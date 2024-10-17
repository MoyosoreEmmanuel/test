import React, { useState, useEffect } from 'react';

const GetProductDetails = ({ contract }) => {
  const [account, setAccount] = useState('');
  const [index, setIndex] = useState(0);
  const [productDetails, setProductDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
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

  const handleGetProductDetails = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setProductDetails(null);

    try {
      const details = await contract.methods.getProductDetails(index).call({ from: account });
      setProductDetails({
        name: details[0],
        quantity: Number(details[1]),
        price: Number(details[2]),
      });
    } catch (error) {
      console.error(error);
      let errorMessage = 'Error fetching product details: ';
  
      if (error.code === 'CALL_EXCEPTION') {
        errorMessage += error.data.message;
      } else {
        errorMessage += error.message;
      }

      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Get Product Details</h2>
      <input
        type="number"
        value={index}
        onChange={e => setIndex(e.target.value)}
        placeholder="Enter product index"
      />
      <button onClick={handleGetProductDetails} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Get Details'}
      </button>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {productDetails && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{productDetails.name}</td>
              <td>{productDetails.quantity}</td>
              <td>{productDetails.price}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GetProductDetails;
