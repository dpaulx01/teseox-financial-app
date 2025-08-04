import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, TrendingUp, BarChart3, Activity, AlertCircle, Loader2, ChevronsDown, ChevronsRight, TrendingDown } from 'lucide-react';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl, calculateVerticalAnalysis, PnlViewType, PnlResult } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import { log } from '../../utils/logger';
import HorizontalAnalysisTable from './HorizontalAnalysisTable';
import VerticalAnalysisComponent from './VerticalAnalysisComponent';
import AdvancedDashboard from './AdvancedDashboard';
import OptimizedHierarchicalTree from '../performance/OptimizedHierarchicalTree';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

type TabType = 'horizontal' | 'vertical' | 'advanced';
type AnalysisType = 'contable' | 'operativo' | 'caja'; // Solo 3 tipos como documentado

const PygContainer: React.FC = () => {
  const { data: financialData } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  
  const [activeTab, setActiveTab] = useState<TabType>('vertical');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('contable');
  const [periodoActual, setPeriodoActual] = useState<string>('');
  const [periodoAnterior, setPeriodoAnterior] = useState<string>('');
  
  // Estados para el árbol jerárquico
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState<boolean>(true);
  
  const [loading, setLoading] = useState<Record<TabType, boolean>>({
    horizontal: false,
    vertical: false,
    advanced: false
  });
  const [errors, setErrors] = useState<Record<TabType, string | null>>({
    horizontal: null,
    vertical: null,
    advanced: null
  });

  // Estados para almacenar los resultados PyG usando la lógica real
  const [pnlDataActual, setPnlDataActual] = useState<PnlResult | null>(null);
  const [pnlDataAnterior, setPnlDataAnterior] = useState<PnlResult | null>(null);

  // Inicializar períodos basándose en los datos disponibles
  useEffect(() => {
    if (!financialData?.monthly) return;
    
    const availableMonths = Object.keys(financialData.monthly);
    log.debug('PygContainer', 'Available months from financialData:', availableMonths);
    
    if (availableMonths.length === 0) return;
    
    // Mapear nombres de meses a formato YYYY-MM si es necesario
    const monthsMap: Record<string, string> = {
      'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
      'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
      'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
    };
    
    // Si los meses están en español, convertir a formato estándar
    const standardizedMonths = availableMonths.map(month => {
      if (monthsMap[month]) {
        // Asumir año actual si viene en formato de nombre
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${monthsMap[month]}`;
      }
      return month; // Ya está en formato correcto
    }).sort();
    
    log.debug('PygContainer', 'Standardized months:', standardizedMonths);
    
    // Período actual = último mes disponible
    const actual = standardizedMonths[standardizedMonths.length - 1];
    setPeriodoActual(actual);
    
    // Período anterior = penúltimo mes disponible
    if (standardizedMonths.length > 1) {
      const anterior = standardizedMonths[standardizedMonths.length - 2];
      setPeriodoAnterior(anterior);
    }
    
    log.debug('PygContainer', 'Set periods:', { actual, anterior: standardizedMonths[standardizedMonths.length - 2] });
  }, [financialData]);

  // Función para convertir período estándar a formato financialData
  const convertPeriodForCalculation = useCallback((periodo: string): string => {
    if (!financialData?.monthly) return periodo;
    
    const monthsMap: Record<string, string> = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };
    
    // Si el período está en formato YYYY-MM, convertir al formato que usa financialData
    if (periodo.includes('-')) {
      const [year, month] = periodo.split('-');
      const monthName = monthsMap[month];
      if (monthName && financialData.monthly[monthName]) {
        log.debug('PygContainer', 'Converting period:', { from: periodo, to: monthName });
        return monthName;
      }
    }
    
    return periodo; // Devolver tal como está si no necesita conversión
  }, [financialData]);

  // Calcular PyG usando la lógica real cuando cambien los parámetros
  const calculatePnlData = useCallback(async (periodo: string): Promise<PnlResult | null> => {
    if (!financialData || !periodo) {
      log.warn('PygContainer', 'calculatePnlData: No financialData or periodo', { financialData: !!financialData, periodo });
      return null;
    }
    
    // Convertir período al formato que espera calculatePnl
    const periodForCalculation = convertPeriodForCalculation(periodo);
    
    log.debug('PygContainer', 'calculatePnlData: Starting calculation', { 
      periodoOriginal: periodo,
      periodoConvertido: periodForCalculation,
      analysisType, 
      hasFinancialData: !!financialData,
      monthlyKeys: financialData.monthly ? Object.keys(financialData.monthly) : [],
      hasRawData: !!financialData.raw && Array.isArray(financialData.raw),
      rawDataLength: financialData.raw ? financialData.raw.length : 0
    });
    
    try {
      const result = await calculatePnl(
        financialData,
        periodForCalculation,
        analysisType as PnlViewType,
        mixedCosts,
        1 // company_id por defecto
      );
      
      log.debug('PygContainer', 'calculatePnlData: Result obtained', {
        periodoOriginal: periodo,
        periodoConvertido: periodForCalculation,
        hasResult: !!result,
        summaryKpis: result?.summaryKpis,
        treeDataLength: result?.treeData?.length,
        waterfallDataLength: result?.waterfallData?.length,
        analysisType: result?.analysisType
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Error calculando PyG para período ${periodo}:`, error);
      return null;
    }
  }, [financialData, analysisType, mixedCosts, convertPeriodForCalculation]);

  // Cargar datos PyG cuando cambien los períodos o tipo de análisis
  useEffect(() => {
    const loadPnlData = async () => {
      if (!periodoActual || !financialData) return;
      
      setLoading(prev => ({ ...prev, [activeTab]: true }));
      setErrors(prev => ({ ...prev, [activeTab]: null }));
      
      try {
        // Cargar datos del período actual
        const dataActual = await calculatePnlData(periodoActual);
        setPnlDataActual(dataActual);
        
        // Cargar datos del período anterior (para análisis horizontal)
        if (periodoAnterior) {
          const dataAnterior = await calculatePnlData(periodoAnterior);
          setPnlDataAnterior(dataAnterior);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setErrors(prev => ({ ...prev, [activeTab]: errorMessage }));
        console.error('Error cargando datos PyG:', error);
      } finally {
        setLoading(prev => ({ ...prev, [activeTab]: false }));
      }
    };

    loadPnlData();
  }, [periodoActual, periodoAnterior, analysisType, activeTab, calculatePnlData, financialData]);

  // Funciones auxiliares para extraer datos para gráficos con algoritmos inteligentes
  const extractExpenseComposition = useCallback((treeData: any[], totalIngresos: number) => {
    log.debug('PygContainer', 'extractExpenseComposition: Input', { 
      treeDataLength: treeData?.length, 
      totalIngresos,
      treeDataSample: treeData?.slice(0, 3)
    });
    
    if (!treeData || !Array.isArray(treeData) || totalIngresos === 0) {
      log.debug('PygContainer', 'extractExpenseComposition: Invalid input, returning empty');
      return [];
    }
    
    // Algoritmo inteligente: Agrupar gastos por categorías principales
    const expenseNodes = treeData.filter(node => {
      const isExpense = node.code && node.code.toString().startsWith('5');
      const hasValue = node.value && node.value > 0;
      console.log('🔍 Filtering node:', { code: node.code, value: node.value, isExpense, hasValue });
      return isExpense && hasValue;
    });
    
    console.log('🔍 extractExpenseComposition: Filtered expenses', {
      count: expenseNodes.length,
      expenses: expenseNodes.map(n => ({ code: n.code, name: n.name, value: n.value }))
    });
    
    // Agrupar por categorías inteligentes
    const categories = {
      'Costos de Ventas': expenseNodes.filter(n => n.code.startsWith('5.1')),
      'Gastos Administrativos': expenseNodes.filter(n => n.code.startsWith('5.2')),
      'Gastos Operacionales': expenseNodes.filter(n => n.code.startsWith('5.3')),
      'Otros Gastos': expenseNodes.filter(n => n.code.startsWith('5') && !n.code.startsWith('5.1') && !n.code.startsWith('5.2') && !n.code.startsWith('5.3'))
    };
    
    const result = Object.entries(categories)
      .map(([categoryName, nodes]) => {
        const totalValue = nodes.reduce((sum, node) => sum + (node.value || 0), 0);
        return {
          name: categoryName,
          value: totalValue,
          percentage: (totalValue / totalIngresos) * 100,
          itemCount: nodes.length
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Ordenar por valor descendente
    
    console.log('🔍 extractExpenseComposition: Result', result);
    return result;
  }, []);

  const extractPygStructure = useCallback((treeData: any[], totalIngresos: number) => {
    console.log('🔍 extractPygStructure: Input', { 
      treeDataLength: treeData?.length, 
      totalIngresos 
    });
    
    if (!treeData || !Array.isArray(treeData) || totalIngresos === 0) {
      console.log('🔍 extractPygStructure: Invalid input, returning empty');
      return [];
    }
    
    // Cálculos inteligentes basados en estructura jerárquica real
    const ingresos = treeData
      .filter(n => n.code && n.code.toString().startsWith('4'))
      .reduce((sum, n) => sum + (n.value || 0), 0);
      
    const costoVentas = treeData
      .filter(n => n.code && n.code.toString().startsWith('5.1'))
      .reduce((sum, n) => sum + (n.value || 0), 0);
      
    const gastosAdmin = treeData
      .filter(n => n.code && (n.code.toString().startsWith('5.2') || n.code.toString().startsWith('5.3')))
      .reduce((sum, n) => sum + (n.value || 0), 0);
      
    const otrosGastos = treeData
      .filter(n => n.code && n.code.toString().startsWith('5') && 
                   !n.code.toString().startsWith('5.1') && 
                   !n.code.toString().startsWith('5.2') && 
                   !n.code.toString().startsWith('5.3'))
      .reduce((sum, n) => sum + (n.value || 0), 0);
    
    const utilidadBruta = ingresos - costoVentas;
    const utilidadOperativa = utilidadBruta - gastosAdmin;
    const utilidadNeta = utilidadOperativa - otrosGastos;
    
    const result = [
      { concepto: 'Ingresos', monto: ingresos, porcentaje: (ingresos / totalIngresos) * 100, tipo: 'ingreso' },
      { concepto: 'Costo de Ventas', monto: costoVentas, porcentaje: (costoVentas / totalIngresos) * 100, tipo: 'costo' },
      { concepto: 'Gastos Administrativos', monto: gastosAdmin, porcentaje: (gastosAdmin / totalIngresos) * 100, tipo: 'gasto' },
      { concepto: 'Otros Gastos', monto: otrosGastos, porcentaje: (otrosGastos / totalIngresos) * 100, tipo: 'gasto' },
      { concepto: 'Utilidad Neta', monto: utilidadNeta, porcentaje: (utilidadNeta / totalIngresos) * 100, tipo: 'utilidad' }
    ].filter(item => Math.abs(item.monto) > 0.01); // Filtrar valores muy pequeños
    
    console.log('🔍 extractPygStructure: Result', result);
    return result;
  }, []);

  // Transformar datos PyG a formato para componentes
  const verticalAnalysisData = useMemo(() => {
    console.log('🔍 verticalAnalysisData: Starting transformation', {
      hasPnlDataActual: !!pnlDataActual,
      periodoActual,
      pnlDataSummary: pnlDataActual?.summaryKpis,
      treeDataLength: pnlDataActual?.treeData?.length
    });
    
    if (!pnlDataActual) {
      console.log('🔍 verticalAnalysisData: No pnlDataActual, returning null');
      return null;
    }
    
    // Usar calculateVerticalAnalysis para obtener porcentajes
    const verticalData = calculateVerticalAnalysis(pnlDataActual);
    
    console.log('🔍 verticalAnalysisData: After calculateVerticalAnalysis', {
      verticalDataSummary: verticalData?.summaryKpis,
      treeDataSample: verticalData?.treeData?.slice(0, 3)
    });
    
    // Transformar treeData a formato esperado por VerticalAnalysisComponent
    const pyg_data = verticalData.treeData.map((node, index) => ({
      id_cuenta: index + 1,
      cuenta: node.name,
      tipo_cuenta: node.code.startsWith('4') ? 'ingreso' : 
                   node.code.startsWith('5.1') ? 'costo' : 
                   node.code.startsWith('5') ? 'gasto' : 'utilidad',
      monto: node.value,
      porcentaje_sobre_ingresos: node.verticalPercentage || 0,
      porcentaje_absoluto: Math.abs(node.verticalPercentage || 0)
    }));

    const ingresos_totales = verticalData.summaryKpis.ingresos;
    const utilidad_bruta = ingresos_totales - verticalData.summaryKpis.costos;
    const utilidad_operativa = utilidad_bruta; // Simplificado por ahora
    const utilidad_neta = verticalData.summaryKpis.utilidad;

    return {
      success: true,
      periodo: periodoActual,
      ingreso_total: ingresos_totales,
      pyg_data,
      summary: {
        ingresos_totales: {
          monto: ingresos_totales,
          porcentaje_sobre_ingresos: 100.0
        },
        utilidad_bruta: {
          monto: utilidad_bruta,
          porcentaje_sobre_ingresos: (utilidad_bruta / ingresos_totales) * 100
        },
        utilidad_operativa: {
          monto: utilidad_operativa,
          porcentaje_sobre_ingresos: (utilidad_operativa / ingresos_totales) * 100
        },
        utilidad_neta: {
          monto: utilidad_neta,
          porcentaje_sobre_ingresos: (utilidad_neta / ingresos_totales) * 100
        }
      },
      graficos: {
        composicion_gastos: extractExpenseComposition(verticalData.treeData, ingresos_totales),
        estructura_pyg: extractPygStructure(verticalData.treeData, ingresos_totales)
      },
      metadata: {
        rentabilidad: {
          margen_bruto: ((utilidad_bruta / ingresos_totales) * 100),
          margen_operativo: ((utilidad_operativa / ingresos_totales) * 100),
          margen_neto: ((utilidad_neta / ingresos_totales) * 100)
        }
      }
    };
    
    console.log('🔍 verticalAnalysisData: Final result', {
      success: result.success,
      periodo: result.periodo,
      ingreso_total: result.ingreso_total,
      pyg_data_length: result.pyg_data?.length,
      composicion_gastos_length: result.graficos?.composicion_gastos?.length,
      estructura_pyg_length: result.graficos?.estructura_pyg?.length,
      pyg_data_sample: result.pyg_data?.slice(0, 3),
      composicion_gastos: result.graficos?.composicion_gastos,
      estructura_pyg: result.graficos?.estructura_pyg
    });
    
    return result;
  }, [pnlDataActual, periodoActual, extractExpenseComposition, extractPygStructure]);

  const horizontalAnalysisData = useMemo(() => {
    if (!pnlDataActual || !pnlDataAnterior) return null;

    // Crear datos de comparación usando ambos períodos
    const pyg_data = pnlDataActual.treeData.map((nodeActual, index) => {
      const nodeAnterior = pnlDataAnterior.treeData.find(n => n.code === nodeActual.code) || 
                          { value: 0 };
      
      const montoAnterior = nodeAnterior.value || 0;
      const montoActual = nodeActual.value;
      const variacionAbsoluta = montoActual - montoAnterior;
      const variacionPorcentual = montoAnterior !== 0 ? (variacionAbsoluta / montoAnterior) * 100 : 0;

      return {
        id_cuenta: index + 1,
        cuenta: nodeActual.name,
        tipo_cuenta: nodeActual.code.startsWith('4') ? 'ingreso' : 
                     nodeActual.code.startsWith('5') ? 'costo' : 'gasto',
        monto_anterior: montoAnterior,
        monto_actual: montoActual,
        variacion_absoluta: variacionAbsoluta,
        variacion_porcentual: variacionPorcentual
      };
    });

    return {
      success: true,
      periodo_actual: periodoActual,
      periodo_anterior: periodoAnterior,
      pyg_data,
      summary: {
        ingresos_totales: {
          monto_anterior: pnlDataAnterior.summaryKpis.ingresos,
          monto_actual: pnlDataActual.summaryKpis.ingresos,
          variacion_absoluta: pnlDataActual.summaryKpis.ingresos - pnlDataAnterior.summaryKpis.ingresos,
          variacion_porcentual: pnlDataAnterior.summaryKpis.ingresos !== 0 ? 
            ((pnlDataActual.summaryKpis.ingresos - pnlDataAnterior.summaryKpis.ingresos) / pnlDataAnterior.summaryKpis.ingresos) * 100 : 0
        }
      }
    };
  }, [pnlDataActual, pnlDataAnterior, periodoActual, periodoAnterior]);

  // Función para manejar toggle de nodos del árbol
  const handleToggleNode = useCallback((code: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  }, []);

  const formatPeriod = (period: string) => {
    if (!period) {
      console.log('🔍 formatPeriod: Empty period');
      return '';
    }
    
    console.log('🔍 formatPeriod: Formatting', { period });
    
    if (!period.includes('-')) {
      console.log('🔍 formatPeriod: Invalid format, no dash');
      return period; // Return as-is if format is unexpected
    }
    
    const [year, month] = period.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      console.log('🔍 formatPeriod: Invalid year/month', { year, month, yearNum, monthNum });
      return period; // Return original if invalid
    }
    
    const date = new Date(yearNum, monthNum - 1, 1);
    const formatted = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    
    console.log('🔍 formatPeriod: Result', { period, formatted });
    return formatted;
  };

  // Verificar si hay datos financieros
  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-light mb-2">No hay datos financieros</h3>
          <p className="text-text-muted">Sube un archivo CSV para comenzar el análisis PyG comparativo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display text-primary neon-text">
            PyG Comparativo
          </h1>
          <p className="text-text-muted">
            Análisis comparativo del Estado de Resultados usando la lógica financiera real del sistema
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Selector de tipo de análisis */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-text-muted whitespace-nowrap">Tipo de Análisis:</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
              className="px-3 py-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 rounded-lg"
            >
              <option value="contable">Contable (Estándar)</option>
              <option value="operativo">Operativo (EBIT)</option>
              <option value="caja">Caja (EBITDA)</option>
            </select>
          </div>

          {/* Selectores de período */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-text-muted" />
            <label className="text-sm font-medium text-text-muted whitespace-nowrap">Período Principal:</label>
            <select
              value={periodoActual}
              onChange={(e) => setPeriodoActual(e.target.value)}
              className="px-3 py-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 rounded-lg"
            >
              {financialData.monthly && Object.keys(financialData.monthly).map(month => {
                const monthsMap: Record<string, string> = {
                  'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
                  'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
                  'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
                };
                
                const currentYear = new Date().getFullYear();
                const standardPeriod = monthsMap[month] ? `${currentYear}-${monthsMap[month]}` : month;
                
                return (
                  <option key={month} value={standardPeriod}>
                    {month}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de período de comparación (solo para análisis horizontal) */}
          {activeTab === 'horizontal' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-text-muted whitespace-nowrap">vs</span>
              <select
                value={periodoAnterior}
                onChange={(e) => setPeriodoAnterior(e.target.value)}
                className="px-3 py-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 rounded-lg"
              >
                <option value="">Seleccionar período...</option>
                {financialData.monthly && Object.keys(financialData.monthly)
                  .filter(month => {
                    // Filtrar el período actual para evitar comparación consigo mismo
                    const monthsMap: Record<string, string> = {
                      'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
                      'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
                      'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
                    };
                    const currentYear = new Date().getFullYear();
                    const standardPeriod = monthsMap[month] ? `${currentYear}-${monthsMap[month]}` : month;
                    return standardPeriod !== periodoActual;
                  })
                  .map(month => {
                    const monthsMap: Record<string, string> = {
                      'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
                      'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
                      'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
                    };
                    
                    const currentYear = new Date().getFullYear();
                    const standardPeriod = monthsMap[month] ? `${currentYear}-${monthsMap[month]}` : month;
                    
                    return (
                      <option key={month} value={standardPeriod}>
                        {month}
                      </option>
                    );
                  })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'vertical', label: 'Análisis Vertical', icon: BarChart3 },
            { id: 'horizontal', label: 'Análisis Horizontal', icon: TrendingUp },
            { id: 'advanced', label: 'Dashboard Avanzado', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-light hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {loading[tab.id as TabType] && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div className="min-h-96">
        {errors[activeTab] && (
          <div className="glass-card p-4 border border-red-500/30 bg-red-500/10 rounded-lg mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-medium">Error:</span>
              <span className="text-light">{errors[activeTab]}</span>
            </div>
          </div>
        )}

        {loading[activeTab] ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-text-muted">Calculando análisis PyG con lógica financiera real...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'vertical' && pnlDataActual && (
              <div className="space-y-6">
                {/* Header del análisis vertical */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-display text-primary">
                      Análisis Vertical - Estructura Porcentual
                    </h2>
                    <p className="text-text-muted">
                      {formatPeriod(periodoActual)} • Base: {formatCurrency(pnlDataActual.summaryKpis.ingresos)}
                    </p>
                  </div>
                </div>

                {/* KPIs de resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-text-muted">Ingresos Totales</h3>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(pnlDataActual.summaryKpis.ingresos)}
                    </div>
                    <div className="text-xs text-text-muted mt-1">100.0% (Base)</div>
                  </div>

                  <div className="glass-card p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-text-muted">Costos Totales</h3>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrency(pnlDataActual.summaryKpis.costos)}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {pnlDataActual.summaryKpis.ingresos > 0 
                        ? ((pnlDataActual.summaryKpis.costos / pnlDataActual.summaryKpis.ingresos) * 100).toFixed(1)
                        : 0
                      }% de ingresos
                    </div>
                  </div>

                  <div className={`glass-card p-4 rounded-lg border ${
                    pnlDataActual.summaryKpis.utilidad >= 0 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-red-500/30 bg-red-500/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-text-muted">Utilidad Neta</h3>
                      {pnlDataActual.summaryKpis.utilidad >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className={`text-2xl font-bold ${
                      pnlDataActual.summaryKpis.utilidad >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(pnlDataActual.summaryKpis.utilidad)}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {pnlDataActual.summaryKpis.ingresos > 0 
                        ? ((pnlDataActual.summaryKpis.utilidad / pnlDataActual.summaryKpis.ingresos) * 100).toFixed(1)
                        : 0
                      }% margen neto
                    </div>
                  </div>
                </div>

                {/* Gráficos de análisis modernos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Gráfico de Gastos Detallados - Estilo Moderno */}
                  <div className="glass-card p-6 rounded-lg border border-border backdrop-blur-xl bg-gradient-to-br from-slate-900/50 to-slate-800/30">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-light mb-1">Composición de Gastos</h3>
                        <div className="text-xs text-accent font-medium">Cuentas de cuarto nivel (5.x.x.x)</div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-600/20 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-purple-400" />
                      </div>
                    </div>
                    
                    {(() => {
                      // Extraer TODAS las cuentas de cuarto nivel 5.x.x.x del árbol
                      const costosNode = calculateVerticalAnalysis(pnlDataActual).treeData.find(n => n.code === '5');
                      const cuentasCuartoNivel: any[] = [];
                      
                      // Recursivamente extraer todas las cuentas 5.x.x.x
                      const extraerCuentasCuartoNivel = (node: any, nivel: number = 0) => {
                        if (node.code.startsWith('5') && nivel === 3) { // Cuarto nivel (5.x.x.x)
                          if (Math.abs(node.value) > 0) {
                            cuentasCuartoNivel.push({
                              name: node.name,
                              fullName: `${node.code} - ${node.name}`,
                              value: Math.abs(node.value),
                              percentage: (Math.abs(node.value) / pnlDataActual.summaryKpis.ingresos) * 100,
                              code: node.code
                            });
                          }
                        }
                        
                        if (node.children) {
                          node.children.forEach((child: any) => extraerCuentasCuartoNivel(child, nivel + 1));
                        }
                      };
                      
                      if (costosNode) {
                        extraerCuentasCuartoNivel(costosNode, 0);
                      }

                      // Fallback a tercer nivel si no hay cuarto nivel
                      if (cuentasCuartoNivel.length === 0) {
                        const extraerTercerNivel = (node: any, nivel: number = 0) => {
                          if (node.code.startsWith('5') && nivel === 2) { // Tercer nivel como fallback
                            if (Math.abs(node.value) > 0) {
                              cuentasCuartoNivel.push({
                                name: node.name,
                                fullName: `${node.code} - ${node.name}`,
                                value: Math.abs(node.value),
                                percentage: (Math.abs(node.value) / pnlDataActual.summaryKpis.ingresos) * 100,
                                code: node.code
                              });
                            }
                          }
                          if (node.children) {
                            node.children.forEach((child: any) => extraerTercerNivel(child, nivel + 1));
                          }
                        };
                        if (costosNode) {
                          extraerTercerNivel(costosNode, 0);
                        }
                      }

                      // Ordenar por valor descendente
                      cuentasCuartoNivel.sort((a, b) => b.value - a.value);

                      if (cuentasCuartoNivel.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-64 text-text-muted">
                            <div className="text-center">
                              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                                <BarChart3 className="h-8 w-8 text-slate-600" />
                              </div>
                              <p>No hay datos de gastos detallados</p>
                            </div>
                          </div>
                        );
                      }

                      const gradientColors = [
                        'from-purple-500 to-pink-500',
                        'from-blue-500 to-cyan-500', 
                        'from-green-500 to-emerald-500',
                        'from-yellow-500 to-orange-500',
                        'from-red-500 to-pink-500',
                        'from-indigo-500 to-purple-500',
                        'from-teal-500 to-green-500',
                        'from-orange-500 to-red-500'
                      ];

                      const totalGastos = cuentasCuartoNivel.reduce((sum, item) => sum + item.value, 0);

                      // Preparar colores sólidos para el pie chart
                      const pieChartColors = [
                        '#8B5CF6', '#06D6A0', '#F59E0B', '#EF4444', 
                        '#3B82F6', '#EC4899', '#10B981', '#F97316',
                        '#6366F1', '#8B5CF6', '#14B8A6', '#F59E0B'
                      ];

                      // Componente de tooltip moderno personalizado
                      const ModernTooltip = ({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 border border-purple-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <div 
                                  className="w-3 h-3 rounded-full shadow-lg"
                                  style={{ backgroundColor: payload[0].color }}
                                />
                                <span className="font-mono text-xs text-purple-400 font-bold">
                                  {data.code}
                                </span>
                              </div>
                              <p className="font-medium text-light mb-2 text-sm">{data.name}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-text-muted">Monto:</span>
                                  <span className="font-mono text-sm font-bold text-accent">
                                    {formatCurrency(data.value)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-text-muted">% del total:</span>
                                  <span className="text-sm font-bold text-purple-400">
                                    {data.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      };

                      return (
                        <div className="space-y-6">
                          {/* Gráfico de pastel moderno con recharts */}
                          <div className="relative">
                            <ResponsiveContainer width="100%" height={320}>
                              <PieChart>
                                <defs>
                                  {/* Definir gradientes para cada slice */}
                                  {cuentasCuartoNivel.map((_, index) => (
                                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor={pieChartColors[index % pieChartColors.length]} stopOpacity={1} />
                                      <stop offset="100%" stopColor={pieChartColors[index % pieChartColors.length]} stopOpacity={0.8} />
                                    </linearGradient>
                                  ))}
                                </defs>
                                <Pie
                                  data={cuentasCuartoNivel}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={120}
                                  innerRadius={40}
                                  dataKey="value"
                                  nameKey="name"
                                  stroke="rgba(51, 65, 85, 0.3)"
                                  strokeWidth={2}
                                  label={({ percentage }) => percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
                                  labelLine={false}
                                  animationBegin={0}
                                  animationDuration={1200}
                                >
                                  {cuentasCuartoNivel.map((_, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={`url(#gradient-${index})`}
                                      className="hover:opacity-80 transition-opacity duration-300 drop-shadow-lg"
                                    />
                                  ))}
                                </Pie>
                                <Tooltip content={<ModernTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                            
                            {/* Centro del donut con estadísticas */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-center bg-slate-900/80 backdrop-blur-sm rounded-full w-20 h-20 flex flex-col items-center justify-center border border-slate-600/30">
                                <div className="text-xs font-bold text-purple-400">
                                  {cuentasCuartoNivel.length}
                                </div>
                                <div className="text-xs text-text-muted">
                                  cuentas
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Leyenda moderna personalizada */}
                          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                            {cuentasCuartoNivel.map((item, index) => (
                              <div key={item.code} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-all duration-200">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <div 
                                    className="w-3 h-3 rounded-full shadow-lg flex-shrink-0"
                                    style={{ backgroundColor: pieChartColors[index % pieChartColors.length] }}
                                  />
                                  <span className="font-mono text-xs text-purple-400 font-semibold">
                                    {item.code}
                                  </span>
                                  <span className="text-xs text-light truncate group-hover:text-purple-300 transition-colors">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                  <div className="font-mono text-xs text-accent font-bold">
                                    {formatCurrency(item.value)}
                                  </div>
                                  <div className="text-xs text-purple-400 font-medium">
                                    {item.percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Resumen estadístico elegante */}
                          <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-text-muted">Total de gastos detallados:</span>
                              <span className="font-mono font-bold text-light">{formatCurrency(totalGastos)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-2">
                              <span className="text-text-muted">Promedio por cuenta:</span>
                              <span className="font-mono text-accent">{formatCurrency(totalGastos / cuentasCuartoNivel.length)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Gráfico de Estructura PyG - Estilo Moderno */}
                  <div className="glass-card p-6 rounded-lg border border-border backdrop-blur-xl bg-gradient-to-br from-slate-900/50 to-slate-800/30">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-light mb-1">Estructura del PyG</h3>
                        <div className="text-xs text-accent font-medium">Análisis: {analysisType.toUpperCase()}</div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                    
                    {(() => {
                      const treeDataWithVertical = calculateVerticalAnalysis(pnlDataActual).treeData;
                      const ingresosNode = treeDataWithVertical.find(n => n.code === '4');
                      const costosNode = treeDataWithVertical.find(n => n.code === '5');
                      
                      const ingresos = ingresosNode ? ingresosNode.value : 0;
                      const costos = costosNode ? Math.abs(costosNode.value) : 0;
                      const utilidad = ingresos - costos;
                      
                      const estructuraData = [
                        { 
                          concepto: 'Ingresos', 
                          monto: ingresos, 
                          porcentaje: 100, 
                          tipo: 'ingreso',
                          gradient: 'from-green-500 to-emerald-500',
                          icon: '💰'
                        },
                        { 
                          concepto: 'Costos y Gastos', 
                          monto: costos, 
                          porcentaje: (costos / ingresos) * 100, 
                          tipo: 'costo',
                          gradient: 'from-red-500 to-pink-500',
                          icon: '💸'
                        },
                        { 
                          concepto: 'Utilidad Neta', 
                          monto: utilidad, 
                          porcentaje: (utilidad / ingresos) * 100, 
                          tipo: 'utilidad',
                          gradient: utilidad >= 0 ? 'from-purple-500 to-indigo-500' : 'from-orange-500 to-red-500',
                          icon: utilidad >= 0 ? '📈' : '📉'
                        }
                      ];

                      return (
                        <div className="space-y-6">
                          {estructuraData.map((item, index) => (
                            <div key={item.concepto} className="group">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="text-2xl">{item.icon}</div>
                                  <div>
                                    <span className="text-sm font-semibold text-light group-hover:text-accent transition-colors">
                                      {item.concepto}
                                    </span>
                                    <div className="text-xs text-text-muted">
                                      {item.tipo === 'ingreso' ? 'Base de cálculo' : 
                                       item.tipo === 'costo' ? 'Gastos operacionales' : 
                                       'Resultado neto'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono text-lg font-bold text-light">
                                    {formatCurrency(Math.abs(item.monto))}
                                  </div>
                                  <div className="text-sm font-semibold text-accent">
                                    {Math.abs(item.porcentaje).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              
                              <div className="relative">
                                <div className="w-full bg-slate-700/30 rounded-full h-4 overflow-hidden shadow-inner">
                                  <div 
                                    className={`h-full bg-gradient-to-r ${item.gradient} rounded-full transition-all duration-1000 ease-out shadow-glow relative`}
                                    style={{ width: `${Math.abs(item.porcentaje)}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                                  </div>
                                </div>
                                
                                {/* Indicador de porcentaje flotante */}
                                <div 
                                  className="absolute top-0 transform -translate-y-8 transition-all duration-300"
                                  style={{ left: `${Math.min(Math.abs(item.porcentaje), 95)}%` }}
                                >
                                  <div className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs font-medium text-accent shadow-lg">
                                    {Math.abs(item.porcentaje).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Resumen de rentabilidad */}
                          <div className="mt-6 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30">
                            <div className="text-center">
                              <div className="text-sm text-text-muted mb-1">Margen de Rentabilidad</div>
                              <div className={`text-2xl font-bold ${utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {((utilidad / ingresos) * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-text-muted mt-1">
                                {utilidad >= 0 ? 'Empresa rentable' : 'Requiere optimización'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Árbol jerárquico con análisis vertical */}
                <div className="glass-card rounded-lg border border-border">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-light flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span>Estructura Jerárquica del PyG</span>
                    </h3>
                    <p className="text-text-muted text-sm mt-1">
                      Vista jerárquica con porcentajes sobre ingresos totales • Análisis: {analysisType}
                    </p>
                  </div>
                  
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setExpandAll(!expandAll)}
                        className="flex items-center space-x-2 px-3 py-2 glass-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        {expandAll ? (
                          <>
                            <ChevronsDown className="h-4 w-4" />
                            <span>Contraer Todo</span>
                          </>
                        ) : (
                          <>
                            <ChevronsRight className="h-4 w-4" />
                            <span>Expandir Todo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <OptimizedHierarchicalTree
                    treeData={calculateVerticalAnalysis(pnlDataActual).treeData}
                    expanded={expandedNodes}
                    expandAll={expandAll}
                    onToggle={handleToggleNode}
                    showVertical={true}
                    showHorizontal={false}
                    insights={[]}
                    viewType={`vertical_${analysisType}`}
                    height={500}
                    className="p-4"
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'horizontal' && horizontalAnalysisData && (
              <HorizontalAnalysisTable data={horizontalAnalysisData} />
            )}
            
            {activeTab === 'advanced' && pnlDataActual && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-light mb-2">Dashboard Avanzado</h3>
                <p className="text-text-muted">Funcionalidad avanzada con ratios y tendencias usando datos PyG reales</p>
                <pre className="text-xs text-left mt-4 bg-slate-800 p-4 rounded overflow-auto">
                  {JSON.stringify(pnlDataActual.summaryKpis, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PygContainer;