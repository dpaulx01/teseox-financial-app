/**
 * EvolutionChart - Gráfico de evolución temporal con dual-axis
 * Muestra precio/m² vs descuento% o margen vs volumen
 */
import React, { useState, useEffect } from 'react';
import { Card, Title, LineChart } from '@tremor/react';
import { motion } from 'framer-motion';
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

  const priceFormatter = (value: number) => `$${value.toFixed(2)}`;
  const percentFormatter = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card className="glass-panel border-2 border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 shadow-2xl backdrop-blur-xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="flex-1">
            <Title className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-1">
              Evolución: Precio Neto vs Descuento
            </Title>
            <p className="text-sm text-slate-400 font-medium">
              Análisis temporal de la presión sobre el precio
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Cargando evolución temporal...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-4 opacity-40">📈</div>
            <p className="text-slate-500 font-medium">No hay datos suficientes para mostrar la evolución</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-80 mb-6 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <LineChart
              data={chartData}
              index="period"
              categories={["Precio/m²", "Descuento %"]}
              colors={["cyan", "amber"]}
              valueFormatter={priceFormatter}
              showGridLines={true}
              showLegend={true}
              className="h-full"
              yAxisWidth={80}
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
              <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Precio Neto/m²
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-white">
                    ${data[data.length - 1].precio_neto_m2.toFixed(2)}
                  </span>
                  <span className={`text-base font-bold px-2 py-0.5 rounded-full ${
                    data[data.length - 1].precio_neto_m2 >= data[0].precio_neto_m2
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {data[data.length - 1].precio_neto_m2 >= data[0].precio_neto_m2 ? '↑' : '↓'}
                    {' '}
                    {Math.abs(
                      ((data[data.length - 1].precio_neto_m2 - data[0].precio_neto_m2) / data[0].precio_neto_m2 * 100)
                    ).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  vs inicio del período
                </p>
              </div>

              {/* Descuento */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border-2 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Descuento Promedio
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-white">
                    {data[data.length - 1].porcentaje_descuento.toFixed(1)}%
                  </span>
                  <span className={`text-base font-bold px-2 py-0.5 rounded-full ${
                    data[data.length - 1].porcentaje_descuento <= data[0].porcentaje_descuento
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {data[data.length - 1].porcentaje_descuento <= data[0].porcentaje_descuento ? '↓' : '↑'}
                    {' '}
                    {Math.abs(data[data.length - 1].porcentaje_descuento - data[0].porcentaje_descuento).toFixed(1)}pp
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
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
