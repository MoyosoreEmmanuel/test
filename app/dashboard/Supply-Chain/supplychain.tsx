import React, { createContext, useContext, useReducer } from 'react';

// Define your initial state and actions
const initialState = {
  products: [],
  error: null,
  // ... other state properties
};

interface SupplyChainState {
  products: any[];
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

const SupplyChainContext = createContext<{
  state: SupplyChainState;
  dispatch: React.Dispatch<SupplyChainAction>;
} | undefined>(undefined);

export function SupplyChainProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(supplyChainReducer, initialState);

  return (
    <SupplyChainContext.Provider value={{ state, dispatch }}>
      {children}
    </SupplyChainContext.Provider>
  );
}

export function useSupplyChain() {
  const context = useContext(SupplyChainContext);
  if (context === undefined) {
    throw new Error('useSupplyChain must be used within a SupplyChainProvider');
  }
  return context;
}