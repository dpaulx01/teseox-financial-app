import React, { useState, useEffect } from 'react';
import { useScenario } from '../../contexts/ScenarioContext';
import { BookOpen, TrendingUp, Calculator, ChevronLeft } from 'lucide-react';

interface BalanceInternoLayoutProps {
  children: React.ReactNode;
  onExit: () => void;
}

const BalanceInternoLayout: React.FC<BalanceInternoLayoutProps> = ({ children, onExit }) => {
  const { scenarioMetadata, exitSimulation } = useScenario();
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    // Animación de entrada completada después de 800ms
    const timer = setTimeout(() => setIsEntering(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleExit = () => {
    exitSimulation();
    onExit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 relative overflow-hidden">
      {/* Fondo con patrón de libro contable */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Animación de entrada simple */}
      {isEntering && (
        <div className="absolute inset-0 bg-dark-bg z-50 shadow-2xl animate-pulse">
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <BookOpen className="w-24 h-24 mx-auto mb-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-display mb-2">Cargando Balance Interno</h2>
              <p className="text-text-secondary">Preparando entorno extracontable...</p>
            </div>
          </div>
        </div>
      )}

      {/* Header del Balance Interno */}
      <header 
        className="relative z-40 bg-gradient-to-r from-purple-800/80 to-blue-800/80 backdrop-blur-xl border-b border-purple-500/30 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 px-4 py-2 bg-dark-surface/50 hover:bg-dark-surface/80 
                        rounded-lg transition-colors text-text-secondary hover:text-white border border-border/50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Volver al Sistema</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <BookOpen className="w-8 h-8 text-purple-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-display text-white">Balance Interno</h1>
                <p className="text-sm text-purple-200">
                  Entorno Extracontable • {scenarioMetadata?.name || 'Sin escenario'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-purple-200">Datos de Simulación</span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-200">Proyecciones Activas</span>
            </div>
          </div>
        </div>

        {/* Línea decorativa inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
      </header>

      {/* Contenido principal */}
      <main 
        className="relative z-10 p-6"
      >
        {children}
      </main>

      {/* Indicadores visuales en las esquinas */}
      <div className="fixed top-4 left-4 z-30">
        <div className="flex items-center space-x-2 px-3 py-2 bg-dark-surface/80 backdrop-blur-sm rounded-lg border border-purple-500/30">
          <Calculator className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-purple-200">Balance Extracontable</span>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-30">
        <div className="text-xs text-purple-300/70 bg-dark-surface/60 px-3 py-2 rounded-lg backdrop-blur-sm">
          Los cambios aquí no afectan la contabilidad oficial
        </div>
      </div>
    </div>
  );
};

export default BalanceInternoLayout;