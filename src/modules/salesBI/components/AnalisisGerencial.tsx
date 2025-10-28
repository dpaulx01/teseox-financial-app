/**
 * AnalisisGerencial - Vista gerencial estilo presentación
 * Diseño profesional con soporte dual-theme
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <Title className="text-4xl font-display text-primary mb-2">
          Análisis Gerencial
        </Title>
        <Text className="text-lg text-text-secondary">
          Enfoque en eficiencia, m² y el Principio de Pareto 80/20
        </Text>
      </motion.div>

      {/* KPIs Gerenciales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Title className="text-2xl font-display text-primary mb-4">
          El Panorama General
        </Title>
        <Grid numItemsLg={4} className="gap-4">
          <KPICardGerencial
            value={kpiData?.total_m2.toLocaleString('es-CO', { maximumFractionDigits: 0 }) || '0'}
            label="m² Totales"
            subtitle="Volumen producido/vendido"
            color="emerald"
            icon={<CubeIcon className="h-6 w-6" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`$${kpiData?.precio_neto_m2.toFixed(2) || '0.00'}`}
            label="Precio Neto/m²"
            subtitle="Precio promedio después de descuentos"
            color="sky"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`${kpiData?.margen_sobre_costo.toFixed(1) || '0'}%`}
            label="Margen sobre Costo"
            subtitle="Rentabilidad vs costo de venta"
            color="purple"
            icon={<ChartBarSquareIcon className="h-6 w-6" />}
            loading={loading}
          />

          <KPICardGerencial
            value={`${kpiData?.porcentaje_descuento.toFixed(1) || '0.0'}%`}
            label="Descuento Promedio"
            subtitle="% sobre precio bruto"
            color="amber"
            icon={<ReceiptPercentIcon className="h-6 w-6" />}
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
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
            <div className="text-xs font-semibold text-sky-400 uppercase mb-1">
              Margen por m²
            </div>
            <div className="text-2xl font-bold text-text-primary">
              ${kpiData.margen_m2.toFixed(2)}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Rentabilidad unitaria
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
            <div className="text-xs font-semibold text-purple-400 uppercase mb-1">
              Costo por m²
            </div>
            <div className="text-2xl font-bold text-text-primary">
              ${kpiData.costo_m2.toFixed(2)}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Costo de venta unitario
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
            <div className="text-xs font-semibold text-emerald-400 uppercase mb-1">
              Ventas Totales
            </div>
            <div className="text-2xl font-bold text-text-primary">
              ${kpiData.venta_neta_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Venta neta del período
            </p>
          </div>
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
        className="text-center p-6 rounded-2xl bg-primary/10 border border-primary/30"
      >
        <Title className="text-2xl font-display text-primary mb-2">
          Enfoque en lo que Genera Valor
        </Title>
        <Text className="text-text-secondary max-w-3xl mx-auto">
          El análisis de Pareto demuestra que un número reducido de productos, clientes o categorías
          impulsa la mayor parte del negocio. Concentrar esfuerzos en estos elementos clave maximiza
          la rentabilidad y eficiencia operativa.
        </Text>
      </motion.div>
    </div>
  );
}
