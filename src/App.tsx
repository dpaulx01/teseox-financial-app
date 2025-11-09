import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FinancialData } from './types';
import { DataProvider } from './contexts/DataContext';
import { MixedCostProvider } from './contexts/MixedCostContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScenarioProvider, useScenario } from './contexts/ScenarioContext';
import { YearProvider, useYear } from './contexts/YearContext';
import { useErrorHandler } from './hooks/useErrorHandler';
import { useLocalStorage } from './hooks/useLocalStorage';
import { loadFinancialData } from './utils/financialStorage';
import Navigation from './components/layout/Navigation';
// Unificar flujo: usar Configuración para subida CSV por año
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import AnimatedBackground from './components/ui/AnimatedBackground';
import HomePage from './pages/HomePage';
import DashboardKPIs from './pages/DashboardKPIs';
import PnlAnalysis from './pages/PnlAnalysis';
// Lazy load para componentes grandes
const BreakEvenAnalysis = React.lazy(() => import('./pages/BreakEvenAnalysis'));
import DataConfiguration from './pages/DataConfiguration';
import OperationalAnalysis from './pages/OperationalAnalysis';
import ProductionDashboard from './pages/ProductionDashboard';
import SalesBIDashboard from './pages/SalesBIDashboard';
import PygContainer from './components/pyg/PygContainer';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import ScenarioManagement from './pages/ScenarioManagement';  
import SimulationBanner from './components/scenario/SimulationBanner';
import EditablePygMatrix from './components/pyg/EditablePygMatrix';
import EditablePygMatrixV2 from './components/pyg/EditablePygMatrixV2';
import BalanceInternoLayout from './components/scenario/BalanceInternoLayout';
import ScenarioDashboard from './components/scenario/ScenarioDashboard';
import BalanceAnalysis from './pages/BalanceAnalysis';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import YearSelector from './components/year/YearSelector';
import GlobalYearBar from './components/year/GlobalYearBar';
import { useYearParamSync } from './hooks/useYearParamSync';

// Flujo unificado: sin migraciones locales automáticas

// Componente interno que usa ScenarioContext
const MainAppContent: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [activeTab, setActiveTab] = useLocalStorage<string>('artyco-active-tab', 'home');
  const [savedData, setSavedData] = useLocalStorage<FinancialData | null>('artyco-financial-data', null);
  const { errors, addError, removeError } = useErrorHandler();
  
  // Usar contextos
  const { scenarioData, isSimulationMode, setActiveScenarioId } = useScenario();
  const { selectedYear, availableYears } = useYear();
  
  // Sincronizar año con URL
  useYearParamSync();

  // Cargar datos por año - REACTIVO AL CAMBIO DE AÑO
  useEffect(() => {
    const loadData = async () => {
      if (!selectedYear) return; // No cargar si no hay año seleccionado
      
      try {
        console.log(`🔄 App: Loading data for year ${selectedYear}`);
        const persistentData = await loadFinancialData(selectedYear);
        if (persistentData) {
          setFinancialData(persistentData);
          setSavedData(persistentData);
          // Solo mostrar mensaje de éxito si realmente hay datos válidos
          if (persistentData.monthly && Object.keys(persistentData.monthly).length > 0) {
            console.log(`✅ App: Financial data loaded for year ${selectedYear}`);
          }
        } else {
          // Si no hay datos para este año, limpiar el estado
          setFinancialData(null);
          setSavedData(null);
        }
      } catch (error) {
        // Solo logear errores críticos en modo desarrollo
        if (import.meta.env.DEV) {
          console.warn(`⚠️ App: Financial data not available for year ${selectedYear}`);
        }
        
        // Limpiar datos si hay error
        setFinancialData(null);
        setSavedData(null);
      }
    };

    loadData();
  }, [selectedYear]); // DEPENDENCIA ÚNICA para evitar bucles

  // Flujo unificado: la carga se hace desde Configuración vía CSVUploaderYearAware

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const renderContent = () => {
    // Home page doesn't require financial data
    if (activeTab === 'home') {
      return <HomePage onNavigate={setActiveTab} />;
    }

    // La configuración no requiere datos financieros
    if (activeTab === 'config') {
      return <DataConfiguration />;
    }

    // Status Producción, BI Ventas y Análisis operativo pueden funcionar sin datos financieros
    if (activeTab === 'status') {
      return <ProductionDashboard />;
    }

    if (activeTab === 'bi-ventas') {
      return <SalesBIDashboard />;
    }

    if (activeTab === 'operational') {
      return <OperationalAnalysis onNavigateToConfig={() => setActiveTab('config')} />;
    }

    const requiresFinancialData = !['home', 'status', 'operational', 'config', 'bi-ventas'].includes(activeTab);

    if (requiresFinancialData && !financialData) {
      // Sin datos: dirigir al flujo de Configuración (CSVUploaderYearAware)
      return <DataConfiguration />;
    }

    switch (activeTab) {
      case 'kpi':
        return <DashboardKPIs />;
      case 'pnl':
        return <PnlAnalysis />;
      case 'pyg':
        return isSimulationMode ? <EditablePygMatrixV2 /> : <PygContainer />;
      case 'balance':
        if (isSimulationMode) {
          // Usuario está en modo simulación, mostrar Balance Interno (matriz editable V2)
          return (
            <BalanceInternoLayout onExit={() => setActiveTab('balance')}>
              <EditablePygMatrixV2 />
            </BalanceInternoLayout>
          );
        } else {
          // Usuario no está en simulación, mostrar dashboard de escenarios
          return (
            <ScenarioDashboard 
              onEnterScenario={(scenarioId) => {
                setActiveScenarioId(scenarioId);
                // El tab permanece en 'balance', pero ahora isSimulationMode será true
              }}
            />
          );
        }
      case 'balance-general':
        return <BalanceAnalysis />;
      case 'breakeven':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-primary animate-pulse">Cargando análisis...</div></div>}>
            <BreakEvenAnalysis />
          </React.Suspense>
        );
      case 'operational':
        return <OperationalAnalysis onNavigateToConfig={() => setActiveTab('config')} />;
      case 'config':
        return <DataConfiguration />;
      case 'scenarios':
        return <ScenarioManagement />;
      case 'rbac':
        return <UserManagement />;
      default:
        return <DashboardKPIs />;
    }
  };

  // Add user info display
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // LÓGICA MULTI-AÑO: Mostrar selector de año si no hay ninguno seleccionado
  if (!selectedYear || availableYears.length === 0) {
    return (
      <YearSelector 
        onContinue={() => {
          if (selectedYear) {
            // El YearContext ya maneja la selección
            console.log('Year selected:', selectedYear);
          }
        }}
      />
    );
  }

  // Usar datos híbridos: escenario si está en simulación, sino datos reales
  const activeData = isSimulationMode ? scenarioData : financialData;

  // Renderizado para Balance Interno (modo simulación)
  if (isSimulationMode) {
    return (
      <ErrorBoundary>
        <DataProvider data={activeData}>
          <MixedCostProvider>
            <DashboardProvider>
              <BalanceInternoLayout onExit={() => setActiveTab('balance')}>
                <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto lg:ml-16 relative z-10">
                  {renderContent()}
                </main>
                <ToastContainer errors={errors} onClose={removeError} />
              </BalanceInternoLayout>
            </DashboardProvider>
          </MixedCostProvider>
        </DataProvider>
      </ErrorBoundary>
    );
  }

  // Renderizado normal del sistema
  return (
    <ErrorBoundary>
      <DataProvider data={activeData}>
        <MixedCostProvider>
          <DashboardProvider>
              <div className="flex h-screen bg-dark-bg font-sans text-text-primary relative overflow-hidden transition-colors duration-300">
              <AnimatedBackground />
              <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
              <main className="flex-1 p-4 lg:p-8 overflow-y-auto lg:ml-16 relative z-10 transition-all duration-500">
                {/* Header con selector global de año */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                  <GlobalYearBar />
                  <div className="glass-card px-4 py-2 rounded-xl border border-border/60 bg-dark-card/80">
                    <span className="text-sm text-text-muted">Usuario: </span>
                    <span className="text-sm font-semibold text-text-primary">{user.username || 'Unknown'}</span>
                    {user.is_superuser && (
                      <span className="ml-2 px-2 py-1 text-xs bg-purple/20 text-purple rounded-full border border-purple/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="cyber-button-sm bg-danger/20 hover:bg-danger/30 text-danger border-danger/40 hover:border-danger"
                  >
                    Cerrar Sesión
                  </button>
                </div>
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

// Componente principal que envuelve con providers  
const MainApp: React.FC = () => {
  return (
    <YearProvider>
      <ScenarioProvider>
        <MainAppContent />
      </ScenarioProvider>
    </YearProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
