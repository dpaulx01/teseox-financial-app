import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  BarChart,
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
  DonutChart,
  Flex,
  Metric,
} from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../../services/api';

interface Props {
  filters: any;
}

export default function CommercialView({ filters }: Props) {
  const [groupBy, setGroupBy] = useState('categoria');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const currencyFormatter = (value: number = 0) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  useEffect(() => {
    loadData();
  }, [filters, groupBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: groupBy, limit: '20' });
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
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

  const topPerformer = useMemo(() => data?.[0], [data]);
  const totalVentas = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.venta_neta || 0), 0),
    [data]
  );
  const totalUnidades = useMemo(
    () => data.reduce((acc: number, item: any) => acc + (item.unidades || 0), 0),
    [data]
  );
  const donutData = useMemo(
    () =>
      data.slice(0, 6).map((item: any) => ({
        dimension: item.dimension || 'Sin definir',
        ventas: Number(item.venta_neta) || 0,
      })),
    [data]
  );

  return (
    <div className="space-y-6 p-6">
        <Grid numItemsLg={5} className="gap-6">
          <Card className="glass-panel col-span-5 lg:col-span-3 border border-border/60 bg-dark-card/70 shadow-hologram">
            <Metric className="mb-2 text-text-primary">
              Total ventas vistas: {currencyFormatter(totalVentas)}
            </Metric>
            <Text className="mb-4 text-sm text-text-muted">
              Comparativo entre ventas netas y descuentos aplicados.
            </Text>
            <BarChart
              data={data}
              index="dimension"
              categories={['venta_neta', 'descuento']}
              colors={['blue', 'amber']}
              valueFormatter={currencyFormatter}
              yAxisWidth={80}
              animationDuration={1200}
              className="h-80"
            />
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
                  <div>{(topPerformer?.porcentaje_descuento || 0).toFixed(1)}% desc.</div>
                </Flex>
              </div>
            </div>

            <div className="mt-6 h-56">
              {donutData.length > 0 ? (
                <DonutChart
                  data={donutData}
                  category="ventas"
                  index="dimension"
                  colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia', 'emerald']}
                  valueFormatter={currencyFormatter}
                  showTooltip
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Text className="text-center text-text-muted">
                    No hay datos suficientes para mostrar el gráfico.
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Grid>

      <Card className="glass-panel border border-border/60 bg-dark-card/80 shadow-hologram">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <Title className="text-xl text-text-primary">Detalle de ventas</Title>
          <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {data.length} segmentos • {totalUnidades.toLocaleString()} unidades
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
                  Descuento
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Facturas
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Unidades
                </TableHeaderCell>
                <TableHeaderCell className="text-right text-xs uppercase tracking-wide text-text-secondary">
                  Ticket Prom.
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-dark-card/60">
              {data.map((row: any, idx) => (
                <TableRow
                  key={idx}
                  className="transition-colors hover:bg-primary/10"
                >
                  <TableCell>
                    <Text className="font-medium text-text-primary">{row.dimension}</Text>
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {currencyFormatter(row.venta_neta)}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {currencyFormatter(row.descuento)}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {row.num_facturas}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {Number(row.unidades || 0).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {currencyFormatter(row.ticket_promedio)}
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
