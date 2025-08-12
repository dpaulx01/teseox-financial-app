import React, { useState, useEffect, useMemo } from 'react';
import { useFinancialData } from '../../contexts/DataContext';
import { useScenario } from '../../contexts/ScenarioContext';
import { EditableCell } from './EditableCell';
import { FinancialData, MonthlyData } from '../../types';
import { Save, RefreshCw, Calculator, AlertTriangle, TrendingUp, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { getSortedMonths } from '../../utils/dateUtils';
import ProjectionEngine from '../../utils/projectionEngine';
import { formatCurrency } from '../../utils/formatters';
import { RawDataRow } from '../../types';
import { parseNumericValue } from '../../utils/formatters';
import { calculatePnl } from '../../utils/pnlCalculator';

type AnalysisType = 'contable' | 'operativo' | 'caja';


interface PygRow {
  code: string;
  name: string;
  level: number;
  isParent: boolean;
  isCalculated?: boolean;
  children?: string[];
  formula?: (data: MonthlyData, month?: string, getValueFn?: (code: string) => number) => number;
}

const EditablePygMatrixV2: React.FC = () => {
  // IMPORTANTE: Este componente es para BALANCE INTERNO, debe usar datos del escenario/simulación
  const { scenarioData, isSimulationMode } = useScenario();
  const { data: realFinancialData } = useFinancialData();
  
  // Usar datos del escenario si está en modo simulación, sino usar datos reales
  const financialData = isSimulationMode && scenarioData ? scenarioData : realFinancialData;

  const [enhancedData, setEnhancedData] = useState<FinancialData | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('contable');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // DEBUG: Verificar qué datos estamos recibiendo
  useEffect(() => {
    console.log('🔵 CONTEXT DEBUG - Balance Interno data:', {
      isSimulationMode,
      usingScenarioData: isSimulationMode && !!scenarioData,
      hasData: !!financialData,
      hasMonthly: !!financialData?.monthly,
      hasRaw: !!financialData?.raw,
      rawLength: financialData?.raw?.length || 0,
      monthlyKeys: financialData?.monthly ? Object.keys(financialData.monthly) : [],
      firstRawData: financialData?.raw?.[0],
      sampleMonthlyData: financialData?.monthly ? Object.entries(financialData.monthly)[0] : null
    });
  }, [financialData, isSimulationMode, scenarioData]);

  // ProjectionEngine: completar año con proyecciones DESPUÉS de procesar datos base
  useEffect(() => {
    if (financialData && financialData.monthly && !enhancedData) {
      console.log('🧠 Ejecutando ProjectionEngine para completar año 2025...');
      const completed = ProjectionEngine.completeYear(financialData, 2025);
      setEnhancedData(completed);
    }
  }, [financialData, enhancedData]);

  const workingData = enhancedData || financialData;

  // Estructura jerárquica del PyG - BASADA EN CSV REAL
  const pygStructure: PygRow[] = [
    // INGRESOS - Estructura real del CSV
    { code: '4', name: 'Ingresos', level: 0, isParent: true, children: ['4.1', '4.2', '4.3'] },
    { code: '4.1', name: '  Ingresos de Actividades Ordinarias', level: 1, isParent: true, children: ['4.1.1', '4.1.2', '4.1.4'] },
    { code: '4.1.1', name: '    Venta de Bienes', level: 2, isParent: true, children: ['4.1.1.1', '4.1.1.2'] },
    { code: '4.1.1.1', name: '      Venta de Producto Terminado', level: 3, isParent: false },
    { code: '4.1.1.2', name: '      Venta de Mercadería', level: 3, isParent: false },
    { code: '4.1.2', name: '    Prestación de Servicios', level: 2, isParent: false },
    { code: '4.1.4', name: '    Rebaja y/o Descuentos sobre Ventas', level: 2, isParent: false },
    { code: '4.2', name: '  Otros Ingresos de Actividades Ordinarias', level: 1, isParent: true, children: ['4.2.1', '4.2.7'] },
    { code: '4.2.1', name: '    Servicio Logístico', level: 2, isParent: false },
    { code: '4.2.7', name: '    Descuentos en Compras', level: 2, isParent: false },
    { code: '4.3', name: '  Otros Ingresos Financieros', level: 1, isParent: true, children: ['4.3.2'] },
    { code: '4.3.2', name: '    Intereses Financieros', level: 2, isParent: false },
    
    // COSTOS Y GASTOS - Estructura real del CSV
    { code: '5', name: 'Costos y Gastos', level: 0, isParent: true, children: ['5.1', '5.2'] },
    { code: '5.1', name: '  Costos de Venta y Producción', level: 1, isParent: true, children: ['5.1.1', '5.1.2', '5.1.3', '5.1.4'] },
    { code: '5.1.1', name: '    Materiales Utilizados o Productos Vendidos', level: 2, isParent: true, children: ['5.1.1.6', '5.1.1.7', '5.1.1.8'] },
    { code: '5.1.1.6', name: '      Productos Terminados C', level: 3, isParent: false },
    { code: '5.1.1.7', name: '      Costo Mercadería', level: 3, isParent: false },
    { code: '5.1.1.8', name: '      Desperdicios, Mermas, Desecho', level: 3, isParent: false },
    { code: '5.1.2', name: '    Mano de Obra Directa', level: 2, isParent: true, children: ['5.1.2.1', '5.1.2.2', '5.1.2.3', '5.1.2.4', '5.1.2.5', '5.1.2.6', '5.1.2.7', '5.1.2.8', '5.1.2.11'] },
    { code: '5.1.2.1', name: '      Sueldos Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.2', name: '      Sobretiempos Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.3', name: '      Décimo Tercer Sueldo Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.4', name: '      Decimo Cuarto Sueldo Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.5', name: '      Vacaciones Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.6', name: '      Aportes Patronales al I.E.S.S. Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.7', name: '      Secap - Iece Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.8', name: '      Fondos de Reserva Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.2.11', name: '      Bonificaciones Mano de Obra Directa', level: 3, isParent: false },
    { code: '5.1.3', name: '    Mano de Obra Indirecta', level: 2, isParent: false },
    { code: '5.1.4', name: '    Costos Indirectos de Fabricación', level: 2, isParent: true, children: ['5.1.4.1'] }, // Solo muestro algunos para brevedad
    { code: '5.1.4.1', name: '      Depreciación Propiedades, Plantas y Equipos', level: 3, isParent: false },
    
    { code: '5.2', name: '  Gastos', level: 1, isParent: true, children: ['5.2.1', '5.2.2', '5.2.3'] },
    { code: '5.2.1', name: '    Gastos de Actividades Ordinarias', level: 2, isParent: true, children: ['5.2.1.1', '5.2.1.2', '5.2.1.3'] },
    { code: '5.2.1.1', name: '      Ventas', level: 3, isParent: false },
    { code: '5.2.1.2', name: '      Administrativos', level: 3, isParent: false },
    { code: '5.2.1.3', name: '      Gastos Financieros', level: 3, isParent: false },
    { code: '5.2.2', name: '    Gastos No Operacionales', level: 2, isParent: false },
    { code: '5.2.3', name: '    Gastos de Operaciones Descontinuadas', level: 2, isParent: false },
    
    // MÉTRICAS CALCULADAS
    { 
      code: 'UB', 
      name: '= UTILIDAD BRUTA', 
      level: 0, 
      isParent: false, 
      isCalculated: true,
      formula: (data: MonthlyData, month?: string, getValueFn?: (code: string) => number) => {
        if (!getValueFn) return 0;
        const ingresos = getValueFn('4');
        const costos = getValueFn('5.1');
        return ingresos - costos;
      }
    },
    { 
      code: 'UO', 
      name: '= UTILIDAD OPERATIVA (EBIT)', 
      level: 0, 
      isParent: false, 
      isCalculated: true,
      formula: (data: MonthlyData, month?: string, getValueFn?: (code: string) => number) => {
        if (!getValueFn) return 0;
        const ingresos = getValueFn('4');
        const totalCostos = getValueFn('5');
        return ingresos - totalCostos;
      }
    },
    { 
      code: 'EBITDA', 
      name: '= EBITDA', 
      level: 0, 
      isParent: false, 
      isCalculated: true,
      formula: (data: MonthlyData, month?: string, getValueFn?: (code: string) => number) => {
        if (!getValueFn) return 0;
        const ingresos = getValueFn('4');
        const totalCostos = getValueFn('5');
        const depreciacion = getValueFn('5.1.4.1');
        const utilidadOperativa = ingresos - totalCostos;
        return utilidadOperativa + depreciacion; // + depreciación
      }
    }
  ];

  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const shouldShowRow = (row: PygRow): boolean => {
    // Siempre mostrar filas de nivel 0 y calculadas
    if (row.level === 0 || row.isCalculated) return true;
    
    // Para otros niveles, verificar si el padre está expandido
    const parentCode = getParentCode(row.code);
    if (!parentCode) return true;
    
    return expandedNodes[parentCode] === true;
  };

  const getParentCode = (code: string): string | null => {
    const parts = code.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  };


  const isExcludedInAnalysis = (row: PygRow): boolean => {
    if (analysisType === 'contable') return false;
    
    // Para análisis operativo (EBIT): excluir intereses e impuestos
    if (analysisType === 'operativo') {
      return row.name.toLowerCase().includes('interes') || 
             row.name.toLowerCase().includes('impuesto');
    }
    
    // Para análisis de caja (EBITDA): excluir depreciación, intereses e impuestos
    if (analysisType === 'caja') {
      return row.name.toLowerCase().includes('depreci') || 
             row.name.toLowerCase().includes('amortiz') ||
             row.name.toLowerCase().includes('interes') || 
             row.name.toLowerCase().includes('impuesto');
    }
    
    return false;
  };

  // Usar la misma lógica que el PyG principal - desde pnlCalculator
  const [pygTreeData, setPygTreeData] = useState<any[]>([]);
  
  // Obtener meses disponibles de forma segura
  const availableMonths = useMemo(() => {
    return workingData?.monthly ? getSortedMonths(workingData.monthly) : [];
  }, [workingData]);
  
  // CALCULAR PyG SOLO DESPUÉS de que ProjectionEngine complete los datos
  useEffect(() => {
    const calculatePygData = async () => {
      if (!workingData || !availableMonths.length) {
        console.log('🔍 DEBUG: Missing data', { hasWorkingData: !!workingData, monthsLength: availableMonths.length });
        return;
      }
      
      // ESPERAR a que ProjectionEngine termine (solo si hay enhancedData o no hay financialData.monthly)
      if (financialData?.monthly && !enhancedData) {
        console.log('⏳ Esperando ProjectionEngine...');
        return;
      }
      
      try {
        // USAR LA MISMA LÓGICA QUE PygContainer.tsx
        const availableKeys = Object.keys(workingData.monthly);
        
        // Función para convertir período al formato correcto (copiada de PygContainer)
        const convertPeriodForCalculation = (periodo: string): string => {
          const monthsMap: Record<string, string> = {
            '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
            '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
            '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
          };
          
          // Si el período está en formato YYYY-MM, convertir al formato que usa financialData
          if (periodo.includes('-')) {
            const [year, month] = periodo.split('-');
            const monthName = monthsMap[month];
            if (monthName && workingData.monthly[monthName]) {
              return monthName;
            }
          }
          
          return periodo; // Devolver tal como está si no necesita conversión
        };
        
        // Usar el primer mes disponible o convertir correctamente
        let periodForCalculation = availableKeys.length > 0 ? availableKeys[0] : null;
        
        // Si availableMonths tiene un formato específico, intentar conversión
        if (availableMonths.length > 0) {
          const firstAvailableMonth = availableMonths[0];
          const converted = convertPeriodForCalculation(firstAvailableMonth);
          if (workingData.monthly[converted]) {
            periodForCalculation = converted;
          }
        }
        
        
        // Validar que encontramos un período válido
        if (!periodForCalculation) {
          console.error('❌ No se pudo encontrar ningún período válido para calcular PyG');
          return;
        }
        
        // DEBUG CRÍTICO: Ver qué datos exactos estamos pasando
        console.log('🔴 CRITICAL DEBUG: Data being passed to calculatePnl:', {
          availableMonths,
          periodForCalculation,
          hasMonthlyData: !!workingData.monthly[periodForCalculation],
          monthlyKeys: Object.keys(workingData.monthly || {}),
          selectedMonth: workingData.monthly[periodForCalculation] ? 'FOUND' : 'NOT FOUND',
          rawDataCount: workingData.raw ? workingData.raw.length : 0,
          monthlyDataSample: workingData.monthly[periodForCalculation] || 'NO DATA',
          allMonthlyData: workingData.monthly,
          firstRawRecord: workingData.raw && workingData.raw.length > 0 ? workingData.raw[0] : 'NO RAW DATA',
          rawKeysFirstRecord: workingData.raw && workingData.raw.length > 0 ? Object.keys(workingData.raw[0]) : 'NO KEYS'
        });
        
        // VERIFICACIÓN ADICIONAL: Asegurar que periodForCalculation tenga datos
        if (!workingData.monthly[periodForCalculation]) {
          console.error('❌ CRITICAL ERROR: periodForCalculation no existe en monthly data');
          console.error('Available monthly keys:', Object.keys(workingData.monthly));
          console.error('Trying to access:', periodForCalculation);
          return;
        }
        
        // USAR EXACTAMENTE LA MISMA LLAMADA QUE PygContainer.tsx
        // CRITICAL FIX: Usar periodForCalculation que ya existe en monthly
        const result = await calculatePnl(
          workingData,
          periodForCalculation, // FIXED: Usar el período que sabemos que existe
          'contable',
          undefined, // mixedCosts como PygContainer
          1 // company_id por defecto como PygContainer
        );
        
        console.log('🔍 DEBUG: PyG calculation result:', {
          treeDataLength: result.treeData.length,
          summaryKpis: result.summaryKpis,
          treeDataDetailed: result.treeData.map(node => ({
            code: node.code,
            name: node.name,
            value: node.value,
            childrenCount: node.children.length
          }))
        });
        
        // SUPER DEBUG: Verificar si hay valores en raw para código 4
        if (workingData.raw) {
          const ingresosData = workingData.raw.filter(r => r['COD.']?.toString().startsWith('4'));
          console.log('🔴 SUPER DEBUG - Ingresos raw data:', {
            count: ingresosData.length,
            samples: ingresosData.slice(0, 3).map(r => ({
              code: r['COD.'],
              cuenta: r['CUENTA'],
              valueInPeriod: r[periodForCalculation],
              allValues: Object.entries(r).filter(([k, v]) => k !== 'COD.' && k !== 'CUENTA').map(([k, v]) => ({ month: k, value: v }))
            }))
          });
          
          // ULTRA DEBUG: Ver EXACTAMENTE qué hay en el primer registro
          if (workingData.raw.length > 0) {
            console.log('🔥 ULTRA DEBUG - First raw record COMPLETE:', workingData.raw[0]);
            console.log('🔥 ULTRA DEBUG - All keys in first record:', Object.keys(workingData.raw[0]));
            console.log('🔥 ULTRA DEBUG - Looking for period:', periodForCalculation);
            console.log('🔥 ULTRA DEBUG - Value for enero:', workingData.raw[0]['enero']);
            console.log('🔥 ULTRA DEBUG - Value for Enero:', workingData.raw[0]['Enero']);
            console.log('🔥 ULTRA DEBUG - Type of raw data:', typeof workingData.raw);
            console.log('🔥 ULTRA DEBUG - Is array?:', Array.isArray(workingData.raw));
          }
        }
        
        // SIMPLIFICAR: Usar exactamente el mismo call que PygContainer exitoso
        console.log('✅ BALANCE INTERNO: Calling calculatePnl with period:', periodForCalculation);
        
        setPygTreeData(result.treeData);
      } catch (error) {
        console.error('⚠️ Error calculating PyG:', error);
      }
    };
    
    calculatePygData();
  }, [workingData, availableMonths, enhancedData]);
  
  // Cache para búsquedas en el árbol (evitar logs excesivos)
  const nodeCache = useMemo(() => {
    const cache = new Map<string, any>();
    
    const cacheNodes = (nodes: any[]) => {
      nodes.forEach(node => {
        cache.set(node.code, node);
        if (node.children && node.children.length > 0) {
          cacheNodes(node.children);
        }
      });
    };
    
    if (pygTreeData.length > 0) {
      cacheNodes(pygTreeData);
    }
    
    return cache;
  }, [pygTreeData]);
  
  // Obtener valor de cuenta desde los datos calculados del PyG
  const getAccountValueForRow = (code: string, monthData: MonthlyData, month: string): number => {
    // Buscar en cache primero
    const node = nodeCache.get(code);
    if (node) {
      console.log(`🔍 DEBUG: Found node ${code}:`, { value: node.value, name: node.name });
      return node.value || 0;
    }
    
    console.log(`🔍 DEBUG: Node ${code} NOT FOUND in cache. Available codes:`, Array.from(nodeCache.keys()));
    return 0;
  };

  const handleSave = async (month: string, row: PygRow, newValue: number) => {
    if (!workingData || row.isCalculated) return;

    try {
      const updatedData: FinancialData = JSON.parse(JSON.stringify(workingData));
      
      // Actualizar valor en raw data si existe
      if (updatedData.raw) {
        const rawRowIndex = updatedData.raw.findIndex(r => r['COD.'] === row.code);
        if (rawRowIndex >= 0) {
          updatedData.raw[rawRowIndex] = {
            ...updatedData.raw[rawRowIndex],
            [month]: newValue
          };
        }
      }

      // Recalcular métricas derivadas
      if (updatedData.monthly[month]) {
        updatedData.monthly[month] = ProjectionEngine.recalculateMetrics(updatedData.monthly[month]);
      }

      setEnhancedData(updatedData);
    } catch (error) {
      console.error('Error saving matrix cell:', error);
      throw error;
    }
  };

  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workingData || !workingData.monthly) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No hay datos de escenario
        </h3>
        <div className="text-xs text-text-muted mt-4">
          Debug: hasWorkingData: {!!workingData ? 'Sí' : 'No'}, 
          hasMonthly: {!!workingData?.monthly ? 'Sí' : 'No'},
          hasRaw: {!!workingData?.raw ? 'Sí' : 'No'}
        </div>
      </div>
    );
  }

  const months = availableMonths;

  return (
    <div className="space-y-6">
      {/* Header con tipo de análisis */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-primary flex items-center space-x-3">
              <Calculator className="w-8 h-8" />
              <span>Estado de Resultados - Matriz Editable</span>
            </h2>
            <p className="text-text-secondary mt-2">
              Balance Interno - Análisis {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Selector de tipo de análisis */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-text-secondary">Perspectiva:</label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
                className="bg-dark-surface border border-border/30 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="contable">P.E. Contable - Estándar</option>
                <option value="operativo">P.E. Operativo - EBIT</option>
                <option value="caja">P.E. de Caja - EBITDA</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Descripción del tipo de análisis */}
      <div className="glass-card p-4 bg-primary/10 border border-primary/30">
        <div className="text-sm text-primary">
          {analysisType === 'contable' && (
            <>
              <strong>Análisis Contable:</strong> Incluye todos los gastos según principios contables.
              Muestra la utilidad neta considerando depreciación, intereses e impuestos.
            </>
          )}
          {analysisType === 'operativo' && (
            <>
              <strong>Análisis Operativo (EBIT):</strong> Excluye gastos financieros e impuestos.
              Muestra la capacidad operativa del negocio sin efectos de financiamiento.
            </>
          )}
          {analysisType === 'caja' && (
            <>
              <strong>Análisis de Caja (EBITDA):</strong> Excluye gastos no monetarios.
              Muestra la generación de efectivo operativo antes de inversiones.
            </>
          )}
        </div>
      </div>

      {/* Matriz editable jerárquica */}
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-muted uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-80">Cuenta</th>
              {months.map(month => (
                <th key={month} className="px-4 py-3 text-right font-medium min-w-32">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {pygStructure.filter(shouldShowRow).map(row => {
              const isExcluded = isExcludedInAnalysis(row);
              
              return (
                <tr 
                  key={row.code} 
                  className={`hover:bg-glass/50 transition-colors group ${
                    row.isCalculated ? 'bg-primary/5 font-semibold' : ''
                  } ${isExcluded ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div 
                      className="flex items-center"
                      style={{ paddingLeft: `${row.level * 24}px` }}
                    >
                      {row.isParent && (
                        <button
                          onClick={() => toggleNode(row.code)}
                          className="mr-2 text-text-muted hover:text-white"
                        >
                          {expandedNodes[row.code] === false ? 
                            <ChevronRight className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                          }
                        </button>
                      )}
                      <span className={`
                        ${row.level === 0 ? 'font-bold text-white' : ''}
                        ${row.isCalculated ? 'text-primary font-bold' : ''}
                        ${isExcluded ? 'line-through' : ''}
                      `}>
                        {row.code} - {row.name}
                      </span>
                    </div>
                  </td>
                  {months.map(month => {
                    const monthData = workingData.monthly[month];
                    const value = row.formula ? 
                      row.formula(monthData, month, (code) => getAccountValueForRow(code, monthData, month)) : 
                      getAccountValueForRow(row.code, monthData, month);
                    
                    if (row.isCalculated || isExcluded) {
                      return (
                        <td key={`${month}-${row.code}`} className="px-4 py-3 text-right">
                          <span className={`
                            ${row.isCalculated ? 'text-primary font-semibold' : ''}
                            ${isExcluded ? 'line-through text-text-muted' : ''}
                          `}>
                            {formatCurrency(value)}
                          </span>
                        </td>
                      );
                    }
                    
                    return (
                      <td key={`${month}-${row.code}`} className="px-2 py-2">
                        <EditableCell
                          initialValue={value}
                          onSave={(newValue) => handleSave(month, row, newValue)}
                          isReadOnly={row.isParent}
                          className={`group-hover:bg-glass/30 ${
                            row.isParent ? 'bg-primary/5' : ''
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer explicativo */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center border-r border-border/30">
            <h4 className="font-semibold text-primary mb-2">Jerarquía de Cuentas</h4>
            <p className="text-text-muted text-xs">
              Las cuentas siguen la estructura contable estándar.
              Clic en ▶ para expandir/contraer subcuentas.
            </p>
          </div>
          <div className="text-center border-r border-border/30">
            <h4 className="font-semibold text-primary mb-2">Edición Inteligente</h4>
            <p className="text-text-muted text-xs">
              Solo las cuentas hoja son editables.
              Los totales se recalculan automáticamente.
            </p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-primary mb-2">Análisis Múltiple</h4>
            <p className="text-text-muted text-xs">
              Cambia entre perspectivas para ver diferentes métricas.
              Los valores excluidos aparecen tachados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditablePygMatrixV2;