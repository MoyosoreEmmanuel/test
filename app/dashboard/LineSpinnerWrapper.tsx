"use client";

import { useEffect } from 'react';
import { lineSpinner } from 'ldrs';

const LineSpinnerWrapper = () => {
  useEffect(() => {
    lineSpinner.register();
  }, []);

  return (
    <l-line-spinner
      size="40"
      stroke="3"
      speed="1"
      color="#8BC34A"
    ></l-line-spinner>
  );
};

export default LineSpinnerWrapper;