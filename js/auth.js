/**
 * auth.js
 * - Supabase Auth: Google OAuth + Email OTP (magic code)
 * - Auto-generates Ethereum wallet on sign-in (no MetaMask needed)
 * - Registers Alpine "appState" (theme toggle + auth state)
 * - Child pages use `createAuthState()` to inherit auth properties
 */

// Supabase config — replace with your project's values
const SUPABASE_URL = 'https://olbklffxzqfqyfbmrmrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYmtsZmZ4enFmcXlmYm1ybXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY2MTksImV4cCI6MjEwMDcyMjYxOX0.A1UCt-AG4pi-2AfLnRuqlGPha8U6wqFqi4o_TIes1UI';

// Initialize Supabase client
const _supabaseClient = (window.supabase && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Simple wallet encryption helpers (AES-GCM via Web Crypto API)
const WalletCrypto = {
  async deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('eunomia-salt-v1'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },
  async encrypt(plaintext, password) {
    const key = await this.deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    // Pack iv + ciphertext as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  },
  async decrypt(ciphertextB64, password) {
    const key = await this.deriveKey(password);
    const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const dec = new TextDecoder();
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return dec.decode(plaintext);
  }
};

// Wallet management — persists to localStorage per Supabase user ID
const WalletManager = {
  _storageKey(userId) { return `eunomia_wallet_${userId}`; },

  get(userId) {
    const raw = localStorage.getItem(this._storageKey(userId));
    return raw ? JSON.parse(raw) : null;
  },

  save(userId, data) {
    localStorage.setItem(this._storageKey(userId), JSON.stringify(data));
  },

  async getOrCreate(userId, userEmail) {
    // Return existing wallet if present
    const existing = this.get(userId);
    if (existing) return existing;

    // Generate new Ethereum wallet via ethers.js
    if (typeof ethers === 'undefined') {
      console.error('ethers.js not loaded — cannot generate wallet');
      return null;
    }
    const wallet = ethers.Wallet.createRandom();

    // Encrypt private key with user's email as password
    const encryptedPk = await WalletCrypto.encrypt(wallet.privateKey, userEmail);

    const walletData = {
      address: wallet.address,
      encryptedPrivateKey: encryptedPk,
      createdAt: new Date().toISOString(),
      chain: 'ethereum-sepolia'
    };

    this.save(userId, walletData);
    console.log(`New wallet created: ${wallet.address}`);
    return walletData;
  }
};

/**
 * Base auth state factory — returns auth-related properties and methods.
 * Call this from child page Alpine components to inherit auth.
 */
function createAuthState() {
  return {
    // Auth state
    user: null,
    isAuthenticated: false,
    authLoading: !!_supabaseClient,
    authModalOpen: false,

    // Wallet state
    walletAddress: '',
    walletData: null,
    walletLoading: false,

    // Email OTP flow
    authMode: 'choose', // 'choose' | 'email' | 'otp'
    emailInput: '',
    otpInput: '',
    otpSent: false,
    otpError: '',
    authError: '',
    isSendingOtp: false,
    isVerifyingOtp: false,
    isGoogleLoading: false,

    // Computed
    get userDisplayName() {
      if (!this.user) return '';
      return this.user.user_metadata?.full_name
        || this.user.email?.split('@')[0]
        || 'User';
    },
    get userAvatar() {
      return this.user?.user_metadata?.avatar_url || '';
    },
    get userEmail() {
      return this.user?.email || '';
    },
    get userInitials() {
      const name = this.userDisplayName;
      return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    // Init — check for existing session and wallet
    async initAuth() {
      if (!_supabaseClient) {
        console.warn('Supabase client not initialized — check anon key');
        this.authLoading = false;
        return;
      }
      try {
        const { data: { session } } = await _supabaseClient.auth.getSession();
        if (session?.user) {
          this.user = session.user;
          this.isAuthenticated = true;
          await this.ensureWallet();
        }
        _supabaseClient.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            this.user = session.user;
            this.isAuthenticated = true;
            await this.ensureWallet();
          } else {
            this.user = null;
            this.isAuthenticated = false;
            this.walletAddress = '';
            this.walletData = null;
          }
        });
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        this.authLoading = false;
      }
    },

    // Ensure wallet exists for current user — creates one if needed
    async ensureWallet() {
      if (!this.user) return;
      this.walletLoading = true;
      try {
        const wallet = await WalletManager.getOrCreate(this.user.id, this.user.email);
        if (wallet) {
          this.walletData = wallet;
          this.walletAddress = wallet.address;
        }
      } catch (e) {
        console.error('Wallet creation error:', e);
      } finally {
        this.walletLoading = false;
      }
    },

    // Google OAuth
    async signInWithGoogle() {
      if (!_supabaseClient) return;
      this.isGoogleLoading = true;
      this.authError = '';
      try {
        const { error } = await _supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://eunomia-protocol.netlify.app/onboard.html' }
        });
        if (error) throw error;
      } catch (e) {
        this.authError = e.message || 'Google sign-in failed';
        this.isGoogleLoading = false;
      }
    },

    // Email OTP — send code
    async sendOtp() {
      if (!_supabaseClient || !this.emailInput) return;
      const email = this.emailInput.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.otpError = 'Please enter a valid email address';
        return;
      }
      this.isSendingOtp = true;
      this.otpError = '';
      this.authError = '';
      try {
        const { error } = await _supabaseClient.auth.signInWithOtp({
          email,
          options: { 
            shouldCreateUser: true,
            emailRedirectTo: 'https://eunomia-protocol.netlify.app/onboard.html'
          }
        });
        if (error) throw error;
        this.otpSent = true;
        this.authMode = 'otp';
      } catch (e) {
        this.otpError = e.message || 'Failed to send code';
      } finally {
        this.isSendingOtp = false;
      }
    },

    // Email OTP — verify code
    async verifyOtp() {
      if (!_supabaseClient || !this.otpInput || !this.emailInput) return;
      this.isVerifyingOtp = true;
      this.otpError = '';
      this.authError = '';
      try {
        const { data, error } = await _supabaseClient.auth.verifyOtp({
          email: this.emailInput.trim(),
          token: this.otpInput.trim(),
          type: 'email'
        });
        if (error) throw error;
        if (data?.session) {
          this.user = data.session.user;
          this.isAuthenticated = true;
          this.authModalOpen = false;
          window.location.href = 'onboard.html';
        }
      } catch (e) {
        this.otpError = e.message || 'Invalid code. Please try again.';
      } finally {
        this.isVerifyingOtp = false;
      }
    },

    // Reset OTP flow
    resetOtpFlow() {
      this.authMode = 'choose';
      this.emailInput = '';
      this.otpInput = '';
      this.otpSent = false;
      this.otpError = '';
      this.authError = '';
    },

    // Sign out
    async signOut() {
      if (!_supabaseClient) return;
      await _supabaseClient.auth.signOut();
      this.user = null;
      this.isAuthenticated = false;
      window.location.href = '/';
    },

    // Open auth modal
    openAuth() {
      this.authModalOpen = true;
      this.authMode = 'choose';
      this.authError = '';
      this.otpError = '';
    },
  };
}

// Register the base appState for index.html
document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({
    ...createAuthState(),
    darkMode: localStorage.getItem('eunomia-theme') !== 'light',
    toggleTheme() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
      localStorage.setItem('eunomia-theme', this.darkMode ? 'dark' : 'light');
      if (window.update3DTheme) window.update3DTheme(this.darkMode);
    },
    init() {
      this.initAuth();
    },
  }));
});
