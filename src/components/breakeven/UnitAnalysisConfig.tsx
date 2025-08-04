import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Package, DollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export interface UnitConfig {
  name: string;
  price: number;
  variableCost: number;
}

interface UnitAnalysisConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: UnitConfig) => void;
  initialConfig?: UnitConfig;
}

const UnitAnalysisConfig: React.FC<UnitAnalysisConfigProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig = { name: 'Unidad', price: 0, variableCost: 0 },
}) => {
  const [config, setConfig] = useState<UnitConfig>(initialConfig);

  const handleChange = (field: keyof UnitConfig, value: string) => {
    const numericValue = field === 'name' ? value : parseFloat(value) || 0;
    setConfig(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const margin = config.price - config.variableCost;
  const marginPercentage = config.price > 0 ? (margin / config.price) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="hologram-card max-w-lg w-full p-6 rounded-2xl border-2 border-primary/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display text-primary neon-text flex items-center gap-3">
                <Package className="w-6 h-6" />
                Configurar Análisis por Unidad
              </h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Input para Nombre de la Unidad */}
              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">Nombre de la Unidad</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Producto, Servicio, m²"
                  className="w-full p-3 glass-card border border-border rounded-lg text-text-secondary focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Input para Precio de Venta Unitario */}
              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">Precio de Venta por Unidad (PVU)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    type="number"
                    value={config.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="w-full pl-10 p-3 glass-card border border-border rounded-lg text-text-secondary focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Input para Costo Variable Unitario */}
              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">Costo Variable por Unidad (CVU)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim" />
                  <input
                    type="number"
                    value={config.variableCost}
                    onChange={(e) => handleChange('variableCost', e.target.value)}
                    className="w-full pl-10 p-3 glass-card border border-border rounded-lg text-text-secondary focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Resumen del Margen */}
              <div className="glass-card p-4 rounded-lg border border-accent/20">
                <h4 className="text-sm font-display text-accent mb-2">Margen de Contribución por Unidad</h4>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-mono text-accent">{formatCurrency(margin)}</span>
                  <span className={`text-lg font-mono ${marginPercentage > 0 ? 'text-primary' : 'text-danger'}`}>
                    {marginPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 glass-card border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors font-mono"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="cyber-button px-6 py-2 flex items-center gap-2 font-display"
              >
                <Save className="w-4 h-4" />
                Guardar Configuración
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UnitAnalysisConfig;
