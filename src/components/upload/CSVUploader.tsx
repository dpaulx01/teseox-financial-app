import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, Loader, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processFinancialData } from '../../utils/financialDataProcessor';

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
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  console.log('🔄 DataUploader component loaded and ready');

  const clearStoredData = useCallback(() => {
    localStorage.removeItem('artyco-financial-data');
    localStorage.removeItem('artyco-active-tab');
    window.location.reload();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('📁 File selected:', file?.name);
    
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Formato inválido. Por favor, selecciona un archivo CSV.');
      setFileName('');
      return;
    }

    console.log('✅ CSV file validated, starting processing...');
    setError('');
    setFileName(file.name);
    setIsLoading(true);

    Papa.parse(file, {
      header: false,
      delimiter: ';',
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          // Convertir array de arrays a objetos con claves numéricas
          const cleanedData = results.data.map((row: any[]) => {
            const cleanedRow: any = {};
            row.forEach((value, index) => {
              // Usar índices numéricos como claves
              const cleanedValue = typeof value === 'string' ? value.replace(/\uFFFD/g, 'ñ').trim() : value;
              cleanedRow[index.toString()] = cleanedValue;
            });
            return cleanedRow;
          });

          const processedData = processFinancialData(cleanedData as any[]);
          console.log('✅ Data processed locally:', processedData);
          
          // GUARDAR SOLO EN MYSQL VIA API RBAC - NO LOCALSTORAGE
          try {
            const token = localStorage.getItem('access_token');
            if (!token) {
              throw new Error('No hay sesión activa. Por favor, inicia sesión.');
            }
            
            // Preparar datos para enviar al backend RBAC
            const formData = new FormData();
            const blob = new Blob([Papa.unparse(results.data, { delimiter: ';' })], { type: 'text/csv' });
            formData.append('csv', blob, 'data.csv');
            formData.append('year', '2025');
            
            // Enviar CSV al backend RBAC para guardar en MySQL
            const response = await fetch('http://localhost:8001/api/financial/csv-upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('✅ Data saved to MySQL database successfully');
              
              // NO guardar en localStorage - la app debe leer desde MySQL
              // localStorage.removeItem('artyco-financial-data-persistent');
              
            } else {
              console.error('❌ Failed to save to MySQL:', response.status);
              throw new Error('Error al guardar en base de datos');
            }
          } catch (serverError) {
            console.error('❌ Could not save to MySQL:', serverError);
            throw serverError;
          }
          
          // Llamar la función de callback como la app original
          const months = processedData.monthly ? Object.keys(processedData.monthly) : [];
          
          onUploadComplete({
            year: 2025, // Año por defecto
            months: months,
            totalAccounts: processedData.raw ? processedData.raw.length : 0,
            totalRevenue: processedData.yearly?.ingresos || 0,
            previousRevenue: 0,
            revenueChange: 0,
            significantChanges: []
          });
        } catch (err) {
          setError(`Error al procesar el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        } finally {
          setIsLoading(false);
        }
      },
      error: (err) => {
        setError(`Error al leer el archivo: ${err.message}`);
        setIsLoading(false);
      }
    });
  }, [onDataLoaded]);

  return (
    <motion.div 
      className="hologram-card p-8 rounded-2xl shadow-hologram text-center max-w-lg mx-auto relative overflow-hidden border-2 border-primary/30"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, type: 'spring' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-hologram" />
      <div className="relative z-10">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Upload className="mx-auto h-20 w-20 text-primary shadow-glow-lg mb-6" />
        </motion.div>
        
        <h2 className="text-3xl font-display text-primary neon-text mb-3">
          Cargar Estado de Resultados
        </h2>
        <p className="text-text-muted mb-8 font-mono">
          Sube tu archivo CSV para iniciar el análisis financiero.
        </p>
        
        <label 
          htmlFor="file-upload" 
          className={`cyber-button group w-full flex items-center justify-center px-6 py-4 rounded-lg font-bold transition-all duration-300 shadow-lg relative overflow-hidden 
            ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          {isLoading ? (
            <>
              <Loader className="h-5 w-5 mr-3 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-3 group-hover:animate-pulse" />
              Seleccionar Archivo CSV
            </>
          )}
        </label>
        
        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          accept=".csv" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
        
        <AnimatePresence>
          {fileName && !error && (
            <motion.p 
              className="mt-6 text-accent font-mono animate-slide-up"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Archivo cargado: {fileName}
            </motion.p>
          )}
          {error && (
            <motion.p 
              className="mt-6 text-danger font-medium flex items-center justify-center animate-slide-up p-3 bg-danger/10 border border-danger/30 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-divider">
          <p className="text-sm text-text-dim mb-3 font-mono">¿Necesitas empezar de nuevo?</p>
          <button
            onClick={clearStoredData}
            className="text-sm px-4 py-2 bg-dark-card border border-danger/50 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors font-medium flex items-center mx-auto group"
          >
            <Trash2 className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            Limpiar y Recargar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CSVUploader;