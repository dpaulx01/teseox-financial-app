import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Badge,
  Button,
  Callout,
  Card,
  Flex,
  Metric,
  Text,
  Title,
} from '@tremor/react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import financialAPI from '../../../services/api';

interface UploadResult {
  success: boolean;
  message: string;
  total_uploaded: number;
  errors_count: number;
  errors?: string[];
  deleted_previous?: number;
  duplicates_skipped_count?: number;
  warnings?: string[];
}

interface SalesDataUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded?: (result: UploadResult) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export type SalesDataUploadResult = UploadResult;

export default function SalesDataUploadModal({
  open,
  onClose,
  onUploaded,
}: SalesDataUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
    setOverwriteExisting(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    };

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClose]);

  const selectFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setErrorMessage('El archivo debe tener extensión .csv');
        setFile(null);
        return;
      }
      setErrorMessage(null);
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file || status === 'uploading') {
      if (!file) {
        setErrorMessage('Selecciona un archivo CSV antes de importar.');
        setStatus('error');
      }
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);
    try {
      console.log('🔄 Subiendo archivo de ventas:', {
        fileName: file.name,
        size: file.size,
        overwrite: overwriteExisting,
      });
      const response = await financialAPI.uploadSalesCSV(file, {
        overwrite: overwriteExisting,
      });
      setResult(response);
      if (response.success) {
        setStatus('success');
        onUploaded?.(response);
      } else {
        setStatus('error');
        setErrorMessage(response.message || 'Error al procesar el archivo.');
      }
    } catch (error: any) {
      setStatus('error');
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'No fue posible cargar el archivo.';
      setErrorMessage(message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-2xl"
          >
            <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-900/90 shadow-2xl">
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-40" />

              <Flex justifyContent="between" alignItems="start" className="mb-6">
                <div className="space-y-2">
                  <Badge color="blue" size="md">
                    Inteligencia de Negocios
                  </Badge>
                  <Title className="text-3xl">Importar Ventas desde CSV</Title>
                  <Text className="text-slate-400 max-w-xl">
                    Carga los movimientos comerciales para actualizar dashboards y análisis financieros.
                    El archivo debe usar punto y coma (;) como separador.
                  </Text>
                </div>
                <Button
                  icon={XMarkIcon}
                  variant="light"
                  color="red"
                  onClick={handleClose}
                >
                  Cerrar
                </Button>
              </Flex>

              <div
                className="relative mt-6 rounded-2xl border-2 border-dashed border-primary/30 bg-slate-900/60 p-8 text-center transition hover:border-primary/60 hover:bg-slate-900/80"
                onClick={selectFile}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CloudArrowUpIcon className="h-8 w-8" />
                </div>
                <Metric className="mt-4">Arrastra o selecciona el archivo</Metric>
                <Text className="mt-2 text-slate-400">
                  Formato soportado: CSV con columnas estándar de ventas
                </Text>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="mt-4 rounded-xl border border-primary/30 bg-slate-900/80 p-4">
                    <Text className="font-medium text-primary">{file.name}</Text>
                    <Text className="text-sm text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB • Última modificación:{' '}
                      {file.lastModified
                        ? new Date(file.lastModified).toLocaleString('es')
                        : 'N/D'}
                    </Text>
                  </div>
                ) : (
                  <Text className="mt-4 text-sm text-slate-500">
                    Haz clic aquí para elegir el archivo desde tu equipo
                  </Text>
                )}
              </div>

              <Flex
                justifyContent="between"
                alignItems="start"
                className="mt-6 flex-col gap-6 lg:flex-row"
              >
                <div className="flex-1 space-y-4">
                  {status === 'uploading' && (
                    <Callout
                      title="Procesando archivo..."
                      icon={ArrowPathIcon}
                      color="blue"
                    >
                      Estamos validando la estructura e insertando los registros.
                      Este proceso puede tardar unos segundos.
                    </Callout>
                  )}

                  {status === 'success' && result && (
                    <Callout
                      title={result.message}
                      icon={CheckCircleIcon}
                      color="emerald"
                    >
                      {result.errors_count > 0 && (
                        <Text className="text-slate-200">
                          {`Hubo ${result.errors_count} fila(s) con observaciones. `}
                          {result.errors && result.errors.length > 0
                            ? 'Revisa los detalles inferiores.'
                            : ''}
                        </Text>
                      )}
                      {result.duplicates_skipped_count ? (
                        <Text className="mt-2 text-emerald-200">
                          {`${result.duplicates_skipped_count.toLocaleString('es-CO')} registros duplicados se omitieron automáticamente.`}
                        </Text>
                      ) : null}
                    </Callout>
                  )}

                  {status === 'error' && (
                    <Callout
                      title="No fue posible terminar la importación"
                      icon={ExclamationTriangleIcon}
                      color="red"
                    >
                      <Text className="text-slate-100">{errorMessage}</Text>
                    </Callout>
                  )}

                  {result?.warnings && result.warnings.length > 0 && (
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                      <Text className="font-medium text-primary">Avisos</Text>
                      <ul className="mt-3 space-y-2 text-sm text-primary/90">
                        {result.warnings.map((warning, idx) => (
                          <li
                            key={`warning-${idx}`}
                            className="rounded-lg border border-primary/20 bg-primary/5 p-2"
                          >
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result?.deleted_previous !== undefined && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                      Se eliminaron {result.deleted_previous.toLocaleString('es-CO')} registros antes de la importación.
                    </div>
                  )}

                  {result?.errors && result.errors.length > 0 && (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                      <Flex justifyContent="between" alignItems="center">
                        <Text className="font-medium text-yellow-200">
                          Observaciones encontradas
                        </Text>
                        <Badge color="yellow">{result.errors_count}</Badge>
                      </Flex>
                      <ul className="mt-4 space-y-2 text-left text-sm text-yellow-100">
                        {result.errors.slice(0, 10).map((err, idx) => (
                          <li
                            key={idx}
                            className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2"
                          >
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex w-full flex-col gap-3 lg:max-w-xs">
                  <label className="inline-flex items-center gap-3 rounded-xl border border-border/50 bg-dark-card/80 px-3 py-2 text-sm text-text-muted transition hover:border-primary/50 hover:text-text-primary">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 rounded border-border/60 bg-dark-card text-primary focus:ring-primary"
                      checked={overwriteExisting}
                      onChange={(event) => setOverwriteExisting(event.target.checked)}
                      disabled={status === 'uploading'}
                    />
                    Sobrescribir datos anteriores
                  </label>

                  {overwriteExisting ? (
                    <Callout
                      title="Se eliminarán los registros actuales antes de importar"
                      icon={ExclamationTriangleIcon}
                      color="yellow"
                    >
                      <Text className="text-sm text-yellow-100">
                        Esta acción limpia todos los registros de ventas existentes para tu empresa antes de cargar el nuevo archivo.
                      </Text>
                    </Callout>
                  ) : (
                    <Callout
                      title="Los duplicados se omitirán automáticamente"
                      icon={CheckCircleIcon}
                      color="emerald"
                    >
                      <Text className="text-sm text-emerald-100">
                        Mantendremos los registros actuales y solo agregaremos filas nuevas. Facturas ya cargadas se saltarán sin generar errores.
                      </Text>
                    </Callout>
                  )}

                  <Flex className="gap-3">
                    <Button variant="secondary" color="gray" onClick={resetState}>
                      Restablecer
                    </Button>
                    <Button
                      icon={CloudArrowUpIcon}
                      disabled={!file || status === 'uploading'}
                      loading={status === 'uploading'}
                      onClick={handleUpload}
                    >
                      {status === 'uploading' ? 'Cargando...' : 'Importar CSV'}
                    </Button>
                  </Flex>
                </div>
              </Flex>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
