import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import type { DailyScheduleDay, DailyScheduleItem } from '../../../types/production';

interface ProductionCalendarBoardProps {
  days: DailyScheduleDay[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface DayCardProps {
  day: DailyScheduleDay;
  onSelect: (day: DailyScheduleDay) => void;
}

const formatNumber = (value: number) =>
  Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value || 0);

const getMonthKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const DayCard: React.FC<DayCardProps> = ({ day, onSelect }) => {
  const badgeColor = day.manual
    ? 'bg-accent-glow text-accent border-accent/40'
    : 'bg-primary-glow text-primary border-primary/30';

  const parsedDate = new Date(day.fecha);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className="h-full w-full text-left rounded-2xl border border-border/60 bg-dark-card/50 shadow-inner transition-transform hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {parsedDate.toLocaleDateString('es-EC', { weekday: 'short' })}
          </p>
          <p className="text-lg font-semibold text-text-primary">
            {parsedDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeColor}`}
        >
          <CalendarRange className="h-3 w-3" />
          {day.manual ? 'Plan manual' : 'Distribución'}
        </span>
      </div>
      <div className="px-4 py-4 space-y-3 text-sm text-text-secondary">
        <div className="flex items-center justify-between">
          <span className="uppercase text-[11px] tracking-wide">Metros</span>
          <span className="font-semibold text-primary data-display">{formatNumber(day.metros)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="uppercase text-[11px] tracking-wide">Unidades</span>
          <span className="font-semibold text-accent data-display">{formatNumber(day.unidades)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>Productos</span>
          <span>{day.items.length}</span>
        </div>
        {typeof day.capacidad === 'number' && day.capacidad > 0 ? (
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Capacidad</span>
            <span>{Math.min(999, Math.round(((day.metros + day.unidades) / day.capacidad) * 100))}%</span>
          </div>
        ) : null}
      </div>
      <div className="px-4 pb-4">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary">
          <TrendingUp className="h-3 w-3" />
          Ver detalle
        </span>
      </div>
    </button>
  );
};

interface DayDetailModalProps {
  day: DailyScheduleDay | null;
  onClose: () => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ day, onClose }) => {
  if (!day) {
    return null;
  }

  const dateLabel = new Date(day.fecha).toLocaleDateString('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const groupedByQuote = useMemo(() => {
    const groups = new Map<string, { cotizacion: string; cliente: string | null; items: DailyScheduleItem[] }>();
    for (const item of day.items) {
      const key = item.numero_cotizacion || `item-${item.item_id}`;
      const bucket = groups.get(key) || {
        cotizacion: item.numero_cotizacion || 'Sin cotización',
        cliente: item.cliente || null,
        items: [],
      };
      bucket.items.push(item);
      groups.set(key, bucket);
    }
    return Array.from(groups.values());
  }, [day.items]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-dark-bg/90 backdrop-blur-md px-4">
      <div className="w-full max-w-5xl glass-panel rounded-2xl border border-border/60 bg-dark-card/95 shadow-hologram animate-scale-in">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-text-primary neon-text">Carga programada</h3>
            <p className="text-sm text-text-muted font-medium mt-1">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 cyber-button-sm bg-dark-card/80 border-border/60 text-text-secondary hover:text-danger hover:border-danger/40 transition-all duration-200"
          >
            Cerrar
          </button>
        </div>
        <div className="px-6 py-6 space-y-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-card rounded-xl border border-primary/30 bg-primary-glow p-5 shadow-glow-sm hover:shadow-glow-md transition-all duration-300">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Metros totales</p>
              <p className="mt-2 text-3xl font-bold text-primary data-display">{formatNumber(day.metros)}</p>
            </div>
            <div className="glass-card rounded-xl border border-accent/30 bg-accent-glow p-5 shadow-glow-sm hover:shadow-glow-md transition-all duration-300">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Unidades totales</p>
              <p className="mt-2 text-3xl font-bold text-accent data-display">{formatNumber(day.unidades)}</p>
            </div>
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/80 p-5 hover:bg-dark-card/90 transition-all duration-300">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Productos únicos</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{day.items.length}</p>
              {day.manual ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-glow border border-accent/30">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <p className="text-xs text-accent font-semibold">Plan manual registrado</p>
                </div>
              ) : null}
            </div>
          </div>

          {groupedByQuote.length === 0 ? (
            <div className="glass-card rounded-2xl border border-dashed border-border/60 bg-dark-card/30 px-6 py-8 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-dashed"></div>
                </div>
                <p className="text-base font-medium text-text-muted">No hay productos asignados</p>
                <p className="text-sm text-text-dim">Este día no tiene carga de producción programada</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                <h4 className="text-lg font-semibold text-text-primary">Productos por cotización</h4>
              </div>
              {groupedByQuote.map((group) => (
                <div key={group.cotizacion} className="glass-card rounded-2xl border border-border/60 bg-dark-card/70 overflow-hidden hover:bg-dark-card/80 transition-all duration-300">
                  <div className="relative px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
                    <div className="relative z-10">
                      <span className="text-lg font-bold text-text-primary">{group.cotizacion}</span>
                      {group.cliente && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full bg-accent"></div>
                          <span className="text-sm text-text-secondary font-medium">{group.cliente}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    {group.items.map((item) => (
                      <div
                        key={`${item.item_id}-${item.descripcion}`}
                        className="px-6 py-4 hover:bg-dark-card/40 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-text-primary text-base leading-tight">{item.descripcion}</p>
                            <div className="flex items-center gap-6 mt-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary"></div>
                                <span className="text-text-muted">Metros:</span>
                                <span className="font-bold text-primary">{formatNumber(item.metros)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-accent"></div>
                                <span className="text-text-muted">Unidades:</span>
                                <span className="font-bold text-accent">{formatNumber(item.unidades)}</span>
                              </div>
                              {item.estatus && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-text-secondary"></div>
                                  <span className="text-text-muted">Estado:</span>
                                  <span className="font-medium text-text-secondary">{item.estatus}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {item.manual ? (
                              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-accent-glow border border-accent/40 shadow-glow-accent">
                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                                <span className="text-xs font-bold text-accent uppercase tracking-wide">Manual</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-dark-card/60 border border-border/40">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Auto</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductionCalendarBoard: React.FC<ProductionCalendarBoardProps> = ({ days, loading, error, onRefresh }) => {
  const [selectedDay, setSelectedDay] = useState<DailyScheduleDay | null>(null);

  const monthBuckets = useMemo(() => {
    const map = new Map<string, { monthDate: Date; days: DailyScheduleDay[] }>();
    for (const day of days) {
      const parsed = new Date(day.fecha);
      parsed.setHours(0, 0, 0, 0);
      const key = getMonthKey(parsed);
      const bucket = map.get(key) || {
        monthDate: new Date(parsed.getFullYear(), parsed.getMonth(), 1),
        days: [],
      };
      bucket.days.push(day);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].monthDate.getTime() - b[1].monthDate.getTime());
  }, [days]);

  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);

  useEffect(() => {
    if (monthBuckets.length === 0) {
      setCurrentMonthKey(null);
      return;
    }
    if (currentMonthKey && monthBuckets.some(([key]) => key === currentMonthKey)) {
      return;
    }
    const todayKey = getMonthKey(new Date());
    const todayBucketExists = monthBuckets.some(([key]) => key === todayKey);
    setCurrentMonthKey(todayBucketExists ? todayKey : monthBuckets[0][0]);
  }, [monthBuckets, currentMonthKey]);

  const currentBucket = useMemo(
    () => monthBuckets.find(([key]) => key === currentMonthKey) ?? null,
    [monthBuckets, currentMonthKey],
  );

  const currentIndex = monthBuckets.findIndex(([key]) => key === currentMonthKey);
  const prevMonthKey = currentIndex > 0 ? monthBuckets[currentIndex - 1][0] : null;
  const nextMonthKey = currentIndex >= 0 && currentIndex < monthBuckets.length - 1 ? monthBuckets[currentIndex + 1][0] : null;

  const visibleDays = useMemo(() => {
    if (!currentBucket) {
      return [] as DailyScheduleDay[];
    }
    return [...currentBucket[1].days].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [currentBucket]);

  const monthLabel = useMemo(() => {
    if (!currentBucket) {
      return '';
    }
    return currentBucket[1].monthDate.toLocaleDateString('es-EC', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentBucket]);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="flex h-64 items-center justify-center text-text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Cargando agenda…
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-200 hover:text-red-100 hover:border-red-200 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  } else if (!visibleDays.length) {
    content = (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-border/60 bg-dark-card/50 p-6 text-sm text-text-secondary">
        Sin programación disponible para este mes.
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleDays.map((day) => (
          <DayCard key={day.fecha} day={day} onSelect={setSelectedDay} />
        ))}
      </div>
    );
  }

  return (
    <section className="glass-panel rounded-2xl border border-border shadow-hologram p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => prevMonthKey && setCurrentMonthKey(prevMonthKey)}
            disabled={!prevMonthKey}
            className="inline-flex items-center justify-center rounded-full border border-border/70 bg-dark-card/60 p-2 text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Agenda diaria de producción</h2>
            <p className="text-xs uppercase tracking-wide text-text-muted">{monthLabel || 'Sin calendario disponible'}</p>
          </div>
          <button
            type="button"
            onClick={() => nextMonthKey && setCurrentMonthKey(nextMonthKey)}
            disabled={!nextMonthKey}
            className="inline-flex items-center justify-center rounded-full border border-border/70 bg-dark-card/60 p-2 text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:text-primary hover:border-primary transition-colors"
        >
          Actualizar
        </button>
      </div>
      {content}
      <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />
    </section>
  );
};

export default ProductionCalendarBoard;
