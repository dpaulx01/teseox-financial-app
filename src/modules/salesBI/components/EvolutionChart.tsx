/**
 * EvolutionChart - Gráfico de evolución temporal
 * Muestra precio/m² vs descuento% con diseño profesional
 */
import React, { useState, useEffect } from 'react';
import { Card, Title, LineChart } from '@tremor/react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../../services/api';

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

  const chartData = data.map(item => ({
    period: item.period,
    'Precio/m²': item.precio_neto_m2,
    'Descuento %': item.porcentaje_descuento
  }));

  // Dual-axis: precio como número, descuento como porcentaje
  const valueFormatter = (value: number, category: string) => {
    if (category === 'Descuento %') {
      return `${value.toFixed(1)}%`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-dark-card/60 p-6 shadow-inner">
      <div className="mb-6">
        <Title className="text-2xl font-display text-primary mb-1">
          Evolución: Precio Neto vs Descuento
        </Title>
        <p className="text-sm text-text-muted">
          Análisis temporal de la presión sobre el precio
        </p>
      </div>

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
          <div className="h-80 mb-6">
            <LineChart
              data={chartData}
              index="period"
              categories={["Precio/m²", "Descuento %"]}
              colors={["sky", "amber"]}
              valueFormatter={valueFormatter}
              showGridLines={true}
              showLegend={true}
              className="h-full"
              yAxisWidth={80}
              curveType="monotone"
            />
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
    </Card>
  );
}
