/**
 * ParetoChart - Gráfico de Pareto con análisis 80/20
 * Usando Chart.js para colores correctos en dual-theme
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Title } from '@tremor/react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ChartTitle,
  Tooltip,
  Legend
);

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
    { value: 'sales' as AnalysisType, label: 'Ventas (USD)', color: '#00F0FF' },
    { value: 'volume' as AnalysisType, label: 'Volumen (m²)', color: '#00FF99' },
    { value: 'profit' as AnalysisType, label: 'Rentabilidad (USD)', color: '#8000FF' }
  ];

  const dimensions = [
    { value: 'producto' as Dimension, label: 'Producto' },
    { value: 'cliente' as Dimension, label: 'Cliente' },
    { value: 'categoria' as Dimension, label: 'Categoría' }
  ];

  const currentAnalysis = analysisTypes.find(t => t.value === analysisType);

  const barChartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: 'Valor',
        data: data.map(item => item.value),
        backgroundColor: currentAnalysis?.color + '40',
        borderColor: currentAnalysis?.color,
        borderWidth: 2,
      }
    ]
  };

  const lineChartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: '% Acumulado',
        data: data.map(item => item.cumulative_percentage),
        borderColor: '#FFB800',
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#FFB800',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const barOptions = {
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
            const value = context.parsed.y;
            if (analysisType === 'volume') {
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
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
        },
        ticks: {
          color: '#8B9DC3',
          callback: (value: any) => {
            if (analysisType === 'volume') {
              return `${(value / 1000).toFixed(0)}k m²`;
            }
            return `$${(value / 1000).toFixed(0)}k`;
          }
        }
      }
    }
  };

  const lineOptions = {
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
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(1)}%`
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
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
        },
        ticks: {
          color: '#8B9DC3',
          callback: (value: any) => `${value}%`
        },
        min: 0,
        max: 100
      }
    }
  };

  const valueFormatter = (value: number) => {
    if (analysisType === 'volume') {
      return `${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m²`;
    }
    return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-right ml-auto">
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
          <div className="h-96 glass-card p-4 border border-border rounded-lg">
            <Bar data={barChartData} options={barOptions} />
          </div>

          {/* Línea acumulativa */}
          <div className="h-64 glass-card p-4 border border-border rounded-lg">
            <Title className="text-lg mb-3 text-text-secondary">
              Porcentaje Acumulado (Principio 80/20)
            </Title>
            <div className="h-48">
              <Line data={lineChartData} options={lineOptions} />
            </div>
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
    </div>
  );
}
