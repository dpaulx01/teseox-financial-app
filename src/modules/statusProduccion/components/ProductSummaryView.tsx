import React, { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { ProductionItem, DailyPlan } from '../../../types/production';
import { useProductSummaryData, ProductSummary } from '../hooks/useProductSummaryData';
import { useSupervisorKPIs } from '../hooks/useSupervisorKPIs';
import SupervisorKPIs from './SupervisorKPIs';
import ProductProgressCard from './ProductProgressCard';

type QuickFilter = 'all' | 'delayed' | 'at_risk' | 'no_date' | 'upcoming_3d';

interface ProductSummaryViewProps {
  items: ProductionItem[];
  dailyPlans: Record<number, DailyPlan[]>;
  onViewDetails: (itemIds: number[]) => void;
  onOpenDailyPlan: (itemId: number) => void;
}

const ProductSummaryView: React.FC<ProductSummaryViewProps> = ({
  items,
  dailyPlans,
  onViewDetails,
  onOpenDailyPlan,
}) => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchText, setSearchText] = useState('');

  // Hooks de datos
  const { summaries, totalProducts, totalAlerts } = useProductSummaryData(items, dailyPlans);
  const kpis = useSupervisorKPIs(items, dailyPlans);

  // Filtrado
  const filteredSummaries = useMemo(() => {
    let filtered = summaries;

    // Filtro rápido
    if (quickFilter === 'delayed') {
      filtered = filtered.filter(s => s.status === 'delayed');
    } else if (quickFilter === 'at_risk') {
      filtered = filtered.filter(s => s.status === 'at_risk');
    } else if (quickFilter === 'no_date') {
      filtered = filtered.filter(s =>
        s.alerts.some(a => a.tipo === 'missing_date')
      );
    } else if (quickFilter === 'upcoming_3d') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in3Days = new Date(today.getTime() + 3 * 86400000);

      filtered = filtered.filter(s => {
        if (!s.nextDeliveryDate) return false;
        const deliveryDate = new Date(s.nextDeliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate >= today && deliveryDate <= in3Days;
      });
    }

    // Búsqueda por texto
    if (searchText.trim() !== '') {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(s =>
        s.productName.toLowerCase().includes(search) ||
        s.deliveries.some(d => d.cliente.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [summaries, quickFilter, searchText]);

  return (
    <div className="space-y-6">
      {/* KPIs del Supervisor */}
      <SupervisorKPIs kpis={kpis} />

      {/* Filtros Rápidos */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-dark-card/40 rounded-xl border border-border/40">
        <div className="flex items-center gap-2 text-text-muted">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={quickFilter === 'all'}
            onClick={() => setQuickFilter('all')}
            label="Todos"
            count={totalProducts}
          />
          <FilterButton
            active={quickFilter === 'delayed'}
            onClick={() => setQuickFilter('delayed')}
            label="Atrasados"
            variant="danger"
            count={summaries.filter(s => s.status === 'delayed').length}
          />
          <FilterButton
            active={quickFilter === 'at_risk'}
            onClick={() => setQuickFilter('at_risk')}
            label="En Riesgo"
            variant="warning"
            count={summaries.filter(s => s.status === 'at_risk').length}
          />
          <FilterButton
            active={quickFilter === 'upcoming_3d'}
            onClick={() => setQuickFilter('upcoming_3d')}
            label="Próximos 3 días"
            variant="info"
          />
          <FilterButton
            active={quickFilter === 'no_date'}
            onClick={() => setQuickFilter('no_date')}
            label="Sin Fecha"
            variant="muted"
          />
        </div>

        {/* Búsqueda */}
        <div className="ml-auto relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar producto o cliente..."
            className="pl-3 pr-8 py-2 rounded-lg bg-dark-bg/60 border border-border/40
                       text-text-primary text-sm placeholder:text-text-muted
                       focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                       transition-all w-64"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-text-muted">
        <p>
          Mostrando {filteredSummaries.length} de {totalProducts} productos
          {totalAlerts > 0 && (
            <span className="ml-2 text-warning">
              • {totalAlerts} alertas activas
            </span>
          )}
        </p>

        {(quickFilter !== 'all' || searchText) && (
          <button
            onClick={() => {
              setQuickFilter('all');
              setSearchText('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-dark-card/40 border border-border/40 text-text-secondary
                       hover:bg-dark-card hover:border-border transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid de Cards */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-card/60 mb-4">
            <Filter className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No se encontraron productos
          </h3>
          <p className="text-text-muted">
            {searchText
              ? `No hay productos que coincidan con "${searchText}"`
              : 'No hay productos que cumplan con los filtros seleccionados'}
          </p>
          <button
            onClick={() => {
              setQuickFilter('all');
              setSearchText('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary
                       hover:bg-primary/20 transition-colors"
          >
            Ver todos los productos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSummaries.map((summary) => (
            <ProductProgressCard
              key={summary.normalizedName}
              summary={summary}
              onViewDetails={onViewDetails}
              onOpenDailyPlan={onOpenDailyPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente auxiliar: botón de filtro
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'muted';
  count?: number;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  active,
  onClick,
  label,
  variant = 'default',
  count,
}) => {
  const variantStyles = {
    default: active
      ? 'bg-primary/20 border-primary/40 text-primary'
      : 'bg-dark-bg/40 border-border/30 text-text-secondary hover:bg-dark-bg/60 hover:border-border/50',
    danger: active
      ? 'bg-danger-glow border-danger/40 text-danger'
      : 'bg-dark-bg/40 border-border/30 text-text-secondary hover:bg-danger-glow hover:border-danger/30',
    warning: active
      ? 'bg-warning-glow border-warning/40 text-warning'
      : 'bg-dark-bg/40 border-border/30 text-text-secondary hover:bg-warning-glow hover:border-warning/30',
    info: active
      ? 'bg-primary-glow border-primary/40 text-primary'
      : 'bg-dark-bg/40 border-border/30 text-text-secondary hover:bg-primary-glow hover:border-primary/30',
    muted: active
      ? 'bg-dark-card/60 border-border/40 text-text-primary'
      : 'bg-dark-bg/40 border-border/30 text-text-secondary hover:bg-dark-card/40 hover:border-border/40',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg border text-xs font-medium
        transition-all duration-200
        ${variantStyles[variant]}
        ${active ? 'shadow-lg' : ''}
      `}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 opacity-75">({count})</span>
      )}
    </button>
  );
};

export default ProductSummaryView;
