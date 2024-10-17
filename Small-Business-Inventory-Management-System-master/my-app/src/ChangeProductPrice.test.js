import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils'; // Import act from react-dom/test-utils
import ChangeProductPrice from './ChangeProductPrice';

// Mock the contract prop
const mockContract = {
  methods: {
    changeProductPrice: () => ({
      send: jest.fn().mockResolvedValue(true),
    }),
  },
};

describe('ChangeProductPrice', () => {
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
      render(<ChangeProductPrice contract={mockContract} />);
    });
    
    // Check if the heading is in the document
    expect(screen.getByText(/Change Product Price/i)).toBeInTheDocument();
    
    // Check if the inputs and button are in the document
    expect(screen.getByPlaceholderText(/Enter product index/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter new price/i)).toBeInTheDocument();
    expect(screen.getByText(/Change Price/i)).toBeInTheDocument();
  });
});
