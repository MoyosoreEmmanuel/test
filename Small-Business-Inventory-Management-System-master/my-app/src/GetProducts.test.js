import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils'; // Import act from react-dom/test-utils
import GetProducts from './GetProducts';

// Mock the contract prop
const mockContract = {
  methods: {
    getProducts: () => ({
      call: jest.fn().mockResolvedValue([
        { name: 'Product 1', quantity: '10', price: '100' },
        { name: 'Product 2', quantity: '20', price: '200' },
      ]),
    }),
  },
};

describe('GetProducts', () => {
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
      render(<GetProducts contract={mockContract} />);
    });
    
    // Check if the heading is in the document
    expect(screen.getByRole('heading', { name: /Get Products/i })).toBeInTheDocument();
    
    // Check if the button is in the document
    expect(screen.getByRole('button', { name: /Get Products/i })).toBeInTheDocument();
  });
});
