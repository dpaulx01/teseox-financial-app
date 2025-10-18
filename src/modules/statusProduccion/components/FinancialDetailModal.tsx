import React from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, CreditCard, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react';
import type { QuoteGroup, PaymentForm } from '../../../types/production';

interface FinancialDetailModalProps {
  group: QuoteGroup;
  quoteTotals: {
    totalAbonado: number;
    saldo: number | null;
  };
  dueDateStatus: {
    message: string;
    type: 'success' | 'warning' | 'danger';
  };
  open: boolean;
  onClose: () => void;
  onManagePayments: () => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateIso: string | null | undefined): string => {
  if (!dateIso) return 'Sin fecha';
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return parsed.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const FinancialDetailModal: React.FC<FinancialDetailModalProps> = ({
  group,
  quoteTotals,
  dueDateStatus,
  open,
  onClose,
  onManagePayments,
}) => {
  if (!open) return null;

  const paymentProgress = group.totalCotizacion !== null && group.totalCotizacion > 0
    ? Math.round((quoteTotals.totalAbonado / group.totalCotizacion) * 100)
    : 0;

  const statusIcon = dueDateStatus.type === 'success' 
    ? <TrendingUp className="w-5 h-5 text-accent" />
    : <AlertCircle className="w-5 h-5 text-warning" />;

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-dark-bg/90 backdrop-blur-md px-4">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-border/60 bg-dark-card/95 shadow-hologram animate-scale-in">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-text-primary neon-text">Detalle Financiero</h3>
            <p className="text-sm text-text-muted font-medium mt-1">
              {group.numeroCotizacion} • {group.cliente || 'Sin cliente'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 cyber-button-sm bg-dark-card/80 border-border/60 text-text-secondary hover:text-danger hover:border-danger/40 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Resumen Financiero */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-card rounded-xl border border-primary/30 bg-primary-glow p-5 shadow-glow-sm">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-primary" />
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Valor Total</p>
              </div>
              <p className="text-3xl font-bold text-primary data-display">
                {formatCurrency(group.totalCotizacion)}
              </p>
            </div>

            <div className="glass-card rounded-xl border border-accent/30 bg-accent-glow p-5 shadow-glow-sm">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-6 h-6 text-accent" />
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Total Abonado</p>
              </div>
              <p className="text-3xl font-bold text-accent data-display">
                {formatCurrency(quoteTotals.totalAbonado)}
              </p>
              <div className="mt-2 text-xs text-text-muted">
                {paymentProgress}% del total
              </div>
            </div>

            <div className="glass-card rounded-xl border border-warning/30 bg-warning-glow p-5 shadow-glow-sm">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-warning" />
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">Saldo Pendiente</p>
              </div>
              <p className="text-3xl font-bold text-warning data-display">
                {formatCurrency(quoteTotals.saldo)}
              </p>
            </div>
          </div>

          {/* Progreso de Pago */}
          {group.totalCotizacion !== null && group.totalCotizacion > 0 && (
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-text-primary">Progreso de Cobro</h4>
                <span className="text-2xl font-bold text-primary">{paymentProgress}%</span>
              </div>
              <div className="w-full bg-border/40 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-sm text-text-muted">
                <span>Cobrado: {formatCurrency(quoteTotals.totalAbonado)}</span>
                <span>Pendiente: {formatCurrency(quoteTotals.saldo)}</span>
              </div>
            </div>
          )}

          {/* Información Adicional */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Estado de Vencimiento */}
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/60 p-4">
              <div className="flex items-center gap-3 mb-2">
                {statusIcon}
                <h5 className="font-semibold text-text-primary">Estado de Vencimiento</h5>
              </div>
              <p className="text-sm text-text-muted">{dueDateStatus.message}</p>
              {group.fechaVencimiento && (
                <p className="text-xs text-text-dim mt-1">
                  Vence: {formatDate(group.fechaVencimiento)}
                </p>
              )}
            </div>

            {/* Información del Proyecto */}
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/60 p-4">
              <div className="flex items-center gap-3 mb-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h5 className="font-semibold text-text-primary">Información del Proyecto</h5>
              </div>
              <div className="space-y-1 text-sm text-text-muted">
                {group.proyecto && (
                  <p><span className="text-text-secondary">Proyecto:</span> {group.proyecto}</p>
                )}
                {group.contacto && (
                  <p><span className="text-text-secondary">Contacto:</span> {group.contacto}</p>
                )}
                {group.fechaIngreso && (
                  <p><span className="text-text-secondary">Ingreso:</span> {formatDate(group.fechaIngreso)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Historial de Pagos */}
          {group.pagos && group.pagos.length > 0 && (
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/60 p-5">
              <h5 className="font-semibold text-text-primary mb-4">Historial de Pagos</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {group.pagos.map((pago, index) => (
                  <div key={index} className="flex justify-between items-center py-2 px-3 rounded-lg bg-dark-card/40 border border-border/30">
                    <div>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(Number(pago.monto))}
                      </span>
                      {pago.descripcion && (
                        <p className="text-xs text-text-muted">{pago.descripcion}</p>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(pago.fecha_pago)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facturas */}
          {group.facturas && group.facturas.length > 0 && (
            <div className="glass-card rounded-xl border border-border/60 bg-dark-card/60 p-4">
              <h5 className="font-semibold text-text-primary mb-3">Facturas Asociadas</h5>
              <div className="flex flex-wrap gap-2">
                {group.facturas.map((factura, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-primary-glow border border-primary/30 text-primary text-xs font-medium"
                  >
                    {factura}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <div className="text-xs text-text-muted">
            {group.items.length} producto{group.items.length !== 1 ? 's' : ''} en esta cotización
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cyber-button-sm bg-dark-card/80 border-border/60 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onManagePayments}
              className="cyber-button inline-flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Gestionar Cobros
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FinancialDetailModal;