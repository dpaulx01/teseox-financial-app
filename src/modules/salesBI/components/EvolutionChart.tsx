/**
 * EvolutionChart - Gráfico de evolución temporal
 * Usando Chart.js para visualización correcta con colores
 */
import React, { useState, useEffect } from 'react';
import { Title } from '@tremor/react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

interface EvolutionChartProps {
  filters: {
    year?: number;
    categoria?: string;
    canal?: string;
  };
}

export default function EvolutionChart({ filters }: EvolutionChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric: 'price',
        group_by_period: 'month'
      });

      if (filters.year) params.append('year', filters.year.toString());
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);

      const response = await api.get(`/api/sales-bi/analysis/evolution?${params}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading evolution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: data.map(item => item.period),
    datasets: [
      {
        label: 'Precio/m²',
        data: data.map(item => item.precio_neto_m2),
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#00F0FF',
        pointBorderColor: '#00F0FF',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Descuento %',
        data: data.map(item => item.porcentaje_descuento),
        borderColor: '#FFB800',
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#FFB800',
        pointBorderColor: '#FFB800',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#E0E7FF',
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 37, 0.95)',
        titleColor: '#00F0FF',
        bodyColor: '#E0E7FF',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('%')) {
              return `${label}: ${value.toFixed(1)}%`;
            }
            return `${label}: $${value.toFixed(2)}`;
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
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
        },
        ticks: {
          color: '#8B9DC3',
          callback: (value: any) => `$${value.toFixed(0)}`
        },
        title: {
          display: true,
          text: 'Precio/m²',
          color: '#00F0FF'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#FFB800',
          callback: (value: any) => `${value.toFixed(0)}%`
        },
        title: {
          display: true,
          text: 'Descuento %',
          color: '#FFB800'
        }
      }
    }
  };

  return (
    <div className="space-y-6">

      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-muted">Cargando evolución temporal...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-40">📈</div>
            <p className="text-text-muted">No hay datos suficientes para mostrar la evolución</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-80 mb-6 glass-card p-4 border border-border rounded-lg">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Insights */}
          {data.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Precio Neto */}
              <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                    Precio Neto/m²
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-text-primary">
                    ${data[data.length - 1].precio_neto_m2.toFixed(2)}
                  </span>
                  <span className={`flex items-center text-sm font-semibold ${
                    data[data.length - 1].precio_neto_m2 >= data[0].precio_neto_m2
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {data[data.length - 1].precio_neto_m2 >= data[0].precio_neto_m2 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {Math.abs(
                      ((data[data.length - 1].precio_neto_m2 - data[0].precio_neto_m2) / data[0].precio_neto_m2 * 100)
                    ).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  vs inicio del período
                </p>
              </div>

              {/* Descuento */}
              <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Descuento Promedio
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-text-primary">
                    {data[data.length - 1].porcentaje_descuento.toFixed(1)}%
                  </span>
                  <span className={`flex items-center text-sm font-semibold ${
                    data[data.length - 1].porcentaje_descuento <= data[0].porcentaje_descuento
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {data[data.length - 1].porcentaje_descuento <= data[0].porcentaje_descuento ? (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    )}
                    {Math.abs(data[data.length - 1].porcentaje_descuento - data[0].porcentaje_descuento).toFixed(1)}pp
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  vs inicio del período
                </p>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
