import Papa from 'papaparse';
import { useState, useCallback } from 'react';
// Flujo unificado: no procesamos ni guardamos localmente
import { Upload, FileText, Loader, AlertCircle } from 'lucide-react';
import { useYear } from '../../contexts/YearContext';
import { apiPath } from '../../config/apiBaseUrl';

export default function CSVUploaderYearAware() {
  const { availableYears, setSelectedYear, refreshYears } = useYear();
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const yearExists = availableYears?.some(y => y.year === uploadYear);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Formato inválido. Selecciona un archivo .csv'); return;
    }
    setFile(f);
    setError('');
  };

  const upload = useCallback(async () => {
    if (!file) { setError('Selecciona un archivo CSV primero'); return; }
    if (yearExists) {
      const ok = confirm(`Ya existen datos para ${uploadYear}. Subir reemplazará permanentemente ese año. ¿Continuar?`);
      if (!ok) return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token') || '';
      // No re-procesamos el CSV en el cliente: lo enviamos tal cual
      const text = await file.text();
      // Si necesitas normalizar delimitador, puedes re-serializar con Papa:
      const rows = Papa.parse<string[]>(text, { delimiter: ';', skipEmptyLines: true }).data as string[][];
      const blob = new Blob([Papa.unparse(rows, { delimiter: ';' })], { type: 'text/csv' });

      const formData = new FormData();
      formData.append('csv', blob, file.name);
      formData.append('year', String(uploadYear));

      const res = await fetch(apiPath('/api/financial/csv-upload'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        try {
          const err = await res.json();
          throw new Error(err?.detail || err?.error || `Error ${res.status}`);
        } catch {
          const txt = await res.text();
          throw new Error(txt || `Error ${res.status}`);
        }
      }

      // Refrescar años y seleccionar el recién subido
      await refreshYears();
      setSelectedYear(uploadYear);
      setSuccess(`✅ CSV de ${uploadYear} cargado y guardado correctamente`);
      setTimeout(() => setSuccess(''), 3000);
      // No alert modal; dejamos feedback visual en el flujo
      setFile(null); // Limpiar archivo tras éxito
    } catch (e: any) {
      setError(e?.message || 'Error al subir');
      setSuccess('');
    } finally {
      setIsLoading(false);
    }
  }, [file, uploadYear, yearExists, refreshYears, setSelectedYear]);

  return (
    <div className="hologram-card p-6 rounded-2xl shadow-hologram">
      <div className="flex items-center gap-3 mb-4">
        <Upload className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-display text-primary">Subir CSV por Año</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm text-text-secondary mb-2">Año destino</label>
          <input
            type="number"
            className="w-full p-3 glass-card border border-border rounded"
            value={uploadYear}
            onChange={(e) => setUploadYear(Number(e.target.value))}
            min={2000} max={2100}
          />
          {yearExists && <p className="text-xs text-warning mt-1">Se reemplazará el año {uploadYear}</p>}
        </div>

        <div>
          <label htmlFor="csv" className="block text-sm text-text-secondary mb-2">Archivo CSV</label>
          <input id="csv" type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          {file && <p className="text-xs mt-1">{file.name}</p>}
        </div>

        <div>
          <button
            disabled={isLoading || !file}
            onClick={upload}
            className="w-full cyber-button flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isLoading ? 'Cargando…' : 'Subir y Guardar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded text-accent">
          <span className="text-sm">{success}</span>
        </div>
      )}
    </div>
  );
}
