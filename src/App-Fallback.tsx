import React, { useState, useCallback, useEffect } from 'react';
import { FinancialData } from './types';
import { DataProvider } from './contexts/DataContext';
import { useErrorHandler } from './hooks/useErrorHandler';
import { useLocalStorage } from './hooks/useLocalStorage';
import Navigation from './components/layout/Navigation';
import DataUploader from './components/upload/DataUploader';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import DashboardKPIs from './pages/DashboardKPIs';
import PnlAnalysis from './pages/PnlAnalysis';
import BreakEvenAnalysis from './pages/BreakEvenAnalysis';

// Styles inline como fallback
const styles = `
  .app-container {
    display: flex;
    height: 100vh;
    background-color: #f9fafb;
    font-family: 'Inter', sans-serif;
  }
  .main-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }
  @media (max-width: 1024px) {
    .main-content {
      padding: 1rem;
      margin-left: 0;
    }
  }
`;

const AppFallback: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [activeTab, setActiveTab] = useLocalStorage<string>('artyco-active-tab', 'kpi');
  const [savedData, setSavedData] = useLocalStorage<FinancialData | null>('artyco-financial-data', null);
  const { errors, addError, removeError } = useErrorHandler();

  // Load saved data on mount
  useEffect(() => {
    if (savedData && !financialData) {
      setFinancialData(savedData);
      addError('Datos previos cargados automáticamente', 'info');
    }
  }, [savedData, financialData, addError]);

  const handleDataLoaded = useCallback((data: FinancialData) => {
    try {
      setFinancialData(data);
      setSavedData(data);
      addError('Datos cargados exitosamente', 'info');
    } catch (error) {
      addError('Error al cargar los datos financieros', 'error');
    }
  }, [addError, setSavedData]);

  const renderContent = () => {
    if (!financialData) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <DataUploader onDataLoaded={handleDataLoaded} />
        </div>
      );
    }

    switch (activeTab) {
      case 'kpi':
        return <DashboardKPIs />;
      case 'pnl':
        return <PnlAnalysis />;
      case 'breakeven':
        return <BreakEvenAnalysis />;
      default:
        return <DashboardKPIs />;
    }
  };

  return (
    <ErrorBoundary>
      <style>{styles}</style>
      <DataProvider data={financialData}>
        <div className="app-container">
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="main-content">
            {renderContent()}
          </main>
          <ToastContainer errors={errors} onClose={removeError} />
        </div>
      </DataProvider>
    </ErrorBoundary>
  );
};

export default AppFallback;