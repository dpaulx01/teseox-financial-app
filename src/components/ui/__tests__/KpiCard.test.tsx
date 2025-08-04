import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DollarSign } from 'lucide-react';
import KpiCard from '../KpiCard';

describe('KpiCard', () => {
  const defaultProps = {
    title: 'Test KPI',
    value: 1000,
    unit: '$',
    icon: DollarSign,
    color: 'bg-blue-500',
  };

  it('should render the title correctly', () => {
    render(<KpiCard {...defaultProps} />);
    expect(screen.getByText('Test KPI')).toBeInTheDocument();
  });

  it('should render numeric values with 2 decimal places', () => {
    render(<KpiCard {...defaultProps} value={1234.567} />);
    expect(screen.getByText('1234.57')).toBeInTheDocument();
  });

  it('should render string values as-is', () => {
    render(<KpiCard {...defaultProps} value="$1,000" />);
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('should render unit when provided', () => {
    render(<KpiCard {...defaultProps} unit="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should not render unit when not provided', () => {
    const { container } = render(<KpiCard {...defaultProps} unit={undefined} />);
    expect(container.querySelector('span')).not.toBeInTheDocument();
  });

  it('should apply the correct color class', () => {
    const { container } = render(<KpiCard {...defaultProps} color="bg-red-500" />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });
});