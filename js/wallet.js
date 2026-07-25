/**
 * wallet.js
 * - Registers Alpine "appState" (theme toggle + EVM + Solana wallet connect)
 * - Persists theme to localStorage so every page picks it up
 * - Saves wallet to localStorage and redirects to onboard.html after connect
 */
document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({
    // Read persisted theme — default dark if nothing saved
    darkMode: localStorage.getItem('eunomia-theme') !== 'light',
    walletConnected: false,
    walletAddress: '',
    walletModalOpen: false,
    selectedChain: 'evm',

    toggleTheme() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
      localStorage.setItem('eunomia-theme', this.darkMode ? 'dark' : 'light');
      if (window.update3DTheme) window.update3DTheme(this.darkMode);
    },

    async connectBrowserWallet() {
      if (typeof window.ethereum === 'undefined') {
        alert('No EVM wallet detected. Please install MetaMask or another Web3 extension.');
        return;
      }
      try {
        const [acc] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const short = acc.slice(0, 6) + '...' + acc.slice(-4);
        this.walletAddress = short;
        this.walletConnected = true;
        this.walletModalOpen = false;
        localStorage.setItem('eunomia-wallet', JSON.stringify({ address: short, full: acc, chain: 'evm' }));
        window.location.href = 'onboard.html';
      } catch (e) { console.error('EVM connection rejected', e); }
    },

    async connectSolanaWallet(walletType) {
      const provider = walletType === 'backpack' ? window.backpack : window.solana;
      if (!provider) { alert(`${walletType.toUpperCase()} extension not found.`); return; }
      try {
        const res = await provider.connect();
        const pub = (res.publicKey || provider.publicKey).toString();
        const short = pub.slice(0, 4) + '...' + pub.slice(-4);
        this.walletAddress = short;
        this.walletConnected = true;
        this.walletModalOpen = false;
        localStorage.setItem('eunomia-wallet', JSON.stringify({ address: short, full: pub, chain: 'solana' }));
        window.location.href = 'onboard.html';
      } catch (e) { console.error('Solana connection rejected', e); }
    },
  }));
});
