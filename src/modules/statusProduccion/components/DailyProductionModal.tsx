import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { DailyProductionPlanEntry, ProductionItem } from '../../../types/production';

type PlanRow = {
  fecha: string;
  metros: string;
  unidades: string;
  notas: string;
};

interface DailyProductionModalProps {
  item: ProductionItem;
  plan: DailyProductionPlanEntry[];
  open: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (entries: DailyProductionPlanEntry[]) => Promise<void>;
}

const DAY_IN_MS = 86_400_000;

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const toISODate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISODate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  
  // Forzar parsing en zona horaria local para evitar desfase UTC
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  
  // Fallback al parsing estándar para fechas con hora
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const calculateEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = 1 + ((h + l - 7 * m + 114) % 31);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, amount: number): Date => {
  const next = new Date(value.getTime() + amount * DAY_IN_MS);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getObservedHoliday = (base: Date): Date => {
  const weekday = base.getDay();
  if (weekday === 0) {
    return addDays(base, 1);
  }
  if (weekday === 6) {
    return addDays(base, -1);
  }
  if (weekday === 2) {
    return addDays(base, -1);
  }
  if (weekday === 3) {
    return addDays(base, 2);
  }
  if (weekday === 4) {
    return addDays(base, 1);
  }
  return base;
};

const buildEcuadorHolidaySet = (year: number): Set<string> => {
  const easter = calculateEasterSunday(year);
  const carnivalMonday = addDays(easter, -48);
  const carnivalTuesday = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);

  const rawHolidays = [
    new Date(year, 0, 1),
    carnivalMonday,
    carnivalTuesday,
    goodFriday,
    new Date(year, 4, 1),
    new Date(year, 4, 24),
    new Date(year, 7, 10),
    new Date(year, 9, 9),
    new Date(year, 10, 2),
    new Date(year, 10, 3),
    new Date(year, 11, 25),
  ];

  const observed = rawHolidays.flatMap((date) => {
    const canonical = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    canonical.setHours(0, 0, 0, 0);
    const observation = getObservedHoliday(canonical);
    return [canonical, observation];
  });

  return new Set(observed.map((date) => toISODate(date)));
};

const METER_KEYWORDS = [
  'M',
  'MT',
  'MTS',
  'METRO',
  'METROS',
  'MTR',
  'MTRS',
  'ML',
  'M2',
  'M3',
  'MTS2',
  'MT2',
  'MTS3',
  'MT3',
];

const UNIT_KEYWORDS = [
  'UN',
  'UNIDAD',
  'UNIDADES',
  'UND',
  'UNDS',
  'U',
  'UNID',
  'UNIDS',
  'PIEZA',
  'PIEZAS',
  'PZA',
  'PZAS',
  'PZ',
  'PZS',
];

const holidayCache = new Map<number, Set<string>>();

const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const year = date.getFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, buildEcuadorHolidaySet(year));
  }
  const key = toISODate(date);
  return !holidayCache.get(year)!.has(key);
};

const nextWorkingDay = (date: Date): Date => {
  let candidate = new Date(date.getTime());
  candidate.setHours(0, 0, 0, 0);
  while (!isWorkingDay(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
};

const previousWorkingDay = (date: Date, includeCurrent = false): Date => {
  let candidate = includeCurrent ? new Date(date.getTime()) : addDays(date, -1);
  candidate.setHours(0, 0, 0, 0);
  while (!isWorkingDay(candidate)) {
    candidate = addDays(candidate, -1);
  }
  return candidate;
};

const formatDisplayDate = (value: string): string => {
  const parsed = parseISODate(value);
  if (!parsed) {
    return value;
  }
  
  return parsed.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const normalizeQuantityUnit = (input: string | null | undefined): 'metros' | 'unidades' => {
  if (!input) {
    return 'unidades';
  }
  const normalized = input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();
  for (const keyword of METER_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return 'metros';
    }
  }
  for (const keyword of UNIT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return 'unidades';
    }
  }
  return 'unidades';
};

const extractQuantityInfo = (
  value: string | null | undefined,
): { amount: number | null; unit: 'metros' | 'unidades' } => {
  if (!value) {
    return { amount: null, unit: 'unidades' };
  }
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return { amount: null, unit: normalizeQuantityUnit(value) };
  }
  const normalized = match[0].replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    return { amount: null, unit: normalizeQuantityUnit(value) };
  }
  return { amount, unit: normalizeQuantityUnit(value) };
};

const DailyProductionModal: React.FC<DailyProductionModalProps> = ({
  item,
  plan,
  open,
  loading,
  saving,
  error,
  onClose,
  onSave,
}) => {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [customDate, setCustomDate] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const startDate = useMemo(() => {
    const ingreso = item.fechaIngreso ? parseISODate(item.fechaIngreso) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (ingreso && ingreso > today) {
      return nextWorkingDay(ingreso);
    }
    return nextWorkingDay(today);
  }, [item.fechaIngreso]);

  const suggestedDates = useMemo(() => {
    const deliveryDate = item.fechaEntrega ? parseISODate(item.fechaEntrega) : null;
    if (!deliveryDate) {
      const dates: Date[] = [];
      let cursor = new Date(startDate.getTime());
      for (let index = 0; index < 10; index += 1) {
        cursor = index === 0 ? cursor : nextWorkingDay(addDays(cursor, 1));
        dates.push(cursor);
      }
      return dates.map((date) => toISODate(date));
    }
    const productionEnd = previousWorkingDay(deliveryDate);
    if (productionEnd < startDate) {
      return [toISODate(productionEnd)];
    }
    const result: string[] = [];
    let cursor = new Date(startDate.getTime());
    
    // Generar todos los días hábiles entre startDate y productionEnd (inclusivo)
    while (cursor <= productionEnd) {
      if (isWorkingDay(cursor)) {
        result.push(toISODate(cursor));
      }
      cursor = addDays(cursor, 1); // Avanzar día por día, no saltar
    }
    
    return result;
  }, [item.fechaEntrega, startDate]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const entries = new Map<string, PlanRow>();
    for (const entry of plan) {
      entries.set(entry.fecha, {
        fecha: entry.fecha,
        metros: entry.metros ? String(entry.metros) : '',
        unidades: entry.unidades ? String(entry.unidades) : '',
        notas: entry.notas ?? '',
      });
    }
    for (const date of suggestedDates) {
      if (!entries.has(date)) {
        entries.set(date, {
          fecha: date,
          metros: '',
          unidades: '',
          notas: '',
        });
      }
    }

    if ((plan?.length ?? 0) === 0 && entries.size > 0) {
      const quantityInfo = extractQuantityInfo(item.cantidad);
      if (quantityInfo.amount !== null && quantityInfo.amount > 0) {
        const sortedKeys = Array.from(entries.keys()).sort(
          (a, b) => (parseISODate(a)?.getTime() ?? 0) - (parseISODate(b)?.getTime() ?? 0),
        );
        const totalDays = sortedKeys.length;
        const baseShare = quantityInfo.amount / totalDays;
        let remaining = quantityInfo.amount;
        sortedKeys.forEach((key, index) => {
          let share: number;
          if (index === totalDays - 1) {
            share = remaining;
          } else {
            share = Math.round(baseShare * 100) / 100;
            remaining = Math.max(Math.round((remaining - share) * 100) / 100, 0);
          }
          const shareString = share > 0 ? share.toFixed(2).replace(/\.00$/, '') : '';
          const current = entries.get(key);
          if (!current) {
            return;
          }
          if (quantityInfo.unit === 'metros') {
            entries.set(key, {
              ...current,
              metros: shareString,
            });
          } else {
            entries.set(key, {
              ...current,
              unidades: shareString,
            });
          }
        });
      }
    }

    const sorted = Array.from(entries.values()).sort(
      (a, b) => (parseISODate(a.fecha)?.getTime() ?? 0) - (parseISODate(b.fecha)?.getTime() ?? 0),
    );
    setRows(sorted);
    setLocalError(null);
    setCustomDate('');
  }, [open, plan, suggestedDates, item.cantidad]);

  if (!open) {
    return null;
  }

  const totals = rows.reduce(
    (acc, row) => {
      const metros = Number.parseFloat(row.metros);
      const unidades = Number.parseFloat(row.unidades);
      if (Number.isFinite(metros)) {
        acc.metros += metros;
      }
      if (Number.isFinite(unidades)) {
        acc.unidades += unidades;
      }
      return acc;
    },
    { metros: 0, unidades: 0 },
  );

  const handleChange = (index: number, key: keyof PlanRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      
      // Recálculo automático inteligente para metros/unidades
      if (key === 'metros' || key === 'unidades') {
        const quantityInfo = extractQuantityInfo(item.cantidad);
        const targetField = quantityInfo.unit;
        
        // Solo aplicar recálculo si estamos editando el campo correcto (metros o unidades)
        if (key === targetField && quantityInfo.amount && quantityInfo.amount > 0) {
          const newValue = Number.parseFloat(value) || 0;
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const editedRowDate = parseISODate(next[index].fecha);
          
          // Calcular cuánto necesitamos distribuir en las otras filas
          const remainingAmount = quantityInfo.amount - newValue;
          
          // Si estamos editando una fecha pasada, solo redistribuir entre fechas futuras/actuales
          // Si estamos editando una fecha actual/futura, redistribuir entre todas las demás fechas
          const shouldPreservePastDates = editedRowDate && editedRowDate >= currentDate;
          
          const otherEditableRows = next.filter((row, idx) => {
            if (idx === index) return false; // Excluir la fila actual
            
            const rowDate = parseISODate(row.fecha);
            const hasValue = (Number.parseFloat(row[targetField]) || 0) > 0;
            
            if (!hasValue || !rowDate) return false;
            
            // Si editamos fecha futura/actual, redistribuir entre todas las fechas con valores
            if (shouldPreservePastDates) {
              return true;
            }
            
            // Si editamos fecha pasada, solo redistribuir entre fechas actuales/futuras
            return rowDate >= currentDate;
          });
          
          if (remainingAmount > 0 && otherEditableRows.length > 0) {
            // Distribuir proporcionalmente basado en los valores actuales
            const otherRowsCurrentTotal = otherEditableRows.reduce((sum, row) => {
              return sum + (Number.parseFloat(row[targetField]) || 0);
            }, 0);
            
            if (otherRowsCurrentTotal > 0) {
              // Redistribuir proporcionalmente
              let distributedSoFar = 0;
              
              otherEditableRows.forEach((row, otherIndex) => {
                const currentValue = Number.parseFloat(row[targetField]) || 0;
                const proportion = currentValue / otherRowsCurrentTotal;
                
                // En la última iteración, asignar el remanente para evitar errores de redondeo
                const isLast = otherIndex === otherEditableRows.length - 1;
                const newDistributedValue = isLast 
                  ? remainingAmount - distributedSoFar
                  : Math.round((remainingAmount * proportion) * 100) / 100;
                
                distributedSoFar += newDistributedValue;
                
                // Encontrar el índice real en el array original
                const realIndex = next.findIndex(r => r.fecha === row.fecha);
                if (realIndex !== -1 && newDistributedValue >= 0) {
                  next[realIndex] = {
                    ...next[realIndex],
                    [targetField]: newDistributedValue > 0 ? newDistributedValue.toString() : '0'
                  };
                }
              });
            }
          }
        }
      }
      
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomDate = () => {
    if (!customDate) {
      setLocalError('Selecciona una fecha para agregar al plan.');
      return;
    }
    const parsed = parseISODate(customDate);
    if (!parsed) {
      setLocalError('La fecha ingresada no es válida.');
      return;
    }
    if (!isWorkingDay(parsed)) {
      setLocalError('La fecha seleccionada no es un día hábil en Ecuador.');
      return;
    }
    const iso = toISODate(parsed);
    if (rows.some((row) => row.fecha === iso)) {
      setLocalError('La fecha ya está incluida en el plan.');
      return;
    }
    setRows((prev) =>
      [...prev, { fecha: iso, metros: '', unidades: '', notas: '' }].sort(
        (a, b) => (parseISODate(a.fecha)?.getTime() ?? 0) - (parseISODate(b.fecha)?.getTime() ?? 0),
      ),
    );
    setCustomDate('');
    setLocalError(null);
  };

  const handleResetToDefault = () => {
    if (suggestedDates.length === 0) {
      setRows([]);
      return;
    }
    const quantityInfo = extractQuantityInfo(item.cantidad);
    const entries = new Map<string, PlanRow>();
    for (const date of suggestedDates) {
      entries.set(date, { fecha: date, metros: '', unidades: '', notas: '' });
    }
    if (quantityInfo.amount !== null && quantityInfo.amount > 0) {
      const totalDays = suggestedDates.length;
      const baseShare = quantityInfo.amount / totalDays;
      let remaining = quantityInfo.amount;
      suggestedDates.forEach((date, index) => {
        let share: number;
        if (index === totalDays - 1) {
          share = remaining;
        } else {
          share = Math.round(baseShare * 100) / 100;
          remaining = Math.max(Math.round((remaining - share) * 100) / 100, 0);
        }
        const shareString = share > 0 ? share.toFixed(2).replace(/\.00$/, '') : '';
        const current = entries.get(date);
        if (!current) {
          return;
        }
        if (quantityInfo.unit === 'metros') {
          entries.set(date, { ...current, metros: shareString });
        } else {
          entries.set(date, { ...current, unidades: shareString });
        }
      });
    }
    setRows(
      Array.from(entries.values()).sort(
        (a, b) => (parseISODate(a.fecha)?.getTime() ?? 0) - (parseISODate(b.fecha)?.getTime() ?? 0),
      ),
    );
    setLocalError(null);
  };

  const handleSave = async () => {
    setLocalError(null);
    const sanitized: DailyProductionPlanEntry[] = [];
    for (const row of rows) {
      const metros = Number.parseFloat(row.metros || '0');
      const unidades = Number.parseFloat(row.unidades || '0');
      if (Number.isNaN(metros) || Number.isNaN(unidades) || metros < 0 || unidades < 0) {
        setLocalError('Las cantidades deben ser números mayores o iguales a cero.');
        return;
      }
      const notas = row.notas.trim();
      if (metros === 0 && unidades === 0 && notas.length === 0) {
        continue;
      }
      sanitized.push({
        fecha: row.fecha,
        metros,
        unidades,
        notas: notas.length > 0 ? notas : null,
      });
    }
    try {
      await onSave(sanitized);
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.detail ||
          err?.message ||
          'No se pudo guardar el plan diario. Inténtalo nuevamente.',
      );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Plan diario de producción</h2>
            <p className="text-xs text-slate-400">
              {item.producto} — {item.cliente || 'Cliente sin registrar'}
            </p>
            {item.fechaEntrega && (
              <p className="text-[11px] text-slate-500">
                Entrega comprometida: {formatDisplayDate(item.fechaEntrega)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-800/70 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(() => {
              const quantityInfo = extractQuantityInfo(item.cantidad);
              const targetAmount = quantityInfo.amount || 0;
              const currentTotal = quantityInfo.unit === 'metros' ? totals.metros : totals.unidades;
              const difference = currentTotal - targetAmount;
              const isBalanced = Math.abs(difference) < 0.01;
              const isOver = difference > 0.01;
              
              return (
                <>
                  <div className={`rounded-xl border p-4 ${
                    isBalanced 
                      ? 'border-green-500/40 bg-green-500/10' 
                      : isOver 
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-orange-500/40 bg-orange-500/10'
                  }`}>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {quantityInfo.unit === 'metros' ? 'Metros planificados' : 'Unidades planificadas'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className={`text-2xl font-semibold ${
                        isBalanced 
                          ? 'text-green-400' 
                          : isOver 
                            ? 'text-red-400'
                            : 'text-orange-400'
                      }`}>
                        {formatNumber(currentTotal)}
                      </p>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Objetivo: {formatNumber(targetAmount)}</p>
                        {!isBalanced && (
                          <p className={`text-xs font-semibold ${
                            isOver ? 'text-red-400' : 'text-orange-400'
                          }`}>
                            {isOver ? '+' : ''}{formatNumber(difference)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isBalanced && (
                      <p className="mt-1 text-xs text-green-400">✓ Balanceado automáticamente</p>
                    )}
                  </div>
                  
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {quantityInfo.unit === 'metros' ? 'Unidades' : 'Metros'} planificados
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-300">
                      {formatNumber(quantityInfo.unit === 'metros' ? totals.unidades : totals.metros)}
                    </p>
                  </div>
                  
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Días laborables</p>
                    <p className="mt-2 text-2xl font-semibold text-indigo-300">{rows.length}</p>
                    <p className="mt-1 text-xs text-slate-400">Excluye fines de semana</p>
                  </div>
                </>
              );
            })()}
          </div>

          {(error || localError) && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error || localError}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <CalendarDays className="h-4 w-4 text-indigo-400" />
                Programación hábil
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Restaurar promedio
                </button>
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-400 focus:ring-0"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDate}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Agregar fecha
                </button>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left w-32">Metros</th>
                    <th className="px-4 py-3 text-left w-32">Unidades</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    <th className="px-4 py-3 text-left w-10" />
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-400" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No hay fechas programadas. Agrega al menos un día hábil.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.fecha} className="border-t border-slate-800/60">
                        <td className="px-4 py-3 text-xs text-slate-300">
                          <div className="font-medium text-slate-100">{formatDisplayDate(row.fecha)}</div>
                          <div className="text-[11px] text-slate-500">{row.fecha}</div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.metros}
                            onChange={(event) => handleChange(index, 'metros', event.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-sky-400 focus:ring-0"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unidades}
                            onChange={(event) => handleChange(index, 'unidades', event.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:ring-0"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={row.notas}
                            onChange={(event) => handleChange(index, 'notas', event.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:ring-0"
                            placeholder="Detalle de actividades, capacidades, turnos..."
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="rounded-full border border-slate-700 bg-slate-800/60 p-2 text-slate-400 hover:text-red-300 hover:border-red-400 transition-colors"
                            title="Eliminar fecha"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <div className="text-xs text-slate-500 space-y-1">
            <p>Solo se permiten días hábiles ecuatorianos. Las fechas se sincronizan con el dashboard gerencial.</p>
            <p>
              Guarda para que el plan manual reemplace la distribución automática en la agenda de producción.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              Guardar agenda
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DailyProductionModal;
