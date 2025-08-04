import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, Settings, TrendingUp, Zap  } from 'lucide-react';

// Demo simplificado de Insight Bubbles para pruebas en Docker
const InsightDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  // Datos de prueba para los insights
  const demoInsights = [
    {
      id: 'demo-critical',
      type: 'critical' as const,
      title: 'EBITDA Crítico Detectado',
      message: 'EBITDA cayó 28% vs. promedio histórico. Posible impacto en costos operativos.',
      confidence: 0.92,
      category: 'anomaly' as const
    },
    {
      id: 'demo-warning',
      type: 'warning' as const,
      title: 'Margen de Seguridad Bajo',
      message: 'Margen de seguridad de 4.2%. Las ventas apenas superan el punto de equilibrio.',
      confidence: 0.85,
      category: 'performance' as const
    },
    {
      id: 'demo-info',
      type: 'info' as const,
      title: '3 Cuentas Mixtas Detectadas',
      message: 'Se identificaron cuentas semi-variables que podrían optimizarse.',
      confidence: 0.78,
      category: 'classification' as const
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          icon: 'text-red-400',
          bg: 'bg-red-500/20',
          border: 'border-red-500/50',
          glow: 'shadow-red-500/20'
        };
      case 'warning':
        return {
          icon: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/50',
          glow: 'shadow-yellow-500/20'
        };
      case 'info':
      default:
        return {
          icon: 'text-blue-400',
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/50',
          glow: 'shadow-blue-500/20'
        };
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Control de Demo */}
      <div className="hologram-card p-4 rounded-xl border border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display text-primary">
              🧠 Demo del Sistema de Insight Bubbles
            </h3>
            <p className="text-text-muted text-sm">
              Prueba las alertas inteligentes contextuales
            </p>
          </div>
          <button
            onClick={() => setShowDemo(!showDemo)}
            className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
              showDemo 
                ? 'border-accent bg-accent/20 text-accent' 
                : 'border-border hover:border-primary/50 text-text-secondary'
            }`}
          >
            {showDemo ? 'Ocultar Demo' : 'Mostrar Demo'}
          </button>
        </div>
      </div>

      {/* Panel de Insights Demo */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Métricas con Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {demoInsights.map((insight, index) => {
                const colors = getColorClass(insight.type);
                
                return (
                  <div key={insight.id} className="relative">
                    {/* Metric Card */}
                    <div className="hologram-card p-6 rounded-xl border border-border relative">
                      <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-primary mb-2">
                          ${(Math.random() * 100000).toFixed(0)}
                        </div>
                        <div className="text-sm text-text-muted">
                          {insight.category === 'anomaly' ? 'EBITDA' : 
                           insight.category === 'performance' ? 'Margen Seguridad' : 
                           'Cuentas Clasificadas'}
                        </div>
                      </div>

                      {/* Insight Bubble */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.2, type: "spring", damping: 15 }}
                        className="absolute -top-2 -right-2"
                      >
                        {/* Pulsing Background */}
                        <div className={`absolute inset-0 rounded-full ${colors.bg} animate-pulse`} />
                        
                        {/* Icon Container */}
                        <div className={`relative p-2 rounded-full ${colors.bg} ${colors.border} border shadow-lg ${colors.glow} cursor-pointer hover:scale-110 transition-transform duration-200 group`}>
                          <div className={colors.icon}>
                            {getIcon(insight.type)}
                          </div>
                        </div>

                        {/* Confidence Indicator */}
                        {insight.confidence < 0.8 && (
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        )}
                      </motion.div>
                    </div>

                    {/* Insight Details */}
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: index * 0.3 + 0.5 }}
                      className="mt-3 p-3 bg-glass rounded-lg border border-border/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                          <Settings className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display text-sm text-text-secondary font-bold mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-text-muted mb-2">
                            {insight.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-text-dim">
                              {(insight.confidence * 100).toFixed(0)}% confianza
                            </span>
                            <button className={`text-xs px-2 py-1 rounded ${colors.bg} ${colors.icon} hover:${colors.bg} transition-colors`}>
                              Ver Detalles
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Panel de Estado */}
            <div className="hologram-card p-4 rounded-xl border border-accent/30 bg-accent/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                  <Zap className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display text-accent font-bold">
                    ✨ Sistema de Insights Activo
                  </h4>
                  <p className="text-text-muted text-sm">
                    Detectados {demoInsights.length} insights basados en análisis IA • 
                    Confianza promedio: {((demoInsights.reduce((sum, i) => sum + i.confidence, 0) / demoInsights.length) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de Prueba */}
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-primary/20 border border-primary/50 rounded-lg text-primary hover:bg-primary/30 transition-colors text-sm">
                🎯 Simular Anomalía
              </button>
              <button className="px-4 py-2 bg-warning/20 border border-warning/50 rounded-lg text-warning hover:bg-warning/30 transition-colors text-sm">
                📊 Generar Tendencia
              </button>
              <button className="px-4 py-2 bg-info/20 border border-info/50 rounded-lg text-info hover:bg-info/30 transition-colors text-sm">
                🔄 Refrescar Insights
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InsightDemo;