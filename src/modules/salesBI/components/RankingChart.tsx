/**
 * RankingChart - Gráfico de ranking horizontal
 * Usando Chart.js para colores y nombres completos
 */
import React, { useState, useEffect } from 'react';
import { Title } from '@tremor/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

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
    { value: 'volume' as Metric, label: 'Volumen (m²)', color: '#00FF99' },
    { value: 'sales' as Metric, label: 'Ventas (USD)', color: '#00F0FF' },
    { value: 'profit' as Metric, label: 'Rentabilidad MP (USD)', color: '#8000FF' },
    { value: 'margin_m2' as Metric, label: 'Margen MP/m²', color: '#FFB800' }
  ];

  const currentMetric = metrics.find(m => m.value === metric);

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: 'Valor',
        data: data.map(item => item.value),
        backgroundColor: currentMetric?.color + '40',
        borderColor: currentMetric?.color,
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 37, 0.95)',
        titleColor: '#00F0FF',
        bodyColor: '#E0E7FF',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.x;
            if (metric === 'volume') {
              return `${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m²`;
            }
            return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
        },
        ticks: {
          color: '#8B9DC3',
          callback: (value: any) => {
            if (metric === 'volume') {
              return `${(value / 1000).toFixed(0)}k m²`;
            }
            return `$${(value / 1000).toFixed(0)}k`;
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#8B9DC3',
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
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
        <div className="h-96 glass-card p-4 border border-border rounded-lg">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}
