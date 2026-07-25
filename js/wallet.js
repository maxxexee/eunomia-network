// Register Alpine component before Alpine initialises (this file loads sync in <head>)
document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({
    darkMode: true,
    walletConnected: false,
    walletAddress: '',
    walletModalOpen: false,
    selectedChain: 'evm',

    toggleTheme() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
    },

    async connectBrowserWallet() {
      if (typeof window.ethereum === 'undefined') {
        alert('No EVM wallet detected. Please install MetaMask or another Web3 extension.'); return;
      }
      try {
        const [acc] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.walletAddress = acc.slice(0,6) + '...' + acc.slice(-4);
        this.walletConnected = true; this.walletModalOpen = false;
      } catch(e) { console.error('EVM connection rejected', e); }
    },

    async connectSolanaWallet(walletType) {
      const provider = walletType === 'backpack' ? window.backpack : window.solana;
      if (!provider) { alert(`${walletType.toUpperCase()} extension not found.`); return; }
      try {
        const res = await provider.connect();
        const pub = (res.publicKey || provider.publicKey).toString();
        this.walletAddress = pub.slice(0,4) + '...' + pub.slice(-4);
        this.walletConnected = true; this.walletModalOpen = false;
      } catch(e) { console.error('Solana connection rejected', e); }
    },
  }));
});
