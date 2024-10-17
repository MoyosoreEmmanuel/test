"use client";

import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from "lucide-react";
import Web3 from 'web3';
import { Contract, SendOptions } from 'web3-eth-contract';
import { initializeWeb3 } from './Web3';
import { useSupplyChain, SupplyChainProvider } from './supplychain';
import { Toast, ToastProvider, ToastViewport, ToastClose } from "@/components/ui/toast"

// Define the type for the AgriSupplyChain contract
interface AgriSupplyChainContract extends Contract {
  methods: {
    productCount(): {
      call(): Promise<string>;
    };
    getProductDetails(id: number): {
      call(): Promise<string[]>; // or a more specific tuple type if you know the exact structure
    };
    createProduct(name: string, quantity: number, price: string, originFarm: string): {
      send(options: { from: string }): Promise<any>;
    };
    transferProduct(id: number, newOwner: string): {
      send(options: { from: string }): Promise<any>;
    };
    updateProductStatus(id: number, status: number): {
      send(options: { from: string }): Promise<any>;
    };
    performQualityCheck(id: number, notes: string, passed: boolean): {
      send(options: { from: string }): Promise<any>;
    };
    updateProductPrice(id: number, newPrice: string): {
      send(options: { from: string }): Promise<any>;
    };
    createProductBatch(batchId: string, names: string[], quantities: number[], prices: string[], originFarm: string): {
      send(options: { from: string }): Promise<any>;
    };
    recallProduct(id: number, reason: string): {
      send(options: { from: string }): Promise<any>;
    };
    reportIssue(id: number, description: string): {
      send(options: { from: string }): Promise<any>;
    };
    addTransportInfo(id: number, carrier: string, estimatedArrivalTime: number, sourceLocation: string, destinationLocation: string): {
      send(options: { from: string }): Promise<any>;
    };
    updateTransportStatus(id: number, transportIndex: number, newStatus: number): {
      send(options: { from: string }): Promise<any>;
    };
    setProductExpiration(id: number, expirationDate: number): {
      send(options: { from: string }): Promise<any>;
    };
    grantRole(role: string, account: string): {
      send(options: { from: string }): Promise<any>;
    };
    deposit(): {
      send(options: SendOptions): Promise<any>;
    };
    withdraw(amount: string): {
      send(options: { from: string }): Promise<any>;
    };
    processPayment(id: number): {
      send(options: SendOptions): Promise<any>;
    };
    getTransportInfo(id: number, transportIndex: number): {
      call(): Promise<[string, string, string, string, string, string, string]>;
    };
    getPriceHistory(id: number): {
      call(): Promise<[string[], string[]]>;
    };
    getQualityCheck(id: number, checkId: number): {
      call(): Promise<[string, string, string, boolean]>;
    };
    registerFarm(name: string): {
      send(options: { from: string }): Promise<any>;
    };
    createShipment(productIds: number[]): {
      send(options: { from: string }): Promise<any>;
    };
    updateShipmentStatus(shipmentId: number, newStatus: number): {
      send(options: { from: string }): Promise<any>;
    };
    transferShipment(shipmentId: number, newOwner: string): {
      send(options: { from: string }): Promise<any>;
    };
    getShipmentDetails(shipmentId: number): {
      call(): Promise<[string, number[], string, string, string]>;
    };
  };
}

// Add these type definitions
type Product = {
  id: number;
  name: string;
  quantity: number;
  price: string;
  currentOwner: string;
  status: number;
  originFarm: string;
  harvestDate: number;
};

// Define your initial state and actions
const initialState = {
  products: [],
  error: null,
  // ... other state properties
};

interface SupplyChainState {
  products: Product[];
  error: string | null;
  // ... other state properties
}

interface SupplyChainAction {
  type: string;
  payload: any;
}

function supplyChainReducer(state: SupplyChainState, action: SupplyChainAction): SupplyChainState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    // ... other action handlers
    default:
      return state;
  }
}

// Add these type declarations
declare const web3Instance: Web3 | undefined;
declare const agriSupplyChainInstanceImport: Contract | undefined;

export default function SupplyChainPage() {
  return (
    <SupplyChainProvider>
      <SupplyChainPageContent />
    </SupplyChainProvider>
  );
}

function SupplyChainPageContent() {
  const { state, dispatch } = useSupplyChain() as { state: SupplyChainState; dispatch: React.Dispatch<SupplyChainAction> };
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  // Form states
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 0, price: 0, originFarm: '' });
  const [transferProduct, setTransferProduct] = useState({ id: 0, newOwner: '' });
  const [updateStatus, setUpdateStatus] = useState({ id: 0, status: 0 });
  const [qualityCheck, setQualityCheck] = useState({ id: 0, notes: '', passed: false });
  const [updatePrice, setUpdatePrice] = useState({ id: 0, newPrice: 0 });
  const [batchCreate, setBatchCreate] = useState<{
    batchId: string;
    names: string[];
    quantities: number[];
    prices: number[];
    originFarm: string;
  }>({ batchId: '', names: [], quantities: [], prices: [], originFarm: '' });

  // New state variables
  const [recallProduct, setRecallProduct] = useState({ id: 0, reason: '' });
  const [expirationDate, setExpirationDate] = useState({ id: 0, date: '' });
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Keep these declarations
  const [issueReport, setIssueReport] = useState({ productId: 0, description: '' });
  const [grantRoleForm, setGrantRoleForm] = useState({ role: '', account: '' });
  const [getTransportInfo, setGetTransportInfo] = useState({ productId: 0, transportIndex: 0 });
  const [getPriceHistory, setGetPriceHistory] = useState({ productId: 0 });
  const [getQualityCheck, setGetQualityCheck] = useState({ productId: 0, checkId: 0 });

  // Remove these duplicate declarations (lines 159-162, 170, 176, 179-181)
  // const [grantRoleForm, setGrantRoleForm] = useState({ role: '', account: '' });
  // const [getTransportInfo, setGetTransportInfo] = useState({ productId: 0, transportIndex: 0 });
  // const [getPriceHistory, setGetPriceHistory] = useState({ productId: 0 });
  // const [getQualityCheck, setGetQualityCheck] = useState({ productId: 0, checkId: 0 });
  // const [grantRoleForm, setGrantRoleForm] = useState({ role: '', account: '' });
  // const [issueReport, setIssueReport] = useState({ productId: 0, description: '' });
  // const [getTransportInfo, setGetTransportInfo] = useState({ productId: 0, transportIndex: 0 });
  // const [getPriceHistory, setGetPriceHistory] = useState({ productId: 0 });
  // const [getQualityCheck, setGetQualityCheck] = useState({ productId: 0, checkId: 0 });

  // New state variables for product batch creation
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productQuantities, setProductQuantities] = useState<number[]>([]);
  const [productPrices, setProductPrices] = useState<number[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const [toast, setToast] = useState<{ message: string; type: 'default' | 'destructive'; show: boolean }>({ message: '', type: 'default', show: false });

  const [transportInfoResult, setTransportInfoResult] = useState<any>(null);
  const [priceHistoryResult, setPriceHistoryResult] = useState<any>(null);
  const [qualityCheckResult, setQualityCheckResult] = useState<any>(null);

  const [contractInstances, setContractInstances] = useState<{
    web3: Web3 | null;
    agriSupplyChainInstance: AgriSupplyChainContract | null;
  }>({ web3: null, agriSupplyChainInstance: null });

  // Add a new state for the display panel
  const [displayPanel, setDisplayPanel] = useState<{
    title: string;
    content: React.ReactNode | null;
  }>({ title: '', content: null });

  useEffect(() => {
    if (!userId) {
      console.log("User not authenticated");
      return;
    }
    
    const initWeb3 = async () => {
      try {
        const instances = await initializeWeb3(setLoading);
        setContractInstances(instances);
      } catch (error) {
        console.error("Error initializing Web3 and loading products", error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize Web3 and load products.' });
      }
    };

    initWeb3();
  }, [userId, dispatch]);

  async function loadProducts() {
    if (!contractInstances.agriSupplyChainInstance) {
      console.error("Contract instance not initialized");
      return;
    }
    try {
      const productCount = await contractInstances.agriSupplyChainInstance.methods.productCount().call();
      console.log("Product count:", productCount);
      const loadedProducts: Product[] = [];
      for (let i = 1; i <= parseInt(productCount); i++) {
        console.log(`Fetching details for product ${i}`);
        const productDetails = await contractInstances.agriSupplyChainInstance.methods.getProductDetails(i).call();
        
        // Transform the array into a Product object
        const product: Product = {
          id: i,
          name: productDetails[0],
          quantity: parseInt(productDetails[1]),
          price: productDetails[2],
          currentOwner: productDetails[3],
          status: parseInt(productDetails[4]),
          originFarm: productDetails[5],
          harvestDate: parseInt(productDetails[6])
        };
        
        loadedProducts.push(product);
      }
      console.log("Loaded products:", loadedProducts);
      dispatch({ type: 'SET_PRODUCTS', payload: loadedProducts });
      
      if (loadedProducts.length === 0) {
        console.log("No products found. This is normal if none have been added yet.");
      }
    } catch (err) {
      console.error("Error loading products", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load products.' });
    }
  }

  function showToast(message: string, type: 'default' | 'destructive') {
    setToast({ message, type, show: true });
    setTimeout(() => setToast({ message: '', type: 'default', show: false }), 3000);
  }

  async function handleCreateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.createProduct(
          newProduct.name,
          newProduct.quantity,
          contractInstances.web3.utils.toWei(newProduct.price.toString(), 'ether'),
          newProduct.originFarm
        ).send({ from: accounts[0] });
        await loadProducts();
        setNewProduct({ name: '', quantity: 0, price: 0, originFarm: '' });
        showToast('Product created successfully', 'default');
      } else {
        showToast('Web3 or contract instance not initialized', 'destructive');
      }
    } catch (err) {
      console.error("Error creating product", err);
      showToast('Failed to create product', 'destructive');
    }
  }

  async function handleTransferProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.transferProduct(
          transferProduct.id,
          transferProduct.newOwner
        ).send({ from: accounts[0] });
        await loadProducts();
        setTransferProduct({ id: 0, newOwner: '' });
        showToast('Product transferred successfully', 'default');
      }
    } catch (err) {
      console.error("Error transferring product", err);
      showToast('Failed to transfer product', 'destructive');
    }
  }

  async function handleUpdateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.updateProductStatus(
          updateStatus.id,
          updateStatus.status
        ).send({ from: accounts[0] });
        await loadProducts();
        setUpdateStatus({ id: 0, status: 0 });
      }
    } catch (err) {
      console.error("Error updating product status", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update product status.' });
    }
  }

  async function handleQualityCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.performQualityCheck(
          qualityCheck.id,
          qualityCheck.notes,
          qualityCheck.passed
        ).send({ from: accounts[0] });
        await loadProducts();
        setQualityCheck({ id: 0, notes: '', passed: false });
      }
    } catch (err) {
      console.error("Error performing quality check", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to perform quality check.' });
    }
  }

  async function handleUpdatePrice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.updateProductPrice(
          updatePrice.id,
          contractInstances.web3.utils.toWei(updatePrice.newPrice.toString(), 'ether')
        ).send({ from: accounts[0] });
        await loadProducts();
        setUpdatePrice({ id: 0, newPrice: 0 });
      }
    } catch (err) {
      console.error("Error updating product price", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update product price.' });
    }
  }

  async function handleCreateBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        
        // Filter out any potential undefined values
        const names = batchCreate.names.filter((name): name is string => name !== undefined);
        const quantities = batchCreate.quantities.filter((qty): qty is number => qty !== undefined);
        const prices = batchCreate.prices.filter((price): price is number => price !== undefined);

        await contractInstances.agriSupplyChainInstance.methods.createProductBatch(
          batchCreate.batchId,
          names,
          quantities,
          prices.map(price => contractInstances.web3!.utils.toWei(price.toString(), 'ether')),
          batchCreate.originFarm
        ).send({ from: accounts[0] });
        
        await loadProducts();
        setBatchCreate({ batchId: '', names: [], quantities: [], prices: [], originFarm: '' });
      }
    } catch (err) {
      console.error("Error creating product batch", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create product batch.' });
    }
  }

  async function handleRecallProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.recallProduct(
          recallProduct.id,
          recallProduct.reason
        ).send({ from: accounts[0] });
        await loadProducts();
        setRecallProduct({ id: 0, reason: '' });
        showToast('Product recalled successfully', 'default');
      }
    } catch (err) {
      console.error("Error recalling product", err);
      showToast('Failed to recall product', 'destructive');
    }
  }

  async function handleReportIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.reportIssue(
          issueReport.productId,
          issueReport.description
        ).send({ from: accounts[0] });
        setIssueReport({ productId: 0, description: '' });
        showToast('Issue reported successfully', 'default');
      }
    } catch (err) {
      console.error("Error reporting issue", err);
      showToast('Failed to report issue', 'destructive');
    }
  }

  async function handleSetExpirationDate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        await contractInstances.agriSupplyChainInstance.methods.setProductExpiration(
          expirationDate.id,
          Math.floor(new Date(expirationDate.date).getTime() / 1000)
        ).send({ from: accounts[0] });
        await loadProducts();
        setExpirationDate({ id: 0, date: '' });
        showToast('Expiration date set successfully', 'default');
      }
    } catch (err) {
      console.error("Error setting expiration date", err);
      showToast('Failed to set expiration date', 'destructive');
    }
  }

  async function handleGrantRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance && contractInstances.web3) {
        const accounts = await contractInstances.web3.eth.getAccounts();
        const roleHash = contractInstances.web3.utils.keccak256(grantRoleForm.role);
        await contractInstances.agriSupplyChainInstance.methods.grantRole(
          roleHash,
          grantRoleForm.account
        ).send({ from: accounts[0] });
        setGrantRoleForm({ role: '', account: '' });
        showToast('Role granted successfully', 'default');
      }
    } catch (err) {
      console.error("Error granting role", err);
      showToast('Failed to grant role', 'destructive');
    }
  }

  async function handleGetTransportInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance) {
        const info = await contractInstances.agriSupplyChainInstance.methods.getTransportInfo(
          getTransportInfo.productId,
          getTransportInfo.transportIndex
        ).call();
        console.log("Transport Info:", info);
        
        setDisplayPanel({
          title: `Transport Info for Product ${getTransportInfo.productId}`,
          content: (
            <div>
              <p>Carrier: {info[0]}</p>
              <p>Departure Time: {new Date(parseInt(info[1]) * 1000).toLocaleString()}</p>
              <p>Estimated Arrival: {new Date(parseInt(info[2]) * 1000).toLocaleString()}</p>
              <p>Actual Arrival: {info[3] !== '0' ? new Date(parseInt(info[3]) * 1000).toLocaleString() : 'Not arrived yet'}</p>
              <p>Source: {info[4]}</p>
              <p>Destination: {info[5]}</p>
              <p>Status: {['Pending', 'InTransit', 'Delivered', 'Delayed'][parseInt(info[6])]}</p>
            </div>
          )
        });
        
        showToast('Transport info retrieved successfully', 'default');
      }
    } catch (err) {
      console.error("Error getting transport information", err);
      showToast('Failed to get transport information', 'destructive');
    }
  }

  async function handleGetPriceHistory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance) {
        const [timestamps, prices] = await contractInstances.agriSupplyChainInstance.methods.getPriceHistory(
          getPriceHistory.productId
        ).call();
        console.log("Price History:", { timestamps, prices });
        
        setDisplayPanel({
          title: `Price History for Product ${getPriceHistory.productId}`,
          content: (
            <ul>
              {timestamps.map((timestamp: string, index: number) => (
                <li key={index}>
                  Date: {new Date(parseInt(timestamp) * 1000).toLocaleString()} - 
                  Price: {contractInstances.web3?.utils.fromWei(prices[index], 'ether')} ETH
                </li>
              ))}
            </ul>
          )
        });
        
        showToast('Price history retrieved successfully', 'default');
      }
    } catch (err) {
      console.error("Error getting price history", err);
      showToast('Failed to get price history', 'destructive');
    }
  }

  async function handleGetQualityCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (contractInstances.agriSupplyChainInstance) {
        const [inspector, date, notes, passed] = await contractInstances.agriSupplyChainInstance.methods.getQualityCheck(
          getQualityCheck.productId,
          getQualityCheck.checkId
        ).call();
        console.log("Quality Check:", { inspector, date, notes, passed });
        
        setDisplayPanel({
          title: `Quality Check for Product ${getQualityCheck.productId}`,
          content: (
            <div>
              <p>Inspector: {inspector}</p>
              <p>Date: {new Date(parseInt(date) * 1000).toLocaleString()}</p>
              <p>Notes: {notes}</p>
              <p>Passed: {passed ? 'Yes' : 'No'}</p>
            </div>
          )
        });
        
        showToast('Quality check retrieved successfully', 'default');
      }
    } catch (err) {
      console.error("Error getting quality check information", err);
      showToast('Failed to get quality check information', 'destructive');
    }
  }

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = state.products.slice(indexOfFirstProduct, indexOfLastProduct);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.error) return <div>Error: {state.error}</div>;

  if (!contractInstances.web3 || !contractInstances.agriSupplyChainInstance) {
    return <div>Loading Web3 and contract...</div>;
  }

  return (
    <ToastProvider>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Supply Chain Management</h1>

        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'products' && (
          <ProductList
            products={currentProducts}
            web3={contractInstances.web3}
            ProductStatus={ProductStatus}
          />
        )}

        {activeTab === 'create' && (
          <CreateProductForm
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            handleCreateProduct={handleCreateProduct}
          />
        )}

        {activeTab === 'transfer' && (
          <TransferProductForm
            transferProduct={transferProduct}
            setTransferProduct={setTransferProduct}
            handleTransferProduct={handleTransferProduct}
          />
        )}

        {activeTab === 'update' && (
          <UpdateProductForm
            updateStatus={updateStatus}
            setUpdateStatus={setUpdateStatus}
            handleUpdateStatus={handleUpdateStatus}
            updatePrice={updatePrice}
            setUpdatePrice={setUpdatePrice}
            handleUpdatePrice={handleUpdatePrice}
          />
        )}

        {activeTab === 'quality' && (
          <QualityCheckForm
            qualityCheck={qualityCheck}
            setQualityCheck={setQualityCheck}
            handleQualityCheck={handleQualityCheck}
          />
        )}

        {activeTab === 'batch' && (
          <BatchCreateForm
            batchCreate={batchCreate}
            setBatchCreate={setBatchCreate}
            handleCreateBatch={handleCreateBatch}
          />
        )}

        {activeTab === 'recall' && (
          <RecallProductForm
            recallProduct={recallProduct}
            setRecallProduct={setRecallProduct}
            handleRecallProduct={handleRecallProduct}
          />
        )}

        {activeTab === 'report' && (
          <ReportIssueForm
            issueReport={issueReport}
            setIssueReport={setIssueReport}
            handleReportIssue={handleReportIssue}
          />
        )}

        {activeTab === 'expiration' && (
          <SetExpirationDateForm
            expirationDate={expirationDate}
            setExpirationDate={setExpirationDate}
            handleSetExpirationDate={handleSetExpirationDate}
          />
        )}

        {activeTab === 'grantRole' && (
          <GrantRoleForm
            grantRoleForm={grantRoleForm}
            setGrantRoleForm={setGrantRoleForm}
            handleGrantRole={handleGrantRole}
          />
        )}

        {activeTab === 'getInfo' && (
          <>
            <GetTransportInfoForm
              getTransportInfo={getTransportInfo}
              setGetTransportInfo={setGetTransportInfo}
              handleGetTransportInfo={handleGetTransportInfo}
            />
            <GetPriceHistoryForm
              getPriceHistory={getPriceHistory}
              setGetPriceHistory={setGetPriceHistory}
              handleGetPriceHistory={handleGetPriceHistory}
            />
            <GetQualityCheckForm
              getQualityCheck={getQualityCheck}
              setGetQualityCheck={setGetQualityCheck}
              handleGetQualityCheck={handleGetQualityCheck}
            />
          </>
        )}

        <Pagination
          productsPerPage={productsPerPage}
          totalProducts={state.products.length}
          paginate={paginate}
          currentPage={currentPage}
        />

        <ToastViewport />
        {toast.show && (
          <Toast variant={toast.type}>
            <p>{toast.message}</p>
            <ToastClose onClick={() => setToast({ ...toast, show: false })} />
          </Toast>
        )}

        {/* Add the display panel */}
        {displayPanel.content && (
          <div className="mt-8 p-4 border rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">{displayPanel.title}</h2>
            {displayPanel.content}
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

function TabNavigation({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'create', label: 'Create Product' },
    { id: 'transfer', label: 'Transfer Product' },
    { id: 'update', label: 'Update Product' },
    { id: 'quality', label: 'Quality Check' },
    { id: 'batch', label: 'Batch Create' },
    { id: 'recall', label: 'Recall Product' },
    { id: 'report', label: 'Report Issue' },
    { id: 'expiration', label: 'Set Expiration' },
    { id: 'grantRole', label: 'Grant Role' },
    { id: 'getInfo', label: 'Get Info' },
  ];

  return (
    <div className="flex flex-wrap space-x-2 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded mb-2 ${
            activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ProductList({ products, web3, ProductStatus }: { products: Product[]; web3: Web3; ProductStatus: string[] }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Product List</h2>
      <ul className="space-y-4">
        {products.map((product: Product) => (
          <li key={product.id} className="border p-4 rounded">
            <p>ID: {product.id}</p>
            <p>Name: {product.name}</p>
            <p>Quantity: {product.quantity}</p>
            <p>Price: {web3 ? web3.utils.fromWei(product.price, 'ether') : '0'} ETH</p>
            <p>Current Owner: {product.currentOwner}</p>
            <p>Status: {ProductStatus[product.status]}</p>
            <p>Origin Farm: {product.originFarm}</p>
            <p>Harvest Date: {new Date(product.harvestDate * 1000).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateProductForm({ newProduct, setNewProduct, handleCreateProduct }: { 
  newProduct: { name: string; quantity: number; price: number; originFarm: string };
  setNewProduct: React.Dispatch<React.SetStateAction<{ name: string; quantity: number; price: number; originFarm: string }>>;
  handleCreateProduct: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Create New Product</h2>
      <form onSubmit={handleCreateProduct} className="space-y-4">
        <input
          type="text"
          placeholder="Product Name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Quantity"
          value={newProduct.quantity}
          onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Price (in ETH)"
          value={newProduct.price}
          onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Origin Farm"
          value={newProduct.originFarm}
          onChange={(e) => setNewProduct({...newProduct, originFarm: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">Create Product</button>
      </form>
    </div>
  );
}

function TransferProductForm({ transferProduct, setTransferProduct, handleTransferProduct }: {
  transferProduct: { id: number; newOwner: string };
  setTransferProduct: React.Dispatch<React.SetStateAction<{ id: number; newOwner: string }>>;
  handleTransferProduct: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Transfer Product</h2>
      <form onSubmit={handleTransferProduct} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={transferProduct.id}
          onChange={(e) => setTransferProduct({...transferProduct, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="New Owner Address"
          value={transferProduct.newOwner}
          onChange={(e) => setTransferProduct({...transferProduct, newOwner: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-green-500 text-white rounded">Transfer Product</button>
      </form>
    </div>
  );
}

function UpdateProductForm({ updateStatus, setUpdateStatus, handleUpdateStatus, updatePrice, setUpdatePrice, handleUpdatePrice }: {
  updateStatus: { id: number; status: number };
  setUpdateStatus: React.Dispatch<React.SetStateAction<{ id: number; status: number }>>;
  handleUpdateStatus: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  updatePrice: { id: number; newPrice: number };
  setUpdatePrice: React.Dispatch<React.SetStateAction<{ id: number; newPrice: number }>>;
  handleUpdatePrice: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Update Product</h2>
      <form onSubmit={handleUpdateStatus} className="space-y-4 mb-4">
        <input
          type="number"
          placeholder="Product ID"
          value={updateStatus.id}
          onChange={(e) => setUpdateStatus({...updateStatus, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <select
          value={updateStatus.status}
          onChange={(e) => setUpdateStatus({...updateStatus, status: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        >
          {ProductStatus.map((status, index) => (
            <option key={index} value={index}>{status}</option>
          ))}
        </select>
        <button type="submit" className="w-full p-2 bg-yellow-500 text-white rounded">Update Status</button>
      </form>
      <form onSubmit={handleUpdatePrice} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={updatePrice.id}
          onChange={(e) => setUpdatePrice({...updatePrice, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="New Price (in ETH)"
          value={updatePrice.newPrice}
          onChange={(e) => setUpdatePrice({...updatePrice, newPrice: parseFloat(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-indigo-500 text-white rounded">Update Price</button>
      </form>
    </div>
  );
}

function QualityCheckForm({ qualityCheck, setQualityCheck, handleQualityCheck }: {
  qualityCheck: { id: number; notes: string; passed: boolean };
  setQualityCheck: React.Dispatch<React.SetStateAction<{ id: number; notes: string; passed: boolean }>>;
  handleQualityCheck: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Perform Quality Check</h2>
      <form onSubmit={handleQualityCheck} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={qualityCheck.id}
          onChange={(e) => setQualityCheck({...qualityCheck, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Notes"
          value={qualityCheck.notes}
          onChange={(e) => setQualityCheck({...qualityCheck, notes: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={qualityCheck.passed}
            onChange={(e) => setQualityCheck({...qualityCheck, passed: e.target.checked})}
            className="mr-2"
          />
          Passed
        </label>
        <button type="submit" className="w-full p-2 bg-purple-500 text-white rounded">Perform Quality Check</button>
      </form>
    </div>
  );
}

function BatchCreateForm({ batchCreate, setBatchCreate, handleCreateBatch }: {
  batchCreate: { batchId: string; names: string[]; quantities: number[]; prices: number[]; originFarm: string };
  setBatchCreate: React.Dispatch<React.SetStateAction<{ batchId: string; names: string[]; quantities: number[]; prices: number[]; originFarm: string }>>;
  handleCreateBatch: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Create Product Batch</h2>
      <form onSubmit={handleCreateBatch} className="space-y-4">
        <input
          type="text"
          placeholder="Batch ID"
          value={batchCreate.batchId}
          onChange={(e) => setBatchCreate({...batchCreate, batchId: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Product Names (comma-separated)"
          value={batchCreate.names.join(',')}
          onChange={(e) => setBatchCreate(prevState => ({
            ...prevState,
            names: e.target.value.split(',').filter(Boolean),
          }))}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Quantities (comma-separated)"
          value={batchCreate.quantities.join(',')}
          onChange={(e) => setBatchCreate(prevState => ({
            ...prevState,
            quantities: e.target.value.split(',').map(Number).filter(n => !isNaN(n)),
          }))}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Prices in ETH (comma-separated)"
          value={batchCreate.prices.join(',')}
          onChange={(e) => setBatchCreate(prevState => ({
            ...prevState,
            prices: e.target.value.split(',').map(Number).filter(n => !isNaN(n)),
          }))}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Origin Farm"
          value={batchCreate.originFarm}
          onChange={(e) => setBatchCreate({...batchCreate, originFarm: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-red-500 text-white rounded">Create Batch</button>
      </form>
    </div>
  );
}

// Add these new form components
function RecallProductForm({ recallProduct, setRecallProduct, handleRecallProduct }: {
  recallProduct: { id: number; reason: string };
  setRecallProduct: React.Dispatch<React.SetStateAction<{ id: number; reason: string }>>;
  handleRecallProduct: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Recall Product</h2>
      <form onSubmit={handleRecallProduct} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={recallProduct.id}
          onChange={(e) => setRecallProduct({...recallProduct, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Recall Reason"
          value={recallProduct.reason}
          onChange={(e) => setRecallProduct({...recallProduct, reason: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-red-500 text-white rounded">Recall Product</button>
      </form>
    </div>
  );
}

function ReportIssueForm({ issueReport, setIssueReport, handleReportIssue }: {
  issueReport: { productId: number; description: string };
  setIssueReport: React.Dispatch<React.SetStateAction<{ productId: number; description: string }>>;
  handleReportIssue: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Report Issue</h2>
      <form onSubmit={handleReportIssue} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={issueReport.productId}
          onChange={(e) => setIssueReport({...issueReport, productId: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Description"
          value={issueReport.description}
          onChange={(e) => setIssueReport({...issueReport, description: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-yellow-500 text-white rounded">Report Issue</button>
      </form>
    </div>
  );
}

function SetExpirationDateForm({ expirationDate, setExpirationDate, handleSetExpirationDate }: {
  expirationDate: { id: number; date: string };
  setExpirationDate: React.Dispatch<React.SetStateAction<{ id: number; date: string }>>;
  handleSetExpirationDate: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Set Expiration Date</h2>
      <form onSubmit={handleSetExpirationDate} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={expirationDate.id}
          onChange={(e) => setExpirationDate({...expirationDate, id: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="datetime-local"
          placeholder="Expiration Date"
          value={expirationDate.date}
          onChange={(e) => setExpirationDate({...expirationDate, date: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-green-500 text-white rounded">Set Expiration Date</button>
      </form>
    </div>
  );
}

function GrantRoleForm({ grantRoleForm, setGrantRoleForm, handleGrantRole }: {
  grantRoleForm: { role: string; account: string };
  setGrantRoleForm: React.Dispatch<React.SetStateAction<{ role: string; account: string }>>;
  handleGrantRole: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Grant Role</h2>
      <form onSubmit={handleGrantRole} className="space-y-4">
        <input
          type="text"
          placeholder="Role"
          value={grantRoleForm.role}
          onChange={(e) => setGrantRoleForm({...grantRoleForm, role: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Account Address"
          value={grantRoleForm.account}
          onChange={(e) => setGrantRoleForm({...grantRoleForm, account: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">Grant Role</button>
      </form>
    </div>
  );
}

function GetTransportInfoForm({ getTransportInfo, setGetTransportInfo, handleGetTransportInfo }: {
  getTransportInfo: { productId: number; transportIndex: number };
  setGetTransportInfo: React.Dispatch<React.SetStateAction<{ productId: number; transportIndex: number }>>;
  handleGetTransportInfo: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Get Transport Info</h2>
      <form onSubmit={handleGetTransportInfo} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={getTransportInfo.productId}
          onChange={(e) => setGetTransportInfo({...getTransportInfo, productId: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Transport Index"
          value={getTransportInfo.transportIndex}
          onChange={(e) => setGetTransportInfo({...getTransportInfo, transportIndex: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-purple-500 text-white rounded">Get Transport Info</button>
      </form>
    </div>
  );
}

function GetPriceHistoryForm({ getPriceHistory, setGetPriceHistory, handleGetPriceHistory }: {
  getPriceHistory: { productId: number };
  setGetPriceHistory: React.Dispatch<React.SetStateAction<{ productId: number }>>;
  handleGetPriceHistory: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Get Price History</h2>
      <form onSubmit={handleGetPriceHistory} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={getPriceHistory.productId}
          onChange={(e) => setGetPriceHistory({...getPriceHistory, productId: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-pink-500 text-white rounded">Get Price History</button>
      </form>
    </div>
  );
}

function GetQualityCheckForm({ getQualityCheck, setGetQualityCheck, handleGetQualityCheck }: {
  getQualityCheck: { productId: number; checkId: number };
  setGetQualityCheck: React.Dispatch<React.SetStateAction<{ productId: number; checkId: number }>>;
  handleGetQualityCheck: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Get Quality Check</h2>
      <form onSubmit={handleGetQualityCheck} className="space-y-4">
        <input
          type="number"
          placeholder="Product ID"
          value={getQualityCheck.productId}
          onChange={(e) => setGetQualityCheck({...getQualityCheck, productId: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Check ID"
          value={getQualityCheck.checkId}
          onChange={(e) => setGetQualityCheck({...getQualityCheck, checkId: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-teal-500 text-white rounded">Get Quality Check</button>
      </form>
    </div>
  );
}

interface PaginationProps {
  productsPerPage: number;
  totalProducts: number;
  paginate: (page: number) => void;
  currentPage: number;
}

function Pagination({ productsPerPage, totalProducts, paginate, currentPage }: PaginationProps) {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalProducts / productsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className="flex justify-center space-x-2 mt-4">
        {pageNumbers.map(number => (
          <li key={number}>
            <button
              onClick={() => paginate(number)}
              className={`px-3 py-1 rounded ${currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {number}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const ProductStatus = [
  'Created',
  'Processed',
  'Packaged',
  'ForSale',
  'Sold',
  'Shipped',
  'Received',
  'Rejected'
];

