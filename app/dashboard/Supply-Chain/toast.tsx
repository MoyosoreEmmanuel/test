import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md ${getBackgroundColor(type)}`}>
      <p className="text-white">{message}</p>
      <button onClick={onClose} className="absolute top-2 right-2 text-white">
        &times;
      </button>
    </div>
  );
}

function getBackgroundColor(type: 'success' | 'error' | 'info') {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    case 'info':
      return 'bg-blue-500';
  }
}