import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CalendarClock, Package } from 'lucide-react';
import { SupervisorKPI } from '../hooks/useSupervisorKPIs';

interface SupervisorKPIsProps {
  kpis: SupervisorKPI;
}

const numberFormatter = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });

const SupervisorKPIs: React.FC<SupervisorKPIsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
      {/* Cumplimiento */}
      <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-text-muted">Cumplimiento</span>
          {kpis.cumplimiento.trend !== 0 && (
            <div className={`flex items-center gap-1 text-xs ${
              kpis.cumplimiento.trend > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {kpis.cumplimiento.trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(kpis.cumplimiento.trend)}%</span>
            </div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-text-primary">
            {kpis.cumplimiento.value}%
          </p>
        </div>
        <p className="mt-1 text-xs text-text-muted">Entregas a tiempo (últimos 30d)</p>
      </div>

      {/* Atrasados */}
      <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Atrasados
          </span>
          {kpis.atrasados.delta !== 0 && (
            <div className={`flex items-center gap-1 text-xs ${
              kpis.atrasados.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {kpis.atrasados.delta > 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{Math.abs(kpis.atrasados.delta)}</span>
            </div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <p className={`text-3xl font-bold ${
            kpis.atrasados.count === 0
              ? 'text-emerald-400'
              : kpis.atrasados.count <= 3
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}>
            {kpis.atrasados.count}
          </p>
          <span className="text-sm text-text-muted mb-1">items</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">Pedidos vencidos sin entregar</p>
      </div>

      {/* Carga Hoy */}
      <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            Carga Hoy
          </span>
        </div>
        <div className="space-y-1">
          {kpis.cargaHoy.metros > 0 && (
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-sky-400">
                {numberFormatter.format(kpis.cargaHoy.metros)}
              </p>
              <span className="text-xs text-text-muted">m²</span>
            </div>
          )}
          {kpis.cargaHoy.unidades > 0 && (
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-amber-400">
                {numberFormatter.format(kpis.cargaHoy.unidades)}
              </p>
              <span className="text-xs text-text-muted">u</span>
            </div>
          )}
          {kpis.cargaHoy.metros === 0 && kpis.cargaHoy.unidades === 0 && (
            <p className="text-2xl font-bold text-text-muted">—</p>
          )}
        </div>
        <p className="mt-1 text-xs text-text-muted">Programado para producir hoy</p>
      </div>

      {/* Próximos 7 días */}
      <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Próximos 7 días
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-3xl font-bold text-text-primary">
            {kpis.proximos7d.count}
          </p>
          <span className="text-sm text-text-muted mb-1">entregas</span>
        </div>
        <div className="flex gap-3 text-xs">
          {kpis.proximos7d.metros > 0 && (
            <span className="text-sky-400">
              {numberFormatter.format(kpis.proximos7d.metros)} m²
            </span>
          )}
          {kpis.proximos7d.unidades > 0 && (
            <span className="text-amber-400">
              {numberFormatter.format(kpis.proximos7d.unidades)} u
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-text-muted">Compromisos próxima semana</p>
      </div>
    </div>
  );
};

export default SupervisorKPIs;
