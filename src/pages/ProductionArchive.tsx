import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FilterX, Loader2 } from 'lucide-react';
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
  const [showAllDispatches, setShowAllDispatches] = useState(false);

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

  const quickFilterOptions = useMemo(() => {
    const base = [
      { key: 'all' as const, label: 'Todas' },
      { key: 'no-date' as const, label: 'Sin fecha' },
    ];
    const recentDates = dispatchGroups.slice(0, 5).map((group) => ({
      key: group.key,
      label: group.label,
    }));
    return [...base, ...recentDates];
  }, [dispatchGroups]);

  const visibleDispatchCards = useMemo(
    () => (showAllDispatches ? dispatchGroups : dispatchGroups.slice(0, 6)),
    [dispatchGroups, showAllDispatches],
  );

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
        <section className="glass-panel rounded-2xl border border-border shadow-hologram p-6 space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-text-primary">Fechas de despacho</h2>
              <p className="text-sm text-text-muted">
                Selecciona una fecha para enfocar la matriz histórica o usa el botón de limpiar para volver a ver todo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFilterOptions.map((option) => {
                const isActive = dispatchFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setDispatchFilter((prev) =>
                        prev === option.key ? 'all' : (option.key as typeof dispatchFilter),
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors border ${
                      isActive
                        ? 'bg-primary text-dark-card border-primary shadow-glow-sm'
                        : 'border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {option.key === dispatchFilter && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {option.label}
                  </button>
                );
              })}
              {dispatchFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDispatchFilter('all')}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-text-secondary hover:text-primary hover:border-primary transition-colors"
                >
                  <FilterX className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDispatchCards.map((group) => {
              const isActive = dispatchFilter === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() =>
                    setDispatchFilter((prev) =>
                      prev === group.key ? 'all' : (group.key === 'no-date' ? 'no-date' : group.key),
                    )
                  }
                  className={`text-left rounded-2xl border px-4 py-4 transition-all duration-200 ${
                    isActive ? 'border-primary bg-primary/10 shadow-glow-sm' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      {group.label}
                    </div>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-text-muted">
                    <div>
                      <p className="uppercase tracking-wide">Productos</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(group.itemCount)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Clientes</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(group.clientCount)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Metros</p>
                      <p className="text-lg font-semibold text-text-primary">{formatNumber(group.metros)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Valor</p>
                      <p className="text-lg font-semibold text-text-primary">{formatCurrency(group.valor)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {dispatchGroups.length > 6 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllDispatches((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-text-secondary hover:text-primary hover:border-primary transition-colors"
              >
                {showAllDispatches ? 'Ver menos fechas' : 'Mostrar todas las fechas'}
              </button>
            </div>
          )}
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
