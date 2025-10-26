import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { DailyProductionPlanEntry, ProductionItem } from '../../../types/production';
import { parseISODate, toISODate, isWorkingDay, nextWorkingDay, previousWorkingDay, addDays } from '../utils/dateUtils';
import { extractQuantityInfo, formatNumber } from '../utils/quantityUtils';

type PlanRow = {
  fecha: string;
  metros: string;
  unidades: string;
  notas: string;
  isManuallyEdited?: boolean;
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
  const [manuallyEditedDates, setManuallyEditedDates] = useState<Set<string>>(new Set());

  const startDate = useMemo(() => {
    const ingreso = item.fechaIngreso ? parseISODate(item.fechaIngreso) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (ingreso) {
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
        isManuallyEdited: true, // Las entradas del plan existente se consideran editadas manualmente
      });
    }
    for (const date of suggestedDates) {
      if (!entries.has(date)) {
        entries.set(date, {
          fecha: date,
          metros: '',
          unidades: '',
          notas: '',
          isManuallyEdited: false,
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
    
    // Inicializar las fechas editadas manualmente basado en el plan existente
    const editedDates = new Set<string>();
    for (const entry of plan) {
      editedDates.add(entry.fecha);
    }
    setManuallyEditedDates(editedDates);
    
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
      const editedDate = next[index].fecha;
      
      // Marcar esta fecha como editada manualmente cuando se cambian metros o unidades
      if (key === 'metros' || key === 'unidades') {
        setManuallyEditedDates(prevDates => new Set([...prevDates, editedDate]));
        next[index] = { ...next[index], [key]: value, isManuallyEdited: true };
      } else {
        next[index] = { ...next[index], [key]: value };
      }
      
      // Recálculo automático inteligente para metros/unidades
      if (key === 'metros' || key === 'unidades') {
        const quantityInfo = extractQuantityInfo(item.cantidad);
        const targetField = quantityInfo.unit;
        
        // Solo aplicar recálculo si estamos editando el campo correcto (metros o unidades)
        if (key === targetField && quantityInfo.amount && quantityInfo.amount > 0) {
          const newValue = Number.parseFloat(value) || 0;
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const editedRowDate = parseISODate(editedDate);
          
          // Calcular cuánto necesitamos distribuir en las otras filas
          const remainingAmount = quantityInfo.amount - newValue;
          
          // Filtrar filas elegibles para redistribución
          const otherEditableRows = next.filter((row, idx) => {
            if (idx === index) return false; // Excluir la fila actual
            
            const rowDate = parseISODate(row.fecha);
            const hasValue = (Number.parseFloat(row[targetField]) || 0) > 0;
            
            if (!hasValue || !rowDate) return false;
            
            // NUNCA redistribuir en fechas que han sido editadas manualmente
            if (manuallyEditedDates.has(row.fecha) || row.isManuallyEdited) {
              return false;
            }
            
            // Solo redistribuir entre fechas actuales/futuras no editadas manualmente
            // NUNCA redistribuir en fechas pasadas, sin importar qué fecha se esté editando
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
      [...prev, { fecha: iso, metros: '', unidades: '', notas: '', isManuallyEdited: false }].sort(
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
      entries.set(date, { fecha: date, metros: '', unidades: '', notas: '', isManuallyEdited: false });
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
          entries.set(date, { ...current, metros: shareString, isManuallyEdited: false });
        } else {
          entries.set(date, { ...current, unidades: shareString, isManuallyEdited: false });
        }
      });
    }
    setRows(
      Array.from(entries.values()).sort(
        (a, b) => (parseISODate(a.fecha)?.getTime() ?? 0) - (parseISODate(b.fecha)?.getTime() ?? 0),
      ),
    );
    setManuallyEditedDates(new Set()); // Reiniciar fechas editadas manualmente
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
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-dark-bg/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-dark-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Plan diario de producción</h2>
            <p className="text-xs text-text-secondary">
              {item.producto} — {item.cliente || 'Cliente sin registrar'}
            </p>
            {item.fechaEntrega && (
              <p className="text-[11px] text-text-muted">
                Entrega comprometida: {formatDisplayDate(item.fechaEntrega)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-dark-card/70 p-2 text-text-secondary hover:bg-dark-bg hover:text-text-primary transition-colors"
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
                      ? 'border-accent/40 bg-accent-glow'
                      : isOver
                        ? 'border-danger/40 bg-danger-glow'
                        : 'border-warning/40 bg-warning-glow'
                  }`}>
                    <p className="text-xs uppercase tracking-wide text-text-muted">
                      {quantityInfo.unit === 'metros' ? 'Metros planificados' : 'Unidades planificadas'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className={`text-2xl font-semibold ${
                        isBalanced
                          ? 'text-accent'
                          : isOver
                            ? 'text-danger'
                            : 'text-warning'
                      }`}>
                        {formatNumber(currentTotal)}
                      </p>
                      <div className="text-right">
                        <p className="text-xs text-text-secondary">Objetivo: {formatNumber(targetAmount)}</p>
                        {!isBalanced && (
                          <p className={`text-xs font-semibold ${
                            isOver ? 'text-danger' : 'text-warning'
                          }`}>
                            {isOver ? '+' : ''}{formatNumber(difference)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isBalanced && (
                      <p className="mt-1 text-xs text-accent">✓ Balanceado automáticamente</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-dark-card/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-text-muted">
                      {quantityInfo.unit === 'metros' ? 'Unidades' : 'Metros'} planificados
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">
                      {formatNumber(quantityInfo.unit === 'metros' ? totals.unidades : totals.metros)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-dark-card/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-text-muted">Días laborables</p>
                    <p className="mt-2 text-2xl font-semibold text-primary">{rows.length}</p>
                    <p className="mt-1 text-xs text-text-secondary">Excluye fines de semana</p>
                  </div>
                </>
              );
            })()}
          </div>

          {(error || localError) && (
            <div className="rounded-xl border border-danger/40 bg-danger-glow px-4 py-3 text-sm text-danger">
              {error || localError}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-dark-card/60">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CalendarDays className="h-4 w-4 text-primary" />
                Programación hábil
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-dark-card/70 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-dark-bg transition-colors"
                >
                  Restaurar promedio
                </button>
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  className="rounded-lg border border-border bg-dark-card px-3 py-2 text-xs text-text-primary focus:border-primary focus:ring-0"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDate}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary-glow px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Agregar fecha
                </button>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-dark-card/80 text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left w-32">Metros</th>
                    <th className="px-4 py-3 text-left w-32">Unidades</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    <th className="px-4 py-3 text-left w-10" />
                  </tr>
                </thead>
                <tbody className="text-sm text-text-primary">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                        No hay fechas programadas. Agrega al menos un día hábil.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.fecha} className="border-t border-border/60">
                        <td className="px-4 py-3 text-xs text-text-secondary">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-text-primary">{formatDisplayDate(row.fecha)}</div>
                              <div className="text-[11px] text-text-muted">{row.fecha}</div>
                            </div>
                            {(manuallyEditedDates.has(row.fecha) || row.isManuallyEdited) && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary-glow text-primary rounded-full border border-primary/30">
                                📌 Manual
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.metros}
                            onChange={(event) => handleChange(index, 'metros', event.target.value)}
                            className="w-full rounded-lg border border-border bg-dark-card px-2 py-2 text-sm text-text-primary focus:border-primary focus:ring-0"
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
                            className="w-full rounded-lg border border-border bg-dark-card px-2 py-2 text-sm text-text-primary focus:border-accent focus:ring-0"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={row.notas}
                            onChange={(event) => handleChange(index, 'notas', event.target.value)}
                            className="w-full rounded-lg border border-border bg-dark-card px-2 py-2 text-xs text-text-primary focus:border-primary focus:ring-0"
                            placeholder="Detalle de actividades, capacidades, turnos..."
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="rounded-full border border-border bg-dark-card/60 p-2 text-text-secondary hover:text-danger hover:border-danger transition-colors"
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

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="text-xs text-text-muted space-y-1">
            <p>Solo se permiten días hábiles ecuatorianos. Las fechas se sincronizan con el dashboard gerencial.</p>
            <p>
              Guarda para que el plan manual reemplace la distribución automática en la agenda de producción.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border/50 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary-glow px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
