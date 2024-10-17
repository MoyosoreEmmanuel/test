import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import AgriSupplyChainDetails from './AgriSupplyChain.json';

let web3;
let agriSupplyChainInstance;

// Hardcoded network ID
const networkId = 1440002; // Replace with your actual network ID

// Initialize web3 instance and contracts
export async function initializeWeb3(setIsLoading) {
    if (web3 && agriSupplyChainInstance) {
        console.log("Web3 and contract already initialized");
        return { web3, agriSupplyChainInstance };
    }

    setIsLoading(true);

    try {
        const provider = await detectEthereumProvider();
        
        if (provider) {
            web3 = new Web3(provider);
            console.log("Web3 initialized successfully with provider.");
        } else {
            web3 = new Web3('https://rpc-evm-sidechain.xrpl.org');
            console.log("Web3 initialized successfully with direct endpoint.");
        }

        console.log(`Using hardcoded Network ID: ${networkId}`);

        // Log the contract address
        console.log("Contract address from JSON:", AgriSupplyChainDetails.networks[networkId]?.address);

        agriSupplyChainInstance = createContractInstance(AgriSupplyChainDetails.abi, AgriSupplyChainDetails.networks[networkId]?.address, 'AgriSupplyChain');
        if (!agriSupplyChainInstance) {
            throw new Error('AgriSupplyChain contract not deployed on the specified network.');
        }

        console.log("Contract instance created successfully");
        return { web3, agriSupplyChainInstance };

    } catch (error) {
        console.error("Error initializing Web3:", error);
        throw error;
    } finally {
        setIsLoading(false);
    }
}

// Helper function to create contract instances
function createContractInstance(abi, contractAddress, description) {
    if (!contractAddress) {
        throw new Error(`${description} contract not deployed on the specified network.`);
    }
    const contractInstance = new web3.eth.Contract(abi, contractAddress);
    console.log(`${description} contract instance created for address: ${contractAddress}`);
    return contractInstance;
}

export async function isWeb3Enabled() {
    const provider = await detectEthereumProvider();
    
    if (provider) {
        try {
            // Request account access
            await provider.request({ method: 'eth_requestAccounts' });
            return true;
        } catch (error) {
            console.error('User denied account access', error);
            return false;
        }
    } else {
        console.log('Please install MetaMask!');
        return false;
    }
}
