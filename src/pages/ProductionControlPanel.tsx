import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, LayoutGrid, PackageOpen, UploadCloud, Users2, X } from 'lucide-react';
import UploadCard from '../modules/statusProduccion/components/UploadCard';
import StatusTable from '../modules/statusProduccion/components/StatusTable';
import { useActiveProductionItems } from '../modules/statusProduccion/hooks/useActiveProductionItems';

export interface ExternalPanelContext {
  focusItemId?: number | null;
  focusQuoteNumber?: string | null;
  viewMode?: 'quotes' | 'products' | 'clients' | 'calendar';
  searchQuery?: string | null;
}

interface ProductionControlPanelProps {
  externalContext?: ExternalPanelContext | null;
  onConsumedContext?: () => void;
}

const ProductionControlPanel: React.FC<ProductionControlPanelProps> = ({ externalContext, onConsumedContext }) => {
  const {
    items,
    statusOptions,
    loading,
    error,
    uploadStatus,
    uploadQuotes,
    resetUploadStatus,
    updateItem,
    isSaving,
    deleteQuote,
  } = useActiveProductionItems();
  const [viewMode, setViewMode] = useState<'quotes' | 'products' | 'clients' | 'calendar'>('quotes');
  const [showUploader, setShowUploader] = useState(false);
  const [externalFocus, setExternalFocus] = useState<ExternalPanelContext | null>(null);

  const viewDescription = useMemo(() => {
    switch (viewMode) {
      case 'products':
        return 'Listado granular de cada producto activo con controles rápidos sobre fechas, estatus y notas.';
      case 'clients':
        return 'Resumen ejecutivo por cliente con carga de producción y compromisos pendientes.';
      case 'calendar':
        return 'Agenda táctil con carga de producción agrupada por día; perfecto para planificación de capacidad.';
      default:
        return 'Vista agrupada por cotización para gestionar cartera, entregas y notas operativas.';
    }
  }, [viewMode]);

  useEffect(() => {
    if (!externalContext) {
      return;
    }

    const targetItem = externalContext.focusItemId
      ? items.find((item) => item.id === externalContext.focusItemId)
      : undefined;

    const resolvedView = externalContext.viewMode ?? 'products';
    setViewMode((prev) => (prev === resolvedView ? prev : resolvedView));

    const resolvedSearch =
      externalContext.searchQuery ??
      targetItem?.numeroCotizacion ??
      targetItem?.producto ??
      '';

    setExternalFocus({
      ...externalContext,
      focusItemId: targetItem?.id ?? externalContext.focusItemId ?? null,
      focusQuoteNumber: externalContext.focusQuoteNumber ?? targetItem?.numeroCotizacion ?? null,
      searchQuery: resolvedSearch,
    });

    onConsumedContext?.();
  }, [externalContext, items, onConsumedContext]);

  useEffect(() => {
    if (!showUploader) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUploader(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUploader]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-text-primary neon-text mb-3">Status Producción</h1>
        <p className="text-text-muted max-w-4xl text-base leading-relaxed">
          Centraliza el seguimiento operativo de las cotizaciones cargadas: controla entregas, estatus, facturación y cobros
          asociados a cada línea de producción.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-panel inline-flex rounded-2xl border border-border/60 bg-dark-card/80 p-2 shadow-hologram w-full max-w-2xl">
          {[
            { key: 'quotes', label: 'Por cotización', icon: LayoutGrid },
            { key: 'products', label: 'Por producto', icon: PackageOpen },
            { key: 'clients', label: 'Por cliente', icon: Users2 },
            { key: 'calendar', label: 'Por día', icon: CalendarRange },
          ].map(({ key, label, icon: Icon }) => {
            const active = viewMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key as typeof viewMode)}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary text-dark-card shadow-glow-md neon-text'
                    : 'text-text-muted hover:text-text-primary hover:bg-dark-card/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="cyber-button inline-flex items-center justify-center gap-2"
          >
            <UploadCloud className="h-5 w-5" />
            Subir cotización
          </button>
          <p className="text-sm text-text-muted max-w-xl text-left lg:text-right bg-dark-card/30 rounded-lg px-3 py-2 border border-border/40">{viewDescription}</p>
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-xl border border-danger/40 bg-danger-glow px-5 py-4 text-sm text-danger shadow-glow-danger">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-border/60 shadow-hologram p-16 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="text-lg font-medium">Cargando matriz de producción...</p>
          <p className="text-sm text-text-dim mt-2">Procesando datos de producción activa</p>
        </div>
      ) : (
        <StatusTable
          items={items}
          statusOptions={statusOptions}
          onSave={updateItem}
          isSaving={isSaving}
          onDeleteQuote={deleteQuote}
          viewMode={viewMode}
          externalFocus={externalFocus}
          onConsumeExternalFocus={() => setExternalFocus(null)}
          onRequestViewChange={setViewMode}
        />
      )}

      {showUploader && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-dark-bg/90 backdrop-blur-md px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowUploader(false)}
        >
          <div
            className="relative w-full max-w-4xl animate-scale-in"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="absolute right-6 top-6 z-10 inline-flex items-center justify-center rounded-full border border-border/60 bg-dark-card/90 p-3 text-text-secondary hover:text-danger hover:border-danger/40 transition-all duration-200 shadow-glass"
              aria-label="Cerrar carga de cotizaciones"
            >
              <X className="h-5 w-5" />
            </button>
            <UploadCard onUpload={uploadQuotes} status={uploadStatus} onReset={resetUploadStatus} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionControlPanel;
