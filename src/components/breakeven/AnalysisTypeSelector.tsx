import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, TrendingUp, DollarSign, Info, HelpCircle, X } from 'lucide-react';
import { BreakEvenAnalysisType } from '../../types';

interface AnalysisTypeSelectorProps {
  selectedType: BreakEvenAnalysisType;
  onTypeChange: (type: BreakEvenAnalysisType) => void;
}

const analysisTypes = {
  contable: {
    id: 'contable',
    name: 'Contable',
    subtitle: 'Estándar',
    icon: BookOpen,
    description: 'Incluye depreciación e intereses',
    objective: '¿Cuánto vender para no tener pérdidas contables?',
    color: 'primary',
    features: ['✓ Depreciación incluida', '✓ Intereses incluidos', '✓ Enfoque a largo plazo'],
    literature: {
      title: 'Punto de Equilibrio Contable',
      definition: 'El nivel de ventas donde la utilidad neta contable es exactamente cero.',
      purpose: 'Determinar el volumen mínimo de ventas para evitar pérdidas según los principios contables.',
      includes: ['Todos los costos operativos', 'Depreciación y amortización', 'Gastos financieros (intereses)', 'Todos los gastos contables'],
      useCase: 'Ideal para reportes financieros, análisis de rentabilidad a largo plazo y evaluación del desempeño contable global de la empresa.'
    }
  },
  operativo: {
    id: 'operativo',
    name: 'Operativo',
    subtitle: 'EBIT',
    icon: TrendingUp,
    description: 'Solo operaciones, sin financiamiento',
    objective: '¿Cuánto vender para que la operación sea autosuficiente?',
    color: 'accent',
    features: ['✓ Depreciación incluida', '✗ Intereses excluidos', '✓ Eficiencia operativa'],
    literature: {
      title: 'Punto de Equilibrio Operativo (EBIT)',
      definition: 'El nivel de ventas donde las Ganancias Antes de Intereses e Impuestos (EBIT) son cero.',
      purpose: 'Evaluar la eficiencia operativa pura de la empresa, sin considerar decisiones de financiamiento.',
      includes: ['Costos operativos directos', 'Gastos administrativos y ventas', 'Depreciación y amortización'],
      excludes: ['Gastos financieros (intereses)', 'Costos de financiamiento'],
      useCase: 'Perfecto para evaluar la eficiencia operativa, comparar diferentes unidades de negocio y tomar decisiones operativas independientes del financiamiento.'
    }
  },
  caja: {
    id: 'caja',
    name: 'Caja',
    subtitle: 'EBITDA',
    icon: DollarSign,
    description: 'Solo flujo de efectivo real',
    objective: '¿Cuánto vender para cubrir todas las facturas?',
    color: 'warning',
    features: ['✗ Depreciación excluida', '✓ Intereses incluidos', '✓ Supervivencia financiera'],
    literature: {
      title: 'Punto de Equilibrio de Caja (EBITDA)',
      definition: 'El nivel de ventas donde las entradas de efectivo igualan exactamente las salidas de efectivo.',
      purpose: 'Determinar el punto de supervivencia financiera basado en flujos de caja reales.',
      includes: ['Costos operativos que requieren efectivo', 'Gastos administrativos y ventas en efectivo', 'Pagos de intereses'],
      excludes: ['Depreciación (no requiere efectivo)', 'Amortización (gasto contable)', 'Otros gastos no monetarios'],
      useCase: 'Crítico para gestión de liquidez, planificación de flujo de caja a corto plazo y evaluación de supervivencia financiera inmediata.'
    }
  }
} as const;

const AnalysisTypeSelector: React.FC<AnalysisTypeSelectorProps> = ({
  selectedType,
  onTypeChange
}) => {
  const selectedConfig = analysisTypes[selectedType];
  const [showModal, setShowModal] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex flex-col lg:flex-row gap-4">
        {Object.values(analysisTypes).map((type) => {
          const IconComponent = type.icon;
          const isSelected = selectedType === type.id;
          
          return (
            <motion.button
              key={type.id}
              onClick={() => onTypeChange(type.id as BreakEvenAnalysisType)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group ${
                isSelected
                  ? `border-${type.color}/50 bg-${type.color}/10 shadow-glow-${type.color}`
                  : 'border-border hover:border-primary/30 hover:bg-glass/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative z-20">
                <div className="flex items-center gap-3 mb-2">
                  <IconComponent 
                    className={`w-5 h-5 ${
                      isSelected ? `text-${type.color}` : 'text-text-muted'
                    }`} 
                  />
                  <div className="flex-1 text-left">
                    <div className={`font-display font-bold ${
                      isSelected ? `text-${type.color}` : 'text-text-secondary'
                    }`}>
                      {type.name}
                    </div>
                    <div className="text-xs text-text-dim font-mono">
                      {type.subtitle}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(type.id);
                    }}
                    className={`p-1 rounded-full transition-all duration-200 hover:scale-110 relative z-30 ${
                      isSelected ? `text-${type.color} hover:bg-${type.color}/20` : 'text-text-dim hover:text-text-secondary hover:bg-glass'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className={`text-xs text-left ${
                  isSelected ? 'text-text-secondary' : 'text-text-dim'
                }`}>
                  {type.description}
                </div>
              </div>
              
              {/* Scan line effect */}
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${type.color}/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none z-0`} />
            </motion.button>
          );
        })}
      </div>

      {/* Warning for negative margin */}
      {/* Add negative margin warning here if needed */}

      {/* Detailed Info Panel */}
      <motion.div
        key={selectedType}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`hologram-card p-6 rounded-xl border-2 border-${selectedConfig.color}/30 bg-${selectedConfig.color}/5`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg bg-${selectedConfig.color}/20 border border-${selectedConfig.color}/30`}>
            <Info className={`w-6 h-6 text-${selectedConfig.color}`} />
          </div>
          
          <div className="flex-1">
            <h3 className={`text-xl font-display text-${selectedConfig.color} mb-2`}>
              Punto de Equilibrio {selectedConfig.name}
            </h3>
            
            <p className="text-text-secondary mb-4 font-mono">
              {selectedConfig.objective}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedConfig.features.map((feature, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono p-2 rounded ${
                    feature.startsWith('✓')
                      ? 'text-accent bg-accent/10 border border-accent/20'
                      : 'text-text-dim bg-glass border border-border'
                  }`}
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal Explicativo */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className={`bg-dark-card/95 backdrop-blur-md p-8 rounded-2xl border-2 border-${analysisTypes[showModal].color}/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-${analysisTypes[showModal].color}/20 border border-${analysisTypes[showModal].color}/30`}>
                    {React.createElement(analysisTypes[showModal].icon, { 
                      className: `w-8 h-8 text-${analysisTypes[showModal].color}` 
                    })}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-display text-${analysisTypes[showModal].color} text-glow`}>
                      {analysisTypes[showModal].literature.title}
                    </h2>
                    <p className="text-text-muted font-mono">
                      Literatura Financiera Profesional
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(null)}
                  className="p-2 rounded-lg hover:bg-glass transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Definición */}
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-lg font-display text-text-secondary mb-2">
                    📖 Definición
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    {analysisTypes[showModal].literature.definition}
                  </p>
                </div>

                {/* Propósito */}
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-lg font-display text-text-secondary mb-2">
                    🎯 Propósito
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    {analysisTypes[showModal].literature.purpose}
                  </p>
                </div>

                {/* Incluye */}
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-lg font-display text-accent mb-3">
                    ✅ Incluye
                  </h3>
                  <ul className="space-y-2">
                    {analysisTypes[showModal].literature.includes.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-text-muted">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Excluye (si existe) */}
                {analysisTypes[showModal].literature.excludes && (
                  <div className="glass-card p-4 rounded-lg">
                    <h3 className="text-lg font-display text-danger mb-3">
                      ❌ Excluye
                    </h3>
                    <ul className="space-y-2">
                      {analysisTypes[showModal].literature.excludes.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-text-muted">
                          <div className="w-2 h-2 bg-danger rounded-full"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Caso de Uso */}
                <div className={`glass-card p-4 rounded-lg border border-${analysisTypes[showModal].color}/30`}>
                  <h3 className={`text-lg font-display text-${analysisTypes[showModal].color} mb-2`}>
                    💼 Cuándo Utilizarlo
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    {analysisTypes[showModal].literature.useCase}
                  </p>
                </div>

                {/* Pregunta Clave */}
                <div className={`hologram-card p-4 rounded-lg border-2 border-${analysisTypes[showModal].color}/50 bg-${analysisTypes[showModal].color}/10`}>
                  <h3 className={`text-lg font-display text-${analysisTypes[showModal].color} mb-2 text-glow`}>
                    ❓ Pregunta Clave
                  </h3>
                  <p className="text-text-secondary font-mono text-lg">
                    {analysisTypes[showModal].objective}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisTypeSelector;