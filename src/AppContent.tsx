import React from 'react';
import { useFinancialData } from './contexts/DataContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useErrorHandler } from './hooks/useErrorHandler';
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

const AppContent: React.FC = () => {
  const { financialData } = useFinancialData();
  const [activeTab, setActiveTab] = useLocalStorage<string>('artyco-active-tab', 'kpi');
  const { errors, addError, removeError } = useErrorHandler();

  const renderContent = () => {
    if (activeTab === 'config') {
      return <DataConfiguration />;
    }

    if (activeTab === 'operational') {
      return <OperationalAnalysis />;
    }

    if (!financialData) {
      return (
        <div className="flex items-center justify-center h-full">
          <DataUploader />
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
      <div className="flex h-screen bg-dark-bg font-sans text-text-secondary relative overflow-hidden">
        <AnimatedBackground />
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto lg:ml-0 relative z-10">
          {renderContent()}
        </main>
        <ToastContainer errors={errors} onClose={removeError} />
      </div>
    </ErrorBoundary>
  );
};

export default AppContent;