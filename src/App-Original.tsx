import React, { useState, useCallback, useEffect } from 'react';
import { FinancialData } from './types';
import { DataProvider } from './contexts/DataContext';
import { MixedCostProvider } from './contexts/MixedCostContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { useErrorHandler } from './hooks/useErrorHandler';
import { useLocalStorage } from './hooks/useLocalStorage';
import { processFinancialData } from './utils/financialDataProcessor';
import { loadFinancialData, saveFinancialData } from './utils/financialStorage';
import Navigation from './components/layout/Navigation';
import DataUploader from './components/upload/DataUploader';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import AnimatedBackground from './components/ui/AnimatedBackground';
import DashboardKPIs from './pages/DashboardKPIs';
import PnlAnalysis from './pages/PnlAnalysis';
import BreakEvenAnalysis from './pages/BreakEvenAnalysis';
import DataConfiguration from './pages/DataConfiguration';
import OperationalAnalysis from './pages/OperationalAnalysis';
import PygContainer from './components/pyg/PygContainer';

// Importar script de migración para que esté disponible globalmente
import './utils/migrateToMySQL';

const App: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [activeTab, setActiveTab] = useLocalStorage<string>('artyco-active-tab', 'kpi');
  const [savedData, setSavedData] = useLocalStorage<FinancialData | null>('artyco-financial-data', null);
  const { errors, addError, removeError } = useErrorHandler();

  // Cargar datos persistentes al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!financialData) {
          const persistentData = await loadFinancialData();
          if (persistentData) {
            setFinancialData(persistentData);
            setSavedData(persistentData);
            // Solo mostrar mensaje de éxito si realmente hay datos válidos
            if (persistentData.monthly && Object.keys(persistentData.monthly).length > 0) {
              addError('Datos financieros cargados desde almacenamiento', 'info');
            }
          }
        }
      } catch (error) {
        // Solo logear errores críticos en modo desarrollo
        if (import.meta.env.DEV) {
          console.warn('⚠️ App: Financial data not available, using upload flow');
        }
        
        // No mostrar errores en UI para problemas de carga inicial
        // El usuario puede cargar datos manualmente
      }
    };

    loadData();
  }, [financialData, setSavedData, addError]);

  const handleDataLoaded = useCallback(async (data: FinancialData) => {
    try {
      setFinancialData(data);
      setSavedData(data); // Persist to localStorage
      await saveFinancialData(data); // Guardar en sistema híbrido
      addError('Datos cargados y guardados exitosamente', 'info');
    } catch (error) {
      // console.error('Error guardando datos:', error);
      addError('Error al cargar los datos financieros', 'error');
    }
  }, [addError, setSavedData]);

  const renderContent = () => {
    // La configuración no requiere datos financieros
    if (activeTab === 'config') {
      return <DataConfiguration />;
    }
    
    // Análisis operativo puede funcionar sin datos financieros si hay datos de producción
    if (activeTab === 'operational') {
      return <OperationalAnalysis onNavigateToConfig={() => setActiveTab('config')} />;
    }

    if (!financialData) {
      return (
        <div className="flex items-center justify-center h-full">
          <DataUploader onDataLoaded={handleDataLoaded} />
        </div>
      );
    }

    switch (activeTab) {
      case 'kpi':
        return <DashboardKPIs />;
      case 'pnl':
        return <PnlAnalysis />;
      case 'pyg':
        return <PygContainer />;
      case 'breakeven':
        return <BreakEvenAnalysis />;
      case 'operational':
        return <OperationalAnalysis onNavigateToConfig={() => setActiveTab('config')} />;
      case 'config':
        return <DataConfiguration />;
      default:
        return <DashboardKPIs />;
    }
  };

  return (
    <ErrorBoundary>
      <DataProvider data={financialData}>
        <MixedCostProvider>
          <DashboardProvider>
            <div className="flex h-screen bg-dark-bg font-sans text-text-secondary relative overflow-hidden">
              <AnimatedBackground />
              <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
              <main className="flex-1 p-4 lg:p-8 overflow-y-auto lg:ml-16 relative z-10 transition-all duration-500">
                {renderContent()}
              </main>
              <ToastContainer errors={errors} onClose={removeError} />
            </div>
          </DashboardProvider>
        </MixedCostProvider>
      </DataProvider>
    </ErrorBoundary>
  );
};

export default App;