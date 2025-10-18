import React, { useCallback, useEffect, useRef, useState } from 'react';
import financialAPI from '../services/api';
import {
  DashboardKpisResponse,
  KpiCard as KpiCardData,
  RiskAlertItem,
  StatusBreakdownItem,
  TopClientItem,
  UpcomingDeliveryItem,
} from '../types/production';
import {
  Loader,
  AlertCircle,
  ShieldAlert,
  CalendarClock,
  TrendingUp,
  Clock,
  RefreshCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import ProductionControlPanel from './ProductionControlPanel';
import ProductionArchive from './ProductionArchive';

const numberFormatter = new Intl.NumberFormat('es-EC');
const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const formatNumber = (value?: number | null) => numberFormatter.format(value ?? 0);
const formatCurrency = (value?: number | null) => currencyFormatter.format(value ?? 0);
const formatDate = (iso?: string | null) => {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const severityStyles: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-danger-glow text-danger border border-danger/30',
  medium: 'bg-warning-glow text-warning border border-warning/30',
  low: 'bg-dark-card/70 text-text-muted border border-border/40',
};

const severityLabel: Record<'high' | 'medium' | 'low', string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const describeAlert = (alert: RiskAlertItem) => {
  switch (alert.tipo) {
    case 'overdue':
      return `Atrasado ${alert.dias} día(s) • Vencía el ${formatDate(alert.fecha_entrega)}`;
    case 'due_soon':
      return alert.dias === 0
        ? 'Entrega programada para hoy'
        : `Entrega en ${alert.dias} día(s)`;
    case 'missing_date':
      return 'Sin fecha de entrega definida';
    case 'missing_status':
      return 'Sin estatus asignado';
    default:
      return '';
  }
};

const renderTopClientsTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }
  const data: TopClientItem = payload[0].payload;
  return (
    <div className="glass-card rounded-xl border border-border/60 bg-dark-card/95 px-4 py-3 shadow-glass">
      <p className="text-sm font-semibold text-text-primary">{data.name}</p>
      <p className="text-xs text-text-muted">
        Unidades activas: {formatNumber(data.total_units)}
      </p>
      <p className="text-xs text-text-muted">
        Metros activos: {formatNumber(data.total_metros)}
      </p>
      <p className="text-xs text-text-muted">
        Ítems activos: {formatNumber(data.item_count)}
      </p>
      {data.total_value ? (
        <p className="text-xs text-text-muted">
          Valor asociado: {formatCurrency(data.total_value)}
        </p>
      ) : null}
    </div>
  );
};

const renderStatusTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }
  const data = payload[0].payload as {
    status: string;
    unidades: number;
    metros: number;
    count: number;
  };
  return (
    <div className="glass-card rounded-xl border border-border/60 bg-dark-card/95 px-4 py-3 shadow-glass">
      <p className="text-sm font-semibold text-text-primary">{data.status}</p>
      <p className="text-xs text-text-muted">Unidades: {formatNumber(data.unidades)}</p>
      <p className="text-xs text-text-muted">Metros: {formatNumber(data.metros)}</p>
      <p className="text-xs text-text-muted">Ítems: {formatNumber(data.count)}</p>
    </div>
  );
};

const KpiCard: React.FC<{ card: KpiCardData }> = ({ card }) => (
  <div className="glass-card rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-glass hover:shadow-glow-sm transition-all duration-300">
    <p className="text-sm font-medium text-text-muted uppercase tracking-wide">{card.label}</p>
    <p className={`mt-3 text-3xl font-bold data-display ${card.color === 'red' ? 'text-danger' : 'text-primary'}`}>
      {card.value}
    </p>
  </div>
);

const ProductionDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'kpi' | 'control_panel' | 'archive'>('kpi');
  const [kpiData, setKpiData] = useState<DashboardKpisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financialAPI.getDashboardKpis();
      setKpiData(data);
      setError(null);
    } catch (err) {
      setError('No se pudo cargar el cuadro de mando.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      fetchData();
      hasMounted.current = true;
      return;
    }
    if (activeView === 'kpi') {
      fetchData();
    }
  }, [activeView, fetchData]);

  const renderKPIs = () => {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-64 items-center justify-center text-danger">
          <AlertCircle className="mr-2 h-5 w-5" />
          {error}
        </div>
      );
    }

    if (!kpiData) {
      return <div className="glass-panel rounded-2xl border border-dashed border-border/60 bg-dark-card/50 p-8 text-center text-sm text-text-muted">Sin información disponible por el momento.</div>;
    }

    const {
      risk_alerts,
      workload_snapshot,
      data_gaps,
      financial_summary,
      status_breakdown,
      top_clients,
      upcoming_deliveries,
      daily_workload,
    } = kpiData;

    const parseDailyWorkloadDate = (value: string) => {
      if (!value) {
        return new Date();
      }
      const [datePart] = value.split('T');
      const parts = datePart.split('-').map((segment) => Number(segment));
      if (parts.length === 3 && parts.every((segment) => Number.isFinite(segment))) {
        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
      }
      return new Date(value);
    };

    const scheduleData = (daily_workload ?? [])
      .map((entry) => {
        const dateObj = parseDailyWorkloadDate(entry.fecha);
        dateObj.setHours(0, 0, 0, 0);
        return {
          rawDate: dateObj,
          date: dateObj.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
          }),
          metros: entry.metros,
          unidades: entry.unidades,
        };
      })
      .filter((item) => {
        const day = item.rawDate.getDay();
        return day !== 0 && day !== 6;
      })
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAhead = new Date(todayStart.getTime());
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    const nextSevenTotals = scheduleData.reduce(
      (acc, item) => {
        if (item.rawDate >= todayStart) {
          acc.metros += item.metros;
          acc.unidades += item.unidades;
          if (item.rawDate <= sevenDaysAhead) {
            acc.metros7 += item.metros;
            acc.unidades7 += item.unidades;
          }
        }
        return acc;
      },
      { metros: 0, unidades: 0, metros7: 0, unidades7: 0 },
    );

    const statusChartData = status_breakdown.map((item) => ({
      status: item.status,
      unidades: item.total_units,
      metros: item.total_metros,
      count: item.count,
    }));

    const topClientsChartData = top_clients.map((item) => ({
      name: item.name,
      unidades: item.total_units,
      metros: item.total_metros,
      item_count: item.item_count,
      total_value: item.total_value,
    }));

    return (
      <div className="space-y-8">
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpiData.kpi_cards.map((card) => (
              <KpiCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        {scheduleData.length > 0 && (
          <section className="grid grid-cols-1 gap-6">
            <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-text-primary neon-text">Agenda de producción (metros / unidades)</h4>
                  <p className="text-sm text-text-muted mt-1">
                    Programación diaria basada en las fechas de entrega de los pedidos activos.
                  </p>
                </div>
                <div className="rounded-full border border-primary/40 bg-primary-glow px-4 py-2 text-sm font-semibold text-primary">
                  Próx. 7 días: {formatNumber(nextSevenTotals.metros7)} m · {formatNumber(nextSevenTotals.unidades7)} u
                </div>
              </div>
              <div className="h-80 rounded-xl overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scheduleData} margin={{ top: 15, right: 25, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <RechartsTooltip
                      contentStyle={{ 
                        fontSize: 13, 
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: 'var(--color-text-primary)'
                      }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Legend wrapperStyle={{ color: 'var(--color-text-secondary)' }} />
                    <Area
                      type="monotone"
                      dataKey="metros"
                      name="Metros"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary-glow)"
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: 'var(--color-primary)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="unidades"
                      name="Unidades"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent-glow)"
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: 'var(--color-accent)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-text-muted sm:grid-cols-2 border-t border-border/40 pt-4">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  Total planificado (≥ hoy): {formatNumber(nextSevenTotals.metros)} m · {formatNumber(nextSevenTotals.unidades)} u
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                  Ventana mostrada: hoy → {sevenDaysAhead.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
            <div className="mb-4 flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-danger" />
              <h4 className="text-xl font-semibold text-text-primary neon-text">Alertas operativas</h4>
            </div>
            <p className="mb-6 text-sm text-text-muted">
              Se generan por entregas vencidas o próximas, y por fichas sin fecha o estatus.
            </p>
            {risk_alerts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 bg-dark-card/30 p-5 text-sm text-text-muted text-center">
                No se registran alertas críticas en este momento.
              </p>
            ) : (
              <ul className="space-y-4">
                {risk_alerts.slice(0, 8).map((alert) => (
                  <li key={`${alert.tipo}-${alert.id}`} className="rounded-xl border border-border/40 bg-dark-card/60 p-4 hover:bg-dark-card/80 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{alert.descripcion}</p>
                        <p className="text-xs text-text-muted">
                          {alert.numero_cotizacion ? `COT ${alert.numero_cotizacion}` : 'Sin número de cotización'}
                          {alert.cliente ? ` • ${alert.cliente}` : ''}
                        </p>
                        <p className="text-xs text-text-light">{describeAlert(alert)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${severityStyles[alert.severidad]}`}
                      >
                        {severityLabel[alert.severidad]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                <h4 className="text-xl font-semibold text-text-primary neon-text">Capacidad y ritmo</h4>
              </div>
              <div className="text-xs text-text-muted">
                Última actualización: {new Date().toLocaleDateString('es-ES')}
              </div>
            </div>
            
            {/* Resumen de producción actual */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-accent/30 bg-accent-glow p-4 text-center">
                <p className="text-xs text-text-muted mb-2">Productos activos</p>
                <p className="text-2xl font-bold text-accent">
                  {kpiData?.status_breakdown?.reduce((sum, status) => sum + status.count, 0) || 0}
                </p>
                <p className="text-xs text-text-dim mt-1">Líneas en proceso</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary-glow p-4 text-center">
                <p className="text-xs text-text-muted mb-2">Valor en proceso</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(financial_summary.total_cotizaciones_activas)}
                </p>
                <p className="text-xs text-text-dim mt-1">Total cotizaciones</p>
              </div>
            </div>
            
            {/* Flujo de trabajo intuitivo */}
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
                    📥 Ingresos esta semana
                  </p>
                  <div className="text-xs text-text-muted">
                    {workload_snapshot.ingresos_semana_unidades + workload_snapshot.ingresos_semana_metros > 0 ? 
                      '✅ Actividad detectada' : '⚪ Sin nuevos ingresos'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-dark-card/40 border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400 data-display">
                      {formatNumber(workload_snapshot.ingresos_semana_unidades)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Unidades</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-card/40 border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400 data-display">
                      {formatNumber(workload_snapshot.ingresos_semana_metros)} m²
                    </p>
                    <p className="text-xs text-text-muted mt-1">Metros cuadrados</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    📤 Entregas programadas
                  </p>
                  <div className="text-xs text-text-muted">
                    {workload_snapshot.entregas_semana_unidades + workload_snapshot.entregas_semana_metros > 0 ? 
                      '⏰ Entregas pendientes' : '🔄 Sin entregas programadas'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-dark-card/40 border border-blue-500/20">
                    <p className="text-2xl font-bold text-blue-400 data-display">
                      {formatNumber(workload_snapshot.entregas_semana_unidades)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Unidades</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-card/40 border border-blue-500/20">
                    <p className="text-2xl font-bold text-blue-400 data-display">
                      {formatNumber(workload_snapshot.entregas_semana_metros)} m²
                    </p>
                    <p className="text-xs text-text-muted mt-1">Metros cuadrados</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border/40 pt-5 text-sm text-text-muted">
              <p className="flex items-center justify-between">
                <span>Plazo promedio (ingreso → entrega):</span>
                <span className="font-semibold text-text-secondary">
                  {workload_snapshot.promedio_plazo_dias != null
                    ? `${workload_snapshot.promedio_plazo_dias.toFixed(1)} días`
                    : '—'}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Retraso promedio (entrega vencida):</span>
                <span className="font-semibold text-text-secondary">
                  {workload_snapshot.promedio_retraso_dias != null
                    ? `${workload_snapshot.promedio_retraso_dias.toFixed(1)} días`
                    : '—'}
                </span>
              </p>
            </div>
            <div className="mt-6 border-t border-dashed border-border/40 pt-5">
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-text-primary">
                <AlertCircle className="h-5 w-5 text-warning" />
                Calidad de datos
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <span className="rounded-lg border border-warning/30 bg-warning-glow px-3 py-2 text-warning">
                  <span className="font-bold">{formatNumber(data_gaps.sin_fecha_entrega)}</span>{' '}
                  sin fecha de entrega
                </span>
                <span className="rounded-lg border border-warning/30 bg-warning-glow px-3 py-2 text-warning">
                  <span className="font-bold">{formatNumber(data_gaps.sin_estatus)}</span>{' '}
                  sin estatus
                </span>
                <span className="rounded-lg border border-warning/30 bg-warning-glow px-3 py-2 text-warning">
                  <span className="font-bold">{formatNumber(data_gaps.sin_cliente)}</span>{' '}
                  sin cliente
                </span>
                <span className="rounded-lg border border-warning/30 bg-warning-glow px-3 py-2 text-warning">
                  <span className="font-bold">{formatNumber(data_gaps.sin_cantidad)}</span>{' '}
                  sin cantidad
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
            <div className="mb-5 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-accent" />
              <h4 className="text-xl font-semibold text-text-primary neon-text">Resumen financiero</h4>
            </div>
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-card/60 border border-border/40">
                <dt className="text-text-muted">
                  <div>Valor activo (líneas abiertas)</div>
                  <div className="text-xs text-text-dim mt-1">Suma de productos individuales</div>
                </dt>
                <dd className="font-bold text-primary data-display">
                  {formatCurrency(financial_summary.total_en_produccion)}
                </dd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-glow border border-primary/40">
                <dt className="text-text-secondary font-medium">
                  <div>Total cotizaciones activas</div>
                  <div className="text-xs text-text-muted mt-1">Valor total de cotizaciones</div>
                </dt>
                <dd className="font-bold text-primary data-display text-lg">
                  {formatCurrency(financial_summary.total_cotizaciones_activas)}
                </dd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-card/60 border border-border/40">
                <dt className="text-text-muted">Valor atrasado (fecha entrega vencida)</dt>
                <dd className="font-bold text-danger">
                  {formatCurrency(financial_summary.valor_atrasado)}
                </dd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-card/60 border border-border/40">
                <dt className="text-text-muted">Listo para retiro (estatus)</dt>
                <dd className="font-bold text-accent">
                  {formatCurrency(financial_summary.valor_listo_para_retiro)}
                </dd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-glow border border-primary/40">
                <dt className="text-text-secondary font-medium">Saldo por cobrar</dt>
                <dd className="font-bold text-primary data-display text-lg">
                  {formatCurrency(financial_summary.saldo_por_cobrar)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
            <h4 className="mb-5 text-xl font-semibold text-text-primary neon-text">
              Distribución por estatus (unidades / metros)
            </h4>
            {statusChartData.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 bg-dark-card/30 p-5 text-sm text-text-muted text-center">
                No hay órdenes activas para graficar.
              </p>
            ) : (
              <>
                <div className="h-72 rounded-xl overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} margin={{ top: 15, right: 25, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis 
                        dataKey="status" 
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <RechartsTooltip content={renderStatusTooltip} />
                      <Legend wrapperStyle={{ color: 'var(--color-text-secondary)' }} />
                      <Bar 
                        dataKey="unidades" 
                        name="Unidades" 
                        fill="var(--color-primary)" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="metros" 
                        name="Metros" 
                        fill="var(--color-accent)" 
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3 text-sm">
                  {status_breakdown.map((status) => (
                    <div
                      key={status.status}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-dark-card/60 p-4 hover:bg-dark-card/80 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{status.status}</p>
                        <p className="text-xs text-text-muted">
                          {status.percent.toFixed(1)}% de las líneas • {formatNumber(status.count)} ítems
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-muted">
                        <p>Unidades: <span className="font-semibold text-primary">{formatNumber(status.total_units)}</span></p>
                        <p>Metros: <span className="font-semibold text-accent">{formatNumber(status.total_metros)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
            <h4 className="mb-5 text-xl font-semibold text-text-primary neon-text">
              Clientes con mayor carga (unidades / metros)
            </h4>
            {topClientsChartData.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 bg-dark-card/30 p-5 text-sm text-text-muted text-center">
                Aún no hay clientes con pedidos activos registrados.
              </p>
            ) : (
              <>
                <div className="h-72 rounded-xl overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClientsChartData} margin={{ top: 15, right: 25, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                      />
                      <RechartsTooltip content={renderTopClientsTooltip} />
                      <Legend wrapperStyle={{ color: 'var(--color-text-secondary)' }} />
                      <Bar 
                        dataKey="unidades" 
                        name="Unidades" 
                        fill="var(--color-primary)" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="metros" 
                        name="Metros" 
                        fill="var(--color-accent)" 
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3 text-sm">
                  {top_clients.map((client) => (
                    <div
                      key={client.name}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-dark-card/60 p-4 hover:bg-dark-card/80 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{client.name}</p>
                        <p className="text-xs text-text-muted">
                          {formatNumber(client.item_count)} ítems en curso
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-muted">
                        <p>Unidades: <span className="font-semibold text-primary">{formatNumber(client.total_units)}</span></p>
                        <p>Metros: <span className="font-semibold text-accent">{formatNumber(client.total_metros)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
          <div className="mb-5 flex items-center gap-3">
            <CalendarClock className="h-6 w-6 text-primary" />
            <h4 className="text-xl font-semibold text-text-primary neon-text">Calendario de entregas (7 días)</h4>
          </div>
          {upcoming_deliveries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-dark-card/30 p-5 text-sm text-text-muted text-center">
              No existen entregas comprometidas en la próxima semana.
            </p>
          ) : (
            <ul className="space-y-4 text-sm">
              {upcoming_deliveries.map((delivery: UpcomingDeliveryItem) => (
                <li
                  key={delivery.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-dark-card/60 p-4 hover:bg-dark-card/80 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{delivery.descripcion}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {delivery.numero_cotizacion ? `COT ${delivery.numero_cotizacion}` : 'Sin número de cotización'}
                      {delivery.cliente ? ` • ${delivery.cliente}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-text-muted">
                    <p className="text-sm font-semibold text-primary data-display">
                      {formatDate(delivery.fecha_entrega)}
                    </p>
                    <p className="font-medium text-text-secondary">
                      {delivery.dias_restantes === 0
                        ? 'Entrega hoy'
                        : `En ${delivery.dias_restantes} día(s)`}
                    </p>
                    <p className="text-accent">{delivery.estatus ?? 'Sin estatus'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'kpi':
        return renderKPIs();
      case 'control_panel':
        return <ProductionControlPanel />;
      case 'archive':
        return <ProductionArchive />;
      default:
        return renderKPIs();
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <h1 className="text-4xl font-bold text-text-primary neon-text">Cuadro de Mando de Producción</h1>
      <p className="mt-3 max-w-4xl text-base text-text-muted leading-relaxed">
        Visualiza desempeño operativo, riesgos y salud financiera de la producción en una vista 360°. Cambia de pestaña para gestionar la producción activa o revisar el archivo histórico.
      </p>

      <div className="mt-8 border-b border-border/40 pb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveView('kpi')}
            className={`whitespace-nowrap border-b-3 py-4 px-2 text-sm font-semibold transition-all duration-200 ${
              activeView === 'kpi'
                ? 'border-primary text-primary neon-text'
                : 'border-transparent text-text-muted hover:border-border hover:text-text-secondary'
            }`}
          >
            Dashboard 360°
          </button>
          <button
            onClick={() => setActiveView('control_panel')}
            className={`whitespace-nowrap border-b-3 py-4 px-2 text-sm font-semibold transition-all duration-200 ${
              activeView === 'control_panel'
                ? 'border-primary text-primary neon-text'
                : 'border-transparent text-text-muted hover:border-border hover:text-text-secondary'
            }`}
          >
            Panel de control
          </button>
          <button
            onClick={() => setActiveView('archive')}
            className={`whitespace-nowrap border-b-3 py-4 px-2 text-sm font-semibold transition-all duration-200 ${
              activeView === 'archive'
                ? 'border-primary text-primary neon-text'
                : 'border-transparent text-text-muted hover:border-border hover:text-text-secondary'
            }`}
          >
            Archivo histórico
          </button>
        </nav>
        {activeView === 'kpi' && (
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="cyber-button-sm inline-flex items-center gap-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Actualizar datos
          </button>
        )}
      </div>

      <div className="mt-6">{renderContent()}</div>
    </div>
  );
};

export default ProductionDashboard;
