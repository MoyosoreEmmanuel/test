import React, { useEffect, useState } from 'react';
import { contractInstance, initializeWeb3 } from './web3';
import './App.css';

import AddProduct from './AddProduct';
import RemoveProduct from './RemoveProduct';
import SellProduct from './SellProduct';
import UpdateQuantity from './UpdateQuantity';
import GetProducts from './GetProducts';
import CheckProductQuantity from './CheckProductQuantity';
import ChangeProductPrice from './ChangeProductPrice';
import GetProductDetails from './GetProductDetails';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeWeb3(setIsLoading); // Pass setIsLoading to initializeWeb3
  }, []);

  if (isLoading) {
    return <div className="loading">Loading...</div>; // Added a class for styling
  }

  return (
    <div className="App">
      <h1 className="title">Store Business Inventory Management System</h1> {/* Added a class for styling */}
      <div className="section">
        <AddProduct contract={contractInstance} />
      </div>
      <div className="section">
        <RemoveProduct contract={contractInstance} />
      </div>
      <div className="section">
        <SellProduct contract={contractInstance} />
      </div>
      <div className="section">
        <UpdateQuantity contract={contractInstance} />
      </div>
      <div className="section">
        <GetProducts contract={contractInstance} />
      </div>
      <div className="section">
        <CheckProductQuantity contract={contractInstance} />
      </div>
      <div className="section">
        <ChangeProductPrice contract={contractInstance} />
      </div>
      <div className="section">
        <GetProductDetails contract={contractInstance} />
      </div>
    </div>
  );
};

export default App;
