import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercentage, formatNumber, parseNumericValue } from '../formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1.000');
      expect(formatCurrency(1234567)).toBe('$1.234.567');
    });

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1000)).toBe('$-1.000');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });
  });

  describe('formatPercentage', () => {
    it('should format numbers as percentages with 2 decimal places', () => {
      expect(formatPercentage(25.123)).toBe('25.12%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(-5.678)).toBe('-5.68%');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatNumber(1000)).toBe('1.000');
      expect(formatNumber(1234567)).toBe('1.234.567');
    });
  });

  describe('parseNumericValue', () => {
    it('should parse European format numbers with comma decimals', () => {
      expect(parseNumericValue('1.000,50')).toBe(1000.5);
      expect(parseNumericValue('8.341,12')).toBe(8341.12);
      expect(parseNumericValue('24.761,14')).toBe(24761.14);
    });

    it('should parse simple comma decimals', () => {
      expect(parseNumericValue('1000,50')).toBe(1000.5);
      expect(parseNumericValue('123,45')).toBe(123.45);
    });

    it('should parse thousands without decimals', () => {
      expect(parseNumericValue('8.341')).toBe(8341);
      expect(parseNumericValue('1.234.567')).toBe(1234567);
    });

    it('should parse English format decimals', () => {
      expect(parseNumericValue('1234.56')).toBe(1234.56);
      expect(parseNumericValue('123.45')).toBe(123.45);
    });

    it('should return numbers as-is', () => {
      expect(parseNumericValue(1000)).toBe(1000);
      expect(parseNumericValue(-500)).toBe(-500);
    });

    it('should return 0 for invalid strings', () => {
      expect(parseNumericValue('invalid')).toBe(0);
      expect(parseNumericValue('')).toBe(0);
    });
  });
});