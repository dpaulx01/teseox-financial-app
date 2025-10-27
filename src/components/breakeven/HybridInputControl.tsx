import React from 'react';

interface HybridInputControlProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  step: number;
  unit: '%' | '$';
  formatValue?: (value: number) => string;
}

export function HybridInputControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  formatValue
}: HybridInputControlProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir campo vacío para que el usuario pueda borrar antes de escribir
    const newValue = e.target.value === '' ? 0 : Number(e.target.value);
    onChange(newValue);
  };

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="space-y-2">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="flex items-center gap-3">
        {/* Slider */}
        <input
          type="range"
          value={value}
          onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-2 bg-glass rounded-lg appearance-none cursor-pointer relative z-30"
        />

        {/* Input numérico */}
        <div className="flex items-center gap-1 px-2 py-1 bg-glass rounded border border-border focus-within:border-accent transition-colors">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            step={step}
            className="w-20 bg-transparent border-none outline-none text-xs text-text-secondary text-right font-mono"
          />
          <span className="text-xs text-text-muted font-mono">{unit}</span>
        </div>
      </div>

      {/* Valor formateado (opcional) */}
      {formatValue && (
        <div className="text-xs text-center font-mono text-text-dim">
          {displayValue}
        </div>
      )}
    </div>
  );
}
