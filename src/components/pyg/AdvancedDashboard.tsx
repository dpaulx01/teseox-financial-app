import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Percent,
  BarChart3,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface AdvancedDashboardData {
  success: boolean;
  periodo_principal: string;
  periodos_analizados: string[];
  ratios: {
    margen_bruto: number;
    margen_operativo: number;
    margen_neto: number;
    eficiencia_costos: number;
    eficiencia_gastos: number;
    rotacion_ventas: number;
  };
  tendencias: {
    periodos: string[];
    ingresos_totales: number[];
    utilidad_bruta: number[];
    utilidad_operativa: number[];
    utilidad_neta: number[];
    margenes: {
      margen_bruto: number[];
      margen_operativo: number[];
      margen_neto: number[];
    };
  };
  crecimiento: Record<string, number[]>;
  analisis_gastos: Array<{
    cuenta: string;
    monto: number;
  }>;
  insights: string[];
  datos_periodo_principal: {
    ingresos_totales: number;
    utilidad_bruta: number;
    utilidad_operativa: number;
    utilidad_neta: number;
  };
}

interface AdvancedDashboardProps {
  data: AdvancedDashboardData;
}

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('ingresos_totales');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showGrowthRates, setShowGrowthRates] = useState(false);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  };

  const trendChartData = useMemo(() => {
    return data.tendencias.periodos.map((periodo, index) => ({
      periodo: formatPeriod(periodo),
      periodoFull: periodo,
      ingresos_totales: data.tendencias.ingresos_totales[index] || 0,
      utilidad_bruta: data.tendencias.utilidad_bruta[index] || 0,
      utilidad_operativa: data.tendencias.utilidad_operativa[index] || 0,
      utilidad_neta: data.tendencias.utilidad_neta[index] || 0,
      margen_bruto: data.tendencias.margenes.margen_bruto[index] || 0,
      margen_operativo: data.tendencias.margenes.margen_operativo[index] || 0,
      margen_neto: data.tendencias.margenes.margen_neto[index] || 0,
    }));
  }, [data.tendencias]);

  const growthChartData = useMemo(() => {
    if (!data.crecimiento.ingresos_totales) return [];
    
    return data.tendencias.periodos.slice(1).map((periodo, index) => ({
      periodo: formatPeriod(periodo),
      ingresos: data.crecimiento.ingresos_totales[index] || 0,
      utilidad_bruta: data.crecimiento.utilidad_bruta[index] || 0,
      utilidad_operativa: data.crecimiento.utilidad_operativa[index] || 0,
      utilidad_neta: data.crecimiento.utilidad_neta[index] || 0,
    }));
  }, [data.crecimiento, data.tendencias.periodos]);

  const kpiConfig = [
    {
      key: 'margen_bruto',
      label: 'Margen Bruto',
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      benchmark: { good: 50, warning: 30 }
    },
    {
      key: 'margen_operativo',
      label: 'Margen Operativo',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      benchmark: { good: 20, warning: 10 }
    },
    {
      key: 'margen_neto',
      label: 'Margen Neto',
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      benchmark: { good: 15, warning: 5 }
    },
    {
      key: 'eficiencia_costos',
      label: 'Eficiencia de Costos',
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      benchmark: { good: 40, warning: 60 },
      invert: true
    },
    {
      key: 'eficiencia_gastos',
      label: 'Eficiencia de Gastos',
      icon: BarChart3,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      benchmark: { good: 30, warning: 50 },
      invert: true
    },
    {
      key: 'rotacion_ventas',
      label: 'Rotación de Ventas',
      icon: TrendingUp,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      benchmark: { good: 1000, warning: 500 }
    }
  ];

  const evaluateKPI = (value: number, benchmark: any, invert = false) => {
    if (invert) {
      if (value <= benchmark.good) return 'excellent';
      if (value <= benchmark.warning) return 'good';
      return 'warning';
    } else {
      if (value >= benchmark.good) return 'excellent';
      if (value >= benchmark.warning) return 'good';
      return 'warning';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-border rounded-lg">
          <p className="font-medium text-light mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              {entry.name.includes('Margen') || entry.name.includes('%')
                ? `${entry.value.toFixed(1)}%`
                : formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const exportData = () => {
    const csvData = [
      ['Período', 'Ingresos', 'Utilidad Bruta', 'Utilidad Operativa', 'Utilidad Neta'],
      ...trendChartData.map(item => [
        item.periodoFull,
        item.ingresos_totales.toString(),
        item.utilidad_bruta.toString(),
        item.utilidad_operativa.toString(),
        item.utilidad_neta.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard_avanzado_${data.periodo_principal}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display text-primary">
            Dashboard Avanzado - Ratios y Tendencias
          </h2>
          <p className="text-text-muted">
            Análisis de {data.periodos_analizados?.length || 0} períodos • 
            Principal: {formatPeriod(data.periodo_principal)}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGrowthRates(!showGrowthRates)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showGrowthRates 
                ? 'bg-primary text-white' 
                : 'glass-card border border-border hover:border-primary/50'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Tasas de Crecimiento</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiConfig.map((kpi) => {
          const value = data.ratios[kpi.key as keyof typeof data.ratios] || 0;
          const performance = evaluateKPI(value, kpi.benchmark, kpi.invert);
          const Icon = kpi.icon;
          
          const performanceIcon = performance === 'excellent' ? CheckCircle :
                                   performance === 'good' ? Info :
                                   AlertTriangle;
          
          const PerformanceIcon = performanceIcon;
          
          return (
            <div
              key={kpi.key}
              className={`glass-card p-4 rounded-lg border ${kpi.borderColor} ${kpi.bgColor} hover:shadow-glow-sm transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`h-5 w-5 ${kpi.color}`} />
                <PerformanceIcon className={`h-4 w-4 ${
                  performance === 'excellent' ? 'text-green-400' :
                  performance === 'good' ? 'text-blue-400' :
                  'text-yellow-400'
                }`} />
              </div>
              
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${kpi.color}`}>
                  {kpi.key === 'rotacion_ventas' 
                    ? value.toFixed(1) 
                    : `${value.toFixed(1)}%`
                  }
                </div>
                <div className="text-xs text-text-muted font-medium">
                  {kpi.label}
                </div>
                <div className={`text-xs font-medium ${
                  performance === 'excellent' ? 'text-green-400' :
                  performance === 'good' ? 'text-blue-400' :
                  'text-yellow-400'
                }`}>
                  {performance === 'excellent' ? 'Excelente' :
                   performance === 'good' ? 'Bueno' :
                   'Mejorable'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos de Tendencias */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tendencias de Utilidades */}
        <div className={`glass-card p-6 rounded-lg border border-border ${
          expandedChart === 'utilidades' ? 'xl:col-span-2' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light">Evolución de Utilidades</h3>
            <button
              onClick={() => setExpandedChart(
                expandedChart === 'utilidades' ? null : 'utilidades'
              )}
              className="p-2 hover:bg-glass rounded transition-colors"
            >
              {expandedChart === 'utilidades' ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="periodo" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value, true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="utilidad_bruta" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Utilidad Bruta"
                dot={{ fill: '#10B981' }}
              />
              <Line 
                type="monotone" 
                dataKey="utilidad_operativa" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Utilidad Operativa"
                dot={{ fill: '#3B82F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="utilidad_neta" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Utilidad Neta"
                dot={{ fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Márgenes de Rentabilidad */}
        <div className={`glass-card p-6 rounded-lg border border-border ${
          expandedChart === 'margenes' ? 'xl:col-span-2' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light">Evolución de Márgenes</h3>
            <button
              onClick={() => setExpandedChart(
                expandedChart === 'margenes' ? null : 'margenes'
              )}
              className="p-2 hover:bg-glass rounded transition-colors"
            >
              {expandedChart === 'margenes' ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="periodo" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="margen_bruto" 
                stackId="1"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.6}
                name="Margen Bruto %"
              />
              <Area 
                type="monotone" 
                dataKey="margen_operativo" 
                stackId="2"
                stroke="#3B82F6" 
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Margen Operativo %"
              />
              <Area 
                type="monotone" 
                dataKey="margen_neto" 
                stackId="3"
                stroke="#8B5CF6" 
                fill="#8B5CF6"
                fillOpacity={0.6}
                name="Margen Neto %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tasas de Crecimiento */}
      {showGrowthRates && growthChartData.length > 0 && (
        <div className="glass-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-light mb-4">Tasas de Crecimiento Período a Período</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={growthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="periodo" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(1)}%`, '']}
                labelFormatter={(label) => `Período: ${label}`}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#10B981" name="Crecimiento Ingresos %" />
              <Line 
                type="monotone" 
                dataKey="utilidad_neta" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                name="Crecimiento Utilidad Neta %"
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Análisis de Gastos y Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gastos */}
        <div className="glass-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-light mb-4">Top Gastos - {formatPeriod(data.periodo_principal)}</h3>
          
          <div className="space-y-3">
            {data.analisis_gastos?.slice(0, 8).map((gasto, index) => {
              const percentage = (gasto.monto / data.datos_periodo_principal.ingresos_totales) * 100;
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-light truncate">
                      {gasto.cuenta}
                    </div>
                    <div className="text-xs text-text-muted">
                      {percentage.toFixed(1)}% de ingresos
                    </div>
                  </div>
                  <div className="text-sm font-mono text-accent">
                    {formatCurrency(gasto.monto)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights Automáticos */}
        <div className="glass-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-light mb-4">💡 Insights Automáticos</h3>
          
          <div className="space-y-3">
            {data.insights?.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <div className="text-sm text-text-secondary">
                  {insight}
                </div>
              </div>
            ))}
            
            {(!data.insights || data.insights.length === 0) && (
              <div className="text-center py-8 text-text-muted">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay insights disponibles para este período</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="glass-card p-6 rounded-lg border border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <h3 className="text-lg font-semibold text-light mb-4">📊 Resumen Ejecutivo</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {formatCurrency(data.datos_periodo_principal.ingresos_totales)}
            </div>
            <div className="text-sm text-text-muted">Ingresos Totales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(data.datos_periodo_principal.utilidad_bruta)}
            </div>
            <div className="text-sm text-text-muted">Utilidad Bruta</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(data.datos_periodo_principal.utilidad_operativa)}
            </div>
            <div className="text-sm text-text-muted">Utilidad Operativa</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              data.datos_periodo_principal.utilidad_neta >= 0 ? 'text-purple-400' : 'text-red-400'
            }`}>
              {formatCurrency(data.datos_periodo_principal.utilidad_neta)}
            </div>
            <div className="text-sm text-text-muted">Utilidad Neta</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDashboard;