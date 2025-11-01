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

// Componente de Insights Inteligentes
interface InsightsInteligentesProps {
  kpiData: KPIData;
  filters: any;
}

function InsightsInteligentes({ kpiData, filters }: InsightsInteligentesProps) {
  const [paretoData, setParetoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParetoInsights();
  }, [filters]);

  const loadParetoInsights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dimension: 'producto', analysis_type: 'sales' });
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);

      const response = await api.get(`/api/sales-bi/analysis/pareto?${params}`);
      if (response.data.success) {
        setParetoData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading pareto insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar insights inteligentes basados en datos reales
  const generateInsights = () => {
    if (!kpiData || loading || !paretoData) return [];

    const insights: Array<{type: 'warning' | 'success' | 'info' | 'alert', message: string}> = [];

    // 1. Análisis de Margen sobre Costo MP
    const margenCosto = kpiData.margen_sobre_costo;
    if (margenCosto < 20) {
      insights.push({
        type: 'alert',
        message: `⚠️ Margen sobre costo MP crítico (${margenCosto.toFixed(1)}%). Los costos de materia prima están consumiendo más del 80% del precio de venta. Evalúe renegociación con proveedores o ajuste de precios.`
      });
    } else if (margenCosto < 35) {
      insights.push({
        type: 'warning',
        message: `📊 Margen sobre costo MP moderado (${margenCosto.toFixed(1)}%). Existe oportunidad de optimización. Considere análisis de proveedores alternativos o economías de escala.`
      });
    } else if (margenCosto >= 50) {
      insights.push({
        type: 'success',
        message: `✅ Excelente margen sobre costo MP (${margenCosto.toFixed(1)}%). El control de costos de materia prima es sólido y genera alta rentabilidad.`
      });
    }

    // 2. Análisis de Descuentos
    const descuento = kpiData.porcentaje_descuento;
    if (descuento > 15) {
      insights.push({
        type: 'warning',
        message: `💰 Nivel de descuentos elevado (${descuento.toFixed(1)}%). Esto representa una pérdida significativa de margen. Revise política comercial y condiciones de negociación con clientes principales.`
      });
    } else if (descuento > 10) {
      insights.push({
        type: 'info',
        message: `📉 Descuentos en nivel medio (${descuento.toFixed(1)}%). Monitoree que no erosionen la rentabilidad objetivo. Considere descuentos por volumen estructurados.`
      });
    } else {
      insights.push({
        type: 'success',
        message: `✨ Política de descuentos controlada (${descuento.toFixed(1)}%). Se mantiene una buena disciplina de precios que protege los márgenes.`
      });
    }

    // 3. Análisis de Concentración (Pareto)
    if (paretoData && paretoData.length > 0) {
      const top3 = paretoData.slice(0, 3);
      const top3Sales = top3.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const totalSales = paretoData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const concentracion = (top3Sales / totalSales) * 100;

      if (concentracion > 70) {
        insights.push({
          type: 'alert',
          message: `🎯 Alta concentración del negocio: El top 3 representa ${concentracion.toFixed(0)}% de las ventas. Existe riesgo de dependencia excesiva. Estrategia recomendada: diversificar cartera y desarrollar nuevos productos/clientes.`
        });
      } else if (concentracion > 50) {
        insights.push({
          type: 'warning',
          message: `📊 Concentración moderada: El top 3 genera ${concentracion.toFixed(0)}% de las ventas. Balancee enfoque en estrellas con desarrollo de nuevas oportunidades.`
        });
      } else {
        insights.push({
          type: 'success',
          message: `🌟 Cartera diversificada: El top 3 representa ${concentracion.toFixed(0)}% de ventas. Buena distribución de riesgo, aunque identifique los drivers principales para maximizar eficiencia.`
        });
      }
    }

    // 4. Análisis de Rentabilidad por m²
    const margenM2 = kpiData.margen_m2;
    const precioNetoM2 = kpiData.precio_neto_m2;
    const eficienciaRentabilidad = (margenM2 / precioNetoM2) * 100;

    if (eficienciaRentabilidad < 25) {
      insights.push({
        type: 'warning',
        message: `📐 Eficiencia por m² mejorable: El margen es ${eficienciaRentabilidad.toFixed(1)}% del precio neto/m². Analice mix de productos y optimice hacia mayor valor agregado por unidad de volumen.`
      });
    } else if (eficienciaRentabilidad >= 35) {
      insights.push({
        type: 'success',
        message: `🏆 Excelente eficiencia por m²: Está generando ${eficienciaRentabilidad.toFixed(1)}% de margen sobre precio neto/m². El mix de productos está bien optimizado.`
      });
    }

    // 5. Recomendación Estratégica Principal
    if (margenCosto >= 35 && descuento < 10 && concentracion <= 60) {
      insights.push({
        type: 'success',
        message: `🎯 Operación saludable: KPIs en rangos óptimos. Estrategia recomendada: Mantener disciplina operativa y explorar crecimiento en segmentos de alto margen.`
      });
    } else if (margenCosto < 30 || descuento > 12) {
      insights.push({
        type: 'alert',
        message: `🔍 Acción inmediata requerida: Los márgenes están bajo presión. Priorice: 1) Renegociación de costos MP con proveedores, 2) Revisión de política de descuentos, 3) Análisis de rentabilidad por cliente/producto.`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
        <div className="animate-pulse">
          <div className="h-6 bg-primary/20 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-primary/10 rounded w-96 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'alert': return '🚨';
      default: return '💡';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'success': return 'from-emerald-500/10 to-emerald-400/5 border-emerald-500/30';
      case 'warning': return 'from-amber-500/10 to-amber-400/5 border-amber-500/30';
      case 'alert': return 'from-red-500/10 to-red-400/5 border-red-500/30';
      default: return 'from-sky-500/10 to-sky-400/5 border-sky-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Title className="text-2xl font-display text-primary mb-2">
          💡 Insights & Recomendaciones Estratégicas
        </Title>
        <Text className="text-text-muted">
          Análisis inteligente basado en tus datos actuales
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl bg-gradient-to-r ${getColorForType(insight.type)} border backdrop-blur-sm`}
          >
            <Text className="text-text-primary leading-relaxed">
              {insight.message}
            </Text>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

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
                label="Margen sobre Costo MP"
                subtitle="Rentabilidad vs costo materia prima"
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
                    Rentabilidad unitaria (MP)
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-dark-card/40 p-4">
                  <div className="text-xs font-semibold text-purple-400 uppercase mb-1">
                    Costo MP por m²
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    ${kpiData.costo_m2.toFixed(2)}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Costo materia prima unitario
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

        {/* Insights Inteligentes - Análisis Dinámico */}
        {kpiData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <InsightsInteligentes kpiData={kpiData} filters={filters} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
