// Enhanced Table Widget for Dashboard
import React, { useState } from 'react';
import { TableWidgetSettings, WidgetConfig } from '../../types/dashboard';
import { AccountNode } from '../../utils/pnlCalculator';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl, calculateVerticalAnalysis, calculateHorizontalAnalysis } from '../../utils/pnlCalculator';
import WidgetContainer from './WidgetContainer';
import EnhancedAccountTreeTable from '../tables/EnhancedAccountTreeTable';

interface TableWidgetProps {
  widget: WidgetConfig;
}

const TableWidget: React.FC<TableWidgetProps> = ({ widget }) => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const settings = widget.settings as TableWidgetSettings;
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['ROOT', '4', '6']));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Calculate PyG data for the table
  const pnlResult = React.useMemo(() => {
    if (!data) return null;
    
    try {
      let result = calculatePnl(data, 'Anual', 'contable', mixedCosts);
      
      if (settings.showVertical) {
        result = calculateVerticalAnalysis(result);
      }
      
      if (settings.showHorizontal) {
        // For horizontal analysis, we'd need comparison data
        // For now, we'll skip this or use mock comparison data
      }
      
      return result;
    } catch (error) {
      // console.error('Error calculating P&L for table widget:', error);
      return null;
    }
  }, [data, mixedCosts, settings.showVertical, settings.showHorizontal]);

  const handleNodeExpansion = (nodeCode: string, isExpanded: boolean) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(nodeCode);
      } else {
        newSet.delete(nodeCode);
      }
      return newSet;
    });
  };

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  if (!data || !pnlResult) {
    return (
      <WidgetContainer widget={widget} onSettingsClick={handleSettingsOpen}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Cargando datos financieros...</div>
        </div>
      </WidgetContainer>
    );
  }

  // Create a mock root node structure from the PyG result
  const rootNode: AccountNode = {
    code: 'ROOT',
    name: 'Estado de Pérdidas y Ganancias',
    value: pnlResult.summaryKpis.utilidad,
    children: pnlResult.treeData
  };

  return (
    <>
      <WidgetContainer widget={widget} onSettingsClick={handleSettingsOpen}>
        <div className="h-full flex flex-col">
          {/* Widget Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/20">
            <h4 className="font-semibold text-purple-400">
              {widget.title}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {settings.showVertical && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  % Vertical
                </span>
              )}
              {settings.showHorizontal && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                  Horizontal
                </span>
              )}
              <span className="text-xs">
                Nivel {settings.level || 'Todos'}
              </span>
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="flex-1 overflow-hidden">
            <EnhancedAccountTreeTable
              rootNode={rootNode}
              expandedNodes={expandedNodes}
              onNodeExpansion={handleNodeExpansion}
              showVerticalAnalysis={settings.showVertical}
              showHorizontalAnalysis={settings.showHorizontal}
              className="h-full"
              maxHeight={widget.size.h * 60 - 150} // Approximate height calculation
              enableVirtualization={true}
            />
          </div>
        </div>
      </WidgetContainer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <TableWidgetSettingsModal
          widget={widget}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
};

// Settings Modal Component
interface TableWidgetSettingsModalProps {
  widget: WidgetConfig;
  onClose: () => void;
}

const TableWidgetSettingsModal: React.FC<TableWidgetSettingsModalProps> = ({
  widget,
  onClose
}) => {
  const settings = widget.settings as TableWidgetSettings;
  const [localSettings, setLocalSettings] = useState<TableWidgetSettings>({ ...settings });

  const handleSave = () => {
    // Update widget settings through context
    // This would be implemented in the dashboard context
    // console.log('Saving table widget settings:', localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold neon-text">
            Configurar Tabla
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* View Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tipo de Vista
            </label>
            <select
              value={localSettings.view}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                view: e.target.value as TableWidgetSettings['view'] 
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="tree">Árbol Jerárquico</option>
              <option value="flat">Lista Plana</option>
              <option value="summary">Resumen</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nivel de Profundidad
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={localSettings.level}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                level: parseInt(e.target.value) 
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Analysis Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showVertical}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showVertical: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar análisis vertical (%)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showHorizontal}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showHorizontal: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar análisis horizontal</span>
            </label>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Ordenar Por
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={localSettings.sortBy}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  sortBy: e.target.value as TableWidgetSettings['sortBy'] 
                }))}
                className="p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="code">Código</option>
                <option value="name">Nombre</option>
                <option value="value">Valor</option>
                <option value="percentage">Porcentaje</option>
              </select>
              
              <select
                value={localSettings.sortOrder}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  sortOrder: e.target.value as TableWidgetSettings['sortOrder'] 
                }))}
                className="p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Elementos por Página
            </label>
            <select
              value={localSettings.pageSize}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                pageSize: parseInt(e.target.value) 
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="0">Todos</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableWidget;