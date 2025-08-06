import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para optimizar llamadas a API cuando el usuario está editando rápidamente
 * 
 * @param value - Valor a hacer debounce
 * @param delay - Delay en millisegundos
 * @returns Valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;