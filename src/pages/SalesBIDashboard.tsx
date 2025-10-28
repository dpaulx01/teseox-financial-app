/**
 * MÓDULO BI PROFESIONAL - Dashboard Principal V2
 * Diseño moderno con animaciones y UX mejorada
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Title, Text, Tab, TabGroup, TabList, TabPanels, TabPanel,
  Grid, Flex, Select, SelectItem, Badge, Metric
} from '@tremor/react';
import {
  FunnelIcon, ChartBarIcon,
  CurrencyDollarIcon, UsersIcon, ShoppingCartIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, XMarkIcon,
  SparklesIcon, ArrowPathIcon, CloudArrowUpIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

// Componentes del módulo
import CommercialView from '../modules/salesBI/components/CommercialView';
import FinancialView from '../modules/salesBI/components/FinancialView';
import AnalisisGerencial from '../modules/salesBI/components/AnalisisGerencial';
import SalesDataUploadModal, {
  SalesDataUploadResult,
} from '../modules/salesBI/components/SalesDataUploadModal';
import SearchableSelect from '../modules/salesBI/components/SearchableSelect';

interface FilterConfig {
  year?: number;
  month?: number;
  categoria?: string;
  canal?: string;
  vendedor?: string;
  cliente?: string;
}

interface FilterOptions {
  years: number[];
  months: number[];
  categorias: string[];
  canales: string[];
  vendedores: string[];
  clientes: string[];
}

// Componente de KPI Card Mejorado
const KPICard = ({ title, value, subtitle, icon: Icon, color, trend, loading }: any) => {
  const accentMap: Record<string, string> = {
    blue: 'from-primary/15 via-transparent to-sky-500/10',
    green: 'from-emerald-400/20 via-transparent to-primary/10',
    purple: 'from-fuchsia-400/20 via-transparent to-primary/10',
    amber: 'from-amber-400/25 via-transparent to-primary/10',
  };

  const iconTint: Record<string, string> = {
    blue: 'text-primary',
    green: 'text-emerald-300',
    purple: 'text-fuchsia-300',
    amber: 'text-amber-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative group"
    >
      <Card className="glass-card relative overflow-hidden border border-border/70 bg-dark-card/80 shadow-hologram transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${accentMap[color]} opacity-70`} />
        <div className="relative z-10">
          <Flex alignItems="start" justifyContent="between">
            <div className="flex-1">
              <Text className="text-text-muted font-medium mb-2">{title}</Text>

              {loading ? (
                <div className="h-10 w-32 bg-dark-card/70 rounded-lg animate-pulse mb-2" />
              ) : (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Metric className="text-3xl font-bold text-text-primary">
                    {value}
                  </Metric>
                </motion.div>
              )}

              {subtitle && (
                <Flex className="mt-2 gap-2" alignItems="center">
                  <Text className="text-xs text-text-muted uppercase tracking-wide">{subtitle}</Text>
                  {trend && (
                    <Badge
                      icon={trend > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
                      color={trend > 0 ? "green" : "red"}
                      className="animate-pulse"
                    >
                      {Math.abs(trend)}%
                    </Badge>
                  )}
                </Flex>
              )}
            </div>

            <motion.div
              whileHover={{ rotate: 360, scale: 1.2 }}
              transition={{ duration: 0.6 }}
              className="p-4 rounded-xl border border-border/60 bg-dark-card/90 shadow-glow-sm"
            >
              <Icon className={`h-8 w-8 ${iconTint[color] || 'text-primary'}`} />
            </motion.div>
          </Flex>
        </div>
      </Card>
    </motion.div>
  );
};

// Componente de Filtro Mejorado
const FilterSelect = ({ label, value, onChange, options, disabled, placeholder }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="relative z-10"
  >
    <Text className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
      <SparklesIcon className="h-4 w-4 text-primary" />
      {label}
    </Text>
    <div className="relative">
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="rounded-xl border border-border/60 bg-dark-card/95 backdrop-blur-xl text-text-primary transition-all duration-200 focus:border-primary/60 hover:bg-dark-card focus:ring-2 focus:ring-primary/30"
      >
        {options}
      </Select>
    </div>
  </motion.div>
);



// ... (keep the rest of the imports)

export default function SalesBIDashboard() {
  const [activeView, setActiveView] = useState<'commercial' | 'financial' | 'gerencial'>('commercial');
  const [filters, setFilters] = useState<FilterConfig>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    years: [],
    months: [],
    categorias: [],
    canales: [],
    vendedores: [],
    clientes: []
  });
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lastImport, setLastImport] = useState<SalesDataUploadResult | null>(null);

  const formatCurrency = (value: number = 0) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadSummaryData();
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const response = await api.get('/api/sales-bi/filters/options');
      if (response.data.success) {
        setFilterOptions(response.data.filters);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/dashboard/summary?${params.toString()}`);
      if (response.data.success) {
        setSummaryData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterConfig, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleImportSuccess = (result: SalesDataUploadResult) => {
    setLastImport(result);
    setShowUploadModal(false);
    loadSummaryData();
    setFilters(prev => ({ ...prev }));
  };

  const handleDownloadTemplate = () => {
    if (typeof window === 'undefined') return;

    const headers = [
      'Fecha de Emisión',
      'Categoría Producto',
      'Vendedor',
      '# Factura',
      'Canal Comercial',
      'Razón Social',
      'Producto',
      'Cantidad Facturada',
      'Factor Conversión',
      'M2',
      'Venta Bruta $',
      'Descuento $',
      'Venta Neta $',
      'Costo Venta $',
      'Costo Uni.$',
      'Rentabilidad $',
    ].join(';');

    const blob = new Blob([`${headers}\n`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_carga_ventas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFilterCount = Object.keys(filters).filter(k => filters[k as keyof FilterConfig]).length;

  const insightCards = useMemo(() => {
    if (!summaryData) return [];

    return [
      {
        title: 'Margen bruto',
        value: `${(summaryData.margen_bruto_porcentaje || 0).toFixed(1)}%`,
        description: 'Relación entre rentabilidad y ventas netas',
        color: 'emerald',
        icon: ArrowTrendingUpIcon,
      },
      {
        title: 'Ticket promedio',
        value: formatCurrency(summaryData.ticket_promedio || 0),
        description: 'Valor promedio por factura emitida',
        color: 'blue',
        icon: ShoppingCartIcon,
      },
      {
        title: 'Clientes activos',
        value: (summaryData.num_clientes || 0).toLocaleString('es-CO'),
        description: 'Clientes únicos en el período filtrado',
        color: 'violet',
        icon: UsersIcon,
      },
    ];
  }, [summaryData]);

  return (
    <>
      <div className="min-h-screen space-y-8 p-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel relative overflow-hidden rounded-3xl border border-border/60 bg-dark-card/90 shadow-hologram p-10"
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.08]" />
          <div className="absolute -top-32 -left-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <Flex
            justifyContent="between"
            alignItems="start"
            className="relative z-10 flex-col gap-8 lg:flex-row"
          >
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-dark-card/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-text-muted">
                <SparklesIcon className="h-4 w-4 text-primary" />
                Inteligencia de Negocios
              </div>
              <Title className="text-4xl font-bold text-text-primary neon-text leading-tight">
                Insights comerciales y financieros con la misma estética pro de Status Producción
              </Title>
              <Text className="text-base text-text-muted leading-relaxed">
                Centraliza métricas clave, descubre oportunidades de crecimiento y actualiza el cerebro
                financiero importando datos frescos en segundos.
              </Text>
              <Flex className="flex-wrap gap-3">
                <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow-glow-sm">
                  <FunnelIcon className="h-4 w-4" />
                  {activeFilterCount} filtro(s) activos
                </div>
                {summaryData && (
                  <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent shadow-glow-sm">
                    <UsersIcon className="h-4 w-4" />
                    {summaryData.num_clientes?.toLocaleString('es-CO') || 0} clientes analizados
                  </div>
                )}
              </Flex>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-dark-card/80 px-4 py-3 text-sm font-semibold text-text-secondary transition-all duration-200 hover:border-primary/60 hover:text-text-primary"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 text-primary" />
                  Descargar plantilla CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="cyber-button inline-flex items-center gap-2"
                >
                  <CloudArrowUpIcon className="h-5 w-5" />
                  Importar ventas CSV
                </button>
              </div>
              <div className="glass-panel inline-flex items-center gap-3 rounded-2xl border border-border/50 bg-dark-card/70 px-4 py-3 text-sm text-text-muted shadow-hologram">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ChartBarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Estado del dashboard
                  </p>
                  <Flex className="gap-2" alignItems="center">
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-text-muted">Actualizando métricas...</span>
                      </>
                    ) : (
                      <span className="text-text-primary">Datos consistentes y listos para analizar</span>
                    )}
                  </Flex>
                </div>
              </div>
            </div>
          </Flex>
        </motion.div>

      {lastImport && (
        <div
          className={`glass-card flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 shadow-glow-sm ${
            lastImport.success
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-danger/40 bg-danger-glow text-danger'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <CloudArrowUpIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold">{lastImport.message}</p>
              <p className="mt-1 text-sm text-text-muted">
                Registros procesados: {lastImport.total_uploaded}.{' '}
                {lastImport.errors_count > 0
                  ? `Observaciones detectadas: ${lastImport.errors_count}. Revisa el detalle en el panel de importación.`
                  : 'Todos los registros fueron importados correctamente.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastImport(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-primary"
          >
            <XMarkIcon className="h-4 w-4" />
            Cerrar
          </button>
        </div>
      )}

      {/* Filtros Dinámicos Mejorados */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-20"
      >
        <Card className="glass-panel border border-border/60 bg-dark-card/75 shadow-hologram">
          <Flex justifyContent="between" alignItems="start" className="mb-6 gap-4">
            <Flex alignItems="center" className="gap-3">
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-primary shadow-glow-sm">
                <FunnelIcon className="h-6 w-6" />
              </div>
              <div>
                <Title className="text-2xl font-semibold text-text-primary">Filtros dinámicos</Title>
                <Text className="text-sm text-text-muted">Personaliza tu análisis con la misma estética futurista.</Text>
              </div>

              <AnimatePresence>
                {activeFilterCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="ml-2"
                  >
                    <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
                      <SparklesIcon className="h-4 w-4" />
                      {activeFilterCount === 1 ? '1 filtro activo' : `${activeFilterCount} filtros activos`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>

            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-dark-card/70 px-4 py-2 text-sm font-semibold text-text-secondary transition-all duration-200 hover:border-danger/60 hover:text-danger"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Limpiar filtros
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </Flex>

          <Grid numItemsLg={3} className="gap-6">
            <FilterSelect
              label="Año"
              value={filters.year?.toString() || ''}
              onChange={(value: string) => handleFilterChange('year', value ? parseInt(value) : undefined)}
              options={[
                <SelectItem key="all" value="">Todos los años</SelectItem>,
                ...filterOptions.years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    📅 {year}
                  </SelectItem>
                ))
              ]}
            />

            <FilterSelect
              label="Mes"
              value={filters.month?.toString() || ''}
              onChange={(value: string) => handleFilterChange('month', value ? parseInt(value) : undefined)}
              disabled={!filters.year}
              options={[
                <SelectItem key="all" value="">Todos los meses</SelectItem>,
                ...filterOptions.months.map(month => (
                  <SelectItem key={month} value={month.toString()}>
                    {new Date(2000, month - 1).toLocaleDateString('es', { month: 'long' })}
                  </SelectItem>
                ))
              ]}
            />

            <FilterSelect
              label="Categoría"
              value={filters.categoria || ''}
              onChange={(value: string) => handleFilterChange('categoria', value || undefined)}
              options={[
                <SelectItem key="all" value="">Todas las categorías</SelectItem>,
                ...filterOptions.categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    🏷️ {cat}
                  </SelectItem>
                ))
              ]}
            />

            <FilterSelect
              label="Canal"
              value={filters.canal || ''}
              onChange={(value: string) => handleFilterChange('canal', value || undefined)}
              options={[
                <SelectItem key="all" value="">Todos los canales</SelectItem>,
                ...filterOptions.canales.map(canal => (
                  <SelectItem key={canal} value={canal}>
                    📊 {canal}
                  </SelectItem>
                ))
              ]}
            />

            <SearchableSelect
              label="Vendedor"
              value={filters.vendedor || ''}
              onChange={(value: string) => handleFilterChange('vendedor', value || undefined)}
              options={filterOptions.vendedores}
              placeholder="Selecciona un vendedor"
              icon="👤"
              emptyMessage="No se encontraron vendedores"
            />

            <SearchableSelect
              label="Cliente"
              value={filters.cliente || ''}
              onChange={(value: string) => handleFilterChange('cliente', value || undefined)}
              options={filterOptions.clientes}
              placeholder="Selecciona un cliente"
              icon="🏢"
              emptyMessage="No se encontraron clientes"
            />
          </Grid>
        </Card>
      </motion.div>

      {insightCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
            {insightCards.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-card relative overflow-hidden border border-border/60 bg-dark-card/80 shadow-hologram">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 opacity-40" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Text className="text-xs uppercase tracking-wide text-text-secondary">{insight.title}</Text>
                        <Metric className="text-text-primary">{insight.value}</Metric>
                        <Text className="text-sm text-text-muted">
                          {insight.description}
                        </Text>
                      </div>
                      <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-primary shadow-glow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </Grid>
        </motion.div>
      )}

      {/* KPIs Mejorados */}
      {summaryData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Grid numItemsLg={4} className="gap-6">
            <KPICard
              title="Venta Neta Total"
              value={`$${summaryData.venta_neta_total?.toLocaleString() || '0'}`}
              subtitle={`${summaryData.num_facturas || 0} facturas`}
              icon={CurrencyDollarIcon}
              color="blue"
              loading={loading}
            />

            <KPICard
              title="Rentabilidad"
              value={`$${summaryData.rentabilidad_total?.toLocaleString() || '0'}`}
              subtitle={`Margen: ${summaryData.margen_bruto_porcentaje || 0}%`}
              icon={ArrowTrendingUpIcon}
              color="green"
              loading={loading}
            />

            <KPICard
              title="Clientes"
              value={summaryData.num_clientes?.toLocaleString() || '0'}
              subtitle={`${summaryData.num_facturas || 0} transacciones`}
              icon={UsersIcon}
              color="purple"
              loading={loading}
            />

            <KPICard
              title="Ticket Promedio"
              value={`$${summaryData.ticket_promedio?.toLocaleString() || '0'}`}
              subtitle={`${summaryData.unidades_vendidas?.toLocaleString() || 0} unidades`}
              icon={ShoppingCartIcon}
              color="amber"
              loading={loading}
            />
          </Grid>
        </motion.div>
      )}

      {/* Tabs Modernos con UI Mejorada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-panel border border-border/60 bg-dark-card/80 shadow-hologram p-0 overflow-hidden">
          {/* Tab Headers Modernos */}
          <div className="relative flex gap-0 p-2 bg-dark-card/40">
            {/* Vista Comercial */}
            <button
              type="button"
              onClick={() => setActiveView('commercial')}
              className={`
                relative flex-1 group px-6 py-4 rounded-xl font-semibold text-base
                transition-all duration-300 overflow-hidden
                ${activeView === 'commercial'
                  ? 'text-text-primary shadow-2xl z-10'
                  : 'text-text-muted hover:text-text-secondary'
                }
              `}
            >
              {/* Fondo activo con gradiente */}
              <AnimatePresence>
                {activeView === 'commercial' && (
                  <motion.div
                    layoutId="activeTab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient-x"
                    style={{
                      boxShadow: '0 0 30px rgba(0, 240, 255, 0.4), inset 0 0 20px rgba(0, 240, 255, 0.2)'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Efecto hover */}
              {activeView !== 'commercial' && (
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}

              {/* Contenido */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <ShoppingCartIcon className={`h-6 w-6 transition-all duration-300 ${
                  activeView === 'commercial'
                    ? 'text-white scale-110'
                    : 'text-text-muted group-hover:text-primary group-hover:scale-105'
                }`} />
                <span className={`font-bold tracking-wide ${
                  activeView === 'commercial'
                    ? 'text-white text-shadow-glow'
                    : ''
                }`}>
                  Vista Comercial
                </span>

                {/* Indicador de estado activo */}
                {activeView === 'commercial' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white shadow-glow-sm"
                  />
                )}
              </div>

              {/* Barra indicadora inferior */}
              {activeView === 'commercial' && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>

            {/* Vista Financiera */}
            <button
              type="button"
              onClick={() => setActiveView('financial')}
              className={`
                relative flex-1 group px-6 py-4 rounded-xl font-semibold text-base
                transition-all duration-300 overflow-hidden
                ${activeView === 'financial'
                  ? 'text-text-primary shadow-2xl z-10'
                  : 'text-text-muted hover:text-text-secondary'
                }
              `}
            >
              {/* Fondo activo con gradiente */}
              <AnimatePresence>
                {activeView === 'financial' && (
                  <motion.div
                    layoutId="activeTab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-accent to-emerald-500 bg-[length:200%_100%] animate-gradient-x"
                    style={{
                      boxShadow: '0 0 30px rgba(0, 255, 153, 0.4), inset 0 0 20px rgba(0, 255, 153, 0.2)'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Efecto hover */}
              {activeView !== 'financial' && (
                <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}

              {/* Contenido */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <ChartBarIcon className={`h-6 w-6 transition-all duration-300 ${
                  activeView === 'financial'
                    ? 'text-white scale-110'
                    : 'text-text-muted group-hover:text-accent group-hover:scale-105'
                }`} />
                <span className={`font-bold tracking-wide ${
                  activeView === 'financial'
                    ? 'text-white text-shadow-glow'
                    : ''
                }`}>
                  Vista Financiera
                </span>

                {/* Indicador de estado activo */}
                {activeView === 'financial' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white shadow-glow-sm"
                  />
                )}
              </div>

              {/* Barra indicadora inferior */}
              {activeView === 'financial' && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>

            {/* Vista Análisis Gerencial */}
            <button
              type="button"
              onClick={() => setActiveView('gerencial')}
              className={`
                relative flex-1 group px-6 py-4 rounded-xl font-semibold text-base
                transition-all duration-300 overflow-hidden
                ${activeView === 'gerencial'
                  ? 'text-text-primary shadow-2xl z-10'
                  : 'text-text-muted hover:text-text-secondary'
                }
              `}
            >
              {/* Fondo activo con gradiente */}
              <AnimatePresence>
                {activeView === 'gerencial' && (
                  <motion.div
                    layoutId="activeTab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 bg-[length:200%_100%] animate-gradient-x"
                    style={{
                      boxShadow: '0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.2)'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Efecto hover */}
              {activeView !== 'gerencial' && (
                <div className="absolute inset-0 bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}

              {/* Contenido */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <ChartBarIcon className={`h-6 w-6 transition-all duration-300 ${
                  activeView === 'gerencial'
                    ? 'text-white scale-110'
                    : 'text-text-muted group-hover:text-violet-500 group-hover:scale-105'
                }`} />
                <span className={`font-bold tracking-wide ${
                  activeView === 'gerencial'
                    ? 'text-white text-shadow-glow'
                    : ''
                }`}>
                  Análisis Gerencial
                </span>

                {/* Indicador de estado activo */}
                {activeView === 'gerencial' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white shadow-glow-sm"
                  />
                )}
              </div>

              {/* Barra indicadora inferior */}
              {activeView === 'gerencial' && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          </div>

          {/* Contenido de las vistas */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeView === 'commercial' && (
                <motion.div
                  key="commercial"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CommercialView filters={filters} />
                </motion.div>
              )}

              {activeView === 'financial' && (
                <motion.div
                  key="financial"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FinancialView filters={filters} />
                </motion.div>
              )}

              {activeView === 'gerencial' && (
                <motion.div
                  key="gerencial"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnalisisGerencial filters={filters} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>

    <SalesDataUploadModal
      open={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      onUploaded={handleImportSuccess}
    />
    </>
  );
}
