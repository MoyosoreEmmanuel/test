import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GetProducts from './GetProducts';

// Mock contract object
const mockContract = {
  methods: {
    getProducts: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockResolvedValue([
        { name: 'Product1', quantity: '10', price: '100' },
        { name: 'Product2', quantity: '20', price: '200' },
      ]),
    })),
  },
};

// Mock window.ethereum object
global.window.ethereum = {
  request: jest.fn().mockResolvedValue(['0x123']),
  on: jest.fn(),
  removeListener: jest.fn(),
};

describe('GetProducts', () => {
  it('renders without crashing', () => {
    render(<GetProducts contract={mockContract} />);
    expect(screen.getByText('Get Products')).toBeInTheDocument();
  });

  it('gets products', async () => {
    render(<GetProducts contract={mockContract} />);
    
    userEvent.click(screen.getByText('Get Products'));

    await waitFor(() => {
      expect(screen.getByText('Index')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Product1')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Product2')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });

  it('handles error when getting products', async () => {
    const errorMessage = 'Error getting products: CALL_EXCEPTION';
    mockContract.methods.getProducts.mockImplementationOnce(() => ({
      call: jest.fn().mockRejectedValue({ code: 'CALL_EXCEPTION', message: errorMessage }),
    }));

    render(<GetProducts contract={mockContract} />);
    
    userEvent.click(screen.getByText('Get Products'));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
