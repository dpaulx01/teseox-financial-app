import React from 'react';
import { X, Package, FileText, DollarSign, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { ProductionItem } from '../../../types/production';
import { extractQuantityInfo } from '../utils/quantityUtils';
import { isMetadataDescription } from '../utils/textUtils';

interface ClientDetailDrawerProps {
  clientName: string;
  items: ProductionItem[];
  open: boolean;
  onClose: () => void;
  onViewProduct: (itemId: number) => void;
}

const numberFormatter = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const formatDate = (iso?: string | null) => {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  clientName,
  items,
  open,
  onClose,
  onViewProduct,
}) => {
  if (!open) return null;

  // Filtrar items de metadata (TIEMPO DE PRODUCCION, ODC, etc.)
  const validItems = items.filter(item => !isMetadataDescription(item.producto));

  // Agrupar por cotización
  const cotizacionesMap = new Map<number, {
    numeroCotizacion: string;
    odc: string | null;
    fechaIngreso: string | null;
    productos: ProductionItem[];
    totalCotizacion: number;
    saldoPendiente: number;
  }>();

  for (const item of validItems) {
    const cotizacionId = item.cotizacionId;
    if (!cotizacionesMap.has(cotizacionId)) {
      cotizacionesMap.set(cotizacionId, {
        numeroCotizacion: item.numeroCotizacion,
        odc: item.odc,
        fechaIngreso: item.fechaIngreso,
        productos: [],
        totalCotizacion: item.totalCotizacion || 0,
        saldoPendiente: item.saldoPendiente || 0,
      });
    }
    cotizacionesMap.get(cotizacionId)!.productos.push(item);
  }

  const cotizaciones = Array.from(cotizacionesMap.values());

  // Calcular totales (solo con items válidos, sin metadata)
  const totalProductos = validItems.length;
  const totalMetros = validItems.reduce((sum, item) => {
    const q = extractQuantityInfo(item.cantidad);
    return sum + (q.unit === 'metros' ? (q.amount || 0) : 0);
  }, 0);
  const totalUnidades = validItems.reduce((sum, item) => {
    const q = extractQuantityInfo(item.cantidad);
    return sum + (q.unit === 'unidades' ? (q.amount || 0) : 0);
  }, 0);

  // Usar totalCotizacion del primer item de cada cotización (es el mismo para todos los items de la cotización)
  const totalValor = cotizaciones.reduce((sum, cot) => sum + (cot.totalCotizacion || 0), 0);
  const totalSaldo = cotizaciones.reduce((sum, cot) => sum + (cot.saldoPendiente || 0), 0);

  // Distribución por estatus (solo items válidos)
  const statusCount = validItems.reduce((acc, item) => {
    const status = item.estatus || 'Sin definir';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 bg-dark-bg border-l border-border shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-card/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary mb-1">
              {clientName}
            </h2>
            <p className="text-sm text-text-muted">
              {cotizaciones.length} {cotizaciones.length === 1 ? 'cotización' : 'cotizaciones'} • {totalProductos} productos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-bg/60 transition-colors text-text-muted hover:text-text-primary"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Resumen Ejecutivo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-card/60 rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-muted">Productos</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{totalProductos}</p>
            </div>

            <div className="bg-dark-card/60 rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-text-muted">Metros</span>
              </div>
              <p className="text-2xl font-bold text-sky-400">{numberFormatter.format(totalMetros)}</p>
            </div>

            <div className="bg-dark-card/60 rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-text-muted">Valor Total</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{currencyFormatter.format(totalValor)}</p>
            </div>

            <div className="bg-dark-card/60 rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-text-muted">Saldo</span>
              </div>
              <p className="text-xl font-bold text-amber-400">{currencyFormatter.format(totalSaldo)}</p>
            </div>
          </div>

          {/* Distribución por Estatus */}
          <div className="bg-dark-card/60 rounded-xl p-4 border border-border/40">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Estado de Producción
            </h3>
            <div className="space-y-2">
              {Object.entries(statusCount).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-dark-bg/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / totalProductos) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cotizaciones y Productos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Cotizaciones y Productos
            </h3>

            {cotizaciones.map((cotizacion) => (
              <div
                key={cotizacion.numeroCotizacion}
                className="bg-dark-card/60 rounded-xl border border-border/40 overflow-hidden"
              >
                {/* Header de Cotización */}
                <div className="bg-dark-card/80 p-4 border-b border-border/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-text-primary">
                        Cotización: {cotizacion.numeroCotizacion}
                      </h4>
                      {cotizacion.odc && (
                        <p className="text-sm text-text-muted">ODC: {cotizacion.odc}</p>
                      )}
                      {cotizacion.fechaIngreso && (
                        <p className="text-xs text-text-muted mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Ingreso: {formatDate(cotizacion.fechaIngreso)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-muted">Total</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {currencyFormatter.format(cotizacion.totalCotizacion)}
                      </p>
                      {cotizacion.saldoPendiente > 0 && (
                        <p className="text-xs text-amber-400">
                          Saldo: {currencyFormatter.format(cotizacion.saldoPendiente)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Productos de la Cotización */}
                <div className="divide-y divide-border/20">
                  {cotizacion.productos.map((producto) => {
                    const quantity = extractQuantityInfo(producto.cantidad);
                    return (
                      <div
                        key={producto.id}
                        className="p-4 hover:bg-dark-bg/40 transition-colors cursor-pointer group"
                        onClick={() => onViewProduct(producto.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                              {producto.producto}
                            </h5>
                            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                              <span>{producto.cantidad}</span>
                              {producto.fechaEntrega && (
                                <span>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDate(producto.fechaEntrega)}
                                </span>
                              )}
                              {producto.estatus && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                  {producto.estatus}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientDetailDrawer;
