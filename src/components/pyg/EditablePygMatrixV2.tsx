import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { EditableCell } from './EditableCell';
import { calculatePnl, PnlViewType, PnlResult } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import ProjectionEngine from '../../utils/projectionEngine';
import { getSortedMonths } from '../../utils/dateUtils';
import { FinancialData, MonthlyData } from '../../types';
import { Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import { log } from '../../utils/logger';

type AnalysisType = 'contable' | 'operativo' | 'caja';

interface EditablePygRow {
  code: string;
  name: string;
  level: number;
  value: number;
  isParent: boolean;
  children?: EditablePygRow[];
}

const EditablePygMatrixV2: React.FC = () => {
  const { data: financialData } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  
  const [analysisType, setAnalysisType] = useState<AnalysisType>('contable');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [enhancedData, setEnhancedData] = useState<FinancialData | null>(null);
  
  // Estados PyG usando EXACTAMENTE la misma lógica de PygContainer
  const [periodoActual, setPeriodoActual] = useState<string>('');
  const [pnlDataActual, setPnlDataActual] = useState<PnlResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Completar año con proyecciones como Balance Interno requiere
  useEffect(() => {
    if (financialData && financialData.monthly) {
      console.log('🧠 ProjectionEngine: Completando año con proyecciones...');
      const completed = ProjectionEngine.completeYear(financialData, 2025);
      setEnhancedData(completed);
    }
  }, [financialData]);

  const workingData = enhancedData || financialData;

  // COPIAR EXACTAMENTE la lógica de inicialización de períodos de PygContainer
  useEffect(() => {
    if (!workingData?.monthly) return;
    
    const availableMonths = Object.keys(workingData.monthly);
    log.debug('EditablePygMatrixV2', 'Available months from workingData:', availableMonths);
    
    if (availableMonths.length === 0) return;
    
    // Mapear nombres de meses a formato YYYY-MM si es necesario
    const monthsMap: Record<string, string> = {
      'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
      'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
      'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
    };
    
    // DEBUG: Ver qué meses tenemos realmente
    console.log('🔍 DEBUG: Raw available months:', availableMonths);
    
    // Si los meses están en español, convertir a formato estándar
    const standardizedMonths = availableMonths.map(month => {
      const monthLower = month.toLowerCase();
      const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      
      if (monthsMap[monthCapitalized]) {
        // Asumir año actual si viene en formato de nombre
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${monthsMap[monthCapitalized]}`;
      }
      return month; // Ya está en formato correcto
    }).sort();
    
    console.log('🔍 DEBUG: Standardized months:', standardizedMonths);
    
    log.debug('EditablePygMatrixV2', 'Standardized months:', standardizedMonths);
    
    // SIMPLIFICADO: Usar directamente el último mes disponible sin conversión
    const lastAvailableMonth = availableMonths[availableMonths.length - 1];
    console.log('🔍 DEBUG: Using last available month directly:', lastAvailableMonth);
    setPeriodoActual(lastAvailableMonth);
    
    log.debug('EditablePygMatrixV2', 'Set periods:', { actual });
  }, [workingData]);

  // SIMPLIFICADO: No convertir períodos, usar tal como están
  const convertPeriodForCalculation = useCallback((periodo: string): string => {
    console.log('🔍 DEBUG: convertPeriodForCalculation - usando período directamente:', periodo);
    return periodo; // Balance Interno usa períodos tal como los genera ProjectionEngine
  }, []);

  // COPIAR EXACTAMENTE la función calculatePnlData de PygContainer
  const calculatePnlData = useCallback(async (periodo: string): Promise<PnlResult | null> => {
    if (!workingData || !periodo) {
      log.warn('EditablePygMatrixV2', 'calculatePnlData: No workingData or periodo', { workingData: !!workingData, periodo });
      return null;
    }
    
    // Convertir período al formato que espera calculatePnl
    const periodForCalculation = convertPeriodForCalculation(periodo);
    
    log.debug('EditablePygMatrixV2', 'calculatePnlData: Starting calculation', { 
      periodoOriginal: periodo,
      periodoConvertido: periodForCalculation,
      analysisType, 
      hasWorkingData: !!workingData,
      monthlyKeys: workingData.monthly ? Object.keys(workingData.monthly) : [],
      hasRawData: !!workingData.raw && Array.isArray(workingData.raw),
      rawDataLength: workingData.raw ? workingData.raw.length : 0
    });
    
    try {
      const result = await calculatePnl(
        workingData,
        periodForCalculation,
        analysisType as PnlViewType,
        mixedCosts,
        1 // company_id por defecto
      );
      
      log.debug('EditablePygMatrixV2', 'calculatePnlData: Result obtained', {
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
  }, [workingData, analysisType, mixedCosts, convertPeriodForCalculation]);

  // COPIAR EXACTAMENTE la lógica de cargar datos PyG de PygContainer
  useEffect(() => {
    const loadPnlData = async () => {
      if (!periodoActual || !workingData) return;
      
      setLoading(true);
      
      try {
        // Cargar datos del período actual
        const dataActual = await calculatePnlData(periodoActual);
        setPnlDataActual(dataActual);
        
        console.log('✅ Balance Interno: PyG data loaded successfully', {
          periodo: periodoActual,
          summaryKpis: dataActual?.summaryKpis,
          treeDataLength: dataActual?.treeData?.length
        });
        
      } catch (error) {
        console.error('❌ Balance Interno: Error cargando datos PyG:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPnlData();
  }, [periodoActual, analysisType, calculatePnlData, workingData]);

  // Convertir treeData del PyG a formato editable
  const editableRows = useMemo((): EditablePygRow[] => {
    if (!pnlDataActual?.treeData) return [];

    const convertNodeToEditableRow = (node: any, level: number = 0): EditablePygRow => {
      const editableRow: EditablePygRow = {
        code: node.code,
        name: node.name,
        level,
        value: node.value || 0,
        isParent: node.children && node.children.length > 0,
        children: []
      };

      if (node.children && node.children.length > 0) {
        editableRow.children = node.children.map((child: any) => 
          convertNodeToEditableRow(child, level + 1)
        );
      }

      return editableRow;
    };

    return pnlDataActual.treeData.map(node => convertNodeToEditableRow(node));
  }, [pnlDataActual]);

  // Función para mostrar/ocultar filas según expansión
  const shouldShowRow = (row: EditablePygRow): boolean => {
    if (row.level === 0) return true;
    
    // Encontrar el padre y ver si está expandido
    const findParent = (rows: EditablePygRow[], targetRow: EditablePygRow): EditablePygRow | null => {
      for (const row of rows) {
        if (row.children) {
          for (const child of row.children) {
            if (child === targetRow) return row;
            const found = findParent([child], targetRow);
            if (found) return found;
          }
        }
      }
      return null;
    };

    const parent = findParent(editableRows, row);
    return parent ? expandedNodes[parent.code] === true : false;
  };

  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  // Función para guardar cambios (simple por ahora)
  const handleSave = async (month: string, rowCode: string, newValue: number) => {
    console.log('💾 Balance Interno: Guardando cambio:', { month, rowCode, newValue });
    // TODO: Implementar lógica de guardado + recálculo + ProjectionEngine
  };

  // Obtener todos los meses disponibles
  const availableMonths = useMemo(() => {
    return workingData?.monthly ? getSortedMonths(workingData.monthly) : [];
  }, [workingData]);

  // Función recursiva para renderizar filas
  const renderRows = (rows: EditablePygRow[]): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    const processRow = (row: EditablePygRow) => {
      result.push(
        <tr key={row.code} className="hover:bg-glass/50 transition-colors group">
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
                  {expandedNodes[row.code] ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </button>
              )}
              <span className={`
                ${row.level === 0 ? 'font-bold text-white' : ''}
                ${row.level === 1 ? 'text-text-secondary' : ''}
                ${row.level >= 2 ? 'text-text-muted' : ''}
              `}>
                {row.code} - {row.name}
              </span>
            </div>
          </td>
          
          {availableMonths.map(month => {
            // Para cuentas padre, mostrar valor calculado
            if (row.isParent) {
              return (
                <td key={`${month}-${row.code}`} className="px-4 py-3 text-right">
                  <span className="text-primary font-semibold">
                    {formatCurrency(row.value)}
                  </span>
                </td>
              );
            }
            
            // Para cuentas hoja, mostrar celda editable
            return (
              <td key={`${month}-${row.code}`} className="px-2 py-2">
                <EditableCell
                  initialValue={row.value}
                  onSave={(newValue) => handleSave(month, row.code, newValue)}
                  isReadOnly={false}
                  className="group-hover:bg-glass/30"
                />
              </td>
            );
          })}
        </tr>
      );
      
      // Procesar hijos si están expandidos
      if (row.isParent && expandedNodes[row.code] && row.children) {
        row.children.forEach(processRow);
      }
    };
    
    rows.forEach(processRow);
    return result;
  };

  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mr-4"></div>
        <span>Cargando datos PyG con proyecciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-primary flex items-center space-x-3">
              <Calculator className="w-8 h-8" />
              <span>Balance Interno - Estado de Resultados</span>
            </h2>
            <p className="text-text-secondary mt-2">
              Matriz Editable con Proyecciones • Análisis {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
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

      {/* Matriz editable */}
      <div className="glass-card p-4 overflow-x-auto">
        {editableRows.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-text-muted uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-80">Cuenta</th>
                {availableMonths.map(month => (
                  <th key={month} className="px-4 py-3 text-right font-medium min-w-32">
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {renderRows(editableRows)}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-text-muted">
            <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Cargando estructura PyG...</p>
          </div>
        )}
      </div>

      {/* Summary KPIs */}
      {pnlDataActual?.summaryKpis && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Resumen Financiero</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(pnlDataActual.summaryKpis.ingresos)}
              </p>
              <p className="text-sm text-text-muted">Ingresos Totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(pnlDataActual.summaryKpis.costos)}
              </p>
              <p className="text-sm text-text-muted">Costos y Gastos</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${pnlDataActual.summaryKpis.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(pnlDataActual.summaryKpis.utilidad)}
              </p>
              <p className="text-sm text-text-muted">Utilidad/Pérdida</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditablePygMatrixV2;