/**
 * RankingChart - Gráfico de ranking horizontal
 * Diseño profesional con nombres completos visibles
 */
import React, { useState, useEffect } from 'react';
import { Card, Title, BarChart } from '@tremor/react';
import { motion } from 'framer-motion';
import api from '../../../services/api';

interface RankingChartProps {
  filters: {
    year?: number;
    month?: number;
  };
}

type Metric = 'volume' | 'sales' | 'profit' | 'margin_m2';

export default function RankingChart({ filters }: RankingChartProps) {
  const [metric, setMetric] = useState<Metric>('volume');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [metric, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dimension: 'categoria',
        metric: metric,
        limit: '10'
      });

      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());

      const response = await api.get(`/api/sales-bi/analysis/ranking?${params}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { value: 'volume' as Metric, label: 'Volumen (m²)', color: 'emerald' },
    { value: 'sales' as Metric, label: 'Ventas (USD)', color: 'sky' },
    { value: 'profit' as Metric, label: 'Rentabilidad (USD)', color: 'purple' },
    { value: 'margin_m2' as Metric, label: 'Margen/m²', color: 'amber' }
  ];

  const chartData = data.map(item => ({
    name: item.name,
    Valor: item.value
  }));

  const valueFormatter = (value: number) => {
    if (metric === 'volume') {
      return `${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m²`;
    }
    return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const currentMetric = metrics.find(m => m.value === metric);

  return (
    <Card className="rounded-2xl border border-border/60 bg-dark-card/60 p-6 shadow-inner">
      <div className="mb-6">
        <Title className="text-2xl font-display text-primary mb-4">
          Top 10 Categorías
        </Title>

        {/* Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          {metrics.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${metric === m.value
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'bg-dark-card/40 text-text-muted hover:bg-dark-card hover:text-text-secondary border border-border/40'
                }
              `}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-muted">Cargando ranking...</p>
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
        <div className="h-96">
          <BarChart
            data={chartData}
            index="name"
            categories={["Valor"]}
            colors={[currentMetric?.color || 'sky']}
            valueFormatter={valueFormatter}
            layout="vertical"
            showGridLines={false}
            showLegend={false}
            className="h-full"
            yAxisWidth={200}
          />
        </div>
      )}
    </Card>
  );
}
