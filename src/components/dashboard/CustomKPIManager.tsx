// Custom KPI Manager - Create and manage user-defined KPIs
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  CalculatorIcon,
  BarChart3,
  Bookmark,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { PyGResult } from '../../utils/pnlCalculator';

export interface CustomKPI {
  id: string;
  name: string;
  description: string;
  formula: KPIFormula;
  format: 'currency' | 'percentage' | 'number' | 'ratio';
  category: 'profitability' | 'efficiency' | 'growth' | 'liquidity' | 'custom';
  target?: number;
  benchmark?: number;
  isActive: boolean;
  isVisible: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIFormula {
  type: 'simple' | 'complex';
  numerator: KPIOperand;
  denominator?: KPIOperand;
  operations?: KPIOperation[];
}

export interface KPIOperand {
  type: 'account' | 'kpi' | 'constant';
  value: string | number;
  modifier?: 'abs' | 'negate';
}

export interface KPIOperation {
  operator: 'add' | 'subtract' | 'multiply' | 'divide';
  operand: KPIOperand;
}

interface CustomKPIManagerProps {
  currentData: PyGResult;
  existingKPIs: CustomKPI[];
  onKPICreate: (kpi: CustomKPI) => void;
  onKPIUpdate: (kpi: CustomKPI) => void;
  onKPIDelete: (kpiId: string) => void;
  className?: string;
}

const CustomKPIManager: React.FC<CustomKPIManagerProps> = ({
  currentData,
  existingKPIs,
  onKPICreate,
  onKPIUpdate,
  onKPIDelete,
  className = ''
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingKPI, setEditingKPI] = useState<CustomKPI | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pre-defined KPI templates
  const kpiTemplates = useMemo(() => [
    {
      name: 'Margen EBITDA',
      description: 'Utilidad antes de intereses, impuestos, depreciación y amortización como % de ingresos',
      formula: {
        type: 'simple' as const,
        numerator: { type: 'kpi' as const, value: 'ebitda' },
        denominator: { type: 'kpi' as const, value: 'ingresos' }
      },
      format: 'percentage' as const,
      category: 'profitability' as const,
      color: '#00F0FF'
    },
    {
      name: 'ROI Operativo',
      description: 'Retorno sobre inversión operativa',
      formula: {
        type: 'simple' as const,
        numerator: { type: 'kpi' as const, value: 'utilidad' },
        denominator: { type: 'kpi' as const, value: 'ingresos', modifier: 'abs' as const }
      },
      format: 'percentage' as const,
      category: 'efficiency' as const,
      color: '#00FF99'
    },
    {
      name: 'Ratio Costos/Ingresos',
      description: 'Proporción de costos sobre ingresos totales',
      formula: {
        type: 'simple' as const,
        numerator: { type: 'kpi' as const, value: 'costos', modifier: 'abs' as const },
        denominator: { type: 'kpi' as const, value: 'ingresos' }
      },
      format: 'percentage' as const,
      category: 'efficiency' as const,
      color: '#FF0080'
    },
    {
      name: 'Margen de Contribución',
      description: 'Ingresos menos costos variables como % de ingresos',
      formula: {
        type: 'complex' as const,
        numerator: { type: 'kpi' as const, value: 'ingresos' },
        operations: [
          { operator: 'subtract' as const, operand: { type: 'kpi' as const, value: 'costos', modifier: 'abs' as const } }
        ]
      },
      format: 'currency' as const,
      category: 'profitability' as const,
      color: '#FFB800'
    }
  ], []);

  // Calculate KPI value based on formula
  const calculateKPIValue = useCallback((formula: KPIFormula, data: PyGResult): number => {
    const getOperandValue = (operand: KPIOperand): number => {
      let value = 0;
      
      switch (operand.type) {
        case 'constant':
          value = Number(operand.value);
          break;
        case 'kpi':
          switch (operand.value) {
            case 'ingresos':
              value = data.summaryKpis.ingresos;
              break;
            case 'costos':
              value = data.summaryKpis.costos;
              break;
            case 'utilidad':
              value = data.summaryKpis.utilidad;
              break;
            case 'gastosOperacionales':
              value = data.summaryKpis.gastosOperacionales;
              break;
            case 'ebitda':
              value = data.summaryKpis.ebitda || (data.summaryKpis.utilidad + Math.abs(data.summaryKpis.costos) * 0.1); // Approximation
              break;
            default:
              value = 0;
          }
          break;
        case 'account':
          // For account-based calculations, we'd need to traverse the tree
          value = 0;
          break;
      }

      // Apply modifiers
      if (operand.modifier === 'abs') {
        value = Math.abs(value);
      } else if (operand.modifier === 'negate') {
        value = -value;
      }

      return value;
    };

    if (formula.type === 'simple') {
      const numeratorValue = getOperandValue(formula.numerator);
      const denominatorValue = formula.denominator ? getOperandValue(formula.denominator) : 1;
      
      return denominatorValue !== 0 ? numeratorValue / denominatorValue : 0;
    } else {
      // Complex formula
      let result = getOperandValue(formula.numerator);
      
      if (formula.operations) {
        formula.operations.forEach(operation => {
          const operandValue = getOperandValue(operation.operand);
          
          switch (operation.operator) {
            case 'add':
              result += operandValue;
              break;
            case 'subtract':
              result -= operandValue;
              break;
            case 'multiply':
              result *= operandValue;
              break;
            case 'divide':
              result = operandValue !== 0 ? result / operandValue : 0;
              break;
          }
        });
      }
      
      return result;
    }
  }, []);

  // Filter KPIs based on search and category
  const filteredKPIs = useMemo(() => {
    return existingKPIs.filter(kpi => {
      const matchesSearch = kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || kpi.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [existingKPIs, searchTerm, selectedCategory]);

  // Create new KPI from template
  const createFromTemplate = (template: typeof kpiTemplates[0]) => {
    const newKPI: CustomKPI = {
      id: `kpi_${Date.now()}`,
      name: template.name,
      description: template.description,
      formula: template.formula,
      format: template.format,
      category: template.category,
      isActive: true,
      isVisible: true,
      color: template.color,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onKPICreate(newKPI);
  };

  // Start creating custom KPI
  const startCustomCreation = () => {
    setIsCreating(true);
    const newKPI: CustomKPI = {
      id: `custom_kpi_${Date.now()}`,
      name: 'Nuevo KPI',
      description: 'Descripción del KPI personalizado',
      formula: {
        type: 'simple',
        numerator: { type: 'kpi', value: 'utilidad' },
        denominator: { type: 'kpi', value: 'ingresos' }
      },
      format: 'percentage',
      category: 'custom',
      isActive: true,
      isVisible: true,
      color: '#8B5CF6',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingKPI(newKPI);
  };

  // Format KPI value for display
  const formatKPIValue = (value: number, format: CustomKPI['format']): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'ratio':
        return `${value.toFixed(2)}:1`;
      case 'number':
        return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
      default:
        return value.toString();
    }
  };

  // Get category color
  const getCategoryColor = (category: CustomKPI['category']) => {
    switch (category) {
      case 'profitability': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'efficiency': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'growth': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'liquidity': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      case 'custom': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalculatorIcon className="h-8 w-8 text-purple-400" />
          <div>
            <h3 className="text-2xl font-bold neon-text">KPIs Personalizados</h3>
            <p className="text-gray-400">Crea y gestiona tus indicadores financieros</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={startCustomCreation}
            className="cyber-button-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear KPI
          </button>
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-purple-400">Plantillas Predefinidas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiTemplates.map((template, index) => (
            <motion.div
              key={index}
              className="glass-card p-4 rounded-lg hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => createFromTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: template.color }}
                />
                <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(template.category)}`}>
                  {template.category.toUpperCase()}
                </span>
              </div>
              
              <h5 className="font-semibold text-white mb-2">{template.name}</h5>
              <p className="text-sm text-gray-400 mb-3">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Formato: {template.format}
                </span>
                <Plus className="h-4 w-4 text-purple-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar KPIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
            />
            <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas las categorías</option>
            <option value="profitability">Rentabilidad</option>
            <option value="efficiency">Eficiencia</option>
            <option value="growth">Crecimiento</option>
            <option value="liquidity">Liquidez</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div className="text-sm text-gray-400">
          {filteredKPIs.length} de {existingKPIs.length} KPIs
        </div>
      </div>

      {/* KPI List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredKPIs.map((kpi, index) => {
            const value = calculateKPIValue(kpi.formula, currentData);
            const formattedValue = formatKPIValue(value, kpi.format);
            
            return (
              <motion.div
                key={kpi.id}
                className="glass-card p-4 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Color indicator */}
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: kpi.color }}
                    />
                    
                    {/* KPI Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h5 className="font-semibold text-white">{kpi.name}</h5>
                        <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(kpi.category)}`}>
                          {kpi.category.toUpperCase()}
                        </span>
                        {!kpi.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">
                            INACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{kpi.description}</p>
                    </div>
                    
                    {/* KPI Value */}
                    <div className="text-right">
                      <div className="text-2xl font-bold neon-text">
                        {formattedValue}
                      </div>
                      {kpi.target && (
                        <div className={`text-xs ${
                          value >= kpi.target ? 'text-green-400' : 'text-red-400'
                        }`}>
                          Meta: {formatKPIValue(kpi.target, kpi.format)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onKPIUpdate({ ...kpi, isVisible: !kpi.isVisible })}
                      className="p-2 rounded hover:bg-slate-700/50 transition-colors"
                      title={kpi.isVisible ? 'Ocultar KPI' : 'Mostrar KPI'}
                    >
                      {kpi.isVisible ? (
                        <Eye className="h-4 w-4 text-purple-400" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => setEditingKPI(kpi)}
                      className="p-2 rounded hover:bg-slate-700/50 transition-colors"
                      title="Editar KPI"
                    >
                      <Pencil className="h-4 w-4 text-blue-400" />
                    </button>
                    
                    <button
                      onClick={() => onKPIDelete(kpi.id)}
                      className="p-2 rounded hover:bg-slate-700/50 transition-colors"
                      title="Eliminar KPI"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredKPIs.length === 0 && (
        <div className="text-center py-12">
          <CalculatorIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            No hay KPIs creados
          </h3>
          <p className="text-gray-500 mb-6">
            Crea KPIs personalizados para medir métricas específicas de tu negocio
          </p>
          <button
            onClick={startCustomCreation}
            className="cyber-button"
          >
            Crear Primer KPI
          </button>
        </div>
      )}

      {/* KPI Editor Modal */}
      <AnimatePresence>
        {editingKPI && (
          <KPIEditorModal
            kpi={editingKPI}
            isCreating={isCreating}
            onSave={(updatedKPI) => {
              if (isCreating) {
                onKPICreate(updatedKPI);
                setIsCreating(false);
              } else {
                onKPIUpdate(updatedKPI);
              }
              setEditingKPI(null);
            }}
            onCancel={() => {
              setEditingKPI(null);
              setIsCreating(false);
            }}
            currentData={currentData}
            calculateValue={calculateKPIValue}
            formatValue={formatKPIValue}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// KPI Editor Modal Component
interface KPIEditorModalProps {
  kpi: CustomKPI;
  isCreating: boolean;
  onSave: (kpi: CustomKPI) => void;
  onCancel: () => void;
  currentData: PyGResult;
  calculateValue: (formula: KPIFormula, data: PyGResult) => number;
  formatValue: (value: number, format: CustomKPI['format']) => string;
}

const KPIEditorModal: React.FC<KPIEditorModalProps> = ({
  kpi,
  isCreating,
  onSave,
  onCancel,
  currentData,
  calculateValue,
  formatValue
}) => {
  const [editedKPI, setEditedKPI] = useState<CustomKPI>({ ...kpi });
  const [previewValue, setPreviewValue] = useState<number>(0);

  // Update preview when formula changes
  React.useEffect(() => {
    try {
      const value = calculateValue(editedKPI.formula, currentData);
      setPreviewValue(value);
    } catch (error) {
      setPreviewValue(0);
    }
  }, [editedKPI.formula, currentData, calculateValue]);

  const handleSave = () => {
    const finalKPI = {
      ...editedKPI,
      updatedAt: new Date()
    };
    onSave(finalKPI);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="glass-card p-6 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold neon-text">
            {isCreating ? 'Crear Nuevo KPI' : 'Editar KPI'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nombre del KPI
              </label>
              <input
                type="text"
                value={editedKPI.name}
                onChange={(e) => setEditedKPI(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Nombre del indicador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Categoría
              </label>
              <select
                value={editedKPI.category}
                onChange={(e) => setEditedKPI(prev => ({ 
                  ...prev, 
                  category: e.target.value as CustomKPI['category']
                }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="profitability">Rentabilidad</option>
                <option value="efficiency">Eficiencia</option>
                <option value="growth">Crecimiento</option>
                <option value="liquidity">Liquidez</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descripción
            </label>
            <textarea
              value={editedKPI.description}
              onChange={(e) => setEditedKPI(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              placeholder="Describe qué mide este KPI"
            />
          </div>

          {/* Format and Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Formato
              </label>
              <select
                value={editedKPI.format}
                onChange={(e) => setEditedKPI(prev => ({ 
                  ...prev, 
                  format: e.target.value as CustomKPI['format']
                }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="currency">Moneda</option>
                <option value="percentage">Porcentaje</option>
                <option value="number">Número</option>
                <option value="ratio">Ratio</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Color
              </label>
              <input
                type="color"
                value={editedKPI.color}
                onChange={(e) => setEditedKPI(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 p-1 bg-slate-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <h4 className="text-sm font-medium text-purple-400 mb-2">Vista Previa</h4>
            <div className="flex items-center space-x-4">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: editedKPI.color }}
              />
              <div>
                <div className="text-lg font-semibold text-white">{editedKPI.name}</div>
                <div className="text-2xl font-bold neon-text">
                  {formatValue(previewValue, editedKPI.format)}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Meta (opcional)
                </label>
                <input
                  type="number"
                  value={editedKPI.target || ''}
                  onChange={(e) => setEditedKPI(prev => ({ 
                    ...prev, 
                    target: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="Valor objetivo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Benchmark (opcional)
                </label>
                <input
                  type="number"
                  value={editedKPI.benchmark || ''}
                  onChange={(e) => setEditedKPI(prev => ({ 
                    ...prev, 
                    benchmark: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="Valor de referencia"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            {isCreating ? 'Crear KPI' : 'Guardar Cambios'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CustomKPIManager;