import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Eye, Info, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { useFinancialData } from '../../contexts/DataContext';
import { calculateMultiLevelBreakEven } from '../../utils/multiLevelBreakEven';

interface DebugEvent {
  timestamp: Date;
  type: 'classification' | 'mixed_cost' | 'reset' | 'ai_apply' | 'calculation';
  message: string;
  details?: any;
}

interface DebugClassificationPanelProps {
  currentMonth: string;
  customClassifications: Record<string, string>;
  mixedCosts: any[];
  className?: string;
}

const DebugClassificationPanel: React.FC<DebugClassificationPanelProps> = ({
  currentMonth,
  customClassifications,
  mixedCosts,
  className = ''
}) => {
  const { data } = useFinancialData();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const prevClassificationsRef = useRef<Record<string, string>>({});
  const prevMixedCostsRef = useRef<any[]>([]);

  // Detectar cambios en clasificaciones
  useEffect(() => {
    const classificationKeys = Object.keys(customClassifications);
    const prevKeys = Object.keys(prevClassificationsRef.current);
    
    if (classificationKeys.length !== prevKeys.length) {
      if (classificationKeys.length === 0) {
        setEvents(prev => [...prev, {
          timestamp: new Date(),
          type: 'reset',
          message: '🔄 Reset: Todas las clasificaciones eliminadas',
          details: { before: prevKeys.length, after: 0 }
        }]);
      } else if (classificationKeys.length > prevKeys.length) {
        const newKeys = classificationKeys.filter(k => !prevKeys.includes(k));
        const aiApplied = newKeys.length > 5; // Si se agregaron muchas de golpe, probablemente fue IA
        
        // Calcular valores después de la clasificación
        const newResults = calculateMultiLevelBreakEven(data, currentMonth, customClassifications, mixedCosts);
        
        setEvents(prev => [...prev, {
          timestamp: new Date(),
          type: aiApplied ? 'ai_apply' : 'classification',
          message: aiApplied ? 
            `🤖 IA aplicó ${newKeys.length} clasificaciones automáticas` :
            `✏️ Clasificación manual agregada`,
          details: { 
            count: newKeys.length,
            classifications: customClassifications,
            values: {
              CFT: newResults.contable.costosFijos,
              CVU: newResults.contable.costosVariables,
              PVU: newResults.contable.ingresos
            }
          }
        }]);
      }
    }
    
    prevClassificationsRef.current = { ...customClassifications };
  }, [customClassifications]);

  // Detectar cambios en costos mixtos
  useEffect(() => {
    if (mixedCosts.length !== prevMixedCostsRef.current.length) {
      setEvents(prev => [...prev, {
        timestamp: new Date(),
        type: 'mixed_cost',
        message: `💰 Análisis de costos mixtos actualizado: ${mixedCosts.length} cuentas`,
        details: { mixedCosts }
      }]);
    }
    prevMixedCostsRef.current = [...mixedCosts];
  }, [mixedCosts]);

  // Análisis detallado de clasificaciones usando la misma lógica que multiLevelBreakEven
  const analysisData = useMemo(() => {
    if (!data?.raw) return null;

    // SIEMPRE usar la función real para obtener valores exactos
    const realResults = calculateMultiLevelBreakEven(data, currentMonth, customClassifications, mixedCosts);
    
    const accounts = data.raw.filter(row => {
      const code = row['COD.'] || '';
      const hasChildren = data.raw.some(otherRow => {
        const otherCode = otherRow['COD.'] || '';
        return otherCode !== code && otherCode.startsWith(code + '.');
      });
      return !hasChildren && code.trim() !== '';
    });

    const classifications = {
      PVU: [] as any[],
      CVU: [] as any[],
      CFT: [] as any[],
      MIX: [] as any[]
    };

    accounts.forEach(row => {
      const codigo = row['COD.'] || '';
      const cuenta = row['CUENTA'] || '';
      
      // Obtener clasificación actual
      let clasificacion = customClassifications[codigo] || 'CVU';
      
      // Calcular valor usando la misma lógica que multiLevelBreakEven
      let valor = 0;
      if (currentMonth === 'Anual') {
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            valor += typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue).replace(/[^\d.-]/g, '')) || 0;
          }
        });
      } else if (currentMonth === 'Promedio') {
        const monthValues: number[] = [];
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            monthValues.push(typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue).replace(/[^\d.-]/g, '')) || 0);
          }
        });
        valor = monthValues.length > 0 ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length : 0;
      } else {
        const monthValue = row[currentMonth];
        if (monthValue) {
          valor = typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue).replace(/[^\d.-]/g, '')) || 0;
        }
      }

      // Si es MIX pero no tiene análisis de costos mixtos, reclasificar como CFT para el inspector
      const finalClassification = clasificacion === 'MIX' && !mixedCosts.some(mc => mc.accountCode === codigo)
        ? 'CFT' 
        : clasificacion;

      const accountInfo = {
        codigo,
        cuenta,
        valor,
        clasificacion: finalClassification,
        hasMixedData: mixedCosts.some(mc => mc.accountCode === codigo),
        isCustom: !!customClassifications[codigo]
      };

      classifications[finalClassification as keyof typeof classifications].push(accountInfo);
    });

    // USAR SIEMPRE los valores reales del motor de cálculo
    const totalValues = {
      PVU: realResults.contable.ingresos,
      CVU: realResults.contable.costosVariables,
      CFT: realResults.contable.costosFijos,
      MIX: 0 // Las cuentas MIX se procesan como CFT internamente en el motor
    };

    return { classifications, totalValues, totalAccounts: accounts.length, realResults };
  }, [data, customClassifications, mixedCosts, currentMonth]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value));
  };

  if (!analysisData) return null;

  const { classifications, totalValues, totalAccounts } = analysisData;

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-display ${
          isOpen
            ? 'border-info/50 bg-info/10 text-info shadow-glow-info'
            : 'border-border hover:border-info/30 text-text-secondary hover:bg-glass/50'
        }`}
      >
        <Bug className="w-4 h-4" />
        {isOpen ? 'Cerrar Debug' : 'Debug Clasificaciones'}
        <span className="ml-1 px-2 py-1 rounded-full text-xs bg-info/20 text-info">
          🔍 Inspector
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 hologram-card rounded-xl border border-info/30 bg-info/5 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-info/20 border border-info/30">
                  <Eye className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-display text-info">
                    🔍 Inspector de Clasificaciones
                  </h3>
                  <p className="text-sm text-text-muted">
                    Análisis detallado del flujo de clasificación ({currentMonth})
                  </p>
                </div>
              </div>

              {/* Resumen General */}
              <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 glass-card rounded-lg border border-info/30">
                  <div className="text-xl font-mono text-info">{totalAccounts}</div>
                  <div className="text-xs text-text-dim uppercase">Total Cuentas</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-success/30">
                  <div className="text-xl font-mono text-success">{classifications.PVU.length}</div>
                  <div className="text-xs text-text-dim uppercase">PVU</div>
                  <div className="text-xs text-success">{formatCurrency(totalValues.PVU)}</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-accent/30">
                  <div className="text-xl font-mono text-accent">{classifications.CVU.length}</div>
                  <div className="text-xs text-text-dim uppercase">CVU</div>
                  <div className="text-xs text-accent">{formatCurrency(totalValues.CVU)}</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-primary/30">
                  <div className="text-xl font-mono text-primary">{classifications.CFT.length}</div>
                  <div className="text-xs text-text-dim uppercase">CFT</div>
                  <div className="text-xs text-primary">{formatCurrency(totalValues.CFT)}</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-warning/30">
                  <div className="text-xl font-mono text-warning">{classifications.MIX.length}</div>
                  <div className="text-xs text-text-dim uppercase">MIX</div>
                  <div className="text-xs text-warning">{formatCurrency(totalValues.MIX)}</div>
                </div>
              </div>

              {/* Detalles por Clasificación */}
              <div className="space-y-4">
                {Object.entries(classifications).map(([type, accounts]) => {
                  if (accounts.length === 0) return null;
                  
                  const isExpanded = expandedSection === type;
                  const colors = {
                    PVU: 'success',
                    CVU: 'accent', 
                    CFT: 'primary',
                    MIX: 'warning'
                  };
                  const color = colors[type as keyof typeof colors];

                  return (
                    <div key={type} className={`p-4 glass-card rounded-lg border border-${color}/30`}>
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : type)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`text-${color} font-mono font-bold`}>
                            {type} ({accounts.length} cuentas)
                          </div>
                          <div className={`text-sm text-${color}`}>
                            {formatCurrency(totalValues[type as keyof typeof totalValues])}
                          </div>
                        </div>
                        {isExpanded ? 
                          <ChevronDown className={`w-4 h-4 text-${color}`} /> : 
                          <ChevronRight className={`w-4 h-4 text-${color}`} />
                        }
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-2 max-h-64 overflow-y-auto"
                          >
                            {accounts.map((account: any, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-glass/30 rounded text-xs">
                                <div className="flex-1">
                                  <div className="font-mono text-text">{account.codigo}</div>
                                  <div className="text-text-muted truncate">{account.cuenta}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono">{formatCurrency(account.valor)}</div>
                                  <div className="flex gap-1">
                                    {account.isCustom && <span className="px-1 bg-info/20 text-info rounded">Custom</span>}
                                    {account.hasMixedData && <span className="px-1 bg-warning/20 text-warning rounded">Mixed Data</span>}
                                    {type === 'MIX' && !account.hasMixedData && <span className="px-1 bg-danger/20 text-danger rounded">→CFT Fallback</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Alertas importantes */}
              {classifications.MIX.some((acc: any) => !acc.hasMixedData) && (
                <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/30">
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <Info className="w-4 h-4" />
                    <span className="font-display">Cuentas MIX sin análisis:</span>
                    <span className="font-mono">
                      {classifications.MIX.filter((acc: any) => !acc.hasMixedData).length} cuentas
                    </span>
                    <span className="text-text-muted">
                      se tratan como CFT automáticamente
                    </span>
                  </div>
                </div>
              )}

              {/* Log de Eventos */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-display text-info flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    📊 Log de Eventos
                  </h4>
                  {events.length > 0 && (
                    <button
                      onClick={() => setEvents([])}
                      className="text-xs text-text-muted hover:text-danger transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                
                <div className="glass-card rounded-lg border border-info/30 max-h-48 overflow-y-auto">
                  {events.length === 0 ? (
                    <div className="p-4 text-center text-text-muted text-sm">
                      No hay eventos registrados aún
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {events.slice().reverse().map((event, index) => (
                        <div key={index} className="p-3 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="text-text-dim">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                            <div className="flex-1">
                              <div className={`font-medium ${
                                event.type === 'ai_apply' ? 'text-accent' :
                                event.type === 'reset' ? 'text-danger' :
                                event.type === 'mixed_cost' ? 'text-warning' :
                                'text-info'
                              }`}>
                                {event.message}
                              </div>
                              {event.details && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-text-muted hover:text-text-secondary">
                                    Ver detalles
                                  </summary>
                                  <pre className="mt-2 p-2 bg-glass/30 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(event.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugClassificationPanel;