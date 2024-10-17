const HDWalletProvider = require('@truffle/hdwallet-provider');
const mnemonic = 'story mobile mean sail wagon talk protect grief sadness neck letter off'; // replace with your wallet's mnemonic

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },
    sepolia: {
      provider: () => new HDWalletProvider(mnemonic, 'https://eth-sepolia.g.alchemy.com/v2/jwzzReO__MTzYHBFTZ6HHCshoRxJ77Nd'),
      network_id: 11155111,        // Sepolia's network id
      gas: 5500000,         // Gas limit - set it to a high value
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0",    // Fetch exact version from solc-bin (default: truffle's version)
    }
  }
};
