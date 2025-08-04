import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CheckCircle, AlertTriangle, XCircle, BarChart3, Target, Zap } from 'lucide-react';
import { useFinancialData } from '../../contexts/DataContext';
import { IntelligentCostClassifier, ClassificationResult } from '../../utils/intelligentCostClassifier';
import { CostClassification } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface IntelligentClassificationPanelProps {
  currentMonth: string;
  className?: string;
}

const IntelligentClassificationPanel: React.FC<IntelligentClassificationPanelProps> = ({
  currentMonth,
  className = ''
}) => {
  const { data } = useFinancialData();
  const [isOpen, setIsOpen] = useState(false);
  const [classifier] = useState(() => new IntelligentCostClassifier());
  const [classificationResults, setClassificationResults] = useState<Record<string, ClassificationResult>>({});
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Configurar el clasificador con datos financieros
  useEffect(() => {
    if (data) {
      classifier.setFinancialData(data);
    }
  }, [data, classifier]);

  // NO ejecutar clasificación automática - debe ser manual
  const [hasRunClassification, setHasRunClassification] = useState(false);
  
  const runManualClassification = useCallback(() => {
    if (!data?.raw) return;

    // console.log('🧠 EJECUTANDO CLASIFICACIÓN IA MANUAL');

    // Obtener todas las cuentas de detalle (sin subcuentas)
    const detailAccounts = data.raw.filter(row => {
      const code = row['COD.'] || '';
      const hasChildren = data.raw.some(otherRow => {
        const otherCode = otherRow['COD.'] || '';
        return otherCode !== code && otherCode.startsWith(code + '.');
      });
      return !hasChildren && code.trim() !== '';
    });

    // Clasificar cada cuenta
    const accounts = detailAccounts.map(row => ({
      code: row['COD.'] || '',
      name: row['CUENTA'] || ''
    }));

    const results = classifier.classifyMultipleAccounts(accounts);
    setClassificationResults(results);
    setHasRunClassification(true);
  }, [data, classifier]);

  // Estadísticas de clasificación
  const stats = useMemo(() => {
    if (Object.keys(classificationResults).length === 0) return null;
    return classifier.getClassificationStatistics(classificationResults);
  }, [classificationResults, classifier]);

  // Filtrar resultados por nivel de confianza
  const resultsByConfidence = useMemo(() => {
    const results = Object.entries(classificationResults);
    return {
      high: results.filter(([_, r]) => r.confidence >= 0.85),
      medium: results.filter(([_, r]) => r.confidence >= 0.60 && r.confidence < 0.85),
      low: results.filter(([_, r]) => r.confidence < 0.60)
    };
  }, [classificationResults]);

  const getClassificationIcon = (classification: CostClassification) => {
    switch (classification) {
      case 'Variable': return '📈';
      case 'Fijo': return '📊';
      case 'Semi-variable': return '⚡';
      case 'Escalonado': return '🎯';
      default: return '❓';
    }
  };

  const getClassificationColor = (classification: CostClassification) => {
    switch (classification) {
      case 'Variable': return 'text-accent border-accent';
      case 'Fijo': return 'text-primary border-primary';
      case 'Semi-variable': return 'text-warning border-warning';
      case 'Escalonado': return 'text-info border-info';
      default: return 'text-text-dim border-border';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-success';
    if (confidence >= 0.60) return 'text-warning';
    return 'text-danger';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.85) return CheckCircle;
    if (confidence >= 0.60) return AlertTriangle;
    return XCircle;
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
            isOpen
              ? 'border-accent/50 bg-accent/10 text-accent shadow-glow-accent'
              : 'border-border hover:border-accent/30 text-text-secondary hover:bg-glass/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          {isOpen ? 'Cerrar Clasificador IA' : 'Clasificador Inteligente'}
          {!hasRunClassification && (
            <span className="ml-1 px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">
              No aplicado
            </span>
          )}
        </button>
        
        {!hasRunClassification && (
          <button
            onClick={runManualClassification}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent hover:text-white transition-all text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            Aplicar IA
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 hologram-card rounded-xl border border-accent/30 bg-accent/5 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                    <Settings className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-accent">
                      🧠 Clasificador Inteligente de Costos
                    </h3>
                    <p className="text-sm text-text-muted">
                      Algoritmo IA con análisis semántico, comportamental y estructural
                    </p>
                  </div>
                </div>
              </div>

              {/* Estadísticas Generales */}
              {stats && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 glass-card rounded-lg border border-info/30">
                    <div className="text-xl font-mono text-info">{stats.total}</div>
                    <div className="text-xs text-text-dim uppercase">Cuentas Analizadas</div>
                  </div>
                  
                  <div className="text-center p-3 glass-card rounded-lg border border-success/30">
                    <div className="text-xl font-mono text-success">{stats.confidence.high.count}</div>
                    <div className="text-xs text-text-dim uppercase">Alta Confianza</div>
                    <div className="text-xs text-success">{stats.confidence.high.percentage.toFixed(1)}%</div>
                  </div>
                  
                  <div className="text-center p-3 glass-card rounded-lg border border-warning/30">
                    <div className="text-xl font-mono text-warning">{stats.confidence.medium.count}</div>
                    <div className="text-xs text-text-dim uppercase">Media Confianza</div>
                    <div className="text-xs text-warning">{stats.confidence.medium.percentage.toFixed(1)}%</div>
                  </div>
                  
                  <div className="text-center p-3 glass-card rounded-lg border border-danger/30">
                    <div className="text-xl font-mono text-danger">{stats.requiresManualReview}</div>
                    <div className="text-xs text-text-dim uppercase">Requieren Revisión</div>
                  </div>
                </div>
              )}

              {/* Distribución por Clasificación */}
              {stats && (
                <div className="mb-6 p-4 glass-card rounded-lg border border-primary/30">
                  <h4 className="text-sm font-display text-primary mb-3">📊 Distribución por Tipo de Costo</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {Object.entries(stats.byClassification).map(([classification, count]) => (
                      <div key={classification} className="text-center">
                        <div className={`text-lg ${getClassificationColor(classification as CostClassification).split(' ')[0]}`}>
                          {getClassificationIcon(classification as CostClassification)} {count}
                        </div>
                        <div className="text-text-muted">{classification}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de Resultados */}
              <div className="space-y-4">
                {/* Alta Confianza - Resumen */}
                {resultsByConfidence.high.length > 0 && (
                  <div className="p-4 glass-card rounded-lg border border-success/30">
                    <h4 className="text-sm font-display text-success mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      ✅ Alta Confianza - Aplicación Automática
                    </h4>
                    <div className="text-sm text-text-secondary">
                      <span className="font-mono text-success">{resultsByConfidence.high.length}</span> cuentas clasificadas automáticamente con confianza ≥85%
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      Las clasificaciones se han aplicado en el panel inferior
                    </div>
                  </div>
                )}

                {/* Media Confianza - Resumen */}
                {resultsByConfidence.medium.length > 0 && (
                  <div className="p-4 glass-card rounded-lg border border-warning/30">
                    <h4 className="text-sm font-display text-warning mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      ⚠️ Media Confianza - Revisión Sugerida
                    </h4>
                    <div className="text-sm text-text-secondary">
                      <span className="font-mono text-warning">{resultsByConfidence.medium.length}</span> cuentas con confianza 70-85%
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      Revise estas clasificaciones en el panel inferior
                    </div>
                  </div>
                )}

                {/* Baja Confianza - Resumen */}
                {resultsByConfidence.low.length > 0 && (
                  <div className="p-4 glass-card rounded-lg border border-danger/30">
                    <h4 className="text-sm font-display text-danger mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      ❌ Baja Confianza - Revisión Manual
                    </h4>
                    <div className="text-sm text-text-secondary">
                      <span className="font-mono text-danger">{resultsByConfidence.low.length}</span> cuentas con confianza &lt;70%
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      Requieren clasificación manual en el panel inferior
                    </div>
                  </div>
                )}
              </div>

              {/* Nota importante */}
              <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/30">
                <div className="flex items-center gap-2 text-accent text-sm">
                  <Target className="w-4 h-4" />
                  <span className="font-display">Próximos Pasos:</span>
                  <span className="text-text-muted">
                    Revisar clasificaciones en el panel inferior y analizar costos mixtos en detalle.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntelligentClassificationPanel;