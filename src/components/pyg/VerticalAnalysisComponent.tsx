import React, { useMemo, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Eye,
  EyeOff,
  Percent,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface VerticalAnalysisData {
  success: boolean;  
  periodo: string;
  ingreso_total: number;
  pyg_data: Array<{
    id_cuenta: number;
    cuenta: string;
    tipo_cuenta: string;
    monto: number;
    porcentaje_sobre_ingresos: number;
    porcentaje_absoluto: number;
  }>;
  summary: Record<string, {
    monto: number;
    porcentaje_sobre_ingresos: number;
  }>;
  graficos: {
    composicion_gastos: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
    estructura_pyg: Array<{
      concepto: string;
      monto: number;
      porcentaje: number;
      tipo: string;
    }>;
  };
  metadata: {
    rentabilidad: {
      margen_bruto: number;
      margen_operativo: number;
      margen_neto: number;
    };
  };
}

interface VerticalAnalysisComponentProps {
  data: VerticalAnalysisData;
}

const VerticalAnalysisComponent: React.FC<VerticalAnalysisComponentProps> = ({ data }) => {
  console.log('🔍 VerticalAnalysisComponent: Received data', {
    hasData: !!data,
    success: data?.success,
    periodo: data?.periodo,
    ingreso_total: data?.ingreso_total,
    pyg_data_length: data?.pyg_data?.length,
    composicion_gastos_length: data?.graficos?.composicion_gastos?.length,
    estructura_pyg_length: data?.graficos?.estructura_pyg?.length,
    composicion_gastos: data?.graficos?.composicion_gastos,
    estructura_pyg: data?.graficos?.estructura_pyg
  });

  const [showTable, setShowTable] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  };

  const pieColors = ['#8B5CF6', '#06D6A0', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#10B981', '#F97316'];
  const barColors = {
    ingreso: '#10B981',
    costo: '#EF4444', 
    gasto: '#F59E0B',
    utilidad: '#8B5CF6'
  };

  const filteredTableData = useMemo(() => {
    if (!selectedCategory) return data.pyg_data;
    return data.pyg_data.filter(item => item.tipo_cuenta === selectedCategory);
  }, [data.pyg_data, selectedCategory]);

  const structureChartData = useMemo(() => {
    return data.graficos.estructura_pyg.map(item => ({
      ...item,
      fill: barColors[item.tipo as keyof typeof barColors] || '#8B5CF6'
    }));
  }, [data.graficos.estructura_pyg]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-card border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="font-medium text-light mb-1">{label || data.name}</p>
          <p className="text-primary">
            <span className="font-mono">{formatCurrency(data.value || data.monto)}</span>
          </p>
          <p className="text-text-muted text-sm mt-1">
            {((data.percentage || data.porcentaje) || 0).toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  const exportData = () => {
    const csvContent = [
      ['Cuenta', 'Tipo', 'Monto', '% sobre Ingresos'],
      ...data.pyg_data.map(item => [
        item.cuenta,
        item.tipo_cuenta,
        item.monto.toString(),
        item.porcentaje_sobre_ingresos.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analisis_vertical_${data.periodo}.csv`;
    link.click();
  };

  const stats = useMemo(() => {
    const categoryCounts = data.pyg_data.reduce((acc, item) => {
      acc[item.tipo_cuenta] = (acc[item.tipo_cuenta] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxExpense = data.pyg_data
      .filter(item => item.tipo_cuenta === 'gasto')
      .reduce((max, item) => item.monto > max.monto ? item : max, 
        { cuenta: '', monto: 0, porcentaje_sobre_ingresos: 0 });

    return {
      categoryCounts,
      maxExpense,
      totalAccounts: data.pyg_data.length
    };
  }, [data.pyg_data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display text-primary">
            Análisis Vertical - Estructura Porcentual
          </h2>
          <p className="text-text-muted">
            {formatPeriod(data.periodo)} • Base: {formatCurrency(data.ingreso_total)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTable(!showTable)}
              className="flex items-center space-x-2 px-3 py-2 glass-card border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              {showTable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showTable ? 'Ocultar' : 'Mostrar'} Tabla</span>
            </button>

            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs de Rentabilidad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(data.metadata.rentabilidad).map(([key, value]) => {
          const isPositive = value >= 0;
          const Icon = isPositive ? TrendingUp : TrendingDown;
          
          return (
            <div
              key={key}
              className={`glass-card p-4 rounded-lg border ${
                isPositive ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-muted capitalize">
                  {key.replace('_', ' ')}
                </h3>
                <Icon className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {value.toFixed(1)}%
              </div>
              <div className="text-xs text-text-muted mt-1">
                {isPositive ? 'Rentabilidad positiva' : 'Requiere atención'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Layout Principal: Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Composición de Gastos */}
        <div className="glass-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light">Composición de Gastos</h3>
            <Info className="h-4 w-4 text-text-muted" title="Distribución porcentual de gastos por categoría" />
          </div>
          
          {data.graficos.composicion_gastos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.graficos.composicion_gastos}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                >
                  {data.graficos.composicion_gastos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted">
              No hay datos de gastos para mostrar
            </div>
          )}
        </div>

        {/* Gráfico de Estructura PyG */}
        <div className="glass-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light">Estructura del PyG</h3>
            <Info className="h-4 w-4 text-text-muted" title="Composición porcentual del Estado de Resultados" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={structureChartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                stroke="#9CA3AF"
              />
              <YAxis 
                type="category" 
                dataKey="concepto" 
                width={120}
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="porcentaje" 
                radius={[0, 4, 4, 0]}
                fill={(entry: any) => entry.fill}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla Detallada */}
      {showTable && (
        <div className="glass-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-lg font-semibold text-light">Detalle por Cuenta</h3>
              
              {/* Filtros por categoría */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    !selectedCategory 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-700 text-text-muted hover:bg-slate-600'
                  }`}
                >
                  Todas ({stats.totalAccounts})
                </button>
                {Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-slate-700 text-text-muted hover:bg-slate-600'
                    }`}
                  >
                    {category} ({count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    Monto ($)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    % sobre Ingresos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                    Impacto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTableData.map((item, index) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-light">
                      {formatCurrency(item.monto)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-sm font-medium text-accent">
                          {Math.abs(item.porcentaje_sobre_ingresos).toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.porcentaje_absoluto > 10 ? (
                        <span className="text-red-400 text-sm">Alto</span>
                      ) : item.porcentaje_absoluto > 5 ? (
                        <span className="text-yellow-400 text-sm">Medio</span>
                      ) : (
                        <span className="text-green-400 text-sm">Bajo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer con insights */}
      <div className="glass-card p-4 rounded-lg border border-border bg-slate-800/30">
        <h4 className="text-sm font-medium text-purple-400 mb-2">💡 Insights Automáticos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Gasto más significativo:</span>
            <div className="font-medium text-light">
              {stats.maxExpense.cuenta} 
              <span className="text-accent ml-2">
                ({stats.maxExpense.porcentaje_sobre_ingresos.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <span className="text-text-muted">Distribución:</span>
            <div className="font-medium text-light">
              {stats.categoryCounts.ingreso || 0} ingresos, {' '}
              {stats.categoryCounts.costo || 0} costos, {' '}
              {stats.categoryCounts.gasto || 0} gastos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerticalAnalysisComponent;