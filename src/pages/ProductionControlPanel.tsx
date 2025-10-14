import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, LayoutGrid, PackageOpen, UploadCloud, Users2, X } from 'lucide-react';
import UploadCard from '../modules/statusProduccion/components/UploadCard';
import StatusTable from '../modules/statusProduccion/components/StatusTable';
import { useActiveProductionItems } from '../modules/statusProduccion/hooks/useActiveProductionItems';

const ProductionControlPanel: React.FC = () => {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Status Producción</h1>
        <p className="text-text-muted max-w-3xl">
          Centraliza el seguimiento operativo de las cotizaciones cargadas: controla entregas, estatus, facturación y cobros
          asociados a cada línea de producción.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-2xl border border-border/70 bg-dark-card/60 p-1 shadow-inner w-full max-w-xl">
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
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-dark-card shadow-lg'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            Subir cotización
          </button>
          <p className="text-xs text-text-muted max-w-xl text-left lg:text-right">{viewDescription}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-border shadow-hologram p-12 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
          <p>Cargando matriz de producción...</p>
        </div>
      ) : (
        <StatusTable
          items={items}
          statusOptions={statusOptions}
          onSave={updateItem}
          isSaving={isSaving}
          onDeleteQuote={deleteQuote}
          viewMode={viewMode}
        />
      )}

      {showUploader && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowUploader(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full border border-border bg-dark-card/80 p-2 text-text-secondary hover:text-primary hover:border-primary transition-colors"
              aria-label="Cerrar carga de cotizaciones"
            >
              <X className="h-4 w-4" />
            </button>
            <UploadCard onUpload={uploadQuotes} status={uploadStatus} onReset={resetUploadStatus} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionControlPanel;
