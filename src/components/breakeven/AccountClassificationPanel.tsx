import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Settings, Save, RotateCcw, Tag, TrendingUp, DollarSign, X, Search, ChevronsRight, ChevronsDown, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancialData } from '../../contexts/DataContext';
import { formatCurrency, parseNumericValue } from '../../utils/formatters';
import { COST_CLASSIFICATION } from '../../constants';
import { IntelligentCostClassifier, ClassificationResult } from '../../utils/intelligentCostClassifier';
import { PROFESSIONAL_COST_CLASSIFICATION } from '../../constants/professionalCostClassification';
import { clearBreakEvenCache } from '../../utils/multiLevelBreakEven';
import { MixedCostAnalyzer } from '../../utils/mixedCostAnalyzer';

type BreakEvenClassification = 'CFT' | 'CVU' | 'PVU' | 'MIX';

interface AccountClassification {
  codigo: string;
  cuenta: string;
  clasificacionActual: string | null;
  clasificacionPuntoEquilibrio: BreakEvenClassification;
  valorAnual: number;
}

interface AccountClassificationPanelProps {
  onClassificationChange?: (classifications: Record<string, BreakEvenClassification>) => void;
  multiLevelData?: { CFT: number; CVU: number; PVU: number } | null;
  onMixedAccountsDetected?: (mixedAccounts: Array<{ code: string; name: string; value: number }>) => void;
  onFlowEvent?: (eventType: string, details: any) => void;
}

const AccountClassificationPanel: React.FC<AccountClassificationPanelProps> = ({ 
  onClassificationChange,
  multiLevelData,
  onMixedAccountsDetected,
  onFlowEvent
}) => {
  const { data } = useFinancialData();
  const [isOpen, setIsOpen] = useState(false);
  const [classifications, setClassifications] = useState<Record<string, BreakEvenClassification>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '4': true,    // Ingresos expandido por defecto
    '5': true,    // Costos expandido por defecto
    '5.1': true,  // Costos de ventas expandido por defecto
    '5.2': false, // Gastos de ventas colapsado por defecto
    '5.3': false  // Gastos administrativos colapsado por defecto
  });
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [cascadeNotification, setCascadeNotification] = useState<string | null>(null);
  const [classifier] = useState(() => new IntelligentCostClassifier());
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<Record<string, ClassificationResult>>({});
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const hasRunAIClassificationRef = useRef(false);
  // Variables eliminadas: forceUpdate y prevMultiLevelDataRef (causaban loop infinito)
  const [shouldRunAutoClassification, setShouldRunAutoClassification] = useState(false);

  // Configurar el clasificador con datos financieros
  useEffect(() => {
    if (data) {
      classifier.setFinancialData(data);
    }
  }, [data, classifier]);

  // ELIMINADO: useEffect que causaba loop infinito con multiLevelData

  // Cargar configuraciones iniciales y ejecutar IA automáticamente
  useEffect(() => {
    // Limpiar cualquier clasificación residual en localStorage
    if (localStorage.getItem('artyco-breakeven-classifications')) {
      localStorage.removeItem('artyco-breakeven-classifications');
    }
    
    // Si hay datos disponibles y no se ha ejecutado IA, ejecutar automáticamente
    if (data?.raw && data.raw.length > 0 && !hasRunAIClassificationRef.current) {
      setShouldRunAutoClassification(true);
      // Ejecutar con un pequeño delay para permitir que el componente se estabilice
      setTimeout(() => {
        runIntelligentClassification();
      }, 500);
    } else {
    }
  }, [data?.raw?.length]); // Ejecutar cuando cambien los datos

  // Procesar todas las cuentas del P&G
  const accounts = useMemo((): AccountClassification[] => {
    if (!data?.raw) return [];

    return data.raw
      .filter(row => row['COD.'] && row['CUENTA'])
      .map(row => {
        const codigo = row['COD.'] || '';
        const cuenta = row['CUENTA'] || '';
        
        // Calcular valor anual sumando todas las columnas que no sean COD. o CUENTA
        const valorAnual = Object.keys(row).reduce((sum, key) => {
          if (key !== 'COD.' && key !== 'CUENTA') {
            const value = row[key];
            if (typeof value === 'number') return sum + value;
            if (typeof value === 'string') {
              const parsed = parseNumericValue(value);
              return sum + parsed;
            }
          }
          return sum;
        }, 0);

        // Clasificación actual del sistema
        const clasificacionActual = COST_CLASSIFICATION[cuenta] || null;

        // Clasificación temporal - se calculará después cuando hasChildren esté disponible
        let defaultClassification: BreakEvenClassification = 'CVU';

        // Aplicar clasificación por defecto SIMPLE - Solo el Clasificador IA introduce MIX
        const getDefaultClassification = (): BreakEvenClassification => {
          // Ingresos siempre son PVU
          if (codigo === '4' || codigo.startsWith('4.')) return 'PVU';
          
          // CLASIFICACIÓN SIMPLE POR CÓDIGO - SIN MIX por defecto
          // Costos de producción (5.1) = Variables
          if (codigo.startsWith('5.1.')) return 'CVU';
          
          // Gastos operacionales (5.2) = Fijos
          if (codigo.startsWith('5.2.')) return 'CFT';
          
          // Otros gastos (5.3) = Fijos
          if (codigo.startsWith('5.3.')) return 'CFT';
          
          // Por defecto todo es variable
          return 'CVU';
        };

        // Usar clasificación personalizada si existe, sino usar la default
        const clasificacionFinal = classifications[codigo] || getDefaultClassification();
        
        return {
          codigo,
          cuenta,
          clasificacionActual,
          clasificacionPuntoEquilibrio: clasificacionFinal,
          valorAnual
        };
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [data, classifications]);

  // Mapeo entre clasificaciones profesionales y clasificaciones de punto de equilibrio
  const mapToPEClassification = (professional: string): BreakEvenClassification => {
    switch (professional) {
      case 'Variable': return 'CVU';
      case 'Fijo': return 'CFT';
      case 'Semi-variable': return 'MIX';
      case 'Escalonado': return 'MIX';
      default: return 'CVU';
    }
  };

  // Detectar y enviar cuentas mixtas automáticamente
  const detectAndSendMixedAccounts = useCallback((currentClassifications: Record<string, BreakEvenClassification>) => {
    if (!data?.raw || !onMixedAccountsDetected) return;

    const mixedAccounts: Array<{ code: string; name: string; value: number }> = [];


    // Buscar cuentas clasificadas como MIX
    Object.entries(currentClassifications).forEach(([code, classification]) => {
      if (classification === 'MIX') {
        // Encontrar la cuenta en los datos raw
        const accountData = data.raw.find(row => row['COD.'] === code);
        if (accountData) {
          const accountName = accountData['CUENTA'] || '';
          
          // Calcular valor anual
          const valorAnual = Object.keys(accountData).reduce((sum, key) => {
            if (key !== 'COD.' && key !== 'CUENTA') {
              const value = accountData[key];
              if (typeof value === 'number') return sum + value;
              if (typeof value === 'string') {
                const parsed = parseNumericValue(value);
                return sum + parsed;
              }
            }
            return sum;
          }, 0);

          mixedAccounts.push({
            code,
            name: accountName,
            value: Math.abs(valorAnual) // Usar valor absoluto para costos
          });
        }
      }
    });

    
    // Siempre notificar (incluso si es 0) para establecer estado consistente
    onMixedAccountsDetected(mixedAccounts);
  }, [data, onMixedAccountsDetected]);

  // Ejecutar clasificador inteligente UNIFICADO
  const runIntelligentClassification = useCallback(() => {
    
    if (!data?.raw || hasRunAIClassificationRef.current) {
      return;
    }


    // Limpiar el caché de cuentas mixtas procesadas antes de ejecutar
    clearBreakEvenCache();

    // Obtener todas las cuentas de detalle
    const detailAccounts = data.raw.filter(row => {
      const code = row['COD.'] || '';
      const hasChildren = data.raw.some(otherRow => {
        const otherCode = otherRow['COD.'] || '';
        return otherCode !== code && otherCode.startsWith(code + '.');
      });
      return !hasChildren && code.trim() !== '';
    });

    // PASO 1: Clasificar cada cuenta con IA
    const accounts = detailAccounts.map(row => ({
      code: row['COD.'] || '',
      name: row['CUENTA'] || ''
    }));

    const results = classifier.classifyMultipleAccounts(accounts);
    setIntelligentSuggestions(results);
    setShowAISuggestions(true);

    // Auto-aplicar clasificaciones de alta confianza
    const highConfidenceClassifications: Record<string, BreakEvenClassification> = {};
    const mixedCandidates: Array<{ code: string; name: string; value: number }> = [];

    let cftCount = 0, cvuCount = 0, mixCount = 0, cftTotal = 0, cvuTotal = 0, mixTotal = 0;

    Object.entries(results).forEach(([key, result]) => {
      if (result.confidence >= 0.85) {
        // Extraer código de cuenta correctamente
        const matchingAccount = detailAccounts.find(acc => 
          `${acc['COD.']}-${acc['CUENTA']}` === key
        );
        if (matchingAccount) {
          const code = matchingAccount['COD.'] || '';
          const peClassification = mapToPEClassification(result.suggested);
          highConfidenceClassifications[code] = peClassification;
          
          // Calcular valor para estadísticas
          let valor = 0;
          Object.keys(matchingAccount).forEach(k => {
            if (k !== 'COD.' && k !== 'CUENTA') {
              const rawValue = matchingAccount[k] || 0;
              valor += typeof rawValue === 'number' ? rawValue : parseNumericValue(String(rawValue));
            }
          });
          valor = Math.abs(valor);
          
          // Contar por tipo
          if (peClassification === 'CFT') { cftCount++; cftTotal += valor; }
          else if (peClassification === 'CVU') { cvuCount++; cvuTotal += valor; }
          else if (peClassification === 'MIX') { mixCount++; mixTotal += valor; }
          
          // Si se clasificó como MIX, agregarlo a los candidatos para análisis automático
          if (peClassification === 'MIX') {
            mixedCandidates.push({
              code,
              name: matchingAccount['CUENTA'] || '',
              value: valor
            });
          }
        }
      }
    });


    // PASO 3: Aplicar clasificaciones y procesar costos mixtos
    if (Object.keys(highConfidenceClassifications).length > 0 || mixedCandidates.length > 0) {
      const newClassifications = { ...classifications, ...highConfidenceClassifications };
      setClassifications(newClassifications);
      if (onClassificationChange) {
        onClassificationChange(newClassifications);
      }
      
      // PASO 4: Análisis inteligente automático de costos mixtos
      let mixedAccountsForPanel: Array<{ code: string; name: string; value: number }> = [];
      
      if (mixedCandidates.length > 0) {
        
        // Crear analizador de costos mixtos
        const mixedAnalyzer = new MixedCostAnalyzer(data, 'Anual');
        
        mixedCandidates.forEach(candidate => {
          const analysis = mixedAnalyzer.analyzeMixedCost(candidate.code, candidate.name, candidate.value);
          
          if (analysis && analysis.confidence === 'high') {
            
            // Agregar a la lista para el MixedCostPanel
            mixedAccountsForPanel.push(candidate);
          } else {
            // NO agregar a mixedAccountsForPanel, se tratará como CFT automáticamente
          }
        });
        
        // Enviar las cuentas MIX finales al panel
        if (mixedAccountsForPanel.length > 0) {
          onMixedAccountsDetected?.(mixedAccountsForPanel);
        }
        
        // Mostrar información más detallada del filtrado
      }
      
      // NO enviar todas las cuentas mixtas aquí - ya se enviaron solo las de alta confianza
      // detectAndSendMixedAccounts(newClassifications); // ELIMINADO: causaba duplicación
      
      // NO guardar en localStorage - se guarda automáticamente en MySQL
      
      // Mostrar notificación de auto-aplicación más precisa
      const mixedAccountsSentToPanel = mixedCandidates.length > 0 ? mixedAccountsForPanel?.length || 0 : 0;
      const mixedAccountsAsCFT = mixedCandidates.length - mixedAccountsSentToPanel;
      
      let notificationText = `✅ IA Unificada: ${Object.keys(highConfidenceClassifications).length} clasificaciones`;
      if (mixedAccountsSentToPanel > 0) {
        notificationText += ` + ${mixedAccountsSentToPanel} cuentas MIX procesadas`;
      }
      if (mixedAccountsAsCFT > 0) {
        notificationText += ` + ${mixedAccountsAsCFT} MIX→CFT`;
      }
      
      setCascadeNotification(notificationText);
      setTimeout(() => setCascadeNotification(null), 7000);
      
      // Marcar que ya se ejecutó el clasificador IA
      hasRunAIClassificationRef.current = true;
      
    } else {
      // Log si no se aplicaron clasificaciones
      onFlowEvent?.('CLASIFICADOR_IA_SIN_CAMBIOS', {
        evento: '⚠️ Clasificador IA ejecutado pero sin cambios',
        motivo: 'No hay clasificaciones con confianza >= 85%',
        total_sugerencias: Object.keys(results).length
      });
    }
  }, [data, classifications, onClassificationChange, classifier, detectAndSendMixedAccounts, onFlowEvent]); // Removido multiLevelData y hasRunAIClassification para evitar re-ejecuciones

  // HABILITADO: Ejecutar clasificador IA automáticamente cuando sea necesario
  useEffect(() => {
    // Solo ejecutar si se activó el flag y hay datos
    if (shouldRunAutoClassification && data?.raw && !hasRunAIClassificationRef.current) {
      runIntelligentClassification();
      setShouldRunAutoClassification(false); // Reset flag
    }
  }, [shouldRunAutoClassification, data?.raw, runIntelligentClassification]);

  // Aplicar sugerencia individual
  const applySuggestion = (accountCode: string, suggestion: BreakEvenClassification) => {
    const newClassifications = { ...classifications, [accountCode]: suggestion };
    setClassifications(newClassifications);
    if (onClassificationChange) {
      onClassificationChange(newClassifications);
    }
    
    // Detectar y enviar cuentas mixtas si se acaba de clasificar como MIX
    if (suggestion === 'MIX') {
      detectAndSendMixedAccounts(newClassifications);
    }
    
    // Marcar como recientemente actualizado
    setRecentlyUpdated(prev => new Set([...prev, accountCode]));
    setTimeout(() => {
      setRecentlyUpdated(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountCode);
        return newSet;
      });
    }, 3000);
  };

  // Funciones del árbol (similar a PnlAnalysis)
  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getChildren = (parentCode: string) => {
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data?.raw?.filter(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    }) || [];
  };

  // Filtrar y preparar cuentas para búsqueda
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return accounts.filter(account => 
      account.codigo.toLowerCase().includes(term) ||
      account.cuenta.toLowerCase().includes(term)
    );
  }, [accounts, searchTerm]);

  // Obtener cuentas raíz (principales)
  const rootAccounts = useMemo(() => {
    if (!data?.raw) return [];
    return data.raw.filter(row => {
      const code = row['COD.'] || '';
      return ['4', '5'].includes(code); // Solo las raíces verdaderas
    });
  }, [data]);

  // Función para verificar si una cuenta tiene subcuentas
  const hasChildren = (parentCode: string): boolean => {
    if (!data?.raw) return false;
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data.raw.some(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    });
  };

  // Función para verificar si una cuenta tiene subcuentas
  const hasClassifiedChildren = (parentCode: string): boolean => {
    if (!data?.raw) return false;
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data.raw.some(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    });
  };

  // Estadísticas - Usar datos reales del motor de cálculo si están disponibles
  const stats = useMemo(() => {
    // PRIORIDAD: Usar datos del multiLevelBreakEven que incluyen ajustes correctos
    if (multiLevelData && multiLevelData.CFT !== undefined) {
      return {
        CFT: multiLevelData.CFT, // Usar valor exacto del motor (ya incluye MIX como CFT)
        CVU: multiLevelData.CVU,
        PVU: multiLevelData.PVU
      };
    }
    
    // FALLBACK: Calcular localmente solo si no hay datos del motor
    const classifiedAccounts = accounts.filter(account => {
      return !hasChildren(account.codigo);
    });

    const totals = classifiedAccounts.reduce((acc, account) => {
      const classification = account.clasificacionPuntoEquilibrio;
      const valor = classification === 'PVU' 
        ? account.valorAnual
        : Math.abs(account.valorAnual);
      acc[classification] = (acc[classification] || 0) + valor;
      return acc;
    }, {} as Record<BreakEvenClassification, number>);

    return {
      CFT: totals.CFT || 0,
      CVU: totals.CVU || 0, 
      PVU: totals.PVU || 0
    };
  }, [accounts, data, classifications, multiLevelData]);

  const handleClassificationChange = (codigo: string, newClassification: BreakEvenClassification) => {
    // Validaciones lógicas
    if (!isValidClassification(codigo, newClassification)) {
      return; // No permitir clasificaciones inválidas
    }

    let newClassifications = {
      ...classifications,
      [codigo]: newClassification
    };

    // LÓGICA INTELIGENTE: Si cambio una cuenta padre, cambiar automáticamente todas sus hijas
    const updateChildrenClassifications = (parentCode: string, classification: BreakEvenClassification) => {
      if (!data?.raw) return;
      
      const updatedChildren = new Set<string>();
      
      // Buscar todas las cuentas hijas (directas e indirectas)
      (data.raw || []).forEach(row => {
        const childCode = row['COD.'] || '';
        
        // Solo actualizar cuentas que sean descendientes del padre
        if (childCode.startsWith(parentCode + '.')) {
          // Solo si es válida la clasificación para esta cuenta hija
          if (isValidClassification(childCode, classification)) {
            newClassifications[childCode] = classification;
            updatedChildren.add(childCode);
          }
        }
      });

      // Mostrar indicador visual de actualización
      if (updatedChildren.size > 0) {
        setRecentlyUpdated(updatedChildren);
        setCascadeNotification(`✨ ${updatedChildren.size} cuenta${updatedChildren.size > 1 ? 's' : ''} actualizada${updatedChildren.size > 1 ? 's' : ''} automáticamente`);
        
        // Limpiar indicadores después de un tiempo
        setTimeout(() => {
          setRecentlyUpdated(new Set());
        }, 2000);
        setTimeout(() => {
          setCascadeNotification(null);
        }, 3000);
      }
    };

    // Aplicar lógica de cascada
    updateChildrenClassifications(codigo, newClassification);

    setClassifications(newClassifications);
    clearBreakEvenCache(); // Limpiar caché para forzar recálculo
    onClassificationChange?.(newClassifications);
  };

  // Función para validar clasificaciones según reglas de negocio
  const isValidClassification = (codigo: string, classification: BreakEvenClassification): boolean => {
    // Código 4 y subcuentas: SOLO PVU
    if (codigo === '4' || codigo.startsWith('4.')) {
      return classification === 'PVU';
    }
    
    // Código 5 y subcuentas: CVU, CFT o MIX
    if (codigo === '5' || codigo.startsWith('5.')) {
      return ['CVU', 'CFT', 'MIX'].includes(classification);
    }
    
    // Otras cuentas pueden ser cualquier cosa
    return true;
  };

  // Función para obtener opciones válidas según el código de cuenta
  const getValidOptions = (codigo: string) => {
    const allOptions = [
      { value: 'CFT', label: 'CFT - Costos Fijos' },
      { value: 'CVU', label: 'CVU - Costos Variables' },
      { value: 'PVU', label: 'PVU - Precio Venta' },
      { value: 'MIX', label: 'MIX - Costo Mixto/Semivariable' }
    ];

    // Código 4 y subcuentas: SOLO PVU
    if (codigo === '4' || codigo.startsWith('4.')) {
      return allOptions.filter(opt => opt.value === 'PVU');
    }
    
    // Código 5 y subcuentas: CVU, CFT o MIX
    if (codigo === '5' || codigo.startsWith('5.')) {
      return allOptions.filter(opt => ['CVU', 'CFT', 'MIX'].includes(opt.value));
    }
    
    // Otras cuentas: todas las opciones
    return allOptions;
  };

  const resetClassifications = () => {
    // Log del evento Reset
    onFlowEvent?.('RESET_CLICKED', {
      evento: '🔄 RESET CLICKED - Eliminando TODAS las clasificaciones',
      valores_antes: multiLevelData ? {
        CFT: `$${Math.round(multiLevelData.CFT).toLocaleString()}`,
        CVU: `$${Math.round(multiLevelData.CVU).toLocaleString()}`,
        PVU: `$${Math.round(multiLevelData.PVU).toLocaleString()}`
      } : null,
      clasificaciones_antes: {
        total: Object.keys(classifications).length,
        detalle_por_tipo: {
          CFT: Object.entries(classifications).filter(([k,v]) => v === 'CFT').length,
          CVU: Object.entries(classifications).filter(([k,v]) => v === 'CVU').length,
          PVU: Object.entries(classifications).filter(([k,v]) => v === 'PVU').length,
          MIX: Object.entries(classifications).filter(([k,v]) => v === 'MIX').length
        },
        primeras_10: Object.entries(classifications).slice(0, 10).map(([k,v]) => `${k}=${v}`)
      }
    });
    
    // Limpiar el caché antes de resetear
    clearBreakEvenCache();
    
    setClassifications({});
    onClassificationChange?.({});
    // Limpiar también las sugerencias inteligentes
    setIntelligentSuggestions({});
    setShowAISuggestions(false);
    // Resetear el estado de clasificación IA
    // console.log(`🔄 RESET IA FLAG: De ${hasRunAIClassificationRef.current} a false`);
    hasRunAIClassificationRef.current = false;
    // NO usar localStorage - las clasificaciones se gestionan en MySQL
    // Forzar recálculo
    setRecentlyUpdated(new Set());
    
    // Log de finalización del reset
    onFlowEvent?.('RESET_COMPLETADO', {
      evento: '✅ RESET COMPLETADO - Todas las clasificaciones eliminadas',
      estado_despues: {
        clasificaciones_total: 0,
        ia_ejecutada: false,
        cache_limpio: true,
        localStorage_eliminado: true
      },
      resultado: 'Sistema vuelve a usar clasificaciones automáticas por defecto'
    });
  };

  const saveClassifications = () => {
    // NO guardar en localStorage - se guarda automáticamente en MySQL
    // Cerrar panel
    setIsOpen(false);
  };

  const getClassificationColor = (classification: BreakEvenClassification) => {
    switch (classification) {
      case 'CFT': return 'text-danger border-danger/30 bg-danger/10';
      case 'CVU': return 'text-warning border-warning/30 bg-warning/10';
      case 'PVU': return 'text-accent border-accent/30 bg-accent/10';
      case 'MIX': return 'text-info border-info/30 bg-info/10';
    }
  };

  const getClassificationLabel = (classification: BreakEvenClassification) => {
    switch (classification) {
      case 'CFT': return 'Costos Fijos Totales';
      case 'CVU': return 'Costo Variable Unitario';
      case 'PVU': return 'Precio de Venta por Unidad';
      case 'MIX': return 'Costo Mixto/Semivariable';
    }
  };

  // Función para renderizar cada nodo del árbol
  const renderNode = (nodeCode: string, depth: number = 0): React.ReactNode => {
    const node = data?.raw?.find(r => r['COD.'] === nodeCode);
    if (!node) return null;

    const children = getChildren(nodeCode);
    const hasChildren = children.length > 0;
    const isExpanded = expanded[nodeCode];
    
    // Calcular valor anual del nodo usando todas las columnas que no sean COD. o CUENTA
    let nodeTotal = 0;
    if (node) {
      Object.keys(node).forEach(key => {
        if (key !== 'COD.' && key !== 'CUENTA') {
          const rawValue = node[key] || 0;
          const value = typeof rawValue === 'number' ? rawValue : parseNumericValue(rawValue);
          nodeTotal += value;
        }
      });
    }

    // Obtener clasificación actual
    const account = accounts.find(acc => acc.codigo === nodeCode);
    const currentClassification = account?.clasificacionPuntoEquilibrio || 'CVU';

    const paddingLeft = depth * 24;
    const isMainAccount = ['4', '5', '5.1', '5.2', '5.3'].includes(nodeCode);
    const wasRecentlyUpdated = recentlyUpdated.has(nodeCode);

    return (
      <div key={nodeCode}>
        <motion.div
          className={`flex items-center gap-3 p-3 transition-all group relative ${
            isMainAccount 
              ? 'bg-gradient-to-r from-primary/10 to-accent/5 font-bold border-b-2 border-primary/30 backdrop-blur-sm' 
              : 'border-b border-border/30 hover:border-primary/20 hover:bg-glass/50'
          } ${
            wasRecentlyUpdated 
              ? 'ring-2 ring-accent/50 bg-accent/10 animate-pulse' 
              : ''
          }`}
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: depth * 0.1 }}
        >
          {/* Expand/Collapse button */}
          <div className="w-6 flex justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggle(nodeCode)}
                className="text-primary hover:text-accent transition-colors p-1 rounded hover:bg-primary/10"
              >
                {isExpanded ? (
                  <ChevronsDown className="w-4 h-4" />
                ) : (
                  <ChevronsRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Código */}
          <div className={`w-20 text-sm font-mono ${isMainAccount ? 'text-primary text-glow' : 'text-accent'}`}>
            {nodeCode}
          </div>
          
          {/* Cuenta */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${isMainAccount ? 'text-text-primary' : 'text-text-secondary'}`}>
              {node['CUENTA']}
              {wasRecentlyUpdated && (
                <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-mono animate-pulse">
                  AUTO-ACTUALIZADA
                </span>
              )}
            </div>
            {account?.clasificacionActual && (
              <div className="text-xs text-text-dim font-mono">
                Sistema: {account.clasificacionActual}
              </div>
            )}
            {/* Mostrar info de IA para cuentas MIX */}
            {currentClassification === 'MIX' && intelligentSuggestions[`${nodeCode}-${node['CUENTA']}`] && (
              <div className="text-xs mt-1 flex items-center gap-2">
                <Settings className="w-3 h-3 text-primary" />
                <span className="text-primary">
                  IA: {intelligentSuggestions[`${nodeCode}-${node['CUENTA']}`].confidence >= 0.7 ? 
                    `${(intelligentSuggestions[`${nodeCode}-${node['CUENTA']}`].fixedPercentage * 100).toFixed(0)}% Fijo / ${(intelligentSuggestions[`${nodeCode}-${node['CUENTA']}`].variablePercentage * 100).toFixed(0)}% Variable` :
                    'Análisis pendiente'
                  }
                  {intelligentSuggestions[`${nodeCode}-${node['CUENTA']}`].confidence < 0.7 && (
                    <span className="text-warning ml-1">(Baja confianza - se tratará como CFT)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Valor */}
          <div className="w-32 text-right">
            <div className={`font-mono ${isMainAccount ? 'text-primary font-bold' : 'text-text-secondary'}`}>
              {formatCurrency(nodeTotal)}
            </div>
          </div>

          {/* Classification selector */}
          <div className="w-48">
            <select
              value={currentClassification}
              onChange={(e) => handleClassificationChange(nodeCode, e.target.value as BreakEvenClassification)}
              className={`w-full p-2 rounded-lg border font-mono text-sm transition-all ${getClassificationColor(currentClassification)}`}
            >
              {getValidOptions(nodeCode).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Render children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {children.map(child => 
                renderNode(child['COD.'] || '', depth + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!data) return null;

  return (
    <>
      {/* Botón para abrir el panel */}
      <button
        onClick={() => setIsOpen(true)}
        className="cyber-button px-4 py-2 text-sm font-display group flex items-center"
      >
        <Settings className="w-4 h-4 mr-2 group-hover:animate-spin" />
        Configurar Cuentas
      </button>

      {/* Panel modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="hologram-card w-full max-w-7xl h-[95vh] flex flex-col relative overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display text-primary neon-text flex items-center">
                      <Tag className="w-6 h-6 mr-3" />
                      Clasificación de Cuentas - Punto de Equilibrio
                    </h2>
                    <p className="text-text-muted font-mono mt-2">
                      Asigna cada cuenta a su categoría correspondiente para cálculos precisos
                    </p>
                    {cascadeNotification && (
                      <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                        <p className="text-accent font-mono text-sm animate-pulse">
                          {cascadeNotification}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={runIntelligentClassification}
                      disabled={hasRunAIClassificationRef.current}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 text-sm font-display ${
                        hasRunAIClassificationRef.current 
                          ? 'border-gray-500 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
                      }`}
                      title={hasRunAIClassificationRef.current ? "Ya se ejecutó el clasificador IA. Use Reset para volver a clasificar." : "Ejecutar clasificador inteligente con IA"}
                    >
                      <Settings className="w-4 h-4" />
                      {hasRunAIClassificationRef.current ? '✅ IA Ejecutada' : '🧠 Clasificador IA'}
                    </button>
                    <button
                      onClick={resetClassifications}
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-text-primary"
                      title="Resetear todas las clasificaciones"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-text-primary"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                  <div className="glass-card p-4 rounded-lg border border-danger/30">
                    <div className="text-sm text-text-muted font-mono">CFT - Costos Fijos</div>
                    <div className="text-xl font-mono text-danger">{formatCurrency(stats.CFT)}</div>
                  </div>
                  <div className="glass-card p-4 rounded-lg border border-warning/30">
                    <div className="text-sm text-text-muted font-mono">CVU - Costos Variables</div>
                    <div className="text-xl font-mono text-warning">{formatCurrency(stats.CVU)}</div>
                  </div>
                  <div className="glass-card p-4 rounded-lg border border-accent/30">
                    <div className="text-sm text-text-muted font-mono">PVU - Precio Venta</div>
                    <div className="text-xl font-mono text-accent">{formatCurrency(stats.PVU)}</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Search and controls */}
              <div className="p-6 border-b border-border">
                <div className="space-y-4">
                  {/* Prominent Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5" />
                    <input
                      type="text"
                      placeholder="🔍 Buscar cuenta o código... (ej: '5.1', 'sueldos', 'arriendo')"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 glass-card border-2 border-primary/30 rounded-xl text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary font-mono text-lg placeholder:text-text-dim shadow-glow-sm"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded({ '4': true, '5': true, '5.1': true, '5.2': true, '5.3': true })}
                      className="text-xs px-2 py-1 glass-card border border-border rounded hover:bg-glass transition-colors text-accent hover:text-primary font-mono"
                    >
                      Expandir Todo
                    </button>
                    <button
                      onClick={() => setExpanded({ '4': false, '5': false, '5.1': false, '5.2': false, '5.3': false })}
                      className="text-xs px-2 py-1 glass-card border border-border rounded hover:bg-glass transition-colors text-accent hover:text-primary font-mono"
                    >
                      Colapsar Todo
                    </button>
                  </div>

                  {/* Search Results Count */}
                  {searchTerm && (
                    <div className="text-sm text-accent font-mono">
                      {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Sugerencias del Clasificador IA */}
              {showAISuggestions && Object.keys(intelligentSuggestions).length > 0 && (
                <div className="p-6 border-b border-border bg-accent/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-accent" />
                      <h3 className="text-lg font-display text-accent">🧠 Sugerencias del Clasificador IA</h3>
                    </div>
                    <button
                      onClick={() => setShowAISuggestions(false)}
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Resumen ejecutivo en lugar de lista detallada */}
                  <div className="space-y-4">
                    {/* Resumen de aplicaciones */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 glass-card rounded-lg border border-success/30">
                        <div className="text-center">
                          <div className="text-2xl font-mono text-success">
                            {Object.entries(intelligentSuggestions).filter(([key, result]) => {
                              if (result.confidence >= 0.85) {
                                // Extraer código correctamente
                                const matchingAccount = accounts.find(acc => 
                                  `${acc.codigo}-${acc.cuenta}` === key
                                );
                                if (matchingAccount) {
                                  return classifications[matchingAccount.codigo] === mapToPEClassification(result.suggested);
                                }
                              }
                              return false;
                            }).length}
                          </div>
                          <div className="text-xs text-text-dim uppercase">Alta Confianza Aplicadas</div>
                          <div className="text-xs text-success mt-1">Automáticamente por IA</div>
                        </div>
                      </div>
                      
                      <div className="p-4 glass-card rounded-lg border border-warning/30">
                        <div className="text-center">
                          <div className="text-2xl font-mono text-warning">
                            {Object.entries(intelligentSuggestions).filter(([code, result]) => 
                              result.confidence >= 0.60 && result.confidence < 0.85
                            ).length}
                          </div>
                          <div className="text-xs text-text-dim uppercase">Media Confianza</div>
                          <div className="text-xs text-warning mt-1">Revisión manual</div>
                        </div>
                      </div>
                      
                      <div className="p-4 glass-card rounded-lg border border-info/30">
                        <div className="text-center">
                          <div className="text-2xl font-mono text-info">
                            {Object.entries(intelligentSuggestions).filter(([code, result]) => 
                              result.mixedCostBreakdown
                            ).length}
                          </div>
                          <div className="text-xs text-text-dim uppercase">Costos Mixtos</div>
                          <div className="text-xs text-info mt-1">Análisis disponible</div>
                        </div>
                      </div>
                    </div>

                    {/* Nota informativa */}
                    <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                      <div className="flex items-center gap-2 text-accent text-sm">
                        <Settings className="w-4 h-4" />
                        <span className="font-display">Estado IA:</span>
                        <span className="text-text-muted">
                          {Object.entries(intelligentSuggestions).filter(([_, r]) => r.confidence >= 0.85).length} clasificaciones aplicadas automáticamente. 
                          Los costos mixtos analizan {Object.entries(intelligentSuggestions).filter(([_, r]) => r.mixedCostBreakdown).length} cuentas adicionales.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-text-dim text-center mt-3 p-2 bg-info/10 rounded border border-info/20">
                    📊 <strong>Total:</strong> {Object.keys(intelligentSuggestions).length} cuentas analizadas | 
                    <strong className="text-success"> {Object.entries(intelligentSuggestions).filter(([_, r]) => r.confidence >= 0.85).length} alta confianza</strong> | 
                    <strong className="text-warning"> {Object.entries(intelligentSuggestions).filter(([_, r]) => r.confidence >= 0.60 && r.confidence < 0.85).length} media confianza</strong> |
                    <strong className="text-danger"> {Object.entries(intelligentSuggestions).filter(([_, r]) => r.confidence < 0.60).length} baja confianza</strong>
                  </div>

                  {/* Explicación del algoritmo */}
                  <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
                    <h4 className="text-sm font-display text-accent mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      🤖 Cómo Funciona el Algoritmo IA
                    </h4>
                    <div className="text-xs text-text-muted space-y-2">
                      <div>
                        <strong className="text-accent">1. Auto-Aplicación (≥85% confianza):</strong>
                        <div className="ml-3">• Clasificaciones con evidencia muy fuerte se aplican automáticamente</div>
                        <div className="ml-3">• Ej: &quot;Depreciación&quot; siempre será Fijo (CFT)</div>
                      </div>
                      <div>
                        <strong className="text-warning">2. Revisión Manual (60-84% confianza):</strong>
                        <div className="ml-3">• Sugerencias que requieren tu confirmación</div>
                        <div className="ml-3">• Usa botón &quot;Aplicar&quot; para cada cuenta</div>
                      </div>
                      <div>
                        <strong className="text-danger">3. Baja Confianza (&lt;60%):</strong>
                        <div className="ml-3">• No se muestran por defecto</div>
                        <div className="ml-3">• Requieren análisis manual completo</div>
                      </div>
                      <div className="pt-2 border-t border-accent/20">
                        <strong className="text-info">Motores del Algoritmo:</strong>
                        <div className="ml-3">• <strong>Semántico (40%):</strong> Analiza el nombre de la cuenta</div>
                        <div className="ml-3">• <strong>Comportamental (40%):</strong> Correlación con ventas y volatilidad</div>
                        <div className="ml-3">• <strong>Estructural (20%):</strong> Código contable y jerarquía</div>
                        <div className="ml-3">• <strong>Costos Mixtos:</strong> Desglose automático fijo/variable usando regresión, alto-bajo y correlación</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Accounts tree or search results */}
              <div className="flex-1 overflow-auto">
                {searchTerm ? (
                  /* Search Results */
                  <div className="p-6">
                    <div className="space-y-2">
                      {searchResults.map((account) => {
                        const wasRecentlyUpdated = recentlyUpdated.has(account.codigo);
                        return (
                        <motion.div
                          key={account.codigo}
                          className={`flex items-center gap-4 p-4 glass-card rounded-lg border border-border hover:border-primary/30 transition-all group ${
                            wasRecentlyUpdated 
                              ? 'ring-2 ring-accent/50 bg-accent/10 animate-pulse' 
                              : ''
                          }`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {/* Código */}
                          <div className="w-20 text-sm font-mono text-primary text-glow">
                            {account.codigo}
                          </div>
                          
                          {/* Cuenta */}
                          <div className="flex-1 min-w-0">
                            <div className="text-text-secondary font-medium truncate">
                              {account.cuenta}
                              {wasRecentlyUpdated && (
                                <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-mono animate-pulse">
                                  AUTO-ACTUALIZADA
                                </span>
                              )}
                            </div>
                            {account.clasificacionActual && (
                              <div className="text-xs text-text-dim font-mono">
                                Sistema: {account.clasificacionActual}
                              </div>
                            )}
                            {/* Mostrar info de IA para cuentas MIX */}
                            {account.clasificacionPuntoEquilibrio === 'MIX' && intelligentSuggestions[`${account.codigo}-${account.cuenta}`] && (
                              <div className="text-xs mt-1 flex items-center gap-2">
                                <Settings className="w-3 h-3 text-primary" />
                                <span className="text-primary">
                                  IA: {intelligentSuggestions[`${account.codigo}-${account.cuenta}`].confidence >= 0.7 ? 
                                    `${(intelligentSuggestions[`${account.codigo}-${account.cuenta}`].fixedPercentage * 100).toFixed(0)}% Fijo / ${(intelligentSuggestions[`${account.codigo}-${account.cuenta}`].variablePercentage * 100).toFixed(0)}% Variable` :
                                    'Análisis pendiente'
                                  }
                                  {intelligentSuggestions[`${account.codigo}-${account.cuenta}`].confidence < 0.7 && (
                                    <span className="text-warning ml-1">(Baja confianza - se tratará como CFT)</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Valor */}
                          <div className="w-32 text-right">
                            <div className="text-text-secondary font-mono">
                              {formatCurrency(account.valorAnual)}
                            </div>
                          </div>

                          {/* Classification selector */}
                          <div className="w-48">
                            <select
                              value={account.clasificacionPuntoEquilibrio}
                              onChange={(e) => handleClassificationChange(account.codigo, e.target.value as BreakEvenClassification)}
                              className={`w-full p-2 rounded-lg border font-mono text-sm transition-all ${getClassificationColor(account.clasificacionPuntoEquilibrio)}`}
                            >
                              {getValidOptions(account.codigo).map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Tree View */
                  <div className="space-y-1">
                    {rootAccounts.map(rootAccount => 
                      renderNode(rootAccount['COD.'] || '', 0)
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text-muted font-mono">
                    {searchTerm 
                      ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} • ${accounts.length} total`
                      : `${accounts.length} cuentas • ${rootAccounts.length} categorías principales`
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 glass-card border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors font-mono"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveClassifications}
                      className="cyber-button px-6 py-2 flex items-center gap-2 font-display"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccountClassificationPanel;