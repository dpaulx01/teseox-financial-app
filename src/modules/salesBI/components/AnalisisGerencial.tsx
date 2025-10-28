/**
 * AnalisisGerencial - Vista gerencial estilo presentación
 * Con navegación rápida y secciones colapsables
 */
import React, { useState, useEffect, useRef } from 'react';
import { Grid, Title, Text } from '@tremor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  CurrencyDollarIcon,
  ChartBarSquareIcon,
  ReceiptPercentIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  Bars3BottomLeftIcon
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

type SectionId = 'kpis' | 'pareto' | 'evolution' | 'ranking';

interface Section {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'kpis', label: 'KPIs Generales', icon: <ChartBarSquareIcon className="h-5 w-5" /> },
  { id: 'pareto', label: 'Análisis Pareto', icon: <ChartPieIcon className="h-5 w-5" /> },
  { id: 'evolution', label: 'Evolución Temporal', icon: <ArrowTrendingUpIcon className="h-5 w-5" /> },
  { id: 'ranking', label: 'Top 10 Categorías', icon: <Bars3BottomLeftIcon className="h-5 w-5" /> }
];

export default function AnalisisGerencial({ filters }: AnalisisGerencialProps) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    kpis: false,
    pareto: false,
    evolution: false,
    ranking: false
  });
  const [activeSection, setActiveSection] = useState<SectionId>('kpis');

  // Refs para scroll
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    kpis: null,
    pareto: null,
    evolution: null,
    ranking: null
  });

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('analisis-gerencial-collapsed');
    if (savedState) {
      try {
        setCollapsed(JSON.parse(savedState));
      } catch (e) {
        console.error('Error loading collapsed state:', e);
      }
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('analisis-gerencial-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // IntersectionObserver para detectar sección activa
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    Object.entries(sectionRefs.current).forEach(([id, ref]) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveSection(id as SectionId);
            }
          },
          { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

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

  const toggleSection = (sectionId: SectionId) => {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const scrollToSection = (sectionId: SectionId) => {
    const ref = sectionRefs.current[sectionId];
    if (ref) {
      // Expandir la sección si está colapsada
      if (collapsed[sectionId]) {
        setCollapsed(prev => ({ ...prev, [sectionId]: false }));
      }
      // Scroll suave
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const CollapsibleSection = ({
    id,
    title,
    subtitle,
    children
  }: {
    id: SectionId;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => {
    const isCollapsed = collapsed[id];

    return (
      <div
        ref={(el) => { sectionRefs.current[id] = el; }}
        className="rounded-2xl border border-border/60 bg-dark-card/40 overflow-hidden shadow-lg"
      >
        {/* Header with collapse button */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-card/60 transition-colors"
          onClick={() => toggleSection(id)}
        >
          <div className="flex-1">
            <Title className="text-2xl font-display text-primary mb-1">
              {title}
            </Title>
            {subtitle && (
              <Text className="text-sm text-text-muted">{subtitle}</Text>
            )}
          </div>
          <button
            type="button"
            className="ml-4 p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleSection(id);
            }}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="h-6 w-6 text-primary" />
            ) : (
              <ChevronUpIcon className="h-6 w-6 text-primary" />
            )}
          </button>
        </div>

        {/* Collapsible content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="relative flex">
      {/* Quick Navigation Sidebar */}
      <div className="sticky top-24 h-fit w-16 lg:w-20 flex-shrink-0 mr-4">
        <div className="flex flex-col gap-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`
                group relative p-3 rounded-xl transition-all duration-200
                ${activeSection === section.id
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'bg-dark-card/60 text-text-muted hover:bg-dark-card hover:text-text-secondary border border-border/40'
                }
              `}
              title={section.label}
            >
              {section.icon}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-dark-card border border-border shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {section.label}
              </div>
            </button>
          ))}

          {/* Collapse All / Expand All */}
          <div className="border-t border-border/40 pt-2 mt-2">
            <button
              type="button"
              onClick={() => {
                const allCollapsed = Object.values(collapsed).every(v => v);
                const newState = !allCollapsed;
                setCollapsed({
                  kpis: newState,
                  pareto: newState,
                  evolution: newState,
                  ranking: newState
                });
              }}
              className="group w-full p-3 rounded-xl bg-dark-card/60 text-text-muted hover:bg-dark-card hover:text-accent border border-border/40 transition-all"
              title="Colapsar/Expandir Todo"
            >
              {Object.values(collapsed).every(v => v) ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronUpIcon className="h-5 w-5" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-dark-card border border-border shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {Object.values(collapsed).every(v => v) ? 'Expandir Todo' : 'Colapsar Todo'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-6 pl-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Title className="text-4xl font-display text-primary mb-2">
            Análisis Gerencial
          </Title>
          <Text className="text-lg text-text-secondary">
            Enfoque en eficiencia, m² y el Principio de Pareto 80/20
          </Text>
        </motion.div>

        {/* KPIs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CollapsibleSection
            id="kpis"
            title="El Panorama General"
            subtitle="KPIs clave del período"
          >
            <Grid numItemsLg={4} className="gap-4 mb-6">
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

            {/* Insights adicionales */}
            {kpiData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            )}
          </CollapsibleSection>
        </motion.div>

        {/* Pareto Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CollapsibleSection
            id="pareto"
            title="Análisis de Pareto"
            subtitle="Principio 80/20 - Elementos clave del negocio"
          >
            <ParetoChart filters={filters} />
          </CollapsibleSection>
        </motion.div>

        {/* Evolution Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CollapsibleSection
            id="evolution"
            title="Evolución Temporal"
            subtitle="Precio Neto vs Descuento en el tiempo"
          >
            <EvolutionChart filters={filters} />
          </CollapsibleSection>
        </motion.div>

        {/* Ranking Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CollapsibleSection
            id="ranking"
            title="Top 10 Categorías"
            subtitle="Ranking por volumen, ventas o rentabilidad"
          >
            <RankingChart filters={filters} />
          </CollapsibleSection>
        </motion.div>

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
    </div>
  );
}
