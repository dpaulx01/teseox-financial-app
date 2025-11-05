import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, RefreshCcw } from 'lucide-react';
import { UploadStatus } from '../hooks/useActiveProductionItems';

interface UploadCardProps {
  onUpload: (files: FileList | File[]) => void;
  status: UploadStatus;
  onReset: () => void;
}

const UploadCard: React.FC<UploadCardProps> = ({ onUpload, status, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <section className="glass-panel rounded-2xl border border-border shadow-hologram p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Carga de cotizaciones Excel</h2>
            <p className="text-sm text-text-muted">
              Arrastra y suelta tus cotizaciones (XLS, XLSX) o selecciónalas manualmente. La información se extraerá automáticamente.
            </p>
          </div>
        </div>

        <div
          className={[
            'border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer',
            'bg-dark-card/40',
            isDragging ? 'border-primary text-primary shadow-glow-md' : 'border-border text-text-secondary hover:border-primary/50 hover:shadow-glow-sm',
          ].join(' ')}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-primary" />
          <p className="text-base text-center">
            <span className="font-semibold text-text-primary">Arrastra y suelta</span> tus archivos Excel aquí
          </p>
          <p className="text-sm text-text-muted">o haz clic para seleccionar (máximo 10 archivos por lote)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            className="hidden"
          />
        </div>

        {status.status !== 'idle' && (
          <div className="mt-6 rounded-xl border border-border bg-dark-card/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  {status.status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {status.status === 'success' && <FileText className="w-4 h-4 text-primary" />}
                  {status.status === 'error' && <FileText className="w-4 h-4 text-danger" />}
                  <span>{status.message}</span>
                </div>
                {status.status === 'success' && status.detail.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-text-muted">
                    {status.detail.map((item) => (
                      <li key={`${item.cotizacion}-${item.archivo}`}>
                        <span className="text-text-primary font-medium">{item.cotizacion}</span> — {item.productos} productos extraídos de{' '}
                        <span className="text-text-secondary">{item.archivo}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {status.status === 'error' && (
                  <p className="mt-2 text-sm text-danger">
                    Verifica que el archivo siga el formato estándar de cotizaciones (Excel .xls o .xlsx) y vuelve a intentarlo.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default UploadCard;
