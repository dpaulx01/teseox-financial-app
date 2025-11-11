import React, { useMemo, useState } from 'react';
import { CalendarDays, FilterX, Loader2 } from 'lucide-react';
import StatusTable from '../modules/statusProduccion/components/StatusTable';
import { useArchivedProductionItems } from '../modules/statusProduccion/hooks/useArchivedProductionItems';
import { extractQuantityInfo, formatNumber } from '../modules/statusProduccion/utils/quantityUtils';

type DispatchGroup = {
  key: string;
  label: string;
  dateValue: number | null;
  itemCount: number;
  clientCount: number;
  metros: number;
  unidades: number;
  valor: number;
};

const ProductionArchive: React.FC = () => {
  const {
    items,
    statusOptions,
    loading,
    error,
    updateItem,
    isSaving,
    deleteQuote,
  } = useArchivedProductionItems();

  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'no-date' | string>('all');

  const dispatchGroups = useMemo<DispatchGroup[]>(() => {
    const groups = new Map<string, DispatchGroup & { clients: Set<string> }>();

    items.forEach((item) => {
      const key = item.fechaDespacho ? item.fechaDespacho.slice(0, 10) : 'no-date';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: key === 'no-date' ? 'Sin fecha de despacho' : formatDispatchLabel(key),
          dateValue: key === 'no-date' ? null : new Date(key).getTime(),
          itemCount: 0,
          clientCount: 0,
          metros: 0,
          unidades: 0,
          valor: 0,
          clients: new Set<string>(),
        });
      }
      const group = groups.get(key)!;
      group.itemCount += 1;
      if (item.cliente) {
        group.clients.add(item.cliente);
      }

      const quantity = extractQuantityInfo(item.cantidad);
      if (quantity.amount) {
        if (quantity.unit === 'metros') {
          group.metros += quantity.amount;
        } else {
          group.unidades += quantity.amount;
        }
      }
      if (item.valorSubtotal) {
        group.valor += Number(item.valorSubtotal);
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        key: group.key,
        label: group.label,
        dateValue: group.dateValue,
        itemCount: group.itemCount,
        clientCount: group.clients.size,
        metros: group.metros,
        unidades: group.unidades,
        valor: group.valor,
      }))
      .sort((a, b) => {
        if (a.dateValue === null && b.dateValue === null) return 0;
        if (a.dateValue === null) return 1;
        if (b.dateValue === null) return -1;
        return b.dateValue - a.dateValue;
      });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (dispatchFilter === 'all') {
      return items;
    }
    if (dispatchFilter === 'no-date') {
      return items.filter((item) => !item.fechaDespacho);
    }
    return items.filter((item) => item.fechaDespacho?.startsWith(dispatchFilter));
  }, [items, dispatchFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Archivo Histórico de Producción</h1>
        <p className="text-text-muted max-w-3xl">
          Consulta el registro de todas las cotizaciones y productos cuyo estado es "Entregado".
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {dispatchGroups.length > 0 && (
        <section className="glass-panel rounded-2xl border border-border shadow-hologram p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Fechas de despacho</h2>
              <p className="text-sm text-text-muted">
                Haz clic sobre una fila o usa el selector para filtrar la matriz histórica.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex flex-col text-xs text-text-muted">
                Seleccionar fecha
                <select
                  className="bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                  value={dispatchFilter}
                  onChange={(event) => setDispatchFilter(event.target.value as typeof dispatchFilter)}
                >
                  <option value="all">Todas</option>
                  <option value="no-date">Sin fecha registrada</option>
                  {dispatchGroups
                    .filter((group) => group.dateValue !== null)
                    .map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.label}
                      </option>
                    ))}
                </select>
              </label>
              {dispatchFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDispatchFilter('all')}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  Limpiar filtro
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-dark-card/70 text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 text-left">Fecha de despacho</th>
                  <th className="px-4 py-3 text-right">Productos</th>
                  <th className="px-4 py-3 text-right">Clientes</th>
                  <th className="px-4 py-3 text-right">Metros</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Valor referencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dispatchGroups.map((group) => (
                  <tr
                    key={group.key}
                  onClick={() =>
                    setDispatchFilter((prev) =>
                      prev === group.key
                        ? 'all'
                        : (group.key === 'no-date' ? 'no-date' : group.key)
                    )
                  }
                    className={`cursor-pointer transition-colors ${
                      dispatchFilter === group.key
                        ? 'bg-primary/10 text-text-primary'
                        : 'hover:bg-dark-card/40'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        {group.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumber(group.itemCount)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(group.clientCount)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(group.metros)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(group.unidades)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(group.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-border shadow-hologram p-12 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
          <p>Cargando matriz de producción...</p>
        </div>
      ) : (
        <StatusTable
          items={filteredItems}
          statusOptions={statusOptions}
          onSave={updateItem}
          isSaving={isSaving}
          onDeleteQuote={deleteQuote}
          viewMode="quotes"
          readOnlyStatuses={[]}
          showDeliverySummary
        />
      )}
    </div>
  );
};

export default ProductionArchive;

const formatDispatchLabel = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString('es-EC', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
