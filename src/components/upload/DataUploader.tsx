import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, Loader, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataUploaderProps } from '../../types';
import { processFinancialData } from '../../utils/financialDataProcessor';

const DataUploader: React.FC<DataUploaderProps> = ({ onDataLoaded }) => {
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
          console.log('✅ Data processed by your algorithm:', processedData);
          
          // Save processed data (from your algorithm) to server
          try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
            const response = await fetch(`${API_BASE}/financial_data_processed.php`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(processedData)
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                console.log('✅ Processed data saved to database using your algorithm');
              } else {
                console.warn('⚠️ Server returned error:', result.error);
              }
            } else {
              console.warn('⚠️ Failed to save to server:', response.status);
            }
          } catch (serverError) {
            console.warn('⚠️ Could not save to server:', serverError);
          }
          
          onDataLoaded(processedData);
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

export default DataUploader;