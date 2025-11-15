/**
 * CommercialView - Vista comercial mejorada con pestañas $/m2 y análisis de clientes
 * Incluye filtros dinámicos y gráficos profesionales
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Badge,
  Card,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
  Flex,
  Metric,
} from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChartBarIcon,
  TableCellsIcon,
  ArrowsUpDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut, Pie, Line } from 'react-chartjs-2';
import api from '../../../services/api';
import { appendTemporalFilters } from '../utils/filterUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  filters: any;
}

type SectionId = 'overview' | 'clients' | 'evolution' | 'details';

interface Section {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Resumen Comercial', icon: <ChartBarIcon className="h-5 w-5" /> },
  { id: 'clients', label: 'Análisis de Ventas', icon: <UsersIcon className="h-5 w-5" /> },
  { id: 'evolution', label: 'Evolución Mensual', icon: <ChartPieIcon className="h-5 w-5" /> },
  { id: 'details', label: 'Detalle de Ventas por Categoría de Producto', icon: <TableCellsIcon className="h-5 w-5" /> }
];

export default function CommercialView({ filters }: Props) {
  const [groupBy, setGroupBy] = useState('categoria');
  const [data, setData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [categoryComposition, setCategoryComposition] = useState<any[]>([]);
  const [channelComposition, setChannelComposition] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    overview: false,
    clients: false,
    evolution: false,
    details: false
  });
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [overviewView, setOverviewView] = useState<'currency' | 'm2'>('currency');
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
    overview: null,
    clients: null,
    evolution: null,
    details: null
  });

  const currencyFormatter = (value: number = 0) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);

  const numberFormatter = (value: number = 0) =>
    (value ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('commercial-view-collapsed');
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
    localStorage.setItem('commercial-view-collapsed', JSON.stringify(collapsed));
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
    loadData();
    loadClientsData();
    loadEvolutionData();
    loadCompositionData();
  }, [filters, groupBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: groupBy, limit: '20' });
      appendTemporalFilters(params, filters);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/analysis/commercial?${params}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientsData = async () => {
    try {
      const params = new URLSearchParams({ group_by: 'cliente', limit: '100' });
      appendTemporalFilters(params, filters);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/analysis/commercial?${params}`);
      if (response.data.success) {
        setClientsData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading clients data:', error);
    }
  };

  const loadEvolutionData = async () => {
    try {
      const params = new URLSearchParams();
      // Incluir TODOS los filtros dinámicos, incluyendo el año
      appendTemporalFilters(params, filters);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/trends/monthly?${params}`);
      if (response.data.success) {
        // Los datos ya vienen agrupados por year y month del endpoint
        setEvolutionData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading evolution data:', error);
    }
  };

  const loadCompositionData = async () => {
    try {
      const buildParams = (group: 'categoria' | 'canal') => {
        const params = new URLSearchParams({ group_by: group, limit: '10' });
        appendTemporalFilters(params, filters);
        if (filters.categoria) params.append('categoria', filters.categoria);
        if (filters.canal) params.append('canal', filters.canal);
        if (filters.vendedor) params.append('vendedor', filters.vendedor);
        if (filters.cliente) params.append('cliente', filters.cliente);
        return params;
      };

      const [categoryResponse, channelResponse] = await Promise.all([
        api.get(`/api/sales-bi/analysis/commercial?${buildParams('categoria')}`),
        api.get(`/api/sales-bi/analysis/commercial?${buildParams('canal')}`),
      ]);

      if (categoryResponse.data.success) {
        setCategoryComposition(categoryResponse.data.data || []);
      }
      if (channelResponse.data.success) {
        setChannelComposition(channelResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error loading composition data:', error);
    }
  };

  const toggleSection = (sectionId: SectionId) => {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const scrollToSection = (sectionId: SectionId) => {
    const ref = sectionRefs.current[sectionId];
    if (ref) {
      if (collapsed[sectionId]) {
        setCollapsed(prev => ({ ...prev, [sectionId]: false }));
      }
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const topPerformer = useMemo(() => data?.[0], [data]);
  const totalVentas = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.venta_neta || 0), 0),
    [data]
  );
  const totalMetros = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.metros_cuadrados || item.m2 || item.unidades || 0), 0),
    [data]
  );
  const totalDescuentos = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.descuento || 0), 0),
    [data]
  );

  const filterSummaryChips = useMemo(() => {
    const chips: string[] = [];
    const yearList = filters.years ?? (filters.year ? [filters.year] : []);
    if (yearList && yearList.length) {
      chips.push(`Años: ${yearList.join(', ')}`);
    }

    const monthList = filters.months ?? (filters.month ? [filters.month] : []);
    if (monthList && monthList.length) {
      const monthLabels = monthList
        .map((month: number) => MONTH_LABELS[month - 1] || `Mes ${month}`)
        .join(', ');
      chips.push(`Meses: ${monthLabels}`);
    }

    if (filters.categoria) {
      chips.push(`Categoría: ${filters.categoria}`);
    }
    if (filters.canal) {
      chips.push(`Canal: ${filters.canal}`);
    }
    if (filters.vendedor) {
      chips.push(`Vendedor: ${filters.vendedor}`);
    }
    if (filters.cliente) {
      chips.push(`Cliente: ${filters.cliente}`);
    }

    return chips;
  }, [filters]);

  const {
    topClientsData,
    clientsChartData,
    totalClientsValue,
    totalClientsVolume
  } = useMemo(() => {
    if (!clientsData || clientsData.length === 0) {
      return {
        topClientsData: [],
        clientsChartData: [],
        totalClientsValue: 0,
        totalClientsVolume: 0
      };
    }

    const sorted = [...clientsData].sort(
      (a, b) => Number(b.venta_neta || 0) - Number(a.venta_neta || 0)
    );

    const totalClientsValue = sorted.reduce(
      (acc, item) => acc + Number(item.venta_neta || 0),
      0
    );
    const totalClientsVolume = sorted.reduce(
      (acc, item) => acc + Number(item.metros_cuadrados || item.m2 || item.unidades || 0),
      0
    );

    const maxVisible = Math.min(10, sorted.length);
    const topClientsData = sorted.slice(0, maxVisible);
    const remainder = sorted.slice(maxVisible);

    const remainderTotals = remainder.reduce(
      (acc, item) => ({
        value: acc.value + Number(item.venta_neta || 0),
        volume: acc.volume + Number(item.metros_cuadrados || item.m2 || item.unidades || 0),
      }),
      { value: 0, volume: 0 }
    );

    const clientsChartData = [...topClientsData];
    if (remainderTotals.value > 0 || remainderTotals.volume > 0) {
      clientsChartData.push({
        dimension: 'Otros',
        venta_neta: remainderTotals.value,
        metros_cuadrados: remainderTotals.volume,
        m2: remainderTotals.volume,
      });
    }

    return {
      topClientsData,
      clientsChartData,
      totalClientsValue,
      totalClientsVolume,
    };
  }, [clientsData]);

  const sortedData = useMemo(() => {
    const rows = [...data];
    const { key, direction } = sortConfig;
    const getValue = (row: any) => {
      switch (key) {
        case 'dimension':
          return row.dimension?.toString().toLowerCase() || '';
        case 'venta_neta':
          return Number(row.venta_neta || 0);
        case 'descuento':
          return Number(row.descuento || 0);
        case 'num_facturas':
          return Number(row.num_facturas || 0);
        case 'metros':
          return Number(row.metros_cuadrados || row.m2 || row.unidades || 0);
        case 'ticket_promedio':
          return Number(row.ticket_promedio || 0);
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

  const chartPalette = useMemo(
    () =>
      isDarkMode
        ? {
            text: '#E0E7FF',
            grid: 'rgba(0, 240, 255, 0.12)',
            tooltipBg: 'rgba(26, 26, 37, 0.95)',
            tooltipText: '#E0E7FF',
            tooltipBorder: 'rgba(0, 240, 255, 0.3)',
          }
        : {
            text: '#1f2937',
            grid: 'rgba(15, 23, 42, 0.06)',
            tooltipBg: '#ffffff',
            tooltipText: '#1f2937',
            tooltipBorder: 'rgba(59, 130, 246, 0.25)',
          },
    [isDarkMode]
  );

  // Chart.js Bar Chart data - Ventas vs Descuentos
  const barChartDataCurrency = {
    labels: data.map((item: any) => item.dimension || 'Sin definir'),
    datasets: [
      {
        label: 'Venta Neta',
        data: data.map((item: any) => item.venta_neta || 0),
        backgroundColor: 'rgba(0, 240, 255, 0.25)',
        borderColor: '#00F0FF',
        borderWidth: 2,
      },
      {
        label: 'Descuento',
        data: data.map((item: any) => item.descuento || 0),
        backgroundColor: 'rgba(255, 184, 0, 0.25)',
        borderColor: '#FFB800',
        borderWidth: 2,
      }
    ]
  };

  // Chart.js Bar Chart data - M2
  const barChartDataM2 = {
    labels: data.map((item: any) => item.dimension || 'Sin definir'),
    datasets: [
      {
        label: 'Metros Cuadrados (m²)',
        data: data.map((item: any) => item.metros_cuadrados || item.m2 || item.unidades || 0),
        backgroundColor: 'rgba(0, 255, 153, 0.25)',
        borderColor: '#00FF99',
        borderWidth: 2,
      }
    ]
  };

  // Opciones para gráfico de DÓLARES
  const barChartOptionsCurrency = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: chartPalette.text,
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBg,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${currencyFormatter(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          callback: (value: any) => {
            return `$${(value / 1000).toFixed(2)}k`;
          }
        }
      }
    }
  };

  // Opciones para gráfico de METROS CUADRADOS
  const barChartOptionsM2 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: chartPalette.text,
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBg,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${numberFormatter(context.parsed.y)} m²`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          callback: (value: any) => {
            return `${numberFormatter(value)} m²`;
          }
        }
      }
    }
  };

  const doughnutBackgroundColors = [
    'rgba(0, 240, 255, 0.85)',
    'rgba(0, 255, 153, 0.85)',
    'rgba(147, 51, 234, 0.85)',
    'rgba(255, 184, 0, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(59, 130, 246, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(16, 185, 129, 0.85)',
  ];

  const doughnutBorderColors = [
    '#00F0FF',
    '#00FF99',
    '#9333EA',
    '#FFB800',
    '#EC4899',
    '#3B82F6',
    '#EF4444',
    '#10B981'
  ];

  const buildColorArray = (length: number, base: string[]) =>
    Array.from({ length }, (_, idx) => base[idx % base.length]);

  // Doughnut chart para composición de clientes por VALOR - Colores modernos y vibrantes
  const clientsValueChartData = useMemo(() => {
    const colorCount = clientsChartData.length;
    return {
      labels: clientsChartData.map((item: any) => item.dimension || 'Sin definir'),
      datasets: [
        {
          data: clientsChartData.map((item: any) => Number(item.venta_neta || 0)),
          backgroundColor: buildColorArray(colorCount, doughnutBackgroundColors),
          borderColor: buildColorArray(colorCount, doughnutBorderColors),
          borderWidth: 3,
          hoverOffset: 10,
          hoverBorderWidth: 4,
        }
      ]
    };
  }, [clientsChartData]);

  // Pie chart para composición de clientes por M2 - Paleta complementaria
  const clientsM2ChartData = useMemo(() => {
    const colorCount = clientsChartData.length;
    return {
      labels: clientsChartData.map((item: any) => item.dimension || 'Sin definir'),
      datasets: [
        {
          data: clientsChartData.map((item: any) => Number(item.metros_cuadrados || item.m2 || 0)),
          backgroundColor: buildColorArray(colorCount, doughnutBackgroundColors),
          borderColor: buildColorArray(colorCount, doughnutBorderColors),
          borderWidth: 3,
          hoverOffset: 10,
          hoverBorderWidth: 4,
        }
      ]
    };
  }, [clientsChartData]);

  const sortedCategoryComposition = useMemo(() => {
    const rows = [...categoryComposition];
    rows.sort((a, b) => Number(b.venta_neta || 0) - Number(a.venta_neta || 0));
    return rows.slice(0, 8);
  }, [categoryComposition]);

  const sortedChannelComposition = useMemo(() => {
    const rows = [...channelComposition];
    rows.sort((a, b) => Number(b.venta_neta || 0) - Number(a.venta_neta || 0));
    return rows.slice(0, 8);
  }, [channelComposition]);

  const categoryCompositionChartData = useMemo(() => ({
    labels: sortedCategoryComposition.map((item: any) => item.dimension || 'Sin definir'),
    datasets: [
      {
        label: 'Venta Neta ($)',
        data: sortedCategoryComposition.map((item: any) => Number(item.venta_neta || 0)),
        backgroundColor: 'rgba(0, 240, 255, 0.7)',
        borderColor: '#00F0FF',
        borderWidth: 2,
        borderRadius: 14,
        maxBarThickness: 28,
        xAxisID: 'xVentas',
      },
      {
        label: 'Metros Cuadrados (m²)',
        data: sortedCategoryComposition.map((item: any) => Number(item.metros_cuadrados || item.m2 || 0)),
        backgroundColor: 'rgba(236, 72, 153, 0.7)',
        borderColor: '#EC4899',
        borderWidth: 2,
        borderRadius: 14,
        maxBarThickness: 28,
        xAxisID: 'xM2',
      }
    ]
  }), [sortedCategoryComposition]);

  const channelCompositionChartData = useMemo(() => ({
    labels: sortedChannelComposition.map((item: any) => item.dimension || 'Sin definir'),
    datasets: [
      {
        label: 'Venta Neta ($)',
        data: sortedChannelComposition.map((item: any) => Number(item.venta_neta || 0)),
        backgroundColor: 'rgba(147, 51, 234, 0.7)',
        borderColor: '#9333EA',
        borderWidth: 2,
        borderRadius: 14,
        maxBarThickness: 28,
        xAxisID: 'xVentas',
      },
      {
        label: 'Metros Cuadrados (m²)',
        data: sortedChannelComposition.map((item: any) => Number(item.metros_cuadrados || item.m2 || 0)),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        borderRadius: 14,
        maxBarThickness: 28,
        xAxisID: 'xM2',
      }
    ]
  }), [sortedChannelComposition]);

  // Opciones modernas para gráficos Doughnut y Pie
  const getDoughnutOptions = useMemo(() => (isM2Chart: boolean = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%', // Para Doughnut, hace el agujero más grande y moderno
    animation: {
      animateRotate: true,
      animateScale: true,
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
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
        }
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

            if (isM2Chart) {
              return `${numberFormatter(context.parsed)} m² (${percentage}%)`;
            } else {
              return `${currencyFormatter(context.parsed)} (${percentage}%)`;
            }
          }
        }
      }
    }
  }), [chartPalette, currencyFormatter, numberFormatter]);

  const compositionChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      xVentas: {
        type: 'linear' as const,
        position: 'top' as const,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          font: {
            size: 12,
            weight: '600' as const,
          },
          callback: (value: any) => currencyFormatter(Number(value ?? 0)),
        },
      },
      xM2: {
        type: 'linear' as const,
        position: 'bottom' as const,
        grid: {
          drawOnChartArea: false,
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          font: {
            size: 12,
            weight: '600' as const,
          },
          callback: (value: any) => `${numberFormatter(Number(value ?? 0))} m²`,
        },
      },
      y: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          font: {
            size: 12,
            weight: '600' as const,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: chartPalette.text,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBg,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const value = Number(context.parsed.x ?? context.parsed);
            if (context.dataset.label?.includes('m²')) {
              return `${context.dataset.label}: ${numberFormatter(value)} m²`;
            }
            return `${context.dataset.label}: ${currencyFormatter(value)}`;
          },
        },
      },
    },
  }), [chartPalette, currencyFormatter, numberFormatter]);

  const getPieOptions = useMemo(() => (isM2Chart: boolean = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
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
        }
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

            if (isM2Chart) {
              return `${numberFormatter(context.parsed)} m² (${percentage}%)`;
            } else {
              return `${currencyFormatter(context.parsed)} (${percentage}%)`;
            }
          }
        }
      }
    }
  }), [chartPalette, currencyFormatter, numberFormatter]);

  // Gráfico de evolución mensual - Line Chart con una línea por año
  const monthNames = MONTH_LABELS;

  const evolutionChartData = useMemo(() => {
    // Obtener años únicos
    const years = [...new Set(evolutionData.map((item: any) => item.year))].sort();

    // Colores por año
    const yearColors: Record<number, { border: string; bg: string }> = {
      2023: { border: '#8000FF', bg: 'rgba(128, 0, 255, 0.1)' }, // Púrpura
      2024: { border: '#00FF99', bg: 'rgba(0, 255, 153, 0.1)' }, // Verde
      2025: { border: '#00F0FF', bg: 'rgba(0, 240, 255, 0.1)' }, // Cyan
    };

    // Crear dataset por cada año
    const datasets = years.map(year => {
      const yearData = evolutionData.filter((item: any) => item.year === year);

      // Crear array de 12 meses con los valores
      const monthlyValues = Array(12).fill(0);
      yearData.forEach((item: any) => {
        if (item.month >= 1 && item.month <= 12) {
          monthlyValues[item.month - 1] = item.venta_neta || 0;
        }
      });

      const colors = yearColors[year] || { border: '#FFB800', bg: 'rgba(255, 184, 0, 0.1)' };

      return {
        label: `${year}`,
        data: monthlyValues,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      };
    });

    return {
      labels: monthNames,
      datasets
    };
  }, [evolutionData]);

  const evolutionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: chartPalette.text,
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13,
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBg,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${currencyFormatter(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          font: {
            size: 13,
            weight: 'bold' as const
          }
        }
      },
      y: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.text,
          callback: (value: any) => `$${(value / 1000).toFixed(0)}k`
        }
      }
    }
  };

  const renderFilterSummary = () => (
    <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
      {filterSummaryChips.length > 0 ? (
        filterSummaryChips.map((chip, idx) => (
          <span
            key={`${chip}-${idx}`}
            className="px-2 py-0.5 rounded-full border border-border/50 bg-dark-card/50 text-text-secondary"
          >
            {chip}
          </span>
        ))
      ) : (
        <span className="text-[11px] text-text-muted">Sin filtros adicionales</span>
      )}
    </div>
  );

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
            {renderFilterSummary()}
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
              <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-dark-card border border-border shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                {section.label}
              </div>
            </button>
          ))}

          <div className="border-t border-border/40 pt-2 mt-2">
            <button
              type="button"
              onClick={() => {
                const allCollapsed = Object.values(collapsed).every(v => v);
                const newState = !allCollapsed;
                setCollapsed({
                  overview: newState,
                  clients: newState,
                  evolution: newState,
                  details: newState
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
            Vista Comercial
          </Title>
          <Text className="text-lg text-text-secondary">
            Análisis de ventas, descuentos y desempeño comercial
          </Text>
        </motion.div>

        {/* Overview Section con pestañas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CollapsibleSection
            id="overview"
            title="Resumen Comercial"
            subtitle={`Total ventas: ${currencyFormatter(totalVentas)} • ${numberFormatter(totalMetros)} m²`}
          >
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => setOverviewView('currency')}
                aria-pressed={overviewView === 'currency'}
                className={`
                  flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all
                  ${overviewView === 'currency'
                    ? 'bg-primary text-white shadow-glow-sm border border-primary/50'
                    : 'bg-dark-card/40 text-text-muted hover:text-text-secondary border border-border/40'}
                `}
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                Vista en Dólares ($)
              </button>
              <button
                type="button"
                onClick={() => setOverviewView('m2')}
                aria-pressed={overviewView === 'm2'}
                className={`
                  flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all
                  ${overviewView === 'm2'
                    ? 'bg-accent text-white shadow-glow-sm border border-accent/50'
                    : 'bg-dark-card/40 text-text-muted hover:text-text-secondary border border-border/40'}
                `}
              >
                <ShoppingBagIcon className="h-4 w-4" />
                Vista en Metros (m²)
              </button>
            </div>

            {overviewView === 'currency' ? (
              <Grid numItemsLg={5} className="gap-6">
                <Card className="glass-panel col-span-5 lg:col-span-3 border border-border/60 bg-dark-card/70 shadow-hologram">
                  <Metric className="mb-2 text-text-primary">
                    Total ventas: {currencyFormatter(totalVentas)}
                  </Metric>
                  <Text className="mb-4 text-sm text-text-muted">
                    Comparativo entre ventas netas y descuentos aplicados.
                  </Text>
                  <div className="h-80 glass-card p-4 border border-border rounded-lg">
                    <Bar data={barChartDataCurrency} options={barChartOptionsCurrency} />
                  </div>
                </Card>

                <Card className="glass-card col-span-5 flex flex-col justify-between border border-border/60 bg-dark-card/70 shadow-hologram lg:col-span-2">
                      <div className="space-y-4">
                        <Flex alignItems="center" className="gap-3">
                          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-primary">
                            <SparklesIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <Text className="text-xs uppercase tracking-wide text-text-muted">Mejor desempeño</Text>
                            <Title className="text-xl text-text-primary">
                              {topPerformer?.dimension || 'Sin datos'}
                            </Title>
                          </div>
                        </Flex>

                        <div className="rounded-2xl border border-border/60 bg-dark-card/80 p-4">
                          <Flex justifyContent="between" alignItems="center">
                            <div>
                              <Text className="text-sm text-text-muted">Venta neta</Text>
                              <Metric className="text-emerald-400">
                                {currencyFormatter(topPerformer?.venta_neta || 0)}
                              </Metric>
                            </div>
                            <Badge color="emerald" icon={ArrowTrendingUpIcon} className="text-xs">
                              {currencyFormatter(topPerformer?.ticket_promedio || 0)} ticket
                            </Badge>
                          </Flex>
                          <Flex justifyContent="between" className="mt-4 text-sm text-text-muted">
                            <div className="flex items-center gap-2">
                              <UsersIcon className="h-4 w-4" />
                              {topPerformer?.num_facturas || 0} facturas
                            </div>
                            <div className="flex items-center gap-2">
                              <ChartBarIcon className="h-4 w-4" />
                              {numberFormatter(topPerformer?.metros_cuadrados || topPerformer?.m2 || topPerformer?.unidades || 0)} m²
                            </div>
                          </Flex>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-dark-card/80 p-4">
                          <Text className="text-xs uppercase tracking-wide text-text-muted mb-2">
                            Total descuentos
                          </Text>
                          <Metric className="text-amber-400">
                            {currencyFormatter(totalDescuentos)}
                          </Metric>
                          <Text className="mt-2 text-xs text-text-muted">
                            Descuento en categoría destacada: {(topPerformer?.porcentaje_descuento || 0).toFixed(2)}%
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </Grid>
            ) : (
              <Grid numItemsLg={5} className="gap-6">
                <Card className="glass-panel col-span-5 lg:col-span-3 border border-border/60 bg-dark-card/70 shadow-hologram">
                  <Metric className="mb-2 text-text-primary">
                    Total metros: {numberFormatter(totalMetros)} m²
                  </Metric>
                  <Text className="mb-4 text-sm text-text-muted">
                    Distribución de metros cuadrados vendidos por {groupBy}.
                  </Text>
                  <div className="h-80 glass-card p-4 border border-border rounded-lg">
                    <Bar data={barChartDataM2} options={barChartOptionsM2} />
                  </div>
                </Card>

                <Card className="glass-card col-span-5 flex flex-col justify-between border border-border/60 bg-dark-card/70 shadow-hologram lg:col-span-2">
                  <div className="space-y-4">
                    <Flex alignItems="center" className="gap-3">
                      <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-accent">
                        <ShoppingBagIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <Text className="text-xs uppercase tracking-wide text-text-muted">Mejor desempeño</Text>
                        <Title className="text-xl text-text-primary">
                          {topPerformer?.dimension || 'Sin datos'}
                        </Title>
                      </div>
                    </Flex>

                    <div className="rounded-2xl border border-border/60 bg-dark-card/80 p-4">
                      <Text className="text-sm text-text-muted">Metros cuadrados</Text>
                      <Metric className="text-accent">
                        {numberFormatter(topPerformer?.metros_cuadrados || topPerformer?.m2 || 0)} m²
                      </Metric>
                      <Flex justifyContent="between" className="mt-4 text-sm text-text-muted">
                          <div>
                            <Text className="text-xs">Precio/m²</Text>
                            <Text className="font-semibold text-text-primary">
                              {currencyFormatter((topPerformer?.venta_neta || 0) / (topPerformer?.metros_cuadrados || topPerformer?.m2 || 1))}
                            </Text>
                        </div>
                        <div className="text-right">
                          <Text className="text-xs">Facturas</Text>
                          <Text className="font-semibold text-text-primary">
                            {topPerformer?.num_facturas || 0}
                          </Text>
                        </div>
                      </Flex>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-dark-card/80 p-4">
                      <Text className="text-xs uppercase tracking-wide text-text-muted mb-2">
                        Precio promedio global (USD/m²)
                      </Text>
                      <Metric className="text-primary">
                        {currencyFormatter(totalVentas / (totalMetros || 1))}
                      </Metric>
                    </div>
                  </div>
                </Card>
              </Grid>
            )}
          </CollapsibleSection>
        </motion.div>

        {/* Clients Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <CollapsibleSection
            id="clients"
            title="Análisis de Ventas"
            subtitle="Composición por clientes, categorías y canales"
          >
            <Grid numItemsLg={2} className="gap-6 mb-6">
              <Card className="glass-panel border border-border/60 bg-dark-card/70 shadow-hologram">
                <Flex alignItems="center" className="gap-2 mb-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <ChartBarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Title className="text-lg font-semibold text-text-primary">
                      Composición por Categoría
                    </Title>
                    <Text className="text-xs text-text-muted">
                      Ventas y volumen por categoría de producto
                    </Text>
                  </div>
                </Flex>
                <div className="h-96">
                  {sortedCategoryComposition.length > 0 ? (
                    <Bar data={categoryCompositionChartData} options={compositionChartOptions} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Text className="text-center text-text-muted">
                        No hay datos de categorías disponibles.
                      </Text>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="glass-panel border border-border/60 bg-dark-card/70 shadow-hologram">
                <Flex alignItems="center" className="gap-2 mb-4">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <ChartPieIcon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <Title className="text-lg font-semibold text-text-primary">
                      Composición por Canal
                    </Title>
                    <Text className="text-xs text-text-muted">
                      Distribución de ventas y m² por canal comercial
                    </Text>
                  </div>
                </Flex>
                <div className="h-96">
                  {sortedChannelComposition.length > 0 ? (
                    <Bar data={channelCompositionChartData} options={compositionChartOptions} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Text className="text-center text-text-muted">
                        No hay datos de canales disponibles.
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </Grid>

            <Grid numItemsLg={2} className="gap-6">
              <Card className="glass-panel border border-border/60 bg-dark-card/70 shadow-hologram">
                <Flex alignItems="center" className="gap-2 mb-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Title className="text-lg font-semibold text-text-primary">
                      Composición por Valor
                    </Title>
                    <Text className="text-xs text-text-muted">Top {topClientsData.length} clientes por ventas</Text>
                    <Text className="text-[11px] text-text-secondary">
                      Total ventas filtradas: {currencyFormatter(totalClientsValue)}
                    </Text>
                  </div>
                </Flex>
                <div className="h-96">
                  {topClientsData.length > 0 ? (
                    <Doughnut data={clientsValueChartData} options={getDoughnutOptions(false)} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Text className="text-center text-text-muted">
                        No hay datos de clientes disponibles.
                      </Text>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="glass-panel border border-border/60 bg-dark-card/70 shadow-hologram">
                <Flex alignItems="center" className="gap-2 mb-4">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <ShoppingBagIcon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <Title className="text-lg font-semibold text-text-primary">
                      Composición por Volumen
                    </Title>
                    <Text className="text-xs text-text-muted">Top {topClientsData.length} clientes por m²</Text>
                    <Text className="text-[11px] text-text-secondary">
                      Total m² filtrados: {numberFormatter(totalClientsVolume)} m²
                    </Text>
                  </div>
                </Flex>
                <div className="h-96">
                  {topClientsData.length > 0 ? (
                    <Pie id="m2-chart" data={clientsM2ChartData} options={getPieOptions(true)} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Text className="text-center text-text-muted">
                        No hay datos de clientes disponibles.
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </Grid>

            {/* Tabla resumen de top clientes */}
            <Card className="glass-panel border border-border/60 bg-dark-card/80 shadow-hologram mt-6">
              <Title className="text-lg font-semibold text-text-primary mb-4">
                Detalle de Top Clientes
              </Title>
              <div className="overflow-hidden rounded-xl border border-border/60">
                <Table className="min-w-full divide-y divide-dark-card/70 text-text-primary">
                  <TableHead>
                    <TableRow className="bg-dark-card/80">
                      <TableHeaderCell className="text-xs uppercase tracking-wide text-text-secondary">
                        Cliente
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Venta Neta
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        M² Vendidos
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Precio/m²
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Desc. %
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Facturas
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Ticket Prom.
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-dark-card/60">
                    {topClientsData.map((row: any, idx) => {
                      const m2 = Number(row.metros_cuadrados || row.m2 || 0);
                      const ventaNeta = Number(row.venta_neta || 0);
                      const descuento = Number(row.descuento || 0);
                      const bruto = ventaNeta + descuento;
                      const descuentoPct = bruto > 0 ? (descuento / bruto) * 100 : 0;
                      const precioM2 = m2 > 0 ? ventaNeta / m2 : 0;

                      return (
                        <TableRow
                          key={idx}
                          className="transition-colors hover:bg-primary/10"
                        >
                          <TableCell>
                            <Text className="font-medium text-text-primary">{row.dimension}</Text>
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {currencyFormatter(ventaNeta)}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {numberFormatter(m2)} m²
                          </TableCell>
                          <TableCell className="text-right text-accent">
                            {currencyFormatter(precioM2)}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {descuentoPct.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {row.num_facturas}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {currencyFormatter(row.ticket_promedio)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </CollapsibleSection>
        </motion.div>

        {/* Evolution Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
        >
          <CollapsibleSection
            id="evolution"
            title="Evolución Mensual de Ventas"
            subtitle="Comparativa de ventas por mes entre diferentes años"
          >
            <Card className="glass-panel border border-border/60 bg-dark-card/70 shadow-hologram">
              <Title className="text-lg font-semibold text-text-primary mb-2">
                Ventas Mensuales por Año
              </Title>
              <Text className="text-sm text-text-muted mb-4">
                Comparativa de ventas netas mes a mes. Cada línea representa un año diferente.
              </Text>
              <div className="h-96 glass-card p-4 border border-border rounded-lg">
                {evolutionData.length > 0 ? (
                  <Line data={evolutionChartData} options={evolutionChartOptions} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Text className="text-center text-text-muted">
                      No hay datos para mostrar la evolución mensual.
                    </Text>
                  </div>
                )}
              </div>
            </Card>
          </CollapsibleSection>
        </motion.div>

        {/* Details Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CollapsibleSection
            id="details"
            title="Detalle de Ventas por Categoría de Producto"
            subtitle={`${data.length} segmentos • ${numberFormatter(totalMetros)} m² • ${currencyFormatter(totalVentas)}`}
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
                          onClick={() => handleSort('metros')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>M² Vendidos</span>
                          {renderSortIcon('metros')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Precio/m²
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('descuento')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Descuento</span>
                          {renderSortIcon('descuento')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        Desc. %
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('num_facturas')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Facturas</span>
                          {renderSortIcon('num_facturas')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                        <button
                          type="button"
                          onClick={() => handleSort('ticket_promedio')}
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-primary transition-colors"
                        >
                          <span>Ticket Prom.</span>
                          {renderSortIcon('ticket_promedio')}
                        </button>
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-dark-card/60">
                    {sortedData.map((row: any, idx) => {
                      const m2 = Number(row.metros_cuadrados || row.m2 || row.unidades || 0);
                      const ventaNeta = Number(row.venta_neta || 0);
                      const descuento = Number(row.descuento || 0);
                      const bruto = ventaNeta + descuento;
                      const descuentoPct = bruto > 0 ? (descuento / bruto) * 100 : 0;
                      const precioM2 = m2 > 0 ? ventaNeta / m2 : 0;

                      return (
                        <TableRow
                          key={idx}
                          className="transition-colors hover:bg-primary/10"
                        >
                          <TableCell>
                            <Text className="font-medium text-text-primary">{row.dimension}</Text>
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {currencyFormatter(ventaNeta)}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {numberFormatter(m2)} m²
                          </TableCell>
                          <TableCell className="text-right text-accent font-semibold">
                            {currencyFormatter(precioM2)}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {currencyFormatter(descuento)}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {descuentoPct.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {row.num_facturas}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary">
                            {currencyFormatter(row.ticket_promedio)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
