import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { motion } from 'framer-motion';

interface CSVUploaderProps {
  onUploadComplete: (changes: ChangesSummary) => void;
}

interface ChangesSummary {
  year: number;
  months: string[];
  totalAccounts: number;
  totalRevenue: number;
  previousRevenue?: number;
  revenueChange?: number;
  significantChanges: SignificantChange[];
}

interface SignificantChange {
  account: string;
  description: string;
  oldValue: number;
  newValue: number;
  changePercent: number;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>('2025');
  const [dragActive, setDragActive] = useState(false);

  const processCSV = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      Papa.parse(file, {
        complete: async (results) => {
          const data = results.data as string[][];
          
          // Validar estructura del CSV
          if (data.length < 2) {
            throw new Error('El archivo CSV está vacío o mal formateado');
          }

          // Detectar meses en las columnas
          const headers = data[0];
          const months: string[] = [];
          for (let i = 2; i < headers.length; i++) {
            if (headers[i] && headers[i].trim()) {
              months.push(headers[i]);
            }
          }

          if (months.length === 0) {
            throw new Error('No se encontraron meses en el CSV');
          }

          // Preparar datos para enviar al backend
          const formData = new FormData();
          formData.append('file', file);
          formData.append('year', year);

          // Obtener token de autenticación
          const token = localStorage.getItem('access_token');
          if (!token) {
            throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
          }

          // Enviar al backend RBAC (endpoint clonado)
          const response = await fetch(`http://localhost:8001/api/financial/csv-upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text();
            // console.error('Error del servidor:', errorText);
            throw new Error(`Error al procesar el archivo: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          
          // Mostrar resumen de cambios (adaptar respuesta del endpoint clonado)
          onUploadComplete({
            year: parseInt(year),
            months: result.months_processed || months.length,
            totalAccounts: result.account_codes_found?.length || 0,
            totalRevenue: result.financial_summary?.total_ingresos || 0,
            previousRevenue: 0, // No calculado en el endpoint clonado
            revenueChange: 0,   // No calculado en el endpoint clonado
            significantChanges: result.account_codes_found || []
          });

          setIsUploading(false);
        },
        error: (error) => {
          setError(`Error al leer el archivo: ${error.message}`);
          setIsUploading(false);
        },
        delimiter: ';',
        encoding: 'UTF-8'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsUploading(false);
    }
  }, [year, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      processCSV(file);
    } else {
      setError('Por favor selecciona un archivo CSV válido');
    }
  }, [processCSV]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  }, [processCSV]);

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-400" />
        Cargar Reporte P&G desde CSV
      </h3>

      {/* Selector de año */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Año del reporte
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full px-3 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          min="2020"
          max="2030"
        />
      </div>

      {/* Zona de carga */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <label htmlFor="csv-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-white mb-2">
            {isUploading ? 'Procesando...' : 'Arrastra tu archivo CSV aquí'}
          </p>
          <p className="text-sm text-gray-400">
            o haz clic para seleccionar (formato: código;descripción;mes1;mes2;...)
          </p>
        </label>
      </div>

      {/* Mensajes de error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Estado de carga */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <p className="text-sm text-blue-400">Procesando archivo CSV...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CSVUploader;