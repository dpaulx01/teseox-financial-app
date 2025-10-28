/**
 * AnalisisGerencial - Vista gerencial estilo presentación
 * Enfoque en m², eficiencia y análisis Pareto
 */
import React, { useState, useEffect } from 'react';
import { Grid, Title, Text } from '@tremor/react';
import { motion } from 'framer-motion';
import {
  CubeIcon,
  CurrencyDollarIcon,
  ChartBarSquareIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import KPICardGerencial from './KPICardGerencial';
import ParetoChart from './ParetoChart';
import EvolutionChart from './EvolutionChart';
import RankingChart from './RankingChart';

interface AnalisisGerencialProps {
  filters: {
    year?: number;
    month?: number;
    categoria?: string;
    canal?: string;
    vendedor?: string;
    cliente?: string;
  };
}

interface KPIData {
  total_m2: number;
  venta_neta_total: number;
  precio_neto_m2: number;
  margen_m2: number;
  costo_m2: number;
  porcentaje_descuento: number;
  margen_sobre_costo: number;
  rentabilidad_total: number;
}

export default function AnalisisGerencial({ filters }: AnalisisGerencialProps) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKPIs();
  }, [filters]);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/kpis/gerencial?${params}`);
      if (response.data.success) {
        setKpiData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 border-2 border-violet-500/30">
          <span className="text-4xl">📊</span>
          <Title className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">
            Análisis Gerencial
          </Title>
        </div>
        <Text className="text-xl text-slate-300 font-medium max-w-3xl mx-auto">
          Enfoque en eficiencia, m² y el Principio de Pareto 80/20
        </Text>
      </motion.div>

      {/* KPIs Gerenciales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-full" />
          <Title className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            El Panorama General
          </Title>
          <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-full" />
        </div>
        <Grid numItemsLg={4} className="gap-6">
          <KPICardGerencial
            value={kpiData?.total_m2.toLocaleString('es-CO', { maximumFractionDigits: 0 }) || '0'}
            label="m² Totales"
            subtitle="Volumen producido/vendido"
            color="primary"
            icon={<CubeIcon className="h-8 w-8" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`$${kpiData?.precio_neto_m2.toFixed(2) || '0.00'}`}
            label="Precio Neto/m²"
            subtitle="Precio promedio después de descuentos"
            color="accent"
            icon={<CurrencyDollarIcon className="h-8 w-8" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`~${kpiData?.margen_sobre_costo.toFixed(0) || '0'}%`}
            label="Margen sobre Costo"
            subtitle="Rentabilidad vs costo de venta"
            color="success"
            icon={<ChartBarSquareIcon className="h-8 w-8" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`${kpiData?.porcentaje_descuento.toFixed(1) || '0.0'}%`}
            label="Descuento Promedio"
            subtitle="% sobre precio bruto"
            color="warning"
            icon={<ReceiptPercentIcon className="h-8 w-8" />}
            loading={loading}
          />
        </Grid>
      </motion.div>

      {/* Insights adicionales */}
      {kpiData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border-2 border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Margen por m²
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
              ${kpiData.margen_m2.toFixed(2)}
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Rentabilidad unitaria
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent border-2 border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Costo por m²
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
              ${kpiData.costo_m2.toFixed(2)}
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Costo de venta unitario
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent border-2 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Ventas Totales
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
              ${kpiData.venta_neta_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Venta neta del período
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Análisis de Pareto */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ParetoChart filters={filters} />
      </motion.div>

      {/* Evolución Temporal y Ranking */}
      <Grid numItemsLg={2} className="gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <EvolutionChart filters={filters} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <RankingChart filters={filters} />
        </motion.div>
      </Grid>

      {/* Mensaje final inspirador */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative overflow-hidden text-center p-10 rounded-3xl bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-pink-500/30 border-2 border-violet-400/50 shadow-[0_0_40px_rgba(139,92,246,0.4)]"
      >
        {/* Efecto de brillo superior */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative">
          <div className="text-6xl mb-4">💡</div>
          <Title className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 mb-4">
            Enfoque en lo que Genera Valor
          </Title>
          <Text className="text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed font-medium">
            El análisis de Pareto demuestra que un número reducido de productos, clientes o categorías
            impulsa la mayor parte del negocio. <span className="text-violet-300 font-bold">Concentrar esfuerzos en estos elementos clave</span> maximiza
            la rentabilidad y eficiencia operativa.
          </Text>
        </div>

        {/* Partículas decorativas */}
        <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-violet-400/40 animate-pulse" />
        <div className="absolute bottom-6 left-6 w-2 h-2 rounded-full bg-pink-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-purple-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
      </motion.div>
    </div>
  );
}
