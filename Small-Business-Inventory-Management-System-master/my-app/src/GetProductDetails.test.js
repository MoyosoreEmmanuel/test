import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils'; // Import act from react-dom/test-utils
import GetProductDetails from './GetProductDetails';

// Mock the contract prop
const mockContract = {
  methods: {
    getProductDetails: () => ({
      call: jest.fn().mockResolvedValue(['Product', '10', '100']),
    }),
  },
};

describe('GetProductDetails', () => {
  // Set up the window.ethereum mock before each test
  beforeEach(() => {
    global.window.ethereum = {
      request: jest.fn().mockResolvedValue(['0x0']),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  it('renders without crashing', async () => { // Make the test callback async
    await act(async () => { // Wrap the render call in act
      render(<GetProductDetails contract={mockContract} />);
    });
    
    // Check if the heading is in the document
    expect(screen.getByText(/Get Product Details/i)).toBeInTheDocument();
    
    // Check if the inputs and button are in the document
    expect(screen.getByPlaceholderText(/Enter product index/i)).toBeInTheDocument();
    expect(screen.getByText(/Get Details/i)).toBeInTheDocument();
  });
});
