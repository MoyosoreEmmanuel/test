const SmallBusinessInventory = artifacts.require("SmallBusinessInventory");

module.exports = function(deployer, network) {
  if(network === 'sepolia') {
    // Deploy the contract on Sepolia network
    deployer.deploy(SmallBusinessInventory);
  } else {
    console.log(`The network ${network} is not configured for deployment in truffle-config.js`);
  }
};
