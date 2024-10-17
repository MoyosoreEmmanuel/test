import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GetProductDetails from './GetProductDetails';

// Mock contract object
const mockContract = {
  methods: {
    getProductDetails: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockResolvedValue(['Product1', '10', '100']),
    })),
  },
};

// Mock window.ethereum object
global.window.ethereum = {
  request: jest.fn().mockResolvedValue(['0x123']),
  on: jest.fn(),
  removeListener: jest.fn(),
};

describe('GetProductDetails', () => {
  it('renders without crashing', () => {
    render(<GetProductDetails contract={mockContract} />);
    expect(screen.getByText('Get Product Details')).toBeInTheDocument();
  });

  it('gets product details', async () => {
    render(<GetProductDetails contract={mockContract} />);
    
    userEvent.type(screen.getByPlaceholderText('Enter product index'), '0');
    userEvent.click(screen.getByText('Get Details'));

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Product1')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('handles error when getting product details', async () => {
    const errorMessage = 'Error fetching product details: CALL_EXCEPTION';
    mockContract.methods.getProductDetails.mockImplementationOnce(() => ({
      call: jest.fn().mockRejectedValue({ code: 'CALL_EXCEPTION', message: errorMessage }),
    }));

    render(<GetProductDetails contract={mockContract} />);
    
    userEvent.type(screen.getByPlaceholderText('Enter product index'), '0');
    userEvent.click(screen.getByText('Get Details'));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
