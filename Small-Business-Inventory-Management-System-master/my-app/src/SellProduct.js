import React, { useState, useEffect } from 'react';

const SellProduct = ({ contract }) => {
  const [account, setAccount] = useState('');
  const [productIndex, setProductIndex] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        console.log('Please connect to MetaMask.');
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
    };

    // Set the initial account
    window.ethereum.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch((err) => {
        console.error(err);
      });

    // Subscribe to accounts change
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    // Unsubscribe on cleanup
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }, [account]);

  const handleSellProduct = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await contract.methods.sellProduct(productIndex, quantity).send({ from: account });

      setSuccessMessage(`Sold "${quantity}" units of product at index "${productIndex}" successfully!`);
      setProductIndex(0);
      setQuantity(0);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Error selling product: ';
  
      // Check if the error was due to a revert
      if (error.code === 'CALL_EXCEPTION') {
        errorMessage += error.data.message;
      } else {
        errorMessage += error.message;
      }

      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 5000);
    }
  };

  return (
    <div>
      <h2>Sell Product</h2>
      <input
        type="number"
        value={productIndex}
        onChange={e => setProductIndex(e.target.value)}
        placeholder="Enter product index"
      />
      <input
        type="number"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        placeholder="Enter quantity"
      />
      <button onClick={handleSellProduct} disabled={isLoading}>
        {isLoading ? 'Selling...' : 'Sell Product'}
      </button>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
    </div>
  );
};

export default SellProduct;
