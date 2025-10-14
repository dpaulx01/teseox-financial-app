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
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-slate-100 text-slate-600',
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow">
      <p className="text-sm font-semibold text-slate-700">{data.name}</p>
      <p className="text-xs text-slate-500">
        Unidades activas: {formatNumber(data.total_units)}
      </p>
      <p className="text-xs text-slate-500">
        Metros activos: {formatNumber(data.total_metros)}
      </p>
      <p className="text-xs text-slate-500">
        Ítems activos: {formatNumber(data.item_count)}
      </p>
      {data.total_value ? (
        <p className="text-xs text-slate-500">
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow">
      <p className="text-sm font-semibold text-slate-700">{data.status}</p>
      <p className="text-xs text-slate-500">Unidades: {formatNumber(data.unidades)}</p>
      <p className="text-xs text-slate-500">Metros: {formatNumber(data.metros)}</p>
      <p className="text-xs text-slate-500">Ítems: {formatNumber(data.count)}</p>
    </div>
  );
};

const KpiCard: React.FC<{ card: KpiCardData }> = ({ card }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{card.label}</p>
    <p className={`mt-2 text-2xl font-semibold ${card.color === 'red' ? 'text-red-600' : 'text-slate-900'}`}>
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
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-64 items-center justify-center text-red-600">
          <AlertCircle className="mr-2 h-5 w-5" />
          {error}
        </div>
      );
    }

    if (!kpiData) {
      return <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Sin información disponible por el momento.</div>;
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
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">Agenda de producción (metros / unidades)</h4>
                  <p className="text-xs text-slate-500">
                    Programación diaria basada en las fechas de entrega de los pedidos activos.
                  </p>
                </div>
                <div className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs text-indigo-600">
                  Próx. 7 días: {formatNumber(nextSevenTotals.metros7)} m · {formatNumber(nextSevenTotals.unidades7)} u
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scheduleData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="metros"
                      name="Metros"
                      stroke="#2563eb"
                      fill="#2563eb22"
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="unidades"
                      name="Unidades"
                      stroke="#22c55e"
                      fill="#22c55e22"
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-2">
                <span>Total planificado (≥ hoy): {formatNumber(nextSevenTotals.metros)} m · {formatNumber(nextSevenTotals.unidades)} u</span>
                <span>Ventana mostrada: hoy → {sevenDaysAhead.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}</span>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <h4 className="text-lg font-semibold text-slate-800">Alertas operativas</h4>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Se generan por entregas vencidas o próximas, y por fichas sin fecha o estatus.
            </p>
            {risk_alerts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No se registran alertas críticas en este momento.
              </p>
            ) : (
              <ul className="space-y-4">
                {risk_alerts.slice(0, 8).map((alert) => (
                  <li key={`${alert.tipo}-${alert.id}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">{alert.descripcion}</p>
                        <p className="text-xs text-slate-500">
                          {alert.numero_cotizacion ? `COT ${alert.numero_cotizacion}` : 'Sin número de cotización'}
                          {alert.cliente ? ` • ${alert.cliente}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">{describeAlert(alert)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${severityStyles[alert.severidad]}`}
                      >
                        {severityLabel[alert.severidad]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-indigo-500" />
              <h4 className="text-lg font-semibold text-slate-800">Capacidad y ritmo</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ingresos hoy</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Unidades</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.ingresos_hoy_unidades)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Metros</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.ingresos_hoy_metros)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ingresos semana</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Unidades</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.ingresos_semana_unidades)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Metros</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.ingresos_semana_metros)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Entregas semana</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Unidades</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.entregas_semana_unidades)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Metros</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(workload_snapshot.entregas_semana_metros)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p>
                Plazo promedio (ingreso → entrega):{' '}
                {workload_snapshot.promedio_plazo_dias != null
                  ? `${workload_snapshot.promedio_plazo_dias.toFixed(1)} días`
                  : '—'}
              </p>
              <p>
                Retraso promedio (entrega vencida):{' '}
                {workload_snapshot.promedio_retraso_dias != null
                  ? `${workload_snapshot.promedio_retraso_dias.toFixed(1)} días`
                  : '—'}
              </p>
            </div>
            <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Calidad de datos
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-600">
                  <span className="font-semibold">{formatNumber(data_gaps.sin_fecha_entrega)}</span>{' '}
                  sin fecha de entrega
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-600">
                  <span className="font-semibold">{formatNumber(data_gaps.sin_estatus)}</span>{' '}
                  sin estatus
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-600">
                  <span className="font-semibold">{formatNumber(data_gaps.sin_cliente)}</span>{' '}
                  sin cliente
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-600">
                  <span className="font-semibold">{formatNumber(data_gaps.sin_cantidad)}</span>{' '}
                  sin cantidad
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <h4 className="text-lg font-semibold text-slate-800">Resumen financiero</h4>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Valor activo (líneas abiertas)</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(financial_summary.total_en_produccion)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Valor atrasado (fecha entrega vencida)</dt>
                <dd className="font-semibold text-red-600">
                  {formatCurrency(financial_summary.valor_atrasado)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Listo para retiro (estatus)</dt>
                <dd className="font-semibold text-emerald-600">
                  {formatCurrency(financial_summary.valor_listo_para_retiro)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <dt className="text-slate-500">Saldo por cobrar</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(financial_summary.saldo_por_cobrar)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-lg font-semibold text-slate-800">
              Distribución por estatus (unidades / metros)
            </h4>
            {statusChartData.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No hay órdenes activas para graficar.
              </p>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip content={renderStatusTooltip} />
                      <Legend />
                      <Bar dataKey="unidades" name="Unidades" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="metros" name="Metros" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 space-y-3 text-xs">
                  {status_breakdown.map((status) => (
                    <div
                      key={status.status}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{status.status}</p>
                        <p className="text-xs text-slate-500">
                          {status.percent.toFixed(1)}% de las líneas • {formatNumber(status.count)} ítems
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Unidades: {formatNumber(status.total_units)}</p>
                        <p>Metros: {formatNumber(status.total_metros)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-lg font-semibold text-slate-800">
              Clientes con mayor carga (unidades / metros)
            </h4>
            {topClientsChartData.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Aún no hay clientes con pedidos activos registrados.
              </p>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClientsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip content={renderTopClientsTooltip} />
                      <Legend />
                      <Bar dataKey="unidades" name="Unidades" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="metros" name="Metros" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 space-y-3 text-xs">
                  {top_clients.map((client) => (
                    <div
                      key={client.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{client.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatNumber(client.item_count)} ítems en curso
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Unidades: {formatNumber(client.total_units)}</p>
                        <p>Metros: {formatNumber(client.total_metros)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-indigo-500" />
            <h4 className="text-lg font-semibold text-slate-800">Calendario de entregas (7 días)</h4>
          </div>
          {upcoming_deliveries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No existen entregas comprometidas en la próxima semana.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {upcoming_deliveries.map((delivery: UpcomingDeliveryItem) => (
                <li
                  key={delivery.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{delivery.descripcion}</p>
                    <p className="text-xs text-slate-500">
                      {delivery.numero_cotizacion ? `COT ${delivery.numero_cotizacion}` : 'Sin número de cotización'}
                      {delivery.cliente ? ` • ${delivery.cliente}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDate(delivery.fecha_entrega)}
                    </p>
                    <p>
                      {delivery.dias_restantes === 0
                        ? 'Entrega hoy'
                        : `En ${delivery.dias_restantes} día(s)`}
                    </p>
                    <p>{delivery.estatus ?? 'Sin estatus'}</p>
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
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-3xl font-bold text-slate-900">Cuadro de Mando de Producción</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Visualiza desempeño operativo, riesgos y salud financiera de la producción en una vista 360°. Cambia de pestaña para gestionar la producción activa o revisar el archivo histórico.
      </p>

      <div className="mt-6 border-b border-slate-200 pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('kpi')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeView === 'kpi'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Dashboard 360°
          </button>
          <button
            onClick={() => setActiveView('control_panel')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeView === 'control_panel'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Panel de control
          </button>
          <button
            onClick={() => setActiveView('archive')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeView === 'archive'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
            className="inline-flex items-center gap-2 self-end rounded-full border border-indigo-500 px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
