import { useState, useCallback } from 'react';

export interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: number;
}

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const addError = useCallback((message: string, type: ErrorState['type'] = 'error') => {
    const newError: ErrorState = {
      message,
      type,
      timestamp: Date.now(),
    };
    setErrors(prev => [...prev, newError]);

    // Auto-remove error after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(error => error.timestamp !== newError.timestamp));
    }, 5000);
  }, []);

  const removeError = useCallback((timestamp: number) => {
    setErrors(prev => prev.filter(error => error.timestamp !== timestamp));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
  };
};