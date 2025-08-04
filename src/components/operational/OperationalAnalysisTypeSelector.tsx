import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Info, 
  HelpCircle, 
  X,
  Target,
  Zap,
  Activity
} from 'lucide-react';

export type OperationalAnalysisType = 'efficiency' | 'profitability' | 'performance';

interface OperationalAnalysisTypeSelectorProps {
  selectedType: OperationalAnalysisType;
  onTypeChange: (type: OperationalAnalysisType) => void;
}

const analysisTypes = {
  efficiency: {
    id: 'efficiency',
    name: 'Eficiencia Operativa',
    subtitle: 'Productividad',
    icon: Zap,
    description: 'Análisis de eficiencia y utilización de recursos',
    objective: '¿Qué tan eficientemente estamos operando?',
    color: 'accent',
    features: [
      '✓ Productividad por m²',
      '✓ Utilización de capacidad',
      '✓ Eficiencia de recursos',
      '✓ Rotación de activos'
    ],
    literature: {
      title: 'Análisis de Eficiencia Operativa',
      definition: 'Evaluación de qué tan bien la empresa utiliza sus recursos para generar producción y ventas.',
      purpose: 'Identificar oportunidades de mejora en procesos, utilización de activos y productividad general.',
      includes: [
        'Productividad por metro cuadrado',
        'Utilización de capacidad instalada',
        'Ratios de eficiencia operativa',
        'Análisis de throughput'
      ],
      metrics: [
        'Asset Turnover Ratio',
        'Capacity Utilization %',
        'Revenue per Square Meter',
        'Operational Efficiency Index'
      ],
      useCase: 'Ideal para optimizar operaciones, identificar cuellos de botella y mejorar la productividad general.'
    }
  },
  profitability: {
    id: 'profitability',
    name: 'Rentabilidad',
    subtitle: 'ROI & Márgenes',
    icon: DollarSign,
    description: 'Análisis de rentabilidad y generación de valor',
    objective: '¿Qué tan rentables son nuestras operaciones?',
    color: 'primary',
    features: [
      '✓ Margen operativo',
      '✓ ROI por m²',
      '✓ Rentabilidad por producto',
      '✓ Value creation analysis'
    ],
    literature: {
      title: 'Análisis de Rentabilidad Operativa',
      definition: 'Evaluación de la capacidad de la empresa para generar utilidades a partir de sus operaciones.',
      purpose: 'Medir la efectividad en la generación de valor y la sostenibilidad financiera de las operaciones.',
      includes: [
        'Márgenes operativos por línea',
        'Rentabilidad por metro cuadrado',
        'ROI operativo',
        'Análisis de valor agregado'
      ],
      metrics: [
        'Gross Margin %',
        'Operating Margin %',
        'ROI per Square Meter',
        'Economic Value Added'
      ],
      useCase: 'Perfecto para evaluar la viabilidad financiera, comparar líneas de producto y optimizar el mix de productos.'
    }
  },
  performance: {
    id: 'performance',
    name: 'Performance Integral',
    subtitle: 'KPIs Balanceados',
    icon: Target,
    description: 'Evaluación integral de performance operativa',
    objective: '¿Cuál es nuestro performance integral?',
    color: 'warning',
    features: [
      '✓ KPIs balanceados',
      '✓ Scorecard operativo',
      '✓ Benchmarking vs targets',
      '✓ Performance holístico'
    ],
    literature: {
      title: 'Análisis de Performance Integral',
      definition: 'Evaluación holística que combina eficiencia, rentabilidad y sostenibilidad operativa.',
      purpose: 'Proporcionar una visión 360° del desempeño operativo mediante KPIs balanceados.',
      includes: [
        'Balanced Scorecard operativo',
        'KPIs integrados de performance',
        'Análisis vs targets y benchmarks',
        'Evaluación de sostenibilidad'
      ],
      metrics: [
        'Operational Performance Index',
        'Balanced KPI Score',
        'Target Achievement %',
        'Sustainability Metrics'
      ],
      useCase: 'Ideal para evaluación ejecutiva, reportes gerenciales y toma de decisiones estratégicas operativas.'
    }
  }
};

const OperationalAnalysisTypeSelector: React.FC<OperationalAnalysisTypeSelectorProps> = ({
  selectedType,
  onTypeChange
}) => {
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const selectedAnalysis = analysisTypes[selectedType];

  return (
    <div className="space-y-4">
      {/* Selector Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(analysisTypes).map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          
          return (
            <motion.div
              key={type.id}
              onClick={() => onTypeChange(type.id as OperationalAnalysisType)}
              className={`relative cursor-pointer group transition-all duration-300 ${
                isSelected 
                  ? 'ring-2 ring-primary ring-opacity-50' 
                  : 'hover:ring-1 hover:ring-accent hover:ring-opacity-30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`hologram-card p-6 rounded-xl transition-all duration-300 ${
                isSelected 
                  ? 'bg-primary/10 border-primary/30 shadow-glow-md' 
                  : 'border-border hover:border-accent/30'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg transition-all duration-300 ${
                      isSelected 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-accent/10 text-accent group-hover:bg-accent/20'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-display font-bold transition-colors duration-300 ${
                        isSelected ? 'text-primary' : 'text-text-primary'
                      }`}>
                        {type.name}
                      </h3>
                      <p className="text-sm text-text-muted">{type.subtitle}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfo(showInfo === type.id ? null : type.id);
                    }}
                    className="p-2 rounded-lg hover:bg-accent/10 transition-colors duration-200"
                  >
                    <HelpCircle className="w-4 h-4 text-text-muted" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  {type.description}
                </p>

                {/* Objective */}
                <div className={`p-3 rounded-lg transition-all duration-300 ${
                  isSelected 
                    ? 'bg-primary/5 border border-primary/20' 
                    : 'bg-accent/5 border border-accent/10'
                }`}>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isSelected ? 'text-primary' : 'text-accent'
                  }`}>
                    {type.objective}
                  </p>
                </div>

                {/* Features */}
                <div className="mt-4 space-y-2">
                  {type.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                        isSelected ? 'bg-primary' : 'bg-accent'
                      }`} />
                      <span className="text-xs text-text-muted">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <div className="w-3 h-3 bg-primary rounded-full shadow-glow-sm" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Panel de Información Detallada */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="hologram-card p-6 rounded-xl border border-accent/30 bg-accent/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Info className="w-5 h-5 text-accent" />
                  <h4 className="font-display font-bold text-accent">
                    {analysisTypes[showInfo as keyof typeof analysisTypes].literature.title}
                  </h4>
                </div>
                <button
                  onClick={() => setShowInfo(null)}
                  className="p-1 rounded-lg hover:bg-accent/10 transition-colors duration-200"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-text-primary mb-2">Definición</h5>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {analysisTypes[showInfo as keyof typeof analysisTypes].literature.definition}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-text-primary mb-2">Propósito</h5>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {analysisTypes[showInfo as keyof typeof analysisTypes].literature.purpose}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-text-primary mb-2">Incluye</h5>
                    <ul className="space-y-1">
                      {analysisTypes[showInfo as keyof typeof analysisTypes].literature.includes.map((item, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                          <span className="text-sm text-text-secondary">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-text-primary mb-2">Métricas Clave</h5>
                    <ul className="space-y-1">
                      {analysisTypes[showInfo as keyof typeof analysisTypes].literature.metrics.map((metric, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          <span className="text-sm text-text-secondary font-mono">{metric}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <h5 className="font-semibold text-primary mb-1">Caso de Uso</h5>
                    <p className="text-sm text-text-secondary">
                      {analysisTypes[showInfo as keyof typeof analysisTypes].literature.useCase}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resumen del Análisis Seleccionado */}
      <div className="hologram-card p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center space-x-3">
          <selectedAnalysis.icon className="w-5 h-5 text-primary" />
          <div>
            <span className="font-semibold text-primary">Análisis Seleccionado: </span>
            <span className="text-text-primary">{selectedAnalysis.name}</span>
            <span className="text-text-muted ml-2">• {selectedAnalysis.objective}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalAnalysisTypeSelector;