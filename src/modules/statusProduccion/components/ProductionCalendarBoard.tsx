import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import type { DailyScheduleDay, DailyScheduleItem } from '../../../types/production';

interface ProductionCalendarBoardProps {
  days: DailyScheduleDay[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatNumber = (value: number) =>
  Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value || 0);

const getMonthKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const parseScheduleDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === 'string') {
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(value);
};

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (value: Date): Date => {
  const day = value.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  const result = new Date(value);
  result.setDate(value.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (value: Date, amount: number): Date => {
  const result = new Date(value);
  result.setDate(value.getDate() + amount);
  return result;
};

interface CalendarCell {
  date: Date;
  dateKey: string;
  dayData?: DailyScheduleDay;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

interface CalendarDayCellProps {
  cell: CalendarCell;
  onSelect: (day: DailyScheduleDay) => void;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ cell, onSelect }) => {
  const { dayData, isCurrentMonth, isToday, isWeekend } = cell;
  const hasData = Boolean(dayData);

  let baseClasses =
    'relative h-full rounded-2xl border border-border/50 bg-dark-card/40 p-3 text-left transition-all flex flex-col gap-3';
  if (hasData) {
    baseClasses += ' hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg cursor-pointer';
  } else {
    baseClasses += ' cursor-default';
  }
  if (!isCurrentMonth) {
    baseClasses += ' opacity-40';
  }
  if (isWeekend) {
    baseClasses += ' bg-dark-card/30';
  }
  if (isToday) {
    baseClasses += ' border-primary/60 shadow-glow-sm';
  }
  if (dayData?.manual) {
    baseClasses += ' ring-1 ring-accent/40';
  }

  return (
    <button
      type="button"
      className={baseClasses}
      onClick={() => dayData && onSelect(dayData)}
      disabled={!hasData}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary leading-none">{cell.date.getDate()}</span>
          <span className="text-[10px] uppercase tracking-wide text-text-muted">
            {cell.date.toLocaleDateString('es-EC', { weekday: 'short' })}
          </span>
        </div>
        {dayData ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              dayData.manual ? 'bg-accent-glow text-accent border-accent/40' : 'bg-primary-glow text-primary border-primary/30'
            }`}
          >
            <CalendarRange className="h-3 w-3" />
            {dayData.manual ? 'Manual' : 'Auto'}
          </span>
        ) : null}
      </div>

      {dayData ? (
        <div className="space-y-2 text-[11px] text-text-secondary">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wide text-text-muted">Metros</span>
            <span className="font-semibold text-primary data-display">{formatNumber(dayData.metros)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wide text-text-muted">Unidades</span>
            <span className="font-semibold text-accent data-display">{formatNumber(dayData.unidades)}</span>
          </div>
          <div className="flex items-center justify-between text-text-muted">
            <span>Productos</span>
            <span>{dayData.items.length}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-[10px] text-text-muted">
          {isCurrentMonth ? 'Sin datos' : ''}
        </div>
      )}

      {dayData ? (
        <div className="mt-auto inline-flex items-center gap-2 text-[11px] font-semibold text-primary">
          <TrendingUp className="h-3 w-3" />
          Ver detalle
        </div>
      ) : null}
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

  const dateLabel = parseScheduleDate(day.fecha).toLocaleDateString('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const groupedByProduct = useMemo(() => {
    const products = new Map<string, {
      descripcion: string;
      totalMetros: number;
      totalUnidades: number;
      cotizaciones: Set<string>;
      clientes: Set<string>;
      hasManual: boolean;
    }>();

    for (const item of day.items) {
      const key = item.descripcion.trim();
      const existing = products.get(key) || {
        descripcion: item.descripcion,
        totalMetros: 0,
        totalUnidades: 0,
        cotizaciones: new Set(),
        clientes: new Set(),
        hasManual: false,
      };

      existing.totalMetros += item.metros;
      existing.totalUnidades += item.unidades;
      
      if (item.numero_cotizacion) {
        existing.cotizaciones.add(item.numero_cotizacion);
      }
      if (item.cliente) {
        existing.clientes.add(item.cliente);
      }
      if (item.manual) {
        existing.hasManual = true;
      }

      products.set(key, existing);
    }

    return Array.from(products.values()).sort((a, b) => {
      // Ordenar por mayor cantidad (metros primero, luego unidades)
      const aTotal = a.totalMetros > 0 ? a.totalMetros : a.totalUnidades;
      const bTotal = b.totalMetros > 0 ? b.totalMetros : b.totalUnidades;
      return bTotal - aTotal;
    });
  }, [day.items]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-start justify-center bg-dark-bg/90 backdrop-blur-md px-4 py-4">
      <div className="w-full max-w-6xl h-[90vh] glass-panel rounded-2xl border border-border/60 bg-dark-card/95 shadow-hologram animate-scale-in flex flex-col">
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
        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="glass-card rounded-xl border border-primary/30 bg-primary-glow p-6 shadow-glow-sm hover:shadow-glow-md transition-all duration-300">
              <p className="text-sm uppercase tracking-wider text-text-muted font-semibold">Metros totales</p>
              <p className="mt-3 text-4xl font-bold text-primary data-display">{formatNumber(day.metros)}</p>
            </div>
            <div className="glass-card rounded-xl border border-accent/30 bg-accent-glow p-6 shadow-glow-sm hover:shadow-glow-md transition-all duration-300">
              <p className="text-sm uppercase tracking-wider text-text-muted font-semibold">Unidades totales</p>
              <p className="mt-3 text-4xl font-bold text-accent data-display">{formatNumber(day.unidades)}</p>
            </div>
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/80 p-6 hover:bg-dark-card/90 transition-all duration-300">
              <p className="text-sm uppercase tracking-wider text-text-muted font-semibold">Productos únicos</p>
              <p className="mt-3 text-4xl font-bold text-text-primary">{groupedByProduct.length}</p>
              {day.manual ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-glow border border-accent/30">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <p className="text-xs text-accent font-semibold">Plan manual registrado</p>
                </div>
              ) : null}
            </div>
          </div>

          {groupedByProduct.length === 0 ? (
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
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/20">
                <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                <h4 className="text-xl font-bold text-text-primary">Programación de productos</h4>
                <span className="text-sm text-text-muted bg-dark-card/60 px-3 py-1 rounded-full border border-border/40">
                  {groupedByProduct.length} {groupedByProduct.length === 1 ? 'producto' : 'productos'} únicos
                </span>
              </div>
              <div className="grid gap-3">
                {groupedByProduct.map((product, index) => {
                  const isMetrosProduct = product.totalMetros > 0;
                  const mainQuantity = isMetrosProduct ? product.totalMetros : product.totalUnidades;
                  const mainUnit = isMetrosProduct ? 'metros' : 'unidades';
                  
                  return (
                    <div
                      key={`${product.descripcion}-${index}`}
                      className="glass-card rounded-2xl border border-border/60 bg-dark-card/70 overflow-hidden hover:bg-dark-card/80 transition-all duration-300"
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h5 className="font-bold text-text-primary text-base leading-tight mb-3">
                              {product.descripcion}
                            </h5>
                            
                            <div className="flex items-center gap-4 mb-3">
                              <div className={`inline-flex items-center gap-3 px-3 py-2 rounded-lg border ${
                                isMetrosProduct 
                                  ? 'border-primary/40 bg-primary-glow' 
                                  : 'border-accent/40 bg-accent-glow'
                              }`}>
                                <div className={`w-3 h-3 rounded-full ${
                                  isMetrosProduct ? 'bg-primary' : 'bg-accent'
                                }`}></div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                                    {mainUnit}
                                  </p>
                                  <p className={`text-xl font-bold ${
                                    isMetrosProduct ? 'text-primary' : 'text-accent'
                                  } data-display`}>
                                    {formatNumber(mainQuantity)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Mostrar la cantidad complementaria si existe */}
                              {((isMetrosProduct && product.totalUnidades > 0) || (!isMetrosProduct && product.totalMetros > 0)) && (
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-dark-card/60">
                                  <div className={`w-3 h-3 rounded-full ${
                                    !isMetrosProduct ? 'bg-primary' : 'bg-accent'
                                  }`}></div>
                                  <span className="text-sm text-text-muted">
                                    {!isMetrosProduct ? 'Metros' : 'Unidades'}:
                                  </span>
                                  <span className={`font-semibold ${
                                    !isMetrosProduct ? 'text-primary' : 'text-accent'
                                  }`}>
                                    {formatNumber(!isMetrosProduct ? product.totalMetros : product.totalUnidades)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              {product.cotizaciones.size > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-text-secondary"></div>
                                  <span className="text-text-muted">
                                    {product.cotizaciones.size} {product.cotizaciones.size === 1 ? 'cotización' : 'cotizaciones'}
                                  </span>
                                </div>
                              )}
                              {product.clientes.size > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                                  <span className="text-text-muted">
                                    {product.clientes.size} {product.clientes.size === 1 ? 'cliente' : 'clientes'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            {product.hasManual ? (
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
                    </div>
                  );
                })}
              </div>
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
      const parsed = parseScheduleDate(day.fecha);
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
    return [...currentBucket[1].days].sort(
      (a, b) => parseScheduleDate(a.fecha).getTime() - parseScheduleDate(b.fecha).getTime(),
    );
  }, [currentBucket]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, DailyScheduleDay>();
    for (const day of visibleDays) {
      const parsed = parseScheduleDate(day.fecha);
      const key = getDateKey(parsed);
      map.set(key, day);
    }
    return map;
  }, [visibleDays]);

  const weeks = useMemo(() => {
    if (!currentBucket) {
      return [] as CalendarCell[][];
    }
    const monthDate = currentBucket[1].monthDate;
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeksMatrix: CalendarCell[][] = [];
    let cursor = startOfWeek(startOfMonth);

    while (true) {
      const weekCells: CalendarCell[] = [];
      for (let i = 0; i < 7; i += 1) {
        const cellDate = addDays(cursor, i);
        cellDate.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(cellDate);
        const dayData = scheduleMap.get(dateKey);
        weekCells.push({
          date: cellDate,
          dateKey,
          dayData,
          isCurrentMonth: cellDate.getMonth() === monthDate.getMonth(),
          isToday: cellDate.getTime() === today.getTime(),
          isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
        });
      }
      weeksMatrix.push(weekCells);

      const lastDay = weekCells[6].date;
      if (
        lastDay >= endOfMonth &&
        (lastDay.getMonth() !== monthDate.getMonth() || lastDay.getDate() === endOfMonth.getDate())
      ) {
        break;
      }
      cursor = addDays(cursor, 7);
    }

    return weeksMatrix;
  }, [currentBucket, scheduleMap]);

  const weekdayLabels = useMemo(
    () => ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    [],
  );

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
  } else if (!weeks.length) {
    content = (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-border/60 bg-dark-card/50 p-6 text-sm text-text-secondary">
        Sin calendario disponible.
      </div>
    );
  } else {
    const hasData = visibleDays.length > 0;
    content = (
      <div className="space-y-3">
        {!hasData ? (
          <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 text-sm text-text-muted text-center">
            Sin programación registrada para este mes. Los días se muestran para control histórico.
          </div>
        ) : null}
        <div className="grid grid-cols-7 gap-2 text-[12px] uppercase tracking-wide text-text-muted">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {weeks.map((week, index) => (
            <div key={`week-${index}`} className="grid grid-cols-7 gap-2">
              {week.map((cell) => (
                <CalendarDayCell key={cell.dateKey} cell={cell} onSelect={setSelectedDay} />
              ))}
            </div>
          ))}
        </div>
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
