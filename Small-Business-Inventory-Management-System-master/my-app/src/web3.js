import Web3 from 'web3';
import contractDetails from './SmallBusinessInventory.json'; // Import the contract details

let web3;
let contractInstance;

export async function initializeWeb3(setIsLoading) { // Add setIsLoading as a parameter
  setIsLoading(true); // Set loading to true at the start
  if (window.ethereum) {
    try {
      // Request account access
      await window.ethereum.enable();
      web3 = new Web3(window.ethereum);
    } catch (error) {
      // User denied account access...
      console.error("User denied account access");
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
  }
  // Non-dapp browsers...
  else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }

  console.log("Connected to MetaMask.");

  const networkId = await web3.eth.net.getId();
  const deployedNetwork = contractDetails.networks[networkId];

  if (deployedNetwork) {
    contractInstance = new web3.eth.Contract(
      contractDetails.abi,
      deployedNetwork.address,
    );
    setIsLoading(false); // Set loading to false once the contract is initialized
  } else {
    console.error('The contract is not deployed on the current network.');
  }
}

export { web3, contractInstance };
