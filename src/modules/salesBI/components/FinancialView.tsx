/**
 * FinancialView - Vista financiera con navegación y secciones colapsables
 * Ajustada con Chart.js para mantener la estética holográfica
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Card,
  Flex,
  Grid,
  Metric,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TableCellsIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../../../services/api';
import { appendTemporalFilters } from '../utils/filterUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  ChartTitle,
  Tooltip,
  Legend
);

interface Props {
  filters: any;
}

type SectionId = 'trends' | 'profitability' | 'detail';

interface Section {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'trends', label: 'Tendencias Mensuales', icon: <ArrowTrendingUpIcon className="h-5 w-5" /> },
  { id: 'profitability', label: 'Rentabilidad (MP)', icon: <BanknotesIcon className="h-5 w-5" /> },
  { id: 'detail', label: 'Detalle Financiero', icon: <TableCellsIcon className="h-5 w-5" /> },
];

export default function FinancialView({ filters }: Props) {
  const [groupBy, setGroupBy] = useState('categoria');
  const [data, setData] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    trends: false,
    profitability: false,
    detail: false,
  });
  const [activeSection, setActiveSection] = useState<SectionId>('trends');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  );
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'venta_neta',
    direction: 'desc'
  });

  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    trends: null,
    profitability: null,
    detail: null,
  });

  const currencyFormatter = useCallback(
    (value: number = 0) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value ?? 0),
    []
  );

  const chartPalette = useMemo(
    () =>
      isDarkMode
        ? {
            text: '#E0E7FF',
            grid: 'rgba(0, 240, 255, 0.12)',
            tooltipBg: 'rgba(26, 26, 37, 0.95)',
            tooltipText: '#E0E7FF',
            tooltipBorder: 'rgba(0, 240, 255, 0.25)',
          }
        : {
            text: '#1f2937',
            grid: 'rgba(148, 163, 184, 0.12)',
            tooltipBg: '#ffffff',
            tooltipText: '#1f2937',
            tooltipBorder: 'rgba(59, 130, 246, 0.2)',
          },
    [isDarkMode]
  );

  const sortedData = useMemo(() => {
    const rows = [...data];
    const { key, direction } = sortConfig;
    const getValue = (row: any) => {
      switch (key) {
        case 'dimension':
          return row.dimension?.toString().toLowerCase() || '';
        case 'venta_neta':
          return Number(row.venta_neta || 0);
        case 'costo_venta':
          return Number(row.costo_venta || 0);
        case 'rentabilidad':
          return Number(row.rentabilidad || 0);
        case 'margen_porcentaje':
          return Number(row.margen_porcentaje || 0);
        case 'ratio_costo_venta':
          return Number(row.ratio_costo_venta || 0);
        default:
          return 0;
      }
    };
    rows.sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);
      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return direction === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
    return rows;
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    );
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowsUpDownIcon className="h-3.5 w-3.5 opacity-60" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDownIcon className="h-3.5 w-3.5 text-primary" />
    );
  };

  useEffect(() => {
    const savedState = localStorage.getItem('financial-view-collapsed');
    if (savedState) {
      try {
        setCollapsed(JSON.parse(savedState));
      } catch (error) {
        console.error('Error loading collapsed state:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('financial-view-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

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
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadData(), loadTrends()]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, groupBy]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams({ group_by: groupBy, limit: '20' });
      appendTemporalFilters(params, filters);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/analysis/financial?${params}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const loadTrends = async () => {
    try {
      const params = new URLSearchParams();
      appendTemporalFilters(params, filters);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/trends/monthly?${params}`);
      if (response.data.success) {
        setTrendsData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading financial trends:', error);
    }
  };

  const toggleSection = (sectionId: SectionId) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const scrollToSection = (sectionId: SectionId) => {
    const ref = sectionRefs.current[sectionId];
    if (ref) {
      if (collapsed[sectionId]) {
        setCollapsed((prev) => ({ ...prev, [sectionId]: false }));
      }
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalRentabilidad = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.rentabilidad || 0), 0),
    [data]
  );
  const totalCosto = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.costo_venta || 0), 0),
    [data]
  );
  const promedioMargen = useMemo(() => {
    if (!data.length) return 0;
    const sum = data.reduce((acc: number, item: any) => acc + (item.margen_porcentaje || 0), 0);
    return sum / data.length;
  }, [data]);
  const donutData = useMemo(() => data.slice(0, 6), [data]);

  const trendsChartData = useMemo(() => {
    const labels = trendsData.map((item: any) => item.period);
    return {
      labels,
      datasets: [
        {
          label: 'Venta Neta',
          data: trendsData.map((item: any) => item.venta_neta || 0),
          borderColor: '#00F0FF',
          backgroundColor: 'rgba(0, 240, 255, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'Rentabilidad (MP)',
          data: trendsData.map((item: any) => item.rentabilidad || 0),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'Costo MP',
          data: trendsData.map((item: any) => item.costo_venta || 0),
          borderColor: '#F472B6',
          backgroundColor: 'rgba(244, 114, 182, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    };
  }, [trendsData]);

  const trendsChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: chartPalette.text,
            usePointStyle: true,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: chartPalette.tooltipBg,
          titleColor: chartPalette.tooltipText,
          bodyColor: chartPalette.tooltipText,
          borderColor: chartPalette.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${currencyFormatter(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: chartPalette.grid,
          },
          ticks: {
            color: chartPalette.text,
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          grid: {
            color: chartPalette.grid,
          },
          ticks: {
            color: chartPalette.text,
            callback: (value: number | string) => currencyFormatter(Number(value)),
          },
        },
      },
    }),
    [chartPalette, currencyFormatter]
  );

  const profitabilityChartData = useMemo(
    () => ({
      labels: data.map((item: any) => item.dimension || 'Sin definir'),
      datasets: [
        {
          label: 'Venta Neta',
          data: data.map((item: any) => item.venta_neta || 0),
          backgroundColor: 'rgba(0, 240, 255, 0.35)',
          borderColor: '#00F0FF',
          borderWidth: 1.5,
          stack: 'combined',
          borderRadius: 8,
        },
        {
          label: 'Costo MP',
          data: data.map((item: any) => item.costo_venta || 0),
          backgroundColor: 'rgba(244, 114, 182, 0.35)',
          borderColor: '#F472B6',
          borderWidth: 1.5,
          stack: 'combined',
          borderRadius: 8,
        },
        {
          label: 'Rentabilidad (MP)',
          data: data.map((item: any) => item.rentabilidad || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.45)',
          borderColor: '#10B981',
          borderWidth: 1.5,
          stack: 'combined',
          borderRadius: 8,
        },
      ],
    }),
    [data]
  );

  const profitabilityChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: chartPalette.text,
            usePointStyle: true,
            padding: 14,
          },
        },
        tooltip: {
          backgroundColor: chartPalette.tooltipBg,
          titleColor: chartPalette.tooltipText,
          bodyColor: chartPalette.tooltipText,
          borderColor: chartPalette.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${currencyFormatter(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            color: chartPalette.grid,
          },
          ticks: {
            color: chartPalette.text,
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          stacked: true,
          grid: {
            color: chartPalette.grid,
          },
          ticks: {
            color: chartPalette.text,
            callback: (value: number | string) => `$${(Number(value) / 1000).toFixed(0)}k`,
          },
        },
      },
    }),
    [chartPalette, currencyFormatter]
  );

  const doughnutChartData = useMemo(
    () => ({
      labels: donutData.map((item: any) => item.dimension || 'Sin definir'),
      datasets: [
        {
          data: donutData.map((item: any) => item.rentabilidad || 0),
          backgroundColor: [
            'rgba(0, 240, 255, 0.85)',    // Cyan brillante
            'rgba(0, 255, 153, 0.85)',    // Verde esmeralda
            'rgba(147, 51, 234, 0.85)',   // Púrpura vibrante
            'rgba(255, 184, 0, 0.85)',    // Naranja dorado
            'rgba(236, 72, 153, 0.85)',   // Rosa fucsia
            'rgba(59, 130, 246, 0.85)',   // Azul brillante
            'rgba(239, 68, 68, 0.85)',    // Rojo vibrante
            'rgba(16, 185, 129, 0.85)',   // Verde agua
          ],
          borderColor: [
            '#00F0FF',
            '#00FF99',
            '#9333EA',
            '#FFB800',
            '#EC4899',
            '#3B82F6',
            '#EF4444',
            '#10B981'
          ],
          borderWidth: 3,
          hoverOffset: 10,
          hoverBorderWidth: 4,
        },
      ],
    }),
    [donutData]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      animation: {
        animateRotate: true,
        animateScale: true,
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          align: 'center' as const,
          labels: {
            color: chartPalette.text,
            padding: 15,
            font: {
              size: 13,
              weight: '500' as const
            },
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: (chart: any) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                const dataset = data.datasets[0];
                const total = dataset.data.reduce((acc: number, val: number) => acc + val, 0);

                return data.labels.map((label: string, i: number) => {
                  const value = dataset.data[i];
                  const percentage = ((value / total) * 100).toFixed(2);

                  return {
                    text: `${label} (${percentage}%)`,
                    fillStyle: dataset.backgroundColor[i],
                    strokeStyle: dataset.borderColor[i],
                    lineWidth: 2,
                    hidden: false,
                    index: i,
                    fontColor: chartPalette.text
                  };
                });
              }
              return [];
            }
          },
        },
        tooltip: {
          backgroundColor: chartPalette.tooltipBg,
          titleColor: chartPalette.tooltipText,
          bodyColor: chartPalette.tooltipText,
          borderColor: chartPalette.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold' as const
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: (context: any) => {
              const total = context.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(2);
              return `${currencyFormatter(context.parsed)} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [chartPalette, currencyFormatter]
  );

  const CollapsibleSection = ({
    id,
    title,
    subtitle,
    children,
  }: {
    id: SectionId;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => {
    const isCollapsed = collapsed[id];

    return (
      <div
        ref={(el) => {
          sectionRefs.current[id] = el;
        }}
        className="rounded-2xl border border-border/60 bg-dark-card/40 overflow-hidden shadow-lg"
      >
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-card/60 transition-colors"
          onClick={() => toggleSection(id)}
        >
          <div className="flex-1">
            <Title className="text-2xl font-display text-primary mb-1">{title}</Title>
            {subtitle && <Text className="text-sm text-text-muted">{subtitle}</Text>}
          </div>
          <button
            type="button"
            className="ml-4 p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
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

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="relative flex">
      <div className="sticky top-24 h-fit w-16 lg:w-20 flex-shrink-0 mr-4">
        <div className="flex flex-col gap-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`
                group relative p-3 rounded-xl transition-all duration-200
                ${
                  activeSection === section.id
                    ? 'bg-primary text-white shadow-glow-sm'
                    : 'bg-dark-card/60 text-text-muted hover:bg-dark-card hover:text-text-secondary border border-border/40'
                }
              `}
              title={section.label}
            >
              {section.icon}
              <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-dark-card border border-border shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {section.label}
              </div>
            </button>
          ))}

          <div className="border-t border-border/40 pt-2 mt-2 relative">
            <button
              type="button"
              onClick={() => {
                const allCollapsed = Object.values(collapsed).every((value) => value);
                const newState = !allCollapsed;
                setCollapsed({
                  trends: newState,
                  profitability: newState,
                  detail: newState,
                });
              }}
              className="group w-full p-3 rounded-xl bg-dark-card/60 text-text-muted hover:bg-dark-card hover:text-accent border border-border/40 transition-all"
              title="Colapsar/Expandir Todo"
            >
              {Object.values(collapsed).every((value) => value) ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronUpIcon className="h-5 w-5" />
              )}
              <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-dark-card border border-border shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {Object.values(collapsed).every((value) => value) ? 'Expandir Todo' : 'Colapsar Todo'}
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-6 pl-0">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Title className="text-4xl font-display text-primary mb-2">Vista Financiera</Title>
          <Text className="text-lg text-text-secondary">
            Análisis de tendencias, rentabilidad y márgenes financieros
          </Text>
          <Text className="text-sm text-text-muted mt-1">
            * Rentabilidad calculada basándose únicamente en el costo de materia prima
          </Text>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CollapsibleSection
            id="trends"
            title="Tendencias Financieras"
            subtitle="Evolución mensual de ventas, costos y rentabilidad neta"
          >
            <Card className="glass-panel relative overflow-hidden border border-border/60 bg-dark-card/70 shadow-hologram">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-emerald-500/15 opacity-50" />
              <Flex justifyContent="between" alignItems="center" className="mb-6 relative z-10">
                <div>
                  <Title className="text-2xl font-semibold text-text-primary">Tendencias Financieras</Title>
                  <Text className="text-sm text-text-muted">
                    Visualiza cómo se comportan tus indicadores clave a lo largo del año.
                  </Text>
                </div>
                <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Salud promedio: {promedioMargen.toFixed(2)}%
                </div>
              </Flex>

              <div className="relative h-80">
                {trendsData.length > 0 ? (
                  <Line data={trendsChartData} options={trendsChartOptions} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-muted">
                    No hay datos suficientes para mostrar tendencias.
                  </div>
                )}
              </div>
            </Card>
          </CollapsibleSection>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CollapsibleSection
            id="profitability"
            title="Indicadores de Rentabilidad (Materia Prima)"
            subtitle={`Análisis de márgenes calculados solo con costo de materia prima por ${groupBy}`}
          >
            <Card className="glass-panel relative overflow-hidden border border-border/60 bg-dark-card/75 shadow-hologram">
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
              <Flex justifyContent="between" alignItems="center" className="mb-6 relative z-10">
                <div className="space-y-1">
                  <Title className="text-xl text-text-primary">Distribución de Rentabilidad</Title>
                  <Text className="text-sm text-text-muted">
                    Ajusta la dimensión para explorar dónde se generan los márgenes más sólidos.
                  </Text>
                </div>
                <Flex className="gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupBy('categoria')}
                    className={`inline-flex items-center gap-2 rounded-xl border border-border/60 bg-dark-card/70 px-4 py-2 text-sm font-semibold text-text-secondary transition-all duration-200 hover:border-primary/60 hover:text-primary ${
                      groupBy === 'categoria' ? 'shadow-glow-sm border-primary/60 text-primary' : ''
                    }`}
                  >
                    Reset
                  </button>
                  <select
                    value={groupBy}
                    onChange={(event) => setGroupBy(event.target.value)}
                    className="rounded-xl border border-border/60 bg-dark-card/80 px-4 py-2 text-sm text-text-primary shadow-inner focus:outline-none focus:border-primary/60"
                  >
                    <option value="categoria">Por Categoría</option>
                    <option value="canal">Por Canal</option>
                    <option value="vendedor">Por Vendedor</option>
                    <option value="cliente">Por Cliente</option>
                    <option value="producto">Por Producto</option>
                  </select>
                </Flex>
              </Flex>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <ArrowTrendingUpIcon className="h-8 w-8 animate-spin text-emerald-400" />
                      <Text className="text-sm">Calculando indicadores de rentabilidad...</Text>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Grid numItemsLg={5} className="gap-6 relative z-0">
                <Card className="glass-panel col-span-5 border border-border/60 bg-dark-card/75 shadow-hologram lg:col-span-3">
                  <Flex justifyContent="between" alignItems="center">
                    <Metric className="text-emerald-400">{currencyFormatter(totalRentabilidad)}</Metric>
                    <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                      Rentabilidad acumulada
                    </div>
                  </Flex>
                  <Text className="mt-2 text-sm text-text-muted">
                    La vista apilada permite comparar rápidamente ventas, costos y utilidad neta.
                  </Text>
                  <div className="mt-4 h-80 glass-card rounded-xl border border-border/60 p-4">
                    {data.length > 0 ? (
                      <Bar data={profitabilityChartData} options={profitabilityChartOptions} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-muted">
                        No hay datos suficientes para mostrar la distribución.
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="glass-card col-span-5 flex flex-col justify-between border border-border/60 bg-dark-card/75 shadow-hologram lg:col-span-2">
                  <div className="space-y-4">
                    <Flex alignItems="center" className="gap-3">
                      <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-emerald-300">
                        <BanknotesIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <Text className="text-xs uppercase tracking-wide text-text-muted">Costo operativo</Text>
                        <Metric className="text-text-primary">{currencyFormatter(totalCosto)}</Metric>
                      </div>
                    </Flex>

                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <Flex justifyContent="between" alignItems="center">
                        <Text className="text-text-primary">Margen promedio</Text>
                        <Badge
                          color={promedioMargen >= 35 ? 'emerald' : promedioMargen >= 20 ? 'yellow' : 'red'}
                          icon={promedioMargen >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
                        >
                          {promedioMargen.toFixed(2)}%
                        </Badge>
                      </Flex>
                      <Text className="mt-2 text-xs text-text-muted">
                        Calculado sobre el total de segmentos visibles en el dashboard.
                      </Text>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Text className="text-xs uppercase tracking-wide text-text-muted mb-3">
                      Distribución de rentabilidad por segmento
                    </Text>
                    <div className="h-80">
                      {donutData.length > 0 ? (
                        <Doughnut data={doughnutChartData} options={doughnutOptions} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-text-muted">
                          No hay segmentos suficientes para mostrar el reparto.
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Grid>
            </Card>
          </CollapsibleSection>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CollapsibleSection
            id="detail"
            title="Detalle Financiero"
            subtitle={`${data.length} segmentos analizados • Margen prom. ${promedioMargen.toFixed(2)}%`}
          >
            <Card className="glass-panel border border-border/60 bg-dark-card/80 shadow-hologram">
              <div className="overflow-hidden rounded-xl border border-border/60">
                <Table className="min-w-full divide-y divide-dark-card/70 text-text-primary">
                  <TableHead>
                    <TableRow className="bg-dark-card/80">
                      <TableHeaderCell className="text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('dimension')}
                          className="inline-flex items-center gap-1 text-left hover:text-primary transition-colors"
                        >
                          <span>{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</span>
                          {renderSortIcon('dimension')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('venta_neta')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Venta Neta</span>
                          {renderSortIcon('venta_neta')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('costo_venta')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Costo MP</span>
                          {renderSortIcon('costo_venta')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('rentabilidad')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Rentabilidad (MP)</span>
                          {renderSortIcon('rentabilidad')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('margen_porcentaje')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Margen %</span>
                          {renderSortIcon('margen_porcentaje')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('ratio_costo_venta')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Ratio Costo %</span>
                          {renderSortIcon('ratio_costo_venta')}
                        </button>
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-dark-card/60">
                    {sortedData.map((row: any, index) => (
                      <TableRow key={index} className="transition-colors hover:bg-emerald-500/10">
                        <TableCell>
                          <Text className="font-medium text-text-primary">{row.dimension}</Text>
                        </TableCell>
                        <TableCell className="text-right text-text-secondary">
                          {currencyFormatter(row.venta_neta)}
                        </TableCell>
                        <TableCell className="text-right text-text-secondary">
                          {currencyFormatter(row.costo_venta)}
                        </TableCell>
                        <TableCell className="text-right text-text-secondary">
                          {currencyFormatter(row.rentabilidad)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            color={
                              row.margen_porcentaje > 50
                                ? 'emerald'
                                : row.margen_porcentaje > 25
                                ? 'yellow'
                                : 'red'
                            }
                          >
                            {row.margen_porcentaje}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-text-secondary">{row.ratio_costo_venta}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </CollapsibleSection>
        </motion.div>
      </div>
    </div>
  );
}
