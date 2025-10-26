import React from 'react';
import { HybridInputControl } from './HybridInputControl';
import { formatCurrency } from '../../utils/formatters';

interface SimpleSimulationControlsProps {
  priceChange: number;
  onPriceChange: (value: number) => void;
  fixedCostChange: number;
  onFixedCostChange: (value: number) => void;
  currentFixedCosts: number;
  variableCostRateChange: number;
  onVariableCostRateChange: (value: number) => void;
}

export const SimpleSimulationControls: React.FC<SimpleSimulationControlsProps> = ({
  priceChange,
  onPriceChange,
  fixedCostChange,
  onFixedCostChange,
  currentFixedCosts,
  variableCostRateChange,
  onVariableCostRateChange,
}) => {
  return (
    <>
      <HybridInputControl
        label="Precios"
        value={priceChange}
        onChange={onPriceChange}
        min={-50}
        max={50}
        step={1}
        unit="%"
      />

      <HybridInputControl
        label="C. Fijos"
        value={fixedCostChange}
        onChange={onFixedCostChange}
        min={-Math.max(10000, currentFixedCosts * 0.5)}
        max={Math.max(10000, currentFixedCosts * 0.5)}
        step={500}
        unit="$"
        formatValue={formatCurrency}
      />

      <HybridInputControl
        label="Ajuste Tasa C. Variables"
        value={variableCostRateChange}
        onChange={onVariableCostRateChange}
        min={-50}
        max={50}
        step={1}
        unit="%"
      />
    </>
  );
};
