export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-EC', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-EC').format(value);
};

export const parseNumericValue = (value: string | number): number => {
  if (typeof value === 'number') return value;
  
  const stringValue = String(value).trim();
  if (!stringValue) return 0;

  // Check for European format first (comma as decimal separator)
  if (stringValue.includes(',')) {
    // Remove all dots (thousands separators) and replace comma with dot
    const normalizedValue = stringValue.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
  } 
  // If no comma, it's either English format or a whole number
  else if (stringValue.includes('.')) {
    const parts = stringValue.split('.');
    // If there's only one dot and it's followed by 1 or 2 digits, assume English decimal
    if (parts.length === 2 && (parts[1].length === 1 || parts[1].length === 2)) {
      const parsed = parseFloat(stringValue);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // Otherwise, assume dots are thousands separators, so remove them
      const normalizedValue = stringValue.replace(/\./g, '');
      const parsed = parseFloat(normalizedValue);
      return isNaN(parsed) ? 0 : parsed;
    }
  } 
  // No dots or commas, simple whole number
  else {
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? 0 : parsed;
  }
};