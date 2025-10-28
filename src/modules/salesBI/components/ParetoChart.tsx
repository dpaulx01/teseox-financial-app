/**
 * ParetoChart - Gráfico de Pareto con análisis 80/20
 * Diseño profesional con soporte dual-theme
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
    { value: 'sales' as AnalysisType, label: 'Ventas (USD)', color: 'sky' },
    { value: 'volume' as AnalysisType, label: 'Volumen (m²)', color: 'emerald' },
    { value: 'profit' as AnalysisType, label: 'Rentabilidad (USD)', color: 'purple' }
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
    <Card className="rounded-2xl border border-border/60 bg-dark-card/60 p-6 shadow-inner">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title className="text-2xl font-display text-primary mb-1">
              Análisis de Pareto
            </Title>
            <p className="text-sm text-text-muted">Principio 80/20 - Elementos clave del negocio</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-muted uppercase mb-1">Total</div>
            <div className="text-lg font-bold text-accent">
              {valueFormatter(total)}
            </div>
          </div>
        </div>

        {/* Toggle Buttons - Tipo de Análisis */}
        <div className="flex flex-wrap gap-2 mb-3">
          {analysisTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setAnalysisType(type.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${analysisType === type.value
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'bg-dark-card/40 text-text-muted hover:bg-dark-card hover:text-text-secondary border border-border/40'
                }
              `}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Toggle Buttons - Dimensión */}
        <div className="flex flex-wrap gap-2">
          {dimensions.map((dim) => (
            <button
              key={dim.value}
              type="button"
              onClick={() => setDimension(dim.value)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                ${dimension === dim.value
                  ? 'bg-accent text-white'
                  : 'bg-dark-card/40 text-text-muted hover:bg-dark-card/60 hover:text-text-secondary'
                }
              `}
            >
              {dim.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-muted">Cargando análisis Pareto...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-40">📊</div>
            <p className="text-text-muted">No hay datos disponibles</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Gráfico de barras */}
          <div className="h-96">
            <BarChart
              data={chartData}
              index="name"
              categories={["Valor"]}
              colors={[currentAnalysis?.color || 'sky']}
              valueFormatter={valueFormatter}
              showGridLines={true}
              showLegend={false}
              className="h-full"
            />
          </div>

          {/* Línea acumulativa */}
          <div className="h-64">
            <Title className="text-lg mb-3 text-text-secondary">
              Porcentaje Acumulado (Principio 80/20)
            </Title>
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
            className="p-4 rounded-xl bg-primary/10 border border-primary/30"
          >
            <p className="text-sm text-text-secondary">
              <span className="font-bold text-primary">Análisis 80/20:</span>{' '}
              {data.length > 0 && (
                <>
                  Los primeros <strong className="text-accent">{Math.ceil(data.length * 0.2)}</strong> {dimension}s
                  generan el <strong className="text-amber-400">{data[Math.ceil(data.length * 0.2) - 1]?.cumulative_percentage.toFixed(1)}%</strong> del total.
                  {data[Math.ceil(data.length * 0.5) - 1] && (
                    <> La mitad genera el <strong className="text-purple-400">{data[Math.ceil(data.length * 0.5) - 1]?.cumulative_percentage.toFixed(1)}%</strong>.</>
                  )}
                </>
              )}
            </p>
          </motion.div>
        </div>
      )}
    </Card>
  );
}
