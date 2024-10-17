import React, { useState, useEffect } from 'react';

const ChangeProductPrice = ({ contract }) => {
  const [account, setAccount] = useState('');
  const [index, setIndex] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        console.log('Please connect to MetaMask.');
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
    };

    window.ethereum.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch((err) => {
        console.error(err);
      });

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }, [account]);

  const handleChangeProductPrice = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await contract.methods.changeProductPrice(index, newPrice).send({ from: account });

      setSuccessMessage(`Price for product at index "${index}" changed successfully!`);
      setIndex(0);
      setNewPrice(0);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Error changing product price: ';
  
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
      <h2>Change Product Price</h2>
      <input
        type="number"
        value={index}
        onChange={e => setIndex(e.target.value)}
        placeholder="Enter product index"
      />
      <input
        type="number"
        value={newPrice}
        onChange={e => setNewPrice(e.target.value)}
        placeholder="Enter new price"
      />
      <button onClick={handleChangeProductPrice} disabled={isLoading}>
        {isLoading ? 'Changing...' : 'Change Price'}
      </button>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
    </div>
  );
};

export default ChangeProductPrice;
