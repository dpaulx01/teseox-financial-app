import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Badge,
  BarChart,
  Card,
  DonutChart,
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
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../../services/api';

interface Props {
  filters: any;
}

export default function FinancialView({ filters }: Props) {
  const [groupBy, setGroupBy] = useState('categoria');
  const [data, setData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(false);

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
  }, [filters, groupBy]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams({ group_by: groupBy, limit: '15' });
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/analysis/financial?${params}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadTrends = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.canal) params.append('canal', filters.canal);
      if (filters.vendedor) params.append('vendedor', filters.vendedor);
      if (filters.cliente) params.append('cliente', filters.cliente);

      const response = await api.get(`/api/sales-bi/trends/monthly?${params}`);
      if (response.data.success) {
        setTrendsData(response.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const currencyFormatter = (value: number = 0) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value ?? 0);

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

  const donutDistribution = useMemo(
    () =>
      data.slice(0, 6).map((item: any) => ({
        dimension: item.dimension || 'Sin definir',
        rentabilidad: Number(item.rentabilidad || 0),
      })),
    [data]
  );

  return (
    <div className="space-y-6 p-6">
      <Card className="glass-panel relative overflow-hidden border border-border/60 bg-dark-card/75 shadow-hologram">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-emerald-500/15 opacity-50" />
        <Flex justifyContent="between" alignItems="center" className="mb-6">
          <div>
            <Title className="text-2xl font-semibold text-text-primary">
              Tendencias Financieras
            </Title>
            <Text className="text-sm text-text-muted">
              Evolución mensual de ventas, costos y rentabilidad neta
            </Text>
          </div>
          <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            <ShieldCheckIcon className="h-4 w-4" />
            Salud promedio: {promedioMargen.toFixed(1)}%
          </div>
        </Flex>

        <AreaChart
          data={trendsData}
          index="period"
          categories={['venta_neta', 'rentabilidad', 'costo_venta']}
          colors={['blue', 'emerald', 'rose']}
          valueFormatter={currencyFormatter}
          yAxisWidth={80}
          className="h-80"
        />
      </Card>

      <Card className="glass-panel relative overflow-hidden border border-border/60 bg-dark-card/75 shadow-hologram">
        <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
        <Flex justifyContent="between" alignItems="center" className="mb-6">
          <div className="space-y-1">
            <Title className="text-xl text-text-primary">Análisis de rentabilidad</Title>
            <Text className="text-sm text-text-muted">
              Desglose comparativo por {groupBy} con foco en margen y eficiencia
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

        <Grid numItemsLg={5} className="gap-6">
          <Card className="glass-panel col-span-5 border border-border/60 bg-dark-card/75 shadow-hologram lg:col-span-3">
            <Flex justifyContent="between" alignItems="center">
              <Metric className="text-emerald-400">
                {currencyFormatter(totalRentabilidad)}
              </Metric>
              <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                Rentabilidad acumulada
              </div>
            </Flex>
            <Text className="mt-2 text-sm text-text-muted">
              La vista apilada permite comparar rápidamente ventas, costos y utilidad neta.
            </Text>
            <BarChart
              data={data}
              index="dimension"
              categories={['venta_neta', 'costo_venta', 'rentabilidad']}
              colors={['blue', 'rose', 'emerald']}
              valueFormatter={currencyFormatter}
              yAxisWidth={80}
              stack
              className="mt-4 h-80"
            />
          </Card>

          <Card className="glass-card col-span-5 flex flex-col justify-between border border-border/60 bg-dark-card/75 shadow-hologram lg:col-span-2">
            <div className="space-y-4">
              <Flex alignItems="center" className="gap-3">
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-emerald-300">
                  <BanknotesIcon className="h-6 w-6" />
                </div>
                <div>
                  <Text className="text-xs uppercase tracking-wide text-text-muted">Costo operativo</Text>
                  <Metric className="text-text-primary">
                    {currencyFormatter(totalCosto)}
                  </Metric>
                </div>
              </Flex>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-text-primary">Margen promedio</Text>
                  <Badge
                    color={promedioMargen >= 35 ? 'emerald' : promedioMargen >= 20 ? 'yellow' : 'red'}
                    icon={promedioMargen >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
                  >
                    {promedioMargen.toFixed(1)}%
                  </Badge>
                </Flex>
                <Text className="mt-2 text-xs text-text-muted">
                  Calculado sobre el total de segmentos visibles en el dashboard.
                </Text>
              </div>
            </div>

            <div className="mt-6 h-56">
              <DonutChart
                data={donutDistribution}
                index="dimension"
                category="rentabilidad"
                colors={['emerald', 'green', 'blue', 'cyan', 'violet', 'fuchsia']}
                valueFormatter={currencyFormatter}
                showTooltip
              />
            </div>
          </Card>
        </Grid>
      </Card>

      <Card className="glass-panel border border-border/60 bg-dark-card/80 shadow-hologram">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <Title className="text-xl text-text-primary">Detalle financiero</Title>
          <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {data.length} segmentos analizados • Margen prom. {promedioMargen.toFixed(1)}%
          </div>
        </Flex>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table className="min-w-full divide-y divide-dark-card/70 text-text-primary">
            <TableHead>
              <TableRow className="bg-dark-card/80">
                <TableHeaderCell className="text-xs uppercase tracking-wide text-text-secondary">
                  {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Venta Neta
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Costo Venta
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Rentabilidad
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Margen %
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Ratio Costo %
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-dark-card/60">
              {data.map((row: any, idx) => (
                <TableRow
                  key={idx}
                  className="transition-colors hover:bg-emerald-500/10"
                >
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
                  <TableCell className="text-right text-text-secondary">
                    {row.ratio_costo_venta}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
