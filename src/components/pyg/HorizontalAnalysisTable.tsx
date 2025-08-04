import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  Search,
  Download,
  Filter
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface HorizontalAnalysisData {
  success: boolean;
  periodo_actual: string;
  periodo_anterior: string;
  pyg_data: Array<{
    id_cuenta: number;
    cuenta: string;
    tipo_cuenta: string;
    monto_anterior: number;
    monto_actual: number;
    variacion_absoluta: number;
    variacion_porcentual: number;
  }>;
  summary: Record<string, {
    monto_anterior: number;
    monto_actual: number;
    variacion_absoluta: number;
    variacion_porcentual: number;
  }>;
}

interface HorizontalAnalysisTableProps {
  data: HorizontalAnalysisData;
}

const HorizontalAnalysisTable: React.FC<HorizontalAnalysisTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  };

  const getVariationStyle = (variacion: number, tipoCuenta: string) => {
    const isExpense = tipoCuenta === 'costo' || tipoCuenta === 'gasto';
    const isPositive = variacion >= 0;
    
    let isGood: boolean;
    if (isExpense) {
      isGood = !isPositive;
    } else {
      isGood = isPositive;
    }

    return {
      color: isGood ? 'text-green-500' : 'text-red-500',
      bgColor: isGood ? 'bg-green-500/10' : 'bg-red-500/10',
      borderColor: isGood ? 'border-green-500/30' : 'border-red-500/30',
      icon: variacion > 0 ? ArrowUp : variacion < 0 ? ArrowDown : Minus
    };
  };

  const processedData = useMemo(() => {
    let filtered = data.pyg_data.filter(item => {
      const matchesSearch = item.cuenta.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || item.tipo_cuenta === filterType;
      return matchesSearch && matchesFilter;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [data.pyg_data, searchTerm, filterType, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig?.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportData = () => {
    const csvContent = [
      ['Cuenta', 'Tipo', `${formatPeriod(data.periodo_anterior)}`, `${formatPeriod(data.periodo_actual)}`, 'Variación ($)', 'Variación (%)'],
      ...processedData.map(item => [
        item.cuenta,
        item.tipo_cuenta,
        item.monto_anterior.toString(),
        item.monto_actual.toString(),
        item.variacion_absoluta.toString(),
        item.variacion_porcentual.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analisis_horizontal_${data.periodo_anterior}_${data.periodo_actual}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display text-primary">
            Análisis Horizontal - Comparativo
          </h2>
          <p className="text-text-muted">
            {formatPeriod(data.periodo_anterior)} vs {formatPeriod(data.periodo_actual)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar cuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 rounded-lg"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-4 py-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 rounded-lg appearance-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="ingreso">Ingresos</option>
              <option value="costo">Costos</option>
              <option value="gasto">Gastos</option>
            </select>
          </div>

          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.summary).map(([key, values]) => {
          const style = getVariationStyle(values.variacion_porcentual, 'ingreso');
          const Icon = style.icon;
          
          return (
            <div
              key={key}
              className={`glass-card p-4 rounded-lg border ${style.borderColor} ${style.bgColor}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-muted capitalize">
                  {key.replace('_', ' ')}
                </h3>
                <Icon className={`h-4 w-4 ${style.color}`} />
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-light">
                  {formatCurrency(values.monto_actual)}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-text-muted">vs</span>
                  <span>{formatCurrency(values.monto_anterior)}</span>
                </div>
                <div className={`text-sm font-medium ${style.color}`}>
                  {values.variacion_porcentual > 0 ? '+' : ''}
                  {values.variacion_porcentual.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla principal */}
      <div className="glass-card rounded-lg overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-slate-800/50">
              <tr>
                {[
                  { key: 'cuenta', label: 'Cuenta' },
                  { key: 'tipo_cuenta', label: 'Tipo' },
                  { key: 'monto_anterior', label: formatPeriod(data.periodo_anterior) },
                  { key: 'monto_actual', label: formatPeriod(data.periodo_actual) },
                  { key: 'variacion_absoluta', label: 'Variación ($)' },
                  { key: 'variacion_porcentual', label: 'Variación (%)' }
                ].map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-light transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {sortConfig?.key === column.key && (
                        <div className="flex flex-col">
                          <ArrowUp className={`h-3 w-3 ${sortConfig.direction === 'asc' ? 'text-primary' : 'text-text-muted'}`} />
                          <ArrowDown className={`h-3 w-3 ${sortConfig.direction === 'desc' ? 'text-primary' : 'text-text-muted'}`} />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedData.map((item, index) => {
                const style = getVariationStyle(item.variacion_porcentual, item.tipo_cuenta);
                const Icon = style.icon;
                
                return (
                  <tr
                    key={item.id_cuenta}
                    className={`hover:bg-glass transition-colors ${index % 2 === 0 ? 'bg-slate-900/20' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-light">{item.cuenta}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.tipo_cuenta === 'ingreso' ? 'bg-green-500/20 text-green-400' :
                        item.tipo_cuenta === 'costo' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.tipo_cuenta}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-mono">
                      {formatCurrency(item.monto_anterior)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light font-mono font-medium">
                      {formatCurrency(item.monto_actual)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center space-x-2 text-sm font-medium ${style.color}`}>
                        <Icon className="h-4 w-4" />
                        <span className="font-mono">
                          {formatCurrency(Math.abs(item.variacion_absoluta))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center space-x-2 px-2 py-1 rounded ${style.bgColor} ${style.borderColor} border`}>
                        <Icon className={`h-4 w-4 ${style.color}`} />
                        <span className={`text-sm font-bold font-mono ${style.color}`}>
                          {item.variacion_porcentual > 0 ? '+' : ''}
                          {item.variacion_porcentual.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-text-muted">
              {searchTerm || filterType !== 'all' 
                ? 'No hay resultados que coincidan con los filtros aplicados'
                : 'No hay datos disponibles para mostrar'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HorizontalAnalysisTable;