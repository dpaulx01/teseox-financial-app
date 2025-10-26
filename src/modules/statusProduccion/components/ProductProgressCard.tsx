import React from 'react';
import { AlertTriangle, Calendar, Package, ChevronRight } from 'lucide-react';
import { ProductSummary } from '../hooks/useProductSummaryData';

interface ProductProgressCardProps {
  summary: ProductSummary;
  onViewDetails: (itemIds: number[]) => void;
  onOpenDailyPlan: (itemId: number) => void;
  onViewDetailed?: (itemIds: number[]) => void;
}

const numberFormatter = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
  });
};

const ProductProgressCard: React.FC<ProductProgressCardProps> = ({
  summary,
  onViewDetails,
  onOpenDailyPlan,
  onViewDetailed,
}) => {
  const totalAlerts = summary.alerts.reduce((sum, alert) => sum + alert.count, 0);

  // Color de progreso
  let progressColor = 'bg-slate-500';
  if (summary.aggregatedProgress >= 100) {
    progressColor = 'bg-emerald-500';
  } else if (summary.aggregatedProgress >= 85) {
    progressColor = 'bg-emerald-400';
  } else if (summary.aggregatedProgress >= 60) {
    progressColor = 'bg-amber-400';
  } else if (summary.aggregatedProgress >= 40) {
    progressColor = 'bg-sky-400';
  }

  // Preparar mini calendario (próximos 7 días)
  const miniCalendar = generateMiniCalendar(summary);

  return (
    <div
      className={`
        rounded-2xl border-l-4 ${summary.colorClass}
        border-t border-r border-b border-border/40
        bg-dark-card/70 backdrop-blur-sm
        p-5 shadow-lg hover:shadow-xl
        transition-all duration-300
        hover:scale-[1.02]
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-1 line-clamp-2">
            {summary.productName}
          </h3>
          <p className="text-xs text-text-muted">
            {summary.totalItems} {summary.totalItems === 1 ? 'entrega' : 'entregas'} activas
          </p>
        </div>

        {/* Badge de alertas */}
        {totalAlerts > 0 && (
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${summary.status === 'delayed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              summary.status === 'at_risk' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-sky-500/20 text-sky-400 border border-sky-500/30'}
          `}>
            <AlertTriangle className="w-3 h-3" />
            <span>{totalAlerts}</span>
          </div>
        )}
      </div>

      {/* Barra de progreso principal */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted">Progreso General</span>
          <span className="text-sm font-semibold text-text-primary">
            {summary.aggregatedProgress}%
          </span>
        </div>
        <div className="relative w-full h-3 bg-dark-bg/60 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${progressColor} rounded-full transition-all duration-500 shadow-lg`}
            style={{ width: `${Math.min(100, summary.aggregatedProgress)}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-dark-bg/40 rounded-xl border border-border/20">
        <div>
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <Package className="w-3 h-3" />
            Total
          </p>
          <div className="space-y-0.5">
            {summary.totalQuantity.metros > 0 && (
              <p className="text-sm font-medium text-sky-400">
                {numberFormatter.format(summary.totalQuantity.metros)} m²
              </p>
            )}
            {summary.totalQuantity.unidades > 0 && (
              <p className="text-sm font-medium text-amber-400">
                {numberFormatter.format(summary.totalQuantity.unidades)} u
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-1">Producido</p>
          <div className="space-y-0.5">
            {summary.totalQuantity.metros > 0 && (
              <p className="text-sm font-medium text-sky-300">
                {numberFormatter.format(summary.producedQuantity.metros)} m²
              </p>
            )}
            {summary.totalQuantity.unidades > 0 && (
              <p className="text-sm font-medium text-amber-300">
                {numberFormatter.format(summary.producedQuantity.unidades)} u
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mini Calendario de Entregas */}
      {miniCalendar.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Próximos 7 días
          </p>
          <div className="flex gap-1">
            {miniCalendar.map((day, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center"
                title={day.tooltip}
              >
                <span className="text-[9px] text-text-muted mb-0.5">
                  {day.dayLabel}
                </span>
                <div className={`
                  w-full h-6 rounded-md flex items-center justify-center text-[10px] font-medium
                  ${day.status === 'overdue' ? 'bg-rose-500/30 border border-rose-500/50 text-rose-300' :
                    day.status === 'upcoming' ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300' :
                    day.status === 'on_time' ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300' :
                    'bg-dark-bg/40 border border-border/20 text-text-muted'}
                `}>
                  {day.count > 0 ? day.count : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de entregas críticas (máximo 3) */}
      {summary.deliveries.length > 0 && (
        <div className="mb-4 space-y-2">
          {summary.deliveries.slice(0, 3).map((delivery, idx) => (
            <div
              key={idx}
              className={`
                px-3 py-2 rounded-lg text-xs border
                ${delivery.status === 'overdue' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
                  delivery.status === 'upcoming' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                  'bg-dark-bg/40 border-border/20 text-text-secondary'}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate flex-1">
                  {delivery.cliente}
                </span>
                <span className="ml-2 text-text-muted whitespace-nowrap">
                  {formatDate(delivery.fecha)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">
                  {delivery.cantidad}
                </span>
                {delivery.status === 'overdue' && (
                  <span className="text-rose-400 font-medium">
                    ATRASADO
                  </span>
                )}
                {delivery.status === 'upcoming' && (
                  <span className="text-amber-400 font-medium">
                    PRÓXIMO
                  </span>
                )}
              </div>
            </div>
          ))}

          {summary.deliveries.length > 3 && (
            <p className="text-xs text-text-muted text-center">
              + {summary.deliveries.length - 3} entregas más
            </p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-3 border-t border-border/30">
        <button
          onClick={() => {
            onViewDetails(summary.itemIds);
            onViewDetailed?.(summary.itemIds);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                     bg-primary/10 border border-primary/30 text-primary text-xs font-medium
                     hover:bg-primary/20 transition-colors"
        >
          Ver Detalles
          <ChevronRight className="w-3 h-3" />
        </button>

        {summary.itemIds.length === 1 && (
          <button
            onClick={() => onOpenDailyPlan(summary.itemIds[0])}
            className="px-3 py-2 rounded-lg
                       bg-dark-bg/60 border border-border/40 text-text-secondary text-xs font-medium
                       hover:bg-dark-bg hover:border-border transition-colors"
          >
            Plan Diario
          </button>
        )}
      </div>
    </div>
  );
};

// Helper: genera mini calendario de 7 días
function generateMiniCalendar(summary: ProductSummary) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendar: Array<{
    dayLabel: string;
    date: Date;
    count: number;
    status: 'overdue' | 'upcoming' | 'on_time' | null;
    tooltip: string;
  }> = [];

  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() + i * 86400000);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    const deliveriesOnDay = summary.deliveries.filter(d => d.fecha.startsWith(dateStr));

    let status: 'overdue' | 'upcoming' | 'on_time' | null = null;
    if (deliveriesOnDay.length > 0) {
      // Priorizar el más crítico
      const hasOverdue = deliveriesOnDay.some(d => d.status === 'overdue');
      const hasUpcoming = deliveriesOnDay.some(d => d.status === 'upcoming');

      if (hasOverdue) status = 'overdue';
      else if (hasUpcoming) status = 'upcoming';
      else status = 'on_time';
    }

    calendar.push({
      dayLabel: dayLabels[dayOfWeek],
      date,
      count: deliveriesOnDay.length,
      status,
      tooltip: deliveriesOnDay.length > 0
        ? `${deliveriesOnDay.length} entrega${deliveriesOnDay.length > 1 ? 's' : ''} - ${date.toLocaleDateString('es-EC')}`
        : date.toLocaleDateString('es-EC'),
    });
  }

  return calendar;
}

export default ProductProgressCard;
