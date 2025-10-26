import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  X,
  CalendarRange,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  StockPlanningConfirmResponse,
  StockPlanningParsedData,
} from '../../../types/production';
import { useStockPlanningUpload } from '../hooks/useStockPlanningUpload';

interface StockPlanningUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: StockPlanningConfirmResponse) => void;
}

interface ProductSummary {
  nombre: string;
  categoria?: string | null;
  unidad?: string | null;
  totalCantidad: number;
  diasProgramados: number;
  programacion: StockPlanningParsedData['productos'][number]['programacion_diaria'];
}

const numberFormatter = new Intl.NumberFormat('es-EC', {
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatDate = (iso: string | null | undefined, fallback: string = '—') => {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return longDateFormatter.format(date);
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return shortDateFormatter.format(date);
};

const StockPlanningUploadModal: React.FC<StockPlanningUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const {
    phase,
    message,
    error,
    parsedData,
    confirmResult,
    parseFile,
    confirmPlan,
    reset,
  } = useStockPlanningUpload();

  const [bodega, setBodega] = useState('');
  const [notas, setNotas] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isUploading = phase === 'uploading';
  const isConfirming = phase === 'confirming';
  const isPreview = phase === 'preview' || phase === 'confirming';
  const isSuccess = phase === 'success';

  useEffect(() => {
    if (!open) {
      reset();
      setBodega('');
      setNotas('');
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, reset]);

  useEffect(() => {
    if (parsedData) {
      setBodega(parsedData.local ?? '');
      setNotas('');
    }
  }, [parsedData]);

  const planMetrics = useMemo(() => {
    if (!parsedData) {
      return null;
    }

    const totalProductos = parsedData.productos.length;
    let totalCantidad = 0;
    const uniqueDays = new Set<string>();

    parsedData.productos.forEach((producto) => {
      producto.programacion_diaria.forEach((entry) => {
        const amount = Number(entry.cantidad) || 0;
        totalCantidad += amount;
        uniqueDays.add(entry.fecha);
      });
    });

    return {
      totalProductos,
      totalCantidad,
      totalDias: uniqueDays.size,
    };
  }, [parsedData]);

  const productSummaries: ProductSummary[] = useMemo(() => {
    if (!parsedData) {
      return [];
    }

    return parsedData.productos.map((producto) => {
      const totalCantidad = producto.programacion_diaria.reduce((sum, entry) => {
        const amount = Number(entry.cantidad) || 0;
        return sum + amount;
      }, 0);

      return {
        nombre: producto.nombre,
        categoria: producto.categoria,
        unidad: producto.unidad,
        totalCantidad,
        diasProgramados: producto.programacion_diaria.length,
        programacion: producto.programacion_diaria,
      };
    });
  }, [parsedData]);

  const handleFileSelect = (files: FileList | File[]) => {
    const file = files instanceof FileList ? files.item(0) : files[0];
    if (!file) {
      return;
    }
    parseFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileSelect(event.dataTransfer.files);
    }
  };

  const handleConfirm = async () => {
    if (!bodega.trim()) {
      return;
    }
    try {
      const result = await confirmPlan({
        bodega: bodega.trim(),
        notas: notas.trim() ? notas.trim() : undefined,
      });
      onSuccess?.(result);
    } catch {
      // El hook ya maneja el estado de error
    }
  };

  const handleReset = () => {
    reset();
    setBodega('');
    setNotas('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!open) {
    return null;
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 px-3 py-1 text-primary text-sm font-semibold">
          Carga de pedidos de stock
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">Sube el Excel semanal de Contifico</h2>
        <p className="text-sm text-text-muted max-w-2xl mx-auto">
          Asegúrate de que el archivo mantenga el formato original (PDI, responsable, periodo y columnas diarias).
          Solo se admiten archivos <span className="font-medium text-text-primary">.xls</span> y <span className="font-medium text-text-primary">.xlsx</span>.
        </p>
      </header>

      <div
        className={[
          'border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer bg-dark-card/50',
          isDragging
            ? 'border-primary text-primary shadow-glow-lg'
            : 'border-border text-text-secondary hover:border-primary/60 hover:shadow-glow-sm',
          isUploading ? 'opacity-70 pointer-events-none' : '',
        ].join(' ')}
        onDragOver={(event) => {
          event.preventDefault();
          if (isUploading) return;
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={isUploading ? (event) => event.preventDefault() : handleDrop}
        onClick={() => {
          if (!isUploading) {
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="p-4 rounded-full bg-primary/10 text-primary">
          <FileSpreadsheet className="w-10 h-10" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg">
            {isUploading ? (
              <span className="font-semibold text-text-primary flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando archivo...
              </span>
            ) : (
              <>
                <span className="font-semibold text-text-primary">Arrastra y suelta</span> el Excel del pedido semanal
              </>
            )}
          </p>
          {!isUploading && (
            <p className="text-sm text-text-muted">
              o haz clic para seleccionar (1 archivo por vez)
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            if (event.target.files) {
              handleFileSelect(event.target.files);
            }
          }}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger-glow px-5 py-4 text-sm text-danger flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">No se pudo procesar el archivo</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => {
    if (!parsedData) {
      return null;
    }

    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Pedido identificado</p>
              <h2 className="text-2xl font-semibold text-text-primary">PDI {parsedData.numero_pedido.replace(/^PDI/i, '')}</h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
              disabled={isConfirming}
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Cargar otro archivo
            </button>
          </div>
          <p className="text-sm text-text-muted">
            Responsable: <span className="text-text-primary font-medium">{parsedData.responsable || 'No especificado'}</span> ·
            Período: <span className="text-text-primary font-medium">{formatDate(parsedData.fecha_inicio)} – {formatDate(parsedData.fecha_fin)}</span> ·
            Origen: <span className="text-text-primary font-medium">{parsedData.local || 'Sin definir'}</span>
          </p>
        </header>

        {message && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-primary">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-danger/40 bg-danger-glow px-5 py-4 text-sm text-danger flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger">No se pudo guardar la programación</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {planMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/40 bg-dark-card/70 p-4 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Productos en programa</p>
              <p className="text-2xl font-semibold text-text-primary">{planMetrics.totalProductos}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-dark-card/70 p-4 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Cantidad total asignada</p>
              <p className="text-2xl font-semibold text-primary">{numberFormatter.format(planMetrics.totalCantidad)}</p>
              <p className="text-[11px] text-text-secondary mt-1">Se calcula según la unidad definida en cada producto</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-dark-card/70 p-4 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Días con carga</p>
              <p className="text-2xl font-semibold text-text-primary">{planMetrics.totalDias}</p>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Productos programados
          </h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {productSummaries.map((product) => (
              <details
                key={product.nombre}
                className="group rounded-2xl border border-border/40 bg-dark-card/70 px-4 py-3 shadow-inner"
                open={productSummaries.length === 1}
              >
                <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{product.nombre}</p>
                    <p className="text-xs text-text-muted">
                      {product.categoria ? `${product.categoria} · ` : ''}
                      Unidad: {product.unidad || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-text-muted">Total</span>
                      <span className="text-sm font-semibold text-primary">
                        {numberFormatter.format(product.totalCantidad)} {product.unidad || ''}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-text-muted">Días</span>
                      <span className="text-sm font-semibold text-text-primary">{product.diasProgramados}</span>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 border-t border-border/30 pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-text-secondary">
                  {product.programacion.map((entry) => (
                    <div
                      key={`${product.nombre}-${entry.fecha}`}
                      className="rounded-lg border border-border/30 bg-dark-card/60 px-3 py-2 flex items-center justify-between"
                    >
                      <span className="font-medium text-text-primary">{formatShortDate(entry.fecha)}</span>
                      <span className="text-text-secondary">
                        {numberFormatter.format(Number(entry.cantidad) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            Completa la información operativa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-xs text-text-muted">
              Bodega destino <span className="text-[10px] text-text-secondary">Campo requerido</span>
              <input
                type="text"
                value={bodega}
                onChange={(event) => setBodega(event.target.value)}
                disabled={isConfirming}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-text-primary bg-dark-card/70 focus:border-primary outline-none transition-colors ${
                  !bodega.trim() && isConfirming ? 'border-danger/60' : 'border-border'
                }`}
                placeholder="Ej. Bodega Norte / Sala Materia Prima"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs text-text-muted">
              Notas internas (opcional)
              <textarea
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                disabled={isConfirming}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary bg-dark-card/70 min-h-[90px] focus:border-primary outline-none transition-colors"
                placeholder="Observaciones, particularidades o coordinaciones especiales"
              />
            </label>
          </div>
          {!bodega.trim() && (
            <p className="text-xs text-warning flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Define la bodega destino antes de confirmar.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            Al confirmar, se crearán o actualizarán los productos de stock y su plan diario. Si el pedido ya existía, se reemplazará por completo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
              disabled={isConfirming}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isConfirming || !bodega.trim()}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar programación
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessStep = () => {
    const result = confirmResult;
    return (
      <div className="space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-full bg-accent-glow border border-accent/40 px-4 py-1.5 text-accent text-sm font-semibold gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Programación guardada
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">Pedido de stock registrado correctamente</h2>
          {message && <p className="text-sm text-text-muted">{message}</p>}
        </header>

        {result && (
          <div className="rounded-3xl border border-accent/40 bg-accent-glow px-6 py-5 text-sm text-accent flex flex-col gap-2">
            <p><span className="font-semibold">Pedido:</span> {result.numero_pedido}</p>
            <p><span className="font-semibold">Cotización generada:</span> {result.numero_cotizacion}</p>
            <p>
              <span className="font-semibold">Productos programados:</span> {result.productos_creados} ·{' '}
              <span className="font-semibold">Entradas en plan diario:</span> {result.planes_diarios_creados}
            </p>
            <p><span className="font-semibold">Bodega:</span> {result.bodega}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
          >
            Cargar otro pedido
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-dark-bg/90 backdrop-blur-md px-4"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl border border-border/60 bg-dark-card/95 p-6 sm:p-8 shadow-hologram animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-dark-card/90 text-text-secondary hover:text-primary hover:border-primary transition-colors"
          aria-label="Cerrar carga de stock"
        >
          <X className="w-5 h-5" />
        </button>

        {isPreview && renderPreviewStep()}
        {!isPreview && !isSuccess && renderUploadStep()}
        {isSuccess && renderSuccessStep()}
      </div>
    </div>
  );
};

export default StockPlanningUploadModal;
