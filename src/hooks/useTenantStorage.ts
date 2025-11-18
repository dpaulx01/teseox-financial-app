import { useState, useEffect, useCallback } from 'react';
import TenantStorage from '../utils/tenantStorage';

/**
 * Hook for tenant-aware localStorage
 * Automatically namespaces keys by company_id to prevent data leakage between tenants
 *
 * Usage:
 *   const [value, setValue, removeValue] = useTenantStorage('myKey', defaultValue);
 */
export const useTenantStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = TenantStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading TenantStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      TenantStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting TenantStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      TenantStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing TenantStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

export default useTenantStorage;
