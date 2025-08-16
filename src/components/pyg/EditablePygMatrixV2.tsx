import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  // Eliminado analysisType - Las 3 utilidades se muestran en las últimas filas
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
    
    // ELIMINADO: Las 3 utilidades se calculan y muestran al final con utilityCalculations
    // Ya no necesitamos estas filas duplicadas en la estructura principal
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


  // USAR EXACTAMENTE LA MISMA LÓGICA QUE PygContainer.tsx
  const calculateUtilities = useCallback(async (data: FinancialData, months: string[]) => {
    const calculations = { 
      'Utilidad Bruta (UB)': {}, 
      'Utilidad Neta (UN)': {}, 
      'EBITDA': {} 
    };
    
    for (const month of months) {
      try {
        // CRÍTICO: calculatePnl espera el mes en MINÚSCULAS porque workingData.monthly usa minúsculas
        // Los logs muestran: workingData.monthly tiene ['enero', 'febrero', 'marzo', ...]
        // NO capitalizar aquí!
        const monthForCalculation = month.toLowerCase();
        
        console.log(`🔍 BALANCE INTERNO - Calculando utilidades para ${month} (usando: ${monthForCalculation})`);
        
        // 1. UB = Utilidad Bruta/Contable (sin exclusiones) - EXACTO como PyG
        const ubResult = await calculatePnl(data, monthForCalculation, 'contable', undefined, 1);
        calculations['Utilidad Bruta (UB)'][month] = ubResult.summaryKpis?.utilidad || 0;
        
        // 2. UN = Utilidad Neta/EBIT (excluye intereses) - EXACTO como PyG  
        const unResult = await calculatePnl(data, monthForCalculation, 'operativo', undefined, 1);
        calculations['Utilidad Neta (UN)'][month] = unResult.summaryKpis?.utilidad || 0;
        
        // 3. EBITDA (excluye depreciación e intereses) - EXACTO como PyG
        const ebitdaResult = await calculatePnl(data, monthForCalculation, 'caja', undefined, 1);
        calculations['EBITDA'][month] = ebitdaResult.summaryKpis?.utilidad || 0;
        
        console.log(`💰 BALANCE INTERNO UTILIDADES ${month}:`, {
          ub: calculations['Utilidad Bruta (UB)'][month],
          un: calculations['Utilidad Neta (UN)'][month], 
          ebitda: calculations['EBITDA'][month],
          inputMonth: monthForCalculation
        });
        
      } catch (error) {
        console.error(`Error calculando utilidades para ${month}:`, error);
        calculations['Utilidad Bruta (UB)'][month] = 0;
        calculations['Utilidad Neta (UN)'][month] = 0;
        calculations['EBITDA'][month] = 0;
      }
    }
    
    setUtilityCalculations(calculations);
  }, []);

  // PyG Tree Data (matriz principal) + 3 utilidades simples
  const [pygTreeData, setPygTreeData] = useState<any[]>([]);
  const [utilityCalculations, setUtilityCalculations] = useState<Record<string, Record<string, number>>>({
    'Utilidad Bruta (UB)': {},
    'Utilidad Neta (UN)': {},
    'EBITDA': {}
  });
  
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
        
        // Debug: Ver qué meses están disponibles y con qué datos
        console.log('🔍 DEBUG: Available months in workingData:', availableKeys);
        if (workingData.raw && workingData.raw.length > 0) {
          const sampleRow = workingData.raw[0];
          console.log('🔍 DEBUG: Sample raw row columns:', Object.keys(sampleRow));
          console.log('🔍 DEBUG: Sample values for each month:', 
            availableKeys.map(month => ({
              month,
              sampleValue: sampleRow[month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()]
            }))
          );
        }
        
        // FUNCIÓN SIMPLIFICADA COMO PygContainer.tsx - SOLO maneja conversiones necesarias
        const convertPeriodForCalculation = (periodo: string): string => {
          if (!workingData?.monthly) return periodo;
          
          // Si ya existe el período tal como está, usarlo directamente
          if (workingData.monthly[periodo]) {
            return periodo;
          }
          
          // Mapa de conversión para capitalización
          const monthsMapReverse: Record<string, string> = {
            'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
            'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
            'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
          };
          
          // Si el período es minúscula, intentar capitalizar
          const periodLower = periodo.toLowerCase();
          if (monthsMapReverse[periodLower]) {
            const capitalized = monthsMapReverse[periodLower];
            if (workingData.monthly[capitalized]) {
              console.log('🔧 Balance Interno - Converting case:', { from: periodo, to: capitalized });
              return capitalized;
            }
          }
          
          // Si es capitalizado, intentar minúscula
          const periodCapitalized = periodo.charAt(0).toUpperCase() + periodo.slice(1).toLowerCase();
          const periodMinuscule = periodo.toLowerCase();
          
          if (workingData.monthly[periodMinuscule]) {
            console.log('🔧 Balance Interno - Converting to lowercase:', { from: periodo, to: periodMinuscule });
            return periodMinuscule;
          }
          
          // Devolver tal como está si no necesita conversión
          return periodo;
        };
        
        // USAR LA MISMA LÓGICA QUE PygContainer.tsx (YA FUNCIONA)
        // Buscar el mes con datos más recientes
        let rawPeriod = null;
        
        // Priorizar junio si tiene datos (según los logs anteriores)
        if (availableKeys.includes('junio') || availableKeys.includes('Junio')) {
          rawPeriod = availableKeys.find(k => k.toLowerCase() === 'junio') || 'junio';
          console.log('✅ Usando junio con datos confirmados:', rawPeriod);
        } else {
          // Si no está junio, buscar el último mes con datos reales
          const sortedKeys = [...availableKeys].sort();
          for (let i = sortedKeys.length - 1; i >= 0; i--) {
            const key = sortedKeys[i];
            const monthData = workingData.monthly[key];
            
            // Verificar si tiene datos en raw
            if (workingData.raw && workingData.raw.length > 0) {
              const hasData = workingData.raw.some(row => {
                const monthKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                return row[monthKey] && parseFloat(row[monthKey] as string) !== 0;
              });
              
              if (hasData) {
                rawPeriod = key;
                console.log('✅ Encontrado mes con datos:', key);
                break;
              }
            }
          }
        }
        
        // Si no hay meses con datos, usar junio por defecto
        if (!rawPeriod) {
          rawPeriod = 'junio';
          console.log('⚠️ Usando junio por defecto');
        }
        
        // Validar que encontramos un período válido  
        if (!rawPeriod) {
          console.error('❌ No se pudo encontrar ningún período válido para calcular PyG');
          return;
        }
        
        // CRÍTICO: calculatePnl SIEMPRE espera el mes en formato CAPITALIZADO para buscar en raw data
        // Necesitamos convertir a formato capitalizado independientemente del formato de monthly
        const monthsMapToCapitalized: Record<string, string> = {
          'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
          'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
          'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
        };
        
        const periodForCalculation = monthsMapToCapitalized[rawPeriod.toLowerCase()] || rawPeriod;
        
        // DEBUG CRÍTICO: Verificar qué formato va a usar calculatePnl
        console.log('🔍 CRÍTICO - Verificando formato para calculatePnl:', {
          rawPeriod,
          periodForCalculation,
          rawDataHasCapitalized: workingData.raw?.[0]?.[periodForCalculation],
          monthlyHasPeriod: !!workingData.monthly?.[rawPeriod] // monthly puede usar lowercase
        });
        
        console.log('✅ USANDO LÓGICA DE PygContainer:', { 
          raw: rawPeriod, 
          converted: periodForCalculation,
          exists: !!workingData.monthly[periodForCalculation]
        });
        
        // USAR EXACTAMENTE LA MISMA LLAMADA QUE PygContainer.tsx con período en lowercase
        const result = await calculatePnl(
          workingData,
          rawPeriod, // USAR LOWERCASE como PygContainer
          'contable',
          undefined, // mixedCosts como PygContainer  
          1 // company_id por defecto como PygContainer
        );
        
        console.log('🔍 DEBUG: PyG calculation result:', {
          period: periodForCalculation,
          treeDataLength: result.treeData.length,
          summaryKpis: result.summaryKpis,
          treeDataDetailed: result.treeData.map(node => ({
            code: node.code,
            name: node.name,
            value: node.value,
            childrenCount: node.children ? node.children.length : 0
          })),
          // Debug específico para los nodos principales
          node4Value: result.treeData.find(n => n.code === '4')?.value,
          node5Value: result.treeData.find(n => n.code === '5')?.value
        });
        
        console.log('✅ BALANCE INTERNO: Calling calculatePnl with:', periodForCalculation);
        
        // Asegurarnos de que tenemos datos antes de actualizar
        if (result.treeData && result.treeData.length > 0) {
          setPygTreeData(result.treeData);
          console.log('✅ PyG Tree Data actualizado con', result.treeData.length, 'nodos principales');
        } else {
          console.error('❌ No se obtuvieron datos del árbol PyG');
        }
      } catch (error) {
        console.error('⚠️ Error calculating PyG:', error);
      }
    };
    
    calculatePygData();
    
    // Calcular las 3 utilidades después de los datos principales
    if (workingData && availableMonths.length > 0) {
      calculateUtilities(workingData, availableMonths);
    }
  }, [workingData, availableMonths, enhancedData, calculateUtilities]);
  
  // Cache para búsquedas en el árbol (evitar logs excesivos)
  const nodeCache = useMemo(() => {
    const cache = new Map<string, any>();
    
    const cacheNodes = (nodes: any[]) => {
      nodes.forEach(node => {
        // Asegurarnos de que el código está correctamente formateado
        const code = node.code ? node.code.toString() : '';
        if (code) {
          cache.set(code, node);
          // También cachear variaciones del código (por si acaso)
          if (code.includes('.')) {
            cache.set(code.replace(/\./g, '_'), node); // 4.1 -> 4_1
          }
        }
        
        if (node.children && node.children.length > 0) {
          cacheNodes(node.children);
        }
      });
    };
    
    if (pygTreeData && pygTreeData.length > 0) {
      cacheNodes(pygTreeData);
      console.log(`📊 NodeCache populated with ${cache.size} nodes from PyG tree`);
      
      // Log algunos ejemplos para debug
      const sampleCodes = Array.from(cache.keys()).slice(0, 10);
      console.log('📊 Sample cached codes:', sampleCodes);
    }
    
    return cache;
  }, [pygTreeData]);
  
  // Obtener valor de cuenta desde los datos raw por mes específico
  const getAccountValueForRow = (code: string, monthData: MonthlyData, month: string): number => {
    // SIEMPRE buscar en datos raw por mes específico
    if (workingData?.raw) {
      const rawRow = workingData.raw.find(r => r['COD.'] === code);
      if (rawRow) {
        // ⚠️ CRÍTICO: Convertir mes al formato correcto (capitalizado)
        const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const value = parseFloat(rawRow[monthKey] as string) || 0;
        
        // Debug para verificar valores por mes
        console.log(`💰 BALANCE INTERNO - ${code} en ${monthKey}:`, { 
          value, 
          rawValue: rawRow[monthKey],
          allMonths: {
            enero: rawRow['Enero'],
            febrero: rawRow['Febrero'], 
            marzo: rawRow['Marzo'],
            abril: rawRow['Abril'],
            mayo: rawRow['Mayo'],
            junio: rawRow['Junio']
          }
        });
        
        return value;
      }
    }
    
    console.log(`⚠️ BALANCE INTERNO - Código ${code} no encontrado en raw data`);
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
              Balance Interno - Matriz con UB, UN y EBITDA
            </p>
          </div>
        </div>
      </div>

      {/* Descripción de la matriz */}
      <div className="glass-card p-4 bg-primary/10 border border-primary/30">
        <div className="text-sm text-primary">
          <strong>Matriz de Utilidades:</strong> Las últimas 3 filas muestran UB (Utilidad Bruta/Contable), 
          UN (Utilidad Neta/EBIT) y EBITDA con sus respectivos cálculos y exclusiones.
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
              const isExcluded = false; // Sin exclusiones en filas normales
              
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
            
            {/* Separador */}
            <tr className="bg-border/20">
              <td colSpan={14} className="px-4 py-1">
                <div className="w-full h-px bg-primary/30"></div>
              </td>
            </tr>
            
            {/* 3 UTILIDADES FINALES - CORREGIR ALINEACIÓN */}
            {Object.keys(utilityCalculations).map((utilityType, index) => {
              const colors = [
                { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
                { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
                { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' }
              ];
              const color = colors[index];
              
              return (
                <tr key={utilityType} className={`${color.bg} font-bold border-t ${index === 0 ? 'border-t-2' : ''} ${color.border}`}>
                  <td className={`px-4 py-3 ${color.text}`} colSpan={1}>
                    {utilityType} {/* Usar una sola columna para el nombre completo */}
                  </td>
                  {months.map(month => (
                    <td key={`${utilityType}-${month}`} className={`px-2 py-3 text-right ${color.text} font-semibold`}>
                      {formatCurrency(utilityCalculations[utilityType][month] || 0)}
                    </td>
                  ))}
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