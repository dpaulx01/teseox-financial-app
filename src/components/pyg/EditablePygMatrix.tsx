import React, { useState, useEffect, useMemo } from 'react';
import { useScenario } from '../../contexts/ScenarioContext';
import { EditableCell } from './EditableCell';
import { FinancialData, MonthlyData } from '../../types';
import { Save, RefreshCw, Calculator, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { getSortedMonths } from '../../utils/dateUtils';
import ProjectionEngine from '../../utils/projectionEngine';

const EditablePygMatrix: React.FC = () => {
  const { 
    scenarioData, 
    updateScenario, 
    activeScenarioId, 
    scenarioMetadata, 
    isLoading 
  } = useScenario();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [enhancedData, setEnhancedData] = useState<FinancialData | null>(null);

  // Auto-completar año 2025 cuando se carga el escenario
  useEffect(() => {
    if (scenarioData && scenarioData.monthly) {
      console.log('📊 Datos originales:', Object.keys(scenarioData.monthly));
      
      const completed = ProjectionEngine.completeYear(scenarioData, 2025);
      setEnhancedData(completed);
      
      console.log('🧠 Datos completados:', Object.keys(completed.monthly));
      
      // Si se agregaron datos nuevos, guardar automáticamente
      const originalMonths = Object.keys(scenarioData.monthly).length;
      const newMonths = Object.keys(completed.monthly).length;
      
      console.log(`📈 Meses: ${originalMonths} → ${newMonths}`);
      
      if (newMonths > originalMonths && activeScenarioId) {
        console.log('💾 Guardando nuevas proyecciones...');
        updateScenario(activeScenarioId, completed);
      }
    }
  }, [scenarioData, activeScenarioId, updateScenario]);

  // Usar datos enhanced si están disponibles, sino los originales
  const workingData = enhancedData || scenarioData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-3 text-text-secondary">Cargando Matriz Editable...</span>
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
        <p className="text-text-secondary">
          Para usar la matriz editable, primero debes entrar en modo simulación.
        </p>
      </div>
    );
  }

  const handleSave = async (month: string, account: keyof MonthlyData, newValue: number) => {
    if (!workingData || !activeScenarioId) return;

    try {
      // Crear copia profunda para evitar mutaciones directas
      const updatedData: FinancialData = JSON.parse(JSON.stringify(workingData));

      // Actualizar el valor específico
      (updatedData.monthly[month] as any)[account] = newValue;

      // RECÁLCULO AUTOMÁTICO: Recalcular métricas derivadas
      updatedData.monthly[month] = ProjectionEngine.recalculateMetrics(updatedData.monthly[month]);

      // Actualizar estado local inmediatamente
      setEnhancedData(updatedData);

      // Actualizar en el backend
      await updateScenario(activeScenarioId, updatedData);
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving matrix cell:', error);
      throw error; // Propagar error para que EditableCell lo maneje
    }
  };

  const handleRecalculate = async () => {
    if (!workingData || !activeScenarioId) return;
    
    setIsRecalculating(true);
    try {
      // Regenerar proyecciones completas con nuevos algoritmos
      const recalculated = ProjectionEngine.completeYear(workingData, 2025);
      
      // Actualizar estado local
      setEnhancedData(recalculated);
      
      // Guardar en backend
      await updateScenario(activeScenarioId, recalculated);
      
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Error recalculating:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Definir cuentas principales del PyG en orden lógico
  const accounts: Array<{
    key: keyof MonthlyData;
    label: string;
    isReadOnly?: boolean;
    category: 'ingresos' | 'costos' | 'gastos' | 'resultados';
  }> = [
    // Ingresos
    { key: 'ingresos', label: 'Ingresos', category: 'ingresos' },
    
    // Costos
    { key: 'costoMateriaPrima', label: 'Costo Materia Prima', category: 'costos' },
    { key: 'costoProduccion', label: 'Costo Producción', category: 'costos' },
    { key: 'costoVentasTotal', label: 'Costo Ventas Total', category: 'costos' },
    
    // Gastos
    { key: 'gastosOperativos', label: 'Gastos Operativos', category: 'gastos' },
    { key: 'gastosAdminTotal', label: 'Gastos Administrativos', category: 'gastos' },
    { key: 'gastosVentasTotal', label: 'Gastos Ventas', category: 'gastos' },
    
    // Resultados (algunos podrían ser calculados)
    { key: 'utilidadBruta', label: 'Utilidad Bruta', category: 'resultados' },
    { key: 'ebitda', label: 'EBITDA', category: 'resultados' },
    { key: 'depreciacion', label: 'Depreciación', category: 'costos' },
    { key: 'utilidadNeta', label: 'Utilidad Neta', category: 'resultados' }
  ];

  const months = getSortedMonths(workingData.monthly);

  // Función para determinar si una celda contiene datos proyectados
  const isProjectedData = (month: string, account: keyof MonthlyData): boolean => {
    const monthData = workingData.monthly[month] as any;
    const isProjected = monthData?._metadata?.[account]?.isProjected || false;
    
    return isProjected;
  };

  // Función para obtener confianza de la proyección
  const getProjectionConfidence = (month: string, account: keyof MonthlyData): number => {
    const monthData = workingData.monthly[month] as any;
    return monthData?._metadata?.[account]?.confidence || 0;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ingresos': return 'text-green-400';
      case 'costos': return 'text-red-400';
      case 'gastos': return 'text-yellow-400';
      case 'resultados': return 'text-blue-400';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con información del escenario */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-primary flex items-center space-x-3">
              <Calculator className="w-8 h-8" />
              <span>Matriz PyG Editable</span>
            </h2>
            <p className="text-text-secondary mt-2">
              {scenarioMetadata?.name} - Edición en tiempo real
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-warning">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                <span className="text-sm">Cambios pendientes</span>
              </div>
            )}
            
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg 
                        transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>Regenerar IA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Ingresos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span>Costos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span>Gastos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span>Resultados</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span>Datos Reales</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <span>Proyección IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matriz editable */}
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-muted uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cuenta</th>
              {months.map(month => (
                <th key={month} className="px-4 py-3 text-right font-medium min-w-32">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {accounts.map(account => (
              <tr 
                key={account.key} 
                className="hover:bg-glass/50 transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(account.category).replace('text-', 'bg-')}/50`}></div>
                    <span className={`font-medium ${getCategoryColor(account.category)}`}>
                      {account.label}
                    </span>
                  </div>
                </td>
                {months.map(month => {
                  const monthData = workingData.monthly[month];
                  const value = monthData?.[account.key] || 0;
                  const isProjected = isProjectedData(month, account.key);
                  const confidence = getProjectionConfidence(month, account.key);
                  
                  return (
                    <td key={`${month}-${account.key}`} className="px-2 py-2 relative">
                      {/* Indicador de proyección */}
                      {isProjected && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-60" 
                             title={`Proyección IA - Confianza: ${confidence}%`}></div>
                      )}
                      
                      <EditableCell
                        initialValue={value}
                        onSave={(newValue) => handleSave(month, account.key, newValue)}
                        isReadOnly={account.isReadOnly}
                        className={`group-hover:bg-glass/30 transition-all duration-200 ${
                          isProjected 
                            ? 'bg-purple-500/10 border border-purple-400/20 rounded-md' 
                            : ''
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con instrucciones */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-sm text-text-muted mb-2">
              💡 <strong>Instrucciones:</strong> Haz clic en cualquier celda para editarla. 
              Los cambios se guardan automáticamente después de 500ms. 
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-dark-surface rounded text-xs">Enter</kbd>
                <span>Guardar</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-dark-surface rounded text-xs">Esc</kbd>
                <span>Cancelar</span>
              </div>
            </div>
          </div>
          
          <div className="text-center border-l border-border/30 pl-6">
            <p className="text-sm text-purple-200 mb-2">
              🧠 <strong>IA Inteligente:</strong> Los datos proyectados se calculan automáticamente usando:
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-purple-300">
              <span>• Tendencias históricas</span>
              <span>• Patrones estacionales</span>
              <span>• Ratios financieros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditablePygMatrix;