/**
 * ParetoChart - Gráfico de Pareto con análisis 80/20
 * Muestra barras + línea acumulativa con toggle buttons
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Title, BarChart, LineChart } from '@tremor/react';
import { motion } from 'framer-motion';
import api from '../../../services/api';

interface ParetoChartProps {
  filters: {
    year?: number;
    month?: number;
    categoria?: string;
    canal?: string;
    vendedor?: string;
    cliente?: string;
  };
}

type AnalysisType = 'sales' | 'volume' | 'profit';
type Dimension = 'producto' | 'cliente' | 'categoria';

export default function ParetoChart({ filters }: ParetoChartProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('sales');
  const [dimension, setDimension] = useState<Dimension>('producto');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [analysisType, dimension, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        analysis_type: analysisType,
        dimension: dimension,
        limit: '20'
      });

      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/analysis/pareto?${params}`);
      if (response.data.success) {
        setData(response.data.data);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error loading Pareto data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysisTypes = [
    {
      value: 'sales' as AnalysisType,
      label: 'Ventas (USD)',
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]'
    },
    {
      value: 'volume' as AnalysisType,
      label: 'Volumen (m²)',
      color: 'emerald',
      gradient: 'from-emerald-500 to-green-600',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.6)]'
    },
    {
      value: 'profit' as AnalysisType,
      label: 'Rentabilidad (USD)',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-600',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.6)]'
    }
  ];

  const dimensions = [
    { value: 'producto' as Dimension, label: 'Producto' },
    { value: 'cliente' as Dimension, label: 'Cliente' },
    { value: 'categoria' as Dimension, label: 'Categoría' }
  ];

  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.name,
      Valor: item.value,
      '% Acumulado': item.cumulative_percentage
    }));
  }, [data]);

  const valueFormatter = (value: number) => {
    if (analysisType === 'volume') {
      return `${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m²`;
    }
    return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const percentageFormatter = (value: number) => `${value.toFixed(1)}%`;

  const currentAnalysis = analysisTypes.find(t => t.value === analysisType);

  return (
    <Card className="glass-panel border-2 border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 shadow-2xl backdrop-blur-xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
              Análisis de Pareto
            </Title>
            <p className="text-sm text-slate-400 font-medium">Principio 80/20 - Identifica los elementos clave del negocio</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold text-cyan-400">
              {valueFormatter(total)}
            </div>
          </div>
        </div>

        {/* Toggle Buttons - Tipo de Análisis */}
        <div className="flex flex-wrap gap-3 mb-4">
          {analysisTypes.map((type) => (
            <motion.button
              key={type.value}
              type="button"
              onClick={() => setAnalysisType(type.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300
                ${analysisType === type.value
                  ? `bg-gradient-to-r ${type.gradient} text-white ${type.glow} border-2 border-white/20`
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border-2 border-slate-700/40 hover:border-slate-600/60'
                }
              `}
            >
              {type.label}
            </motion.button>
          ))}
        </div>

        {/* Toggle Buttons - Dimensión */}
        <div className="flex flex-wrap gap-2">
          {dimensions.map((dim) => (
            <motion.button
              key={dim.value}
              type="button"
              onClick={() => setDimension(dim.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300
                ${dimension === dim.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'bg-slate-800/40 text-slate-500 hover:bg-slate-700/60 hover:text-slate-300 border border-slate-700/40'
                }
              `}
            >
              {dim.label}
            </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/30 border-t-cyan-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Cargando análisis Pareto...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-4 opacity-40">📊</div>
            <p className="text-slate-500 font-medium">No hay datos disponibles</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Gráfico de barras */}
          <div className="h-96 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <BarChart
              data={chartData}
              index="name"
              categories={["Valor"]}
              colors={[currentAnalysis?.color || 'cyan']}
              valueFormatter={valueFormatter}
              showGridLines={true}
              showLegend={false}
              className="h-full"
            />
          </div>

          {/* Línea acumulativa */}
          <div className="h-64 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <div className="mb-4">
              <Title className="text-xl font-bold text-amber-400 mb-1">
                Porcentaje Acumulado (Principio 80/20)
              </Title>
              <p className="text-xs text-slate-500">Curva de Pareto mostrando concentración del valor</p>
            </div>
            <LineChart
              data={chartData}
              index="name"
              categories={["% Acumulado"]}
              colors={["amber"]}
              valueFormatter={percentageFormatter}
              showGridLines={true}
              showLegend={false}
              className="h-full"
              yAxisWidth={60}
            />
          </div>

          {/* Análisis de texto */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-purple-500/20 border-2 border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.3)]"
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">💡</div>
              <div>
                <p className="text-base text-slate-200 font-medium leading-relaxed">
                  <span className="font-black text-cyan-400 text-lg">Análisis 80/20:</span>{' '}
                  {data.length > 0 && (
                    <>
                      Los primeros <strong className="text-emerald-400">{Math.ceil(data.length * 0.2)}</strong> {dimension}s
                      generan el <strong className="text-amber-400 text-lg">{data[Math.ceil(data.length * 0.2) - 1]?.cumulative_percentage.toFixed(1)}%</strong> del total.
                      {data[Math.ceil(data.length * 0.5) - 1] && (
                        <> La mitad genera el <strong className="text-purple-400">{data[Math.ceil(data.length * 0.5) - 1]?.cumulative_percentage.toFixed(1)}%</strong>.</>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Card>
  );
}
