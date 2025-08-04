import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Calculator, TrendingUp, Activity, Target, BookOpen, Code, CheckCircle } from 'lucide-react';

interface CalculationMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculationMethodologyModal: React.FC<CalculationMethodologyModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'algorithms' | 'formulas' | 'data'>('overview');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] bg-dark-bg border border-primary/30 rounded-2xl shadow-hologram overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Calculator className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-display text-primary">
                    Metodología de Cálculo
                  </h2>
                  <p className="text-text-muted text-sm font-mono">
                    Cómo el motor de inteligencia financiera procesa tus datos
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-glass rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border">
              {[
                { id: 'overview', label: 'Resumen', icon: Info },
                { id: 'algorithms', label: 'Algoritmos', icon: TrendingUp },
                { id: 'formulas', label: 'Fórmulas', icon: Calculator },
                { id: 'data', label: 'Fuente de Datos', icon: BookOpen }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-4 py-3 text-sm font-display font-medium transition-all duration-300 flex items-center justify-center space-x-2 border-b-2
                      ${activeTab === tab.id 
                        ? 'border-primary text-primary bg-primary/10' 
                        : 'border-transparent text-text-secondary hover:text-primary hover:bg-glass'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="glass-card p-4 border border-blue-500/30 rounded-lg">
                    <h3 className="text-lg font-display text-blue-500 mb-3">
                      📊 Proceso de Análisis
                    </h3>
                    <div className="space-y-3 text-sm text-text-secondary">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 text-xs font-mono">1</div>
                        <div>
                          <p className="font-medium">Lectura de CSV</p>
                          <p className="text-text-muted">El sistema lee tu archivo CSV y extrae: Ingresos, EBITDA, Utilidad Neta, Costos, Márgenes</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 text-xs font-mono">2</div>
                        <div>
                          <p className="font-medium">Análisis de Características</p>
                          <p className="text-text-muted">Evalúa volatilidad, tendencias, calidad de datos, tipo de negocio y outliers</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 text-xs font-mono">3</div>
                        <div>
                          <p className="font-medium">Selección de Algoritmo</p>
                          <p className="text-text-muted">Elige automáticamente el mejor de 5 algoritmos según las características detectadas</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 text-xs font-mono">4</div>
                        <div>
                          <p className="font-medium">Cálculo de Métricas</p>
                          <p className="text-text-muted">Calcula tendencias, volatilidad, proyecciones, eficiencia y genera insights</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 border border-green-500/30 rounded-lg">
                    <h3 className="text-lg font-display text-green-500 mb-3">
                      🎯 Datos de Entrada (Tu CSV)
                    </h3>
                    <div className="text-sm text-text-secondary space-y-2">
                      <p><span className="font-mono text-accent">Ingresos:</span> $8,341 → $4,176 → $24,761 → $12,399 → $32,190</p>
                      <p><span className="font-mono text-primary">EBITDA:</span> -$1,374 → -$6,555 → $13,369 → $2,166 → -$295 → $13,944</p>
                      <p><span className="font-mono text-warning">Utilidad:</span> -$2,931 → -$8,113 → $11,588 → $608 → -$1,853 → $10,544</p>
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-500 font-medium">⚠️ Características Detectadas:</p>
                        <ul className="text-text-muted text-xs mt-1 space-y-1">
                          <li>• Volatilidad extrema (variación 8x en ingresos)</li>
                          <li>• Pérdidas consecutivas en Enero-Febrero</li>
                          <li>• Recuperación fuerte en Marzo y Junio</li>
                          <li>• Patrones estacionales evidentes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'algorithms' && (
                <div className="space-y-6">
                  <div className="glass-card p-4 border border-primary/30 rounded-lg">
                    <h3 className="text-lg font-display text-primary mb-3">
                      🧠 Algoritmos Disponibles
                    </h3>
                    <div className="space-y-4">
                      <div className="border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <h4 className="font-medium text-green-500">Análisis de Riesgo y Volatilidad</h4>
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">SELECCIONADO</span>
                        </div>
                        <p className="text-text-muted text-sm">
                          Elegido para tus datos por la volatilidad extrema y pérdidas consecutivas. 
                          Calcula métricas robustas usando coeficientes de variación limitados.
                        </p>
                      </div>
                      
                      <div className="border border-border rounded-lg p-3">
                        <h4 className="font-medium text-text-secondary mb-1">Regresión Lineal Múltiple</h4>
                        <p className="text-text-muted text-sm">Para datos de alta calidad sin valores extremos</p>
                      </div>
                      
                      <div className="border border-border rounded-lg p-3">
                        <h4 className="font-medium text-text-secondary mb-1">Series Temporales</h4>
                        <p className="text-text-muted text-sm">Para datos estacionales con 12+ períodos</p>
                      </div>
                      
                      <div className="border border-border rounded-lg p-3">
                        <h4 className="font-medium text-text-secondary mb-1">Análisis por Mediana</h4>
                        <p className="text-text-muted text-sm">Para datos con muchos outliers</p>
                      </div>
                      
                      <div className="border border-border rounded-lg p-3">
                        <h4 className="font-medium text-text-secondary mb-1">Ratios Financieros</h4>
                        <p className="text-text-muted text-sm">Para evaluación de salud financiera</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'formulas' && (
                <div className="space-y-6">
                  <div className="glass-card p-4 border border-accent/30 rounded-lg">
                    <h3 className="text-lg font-display text-accent mb-3">
                      📐 Fórmulas Aplicadas
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Volatilidad</h4>
                        <code className="text-accent">
                          CV = (Desviación Estándar / |Media|) × 100
                          <br />
                          Volatilidad = min((CV_ingresos + CV_ebitda) / 2 × 100, 200%)
                        </code>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Tendencia</h4>
                        <code className="text-accent">
                          Regresión: y = mx + b
                          <br />
                          Tendencia = min(max((m / media) × 100, -50%), 50%)
                        </code>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Crecimiento Mensual</h4>
                        <code className="text-accent">
                          Crecimiento = ((Valor_actual - Valor_anterior) / |Valor_anterior|) × 100
                          <br />
                          Promedio = Σ(crecimientos_válidos) / n
                        </code>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Proyección</h4>
                        <code className="text-accent">
                          Proyección = Último_valor + (pendiente × períodos)
                          <br />
                          Mínimo = max(proyección, 0)
                        </code>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Métricas de Desempeño</h4>
                        <code className="text-accent">
                          Eficiencia = max(0, (EBITDA_promedio / Ingresos_promedio) × 100)
                          <br />
                          Rentabilidad = (Utilidad_promedio / Ingresos_promedio) × 100
                          <br />
                          Sostenibilidad = max(0, 100 - Volatilidad)
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div className="glass-card p-4 border border-warning/30 rounded-lg">
                    <h3 className="text-lg font-display text-warning mb-3">
                      📋 Fuente de Datos
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Estructura del CSV</h4>
                        <div className="text-text-muted space-y-1">
                          <p>• <span className="font-mono text-accent">Mes:</span> Enero, Febrero, Marzo, Abril, Mayo, Junio</p>
                          <p>• <span className="font-mono text-accent">Ingresos:</span> Ingresos totales mensuales</p>
                          <p>• <span className="font-mono text-accent">EBITDA:</span> Earnings Before Interest, Taxes, Depreciation, Amortization</p>
                          <p>• <span className="font-mono text-accent">Utilidad Neta:</span> Ganancia final después de todos los gastos</p>
                          <p>• <span className="font-mono text-accent">Costos:</span> Costos de ventas y producción</p>
                          <p>• <span className="font-mono text-accent">Márgenes:</span> Calculados automáticamente</p>
                        </div>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Procesamiento</h4>
                        <div className="text-text-muted space-y-1">
                          <p>1. Limpieza de datos: Filtrado de valores extremos y zeros</p>
                          <p>2. Validación: Verificación de coherencia entre métricas</p>
                          <p>3. Normalización: Conversión a formato estándar</p>
                          <p>4. Cálculos: Aplicación de algoritmos especializados</p>
                        </div>
                      </div>
                      
                      <div className="bg-dark-card p-3 rounded-lg border border-border">
                        <h4 className="font-mono text-primary mb-2">Limitaciones</h4>
                        <div className="text-text-muted space-y-1">
                          <p>• Volatilidad máxima: 200%</p>
                          <p>• Tendencia máxima: ±50%</p>
                          <p>• Crecimiento máximo: ±100%</p>
                          <p>• Proyección mínima: $0</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CalculationMethodologyModal;