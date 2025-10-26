import React from 'react';

export type DistributionParams = {
  distribution: 'normal' | 'triangular' | 'uniform';
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  mode: number;
};

interface DistributionConfig {
  title: string;
  params: DistributionParams;
  unit: '%' | '$';
  onChange: (params: DistributionParams) => void;
}

interface MonteCarloControlsProps {
  iterations: number;
  onIterationsChange: (value: number) => void;
  distributions: DistributionConfig[];
}

export const MonteCarloControls: React.FC<MonteCarloControlsProps> = ({
  iterations,
  onIterationsChange,
  distributions,
}) => {
  return (
    <>
      <div>
        <div className="text-xs text-text-muted mb-1">Iteraciones</div>
        <input
          type="number"
          min={100}
          max={10000}
          step={100}
          value={iterations}
          onChange={(e) => onIterationsChange(Number(e.target.value))}
          className="w-full px-2 py-1 bg-glass rounded text-xs text-text-secondary border border-border focus:border-accent"
        />
      </div>

      {distributions.map(({ title, params, unit, onChange }) => (
        <div key={title} className="space-y-1 p-2 border border-border/50 rounded-md">
          <div className="text-xs text-text-muted">{title}</div>
          <select
            value={params.distribution}
            onChange={(e) =>
              onChange({
                ...params,
                distribution: e.target.value as DistributionParams['distribution'],
              })
            }
            className="w-full px-2 py-1 bg-glass rounded text-xs text-text-secondary border border-border focus:border-accent mb-1"
          >
            <option value="normal">Normal</option>
            <option value="triangular">Triangular</option>
            <option value="uniform">Uniforme</option>
          </select>

          {params.distribution === 'normal' && (
            <div className="flex gap-2">
              <input
                type="number"
                value={params.mean}
                onChange={(e) => onChange({ ...params, mean: Number(e.target.value) })}
                className="w-1/2 px-2 py-1 bg-glass rounded text-xs"
                placeholder={`Media ${unit}`}
              />
              <input
                type="number"
                value={params.stdDev}
                onChange={(e) => onChange({ ...params, stdDev: Number(e.target.value) })}
                className="w-1/2 px-2 py-1 bg-glass rounded text-xs"
                placeholder={`Desv ${unit}`}
              />
            </div>
          )}

          {params.distribution === 'triangular' && (
            <div className="flex gap-2">
              <input
                type="number"
                value={params.min}
                onChange={(e) => onChange({ ...params, min: Number(e.target.value) })}
                className="w-1/3 px-1 py-1 bg-glass rounded text-xs"
                placeholder={`Min ${unit}`}
              />
              <input
                type="number"
                value={params.mode}
                onChange={(e) => onChange({ ...params, mode: Number(e.target.value) })}
                className="w-1/3 px-1 py-1 bg-glass rounded text-xs"
                placeholder={`Moda ${unit}`}
              />
              <input
                type="number"
                value={params.max}
                onChange={(e) => onChange({ ...params, max: Number(e.target.value) })}
                className="w-1/3 px-1 py-1 bg-glass rounded text-xs"
                placeholder={`Max ${unit}`}
              />
            </div>
          )}

          {params.distribution === 'uniform' && (
            <div className="flex gap-2">
              <input
                type="number"
                value={params.min}
                onChange={(e) => onChange({ ...params, min: Number(e.target.value) })}
                className="w-1/2 px-2 py-1 bg-glass rounded text-xs"
                placeholder={`Min ${unit}`}
              />
              <input
                type="number"
                value={params.max}
                onChange={(e) => onChange({ ...params, max: Number(e.target.value) })}
                className="w-1/2 px-2 py-1 bg-glass rounded text-xs"
                placeholder={`Max ${unit}`}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
};
