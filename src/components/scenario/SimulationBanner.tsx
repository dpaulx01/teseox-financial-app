import React from 'react';
import { X, Share2, Copy, Save, Eye, BarChart3 } from 'lucide-react';
import { useScenario } from '../../contexts/ScenarioContext';
import { motion } from 'framer-motion';

const SimulationBanner: React.FC = () => {
  const { 
    scenarioMetadata, 
    exitSimulation, 
    duplicateScenario,
    isLoading 
  } = useScenario();

  if (!scenarioMetadata) return null;

  const handleDuplicate = async () => {
    try {
      await duplicateScenario(scenarioMetadata.id, `${scenarioMetadata.name} - Copia`);
    } catch (error) {
      console.error('Error duplicating scenario:', error);
    }
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/95 to-blue-900/95 backdrop-blur-lg border-b border-purple-500/30 shadow-hologram"
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Indicador animado */}
          <div className="flex items-center space-x-2">
            <div className="animate-pulse w-3 h-3 bg-purple-400 rounded-full"></div>
            <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full animation-delay-200"></div>
            <div className="animate-pulse w-2 h-2 bg-cyan-400 rounded-full animation-delay-400"></div>
          </div>
          
          {/* Información del escenario */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔬</span>
              <h3 className="text-white font-semibold text-lg">
                MODO SIMULACIÓN: {scenarioMetadata.name}
              </h3>
            </div>
            <div className="flex items-center space-x-4 text-purple-200 text-sm">
              <span>{scenarioMetadata.description || `Año base: ${scenarioMetadata.base_year}`}</span>
              <span>•</span>
              <span className="capitalize">{scenarioMetadata.category}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>Análisis en tiempo real</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Controles */}
        <div className="flex items-center space-x-2">
          {/* Información adicional */}
          <div className="hidden md:flex items-center space-x-4 text-purple-200 text-sm mr-4">
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span>Todos los gráficos usan datos simulados</span>
            </div>
          </div>

          {/* Botones de acción */}
          <button
            onClick={handleDuplicate}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white disabled:opacity-50"
            title="Duplicar escenario"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            title="Compartir escenario"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/20 mx-2" />
          
          {/* Botón salir */}
          <button
            onClick={exitSimulation}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 border border-red-500/30 hover:border-red-500/50"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Salir de Simulación</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>
      </div>

      {/* Efecto de brillo inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
      
      {/* Partículas flotantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-float"></div>
        <div className="absolute top-4 right-1/3 w-0.5 h-0.5 bg-blue-400/40 rounded-full animate-float animation-delay-1000"></div>
        <div className="absolute top-1 right-1/4 w-1 h-1 bg-cyan-400/20 rounded-full animate-float animation-delay-2000"></div>
      </div>

      <style jsx>{`
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
};

export default SimulationBanner;