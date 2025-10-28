/**
 * RankingChart - Gráfico de ranking horizontal
 * Estilo presentación con barras horizontales
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
    {
      value: 'volume' as Metric,
      label: 'Volumen (m²)',
      color: 'emerald',
      gradient: 'from-emerald-500 to-green-600',
      icon: '📦'
    },
    {
      value: 'sales' as Metric,
      label: 'Ventas (USD)',
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-600',
      icon: '💰'
    },
    {
      value: 'profit' as Metric,
      label: 'Rentabilidad (USD)',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-600',
      icon: '📈'
    },
    {
      value: 'margin_m2' as Metric,
      label: 'Margen/m²',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600',
      icon: '💎'
    }
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
    <Card className="glass-panel border-2 border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 shadow-2xl backdrop-blur-xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="text-3xl">{currentMetric?.icon || '🏆'}</div>
          <div>
            <Title className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1">
              Top 10 Categorías
            </Title>
            <p className="text-sm text-slate-400 font-medium">
              Ranking por {currentMetric?.label.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          {metrics.map((m) => (
            <motion.button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300
                ${metric === m.value
                  ? `bg-gradient-to-r ${m.gradient} text-white shadow-lg`
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border border-slate-700/40'
                }
              `}
            >
              <span className="mr-1.5">{m.icon}</span>
              {m.label}
            </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500/30 border-t-emerald-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Cargando ranking...</p>
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
        <div className="h-96 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
          <BarChart
            data={chartData}
            index="name"
            categories={["Valor"]}
            colors={[currentMetric?.color || 'cyan']}
            valueFormatter={valueFormatter}
            layout="vertical"
            showGridLines={false}
            showLegend={false}
            className="h-full"
          />
        </div>
      )}
    </Card>
  );
}
