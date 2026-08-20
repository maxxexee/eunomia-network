/**
 * Eunomia ENS Registration Module
 * Handles ENS name registration on Sepolia testnet
 */

// ENS Registry ABI (minimal for registration)
const ENS_REGISTRY_ABI = [
  "function register(string name, address owner, uint duration, bytes32 secret, address resolver) payable",
  "function available(string name) view returns (bool)",
  "function rentPrice(string name, uint duration) view returns (uint)",
  "function getENSAddress() view returns (address)",
  "function getOwner(bytes32 node) view returns (address)",
  "function setSubnodeRecord(bytes32 parentNode, bytes32 labelNode, address owner, address resolver, uint ttl)"
];

const PUBLIC_RESOLVER_ABI = [
  "function setAddr(bytes32 node, address addr)",
  "function setContenthash(bytes32 node, bytes32 hash)",
  "function addr(bytes32 node) view returns (address)"
];

// Sepolia ENS Registry and Resolver addresses
const SEPOLIA_ENS_REGISTRY = '0x253553366Da8546Fc250F225fe3d12a07401295B'; // ENS Sepolia registry
const SEPOLIA_RESOLVER = '0x3506424CA903EFD62c1738d6FcC0fCb7c0ADda38'; // Sepolia public resolver

// ENS state
const ENS_STATE = {
  selectedName: '',
  isAvailable: false,
  registrationCost: null,
  duration: 31536000, // 1 year in seconds
  isRegistered: false
};

/**
 * ENS Registration Module for Eunomia
 */
function createEnsState() {
  return {
    ensState: { ...ENS_STATE },
    ensWalletAddress: '',
    ensError: '',
    ensSuccess: '',
    ensRegistrationStep: 0, // 0: input, 1: checking, 2: available, 3: registering, 4: complete
    ensRegistrations: [],
    ensVisible: false,

    // Initialize ENS state
    initEns() {
      const storedEns = localStorage.getItem('eunomia_ens_data');
      if (storedEns) {
        try {
          const data = JSON.parse(storedEns);
          this.ensState = { ...ENS_STATE, ...data.state };
          this.ensRegistrations = data.registrations || [];
          this.ensVisible = data.visible || false;
        } catch (e) {
          console.error('Failed to parse ENS data:', e);
        }
      }

      // Get wallet address from auth or Supabase session
      const authData = localStorage.getItem('eunomia_auth_data');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          this.ensWalletAddress = parsed.walletAddress || '';
        } catch (e) {
          console.error('Failed to parse auth data for ENS wallet:', e);
        }
      }
    },

    // Check if ENS name is available
    async checkEnsAvailability() {
      if (!this.ensState.selectedName) {
        this.ensError = 'Please enter a valid ENS name';
        return;
      }

      // Validate name format (alphanumeric + hyphens, 3-50 chars)
      const nameRegex = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/i;
      if (!nameRegex.test(this.ensState.selectedName)) {
        this.ensError = 'Invalid ENS name format. Use 3-50 characters (letters, numbers, hyphens)';
        return;
      }

      this.ensRegistrationStep = 1;
      this.ensError = '';

      try {
        // Check availability (simplified check)
        // In production, this would call ENS Registry.available()
        const isAvailable = await this.mockCheckAvailability(this.ensState.selectedName);
        this.ensState.isAvailable = isAvailable;

        if (isAvailable) {
          this.ensRegistrationStep = 2;
          this.ensError = '';
        } else {
          this.ensError = `ENS name "${this.ensState.selectedName}.eth" is not available`;
          this.ensRegistrationStep = 0;
        }
      } catch (error) {
        console.error('Error checking ENS availability:', error);
        this.ensError = 'Failed to check ENS availability. Please try again.';
        this.ensRegistrationStep = 0;
      }
    },

    // Mock availability check (replace with actual ENS call)
    async mockCheckAvailability(name) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Simple validation - in reality this would call ENS contract
      const existingNames = ['eunomia', 'test', 'admin', 'root', 'meta', 'ens'];
      return !existingNames.includes(name.toLowerCase());
    },

    // Register ENS name
    async registerEnsName() {
      if (!this.ensState.isAvailable || !this.ensWalletAddress) {
        this.ensError = 'Please check availability first and ensure wallet is connected';
        return;
      }

      this.ensRegistrationStep = 3;
      this.ensError = '';

      try {
        // Get current signer from MetaMask
        if (!window.ethereum) {
          throw new Error('MetaMask is not installed. Please install MetaMask to register an ENS name.');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();

        // Get ENS Registry contract
        const ensContract = new ethers.Contract(SEPOLIA_ENS_REGISTRY, ENS_REGISTRY_ABI, signer);

        // Generate secret for commitment
        const secret = ethers.utils.randomBytes(32);

        // Label hash (name hash)
        const labelHash = ethers.utils.solidityKeccak256(['string'], [this.ensState.selectedName]);

        // Parent node hash (empty for top-level .eth)
        const parentNodeHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

        // Get registration cost
        const rentPrice = await ensContract.rentPrice(this.ensState.selectedName, this.ensState.duration);
        this.ensState.registrationCost = ethers.utils.formatEther(rentPrice);

        // Register the name
        const tx = await ensContract.register(
          this.ensState.selectedName,
          signerAddress,
          this.ensState.duration,
          secret,
          SEPOLIA_RESOLVER,
          {
            value: rentPrice,
            gasLimit: 300000
          }
        );

        // Wait for transaction
        await tx.wait();

        // Set resolver address
        const resolverContract = new ethers.Contract(SEPOLIA_RESOLVER, PUBLIC_RESOLVER_ABI, signer);

        // Set address record
        const setAddrTx = await resolverContract.setAddr(labelHash, signerAddress);
        await setAddrTx.wait();

        // Update state
        this.ensState.isRegistered = true;
        this.ensState.registrationCost = null;
        this.ensRegistrationStep = 4;
        this.ensSuccess = `Successfully registered ${this.ensState.selectedName}.eth!`;
        this.ensError = '';

        // Add to registrations list
        this.ensRegistrations.push({
          name: `${this.ensState.selectedName}.eth`,
          address: signerAddress,
          registeredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + this.ensState.duration * 1000).toISOString()
        });

        // Save to localStorage
        this.saveEnsData();

        console.log(`ENS registration complete: ${this.ensState.selectedName}.eth`);
      } catch (error) {
        console.error('ENS registration failed:', error);
        this.ensError = `Registration failed: ${error.message}`;
        this.ensRegistrationStep = 2; // Back to available state
        this.ensState.registrationCost = null;
      }
    },

    // Save ENS data to localStorage
    saveEnsData() {
      const data = {
        state: this.ensState,
        registrations: this.ensRegistrations,
        visible: this.ensVisible
      };
      localStorage.setItem('eunomia_ens_data', JSON.stringify(data));
    },

    // Verify ENS ownership
    async verifyEnsOwnership(name) {
      try {
        // This would verify the user owns the ENS name
        // Simplified verification
        const address = await this.resolveEnsName(name);
        return address === this.ensWalletAddress;
      } catch (error) {
        console.error('ENS verification failed:', error);
        return false;
      }
    },

    // Resolve ENS name to address
    async resolveEnsName(name) {
      // In production, this would use ethers.utils.namehash and contract calls
      // Simplified for demo
      return this.ensWalletAddress;
    },

    // Complete ENS registration
    completeEnsRegistration() {
      if (this.ensRegistrationStep === 4) {
        // Update onboard step to next
        if (window.onboardState) {
          window.onboardState.onboardState.currentStep = 3;
        }
        this.ensVisible = false;
        this.saveEnsData();
      }
    },

    // Reset ENS state
    resetEnsState() {
      this.ensState = { ...ENS_STATE };
      this.ensRegistrationStep = 0;
      this.ensError = '';
      this.ensSuccess = '';
      this.ensVisible = false;
      this.saveEnsData();
    }
  };
}

// Export for global use
window.createEnsState = createEnsState;

// Also export as Alpine component
if (typeof Alpine !== 'undefined') {
  Alpine.data('ens', createEnsState);
}

console.log('Eunomia ENS module loaded'); 
