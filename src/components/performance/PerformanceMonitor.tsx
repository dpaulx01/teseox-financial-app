// Performance Monitor Widget - Real-time performance tracking
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye,
  EyeOff
 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { useMemoryMonitor, usePerformanceMonitor } from '../../utils/performanceOptimization';

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  memoryUsage: number;
  memoryPercentage: number;
  timestamp: number;
  fps: number;
  warnings: string[];
}

interface PerformanceMonitorProps {
  maxDataPoints?: number;
  warningThresholds?: {
    renderTime: number;
    memoryPercentage: number;
    fps: number;
  };
  className?: string;
  isVisible?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  maxDataPoints = 50,
  warningThresholds = {
    renderTime: 16, // ms - more than 1 frame at 60fps
    memoryPercentage: 80, // %
    fps: 30 // minimum acceptable fps
  },
  className = '',
  isVisible = true
}) => {
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fpsCounter, setFpsCounter] = useState({ frames: 0, lastTime: 0, fps: 60 });

  // Monitor memory usage
  const memoryUsage = useMemoryMonitor(1000);
  
  // Monitor component performance
  const { getRenderCount } = usePerformanceMonitor('PerformanceMonitor');

  // FPS calculation using RAF with throttling
  useEffect(() => {
    let animationId: number;
    let frameCount = 0;
    let lastTime = performance.now ? performance.now() : Date.now();
    let fps = 60;
    
    const calculateFPS = (timestamp: number) => {
      frameCount++;
      
      // Only update FPS every 30 frames to prevent excessive state updates
      if (frameCount >= 30) {
        const delta = timestamp - lastTime;
        const calculatedFps = Math.round((frameCount * 1000) / delta);
        
        setFpsCounter(prev => ({
          frames: 0,
          lastTime: timestamp,
          fps: calculatedFps
        }));
        
        frameCount = 0;
        lastTime = timestamp;
        fps = calculatedFps;
      }
      
      animationId = requestAnimationFrame(calculateFPS);
    };
    
    animationId = requestAnimationFrame(calculateFPS);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Collect performance metrics with throttling
  useEffect(() => {
    const collectMetrics = () => {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const warnings: string[] = [];
      
      // Mock render time calculation (in real app, this would come from actual measurements)
      const renderTime = Math.random() * 30; // Random for demo
      
      if (renderTime > warningThresholds.renderTime) {
        warnings.push(`Render lento: ${renderTime.toFixed(1)}ms`);
      }
      
      if (memoryUsage && memoryUsage.percentage > warningThresholds.memoryPercentage) {
        warnings.push(`Memoria alta: ${memoryUsage.percentage.toFixed(1)}%`);
      }
      
      if (fpsCounter.fps < warningThresholds.fps) {
        warnings.push(`FPS bajo: ${fpsCounter.fps}`);
      }

      const metrics: PerformanceMetrics = {
        renderTime,
        renderCount: getRenderCount(),
        memoryUsage: memoryUsage?.used || 0,
        memoryPercentage: memoryUsage?.percentage || 0,
        timestamp: now,
        fps: fpsCounter.fps,
        warnings
      };

      setMetricsHistory(prev => {
        const newHistory = [...prev, metrics];
        return newHistory.slice(-maxDataPoints);
      });
    };

    // Increase interval to reduce frequency and memory pressure
    const interval = setInterval(collectMetrics, 2000);
    return () => clearInterval(interval);
  }, [memoryUsage?.percentage, fpsCounter.fps, getRenderCount, maxDataPoints, warningThresholds]);

  // Current metrics
  const currentMetrics = metricsHistory[metricsHistory.length - 1];
  
  // Chart data for performance trends
  const chartData = useMemo(() => {
    const labels = metricsHistory.map((_, index) => `T-${metricsHistory.length - 1 - index}`).reverse();
    
    return {
      labels,
      datasets: [
        {
          label: 'Render Time (ms)',
          data: metricsHistory.map(m => m.renderTime),
          borderColor: 'rgba(0, 240, 255, 0.8)',
          backgroundColor: 'rgba(0, 240, 255, 0.1)',
          yAxisID: 'y',
          tension: 0.4
        },
        {
          label: 'Memory (%)',
          data: metricsHistory.map(m => m.memoryPercentage),
          borderColor: 'rgba(255, 0, 128, 0.8)',
          backgroundColor: 'rgba(255, 0, 128, 0.1)',
          yAxisID: 'y1',
          tension: 0.4
        },
        {
          label: 'FPS',
          data: metricsHistory.map(m => m.fps),
          borderColor: 'rgba(0, 255, 153, 0.8)',
          backgroundColor: 'rgba(0, 255, 153, 0.1)',
          yAxisID: 'y2',
          tension: 0.4
        }
      ]
    };
  }, [metricsHistory]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#8B9DC3',
          font: { size: 10 }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#8B9DC3',
          font: { size: 10 }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          color: '#00F0FF',
          font: { size: 10 }
        },
        grid: { color: 'rgba(0, 240, 255, 0.1)' }
      },
      y1: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        max: 100,
        grid: { drawOnChartArea: false }
      },
      y2: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        min: 0,
        max: 120,
        grid: { drawOnChartArea: false }
      }
    }
  };

  // Performance status
  const getPerformanceStatus = () => {
    if (!currentMetrics) return { status: 'unknown', color: 'text-gray-400' };
    
    const hasWarnings = currentMetrics.warnings.length > 0;
    const criticalIssues = currentMetrics.warnings.filter(w => 
      w.includes('Render lento') || w.includes('Memoria alta')
    ).length > 0;
    
    if (criticalIssues) {
      return { status: 'critical', color: 'text-red-400' };
    } else if (hasWarnings) {
      return { status: 'warning', color: 'text-yellow-400' };
    } else {
      return { status: 'good', color: 'text-green-400' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed bottom-4 right-4 z-50 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <motion.button
          onClick={() => setIsExpanded(true)}
          className="glass-card p-3 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-2">
            <Settings className={`h-5 w-5 ${performanceStatus.color}`} />
            <div className="text-sm">
              <div className={`font-medium ${performanceStatus.color}`}>
                {currentMetrics?.fps || 0} FPS
              </div>
              <div className="text-xs text-gray-400">
                {currentMetrics?.memoryPercentage.toFixed(0) || 0}% RAM
              </div>
            </div>
            {currentMetrics?.warnings.length > 0 && (
              <motion.div
                className="w-2 h-2 bg-red-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </div>
        </motion.button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <motion.div
          className="glass-card p-4 rounded-lg border border-purple-500/30 w-96"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-white">Monitor de Rendimiento</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>

          {/* Current Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-slate-800/30 rounded">
              <div className={`text-lg font-bold ${performanceStatus.color}`}>
                {currentMetrics?.fps || 0}
              </div>
              <div className="text-xs text-gray-400">FPS</div>
            </div>
            <div className="text-center p-2 bg-slate-800/30 rounded">
              <div className="text-lg font-bold text-purple-400">
                {currentMetrics?.renderTime.toFixed(1) || 0}
              </div>
              <div className="text-xs text-gray-400">Render (ms)</div>
            </div>
            <div className="text-center p-2 bg-slate-800/30 rounded">
              <div className={`text-lg font-bold ${
                (currentMetrics?.memoryPercentage || 0) > warningThresholds.memoryPercentage 
                  ? 'text-red-400' 
                  : 'text-blue-400'
              }`}>
                {currentMetrics?.memoryPercentage.toFixed(0) || 0}%
              </div>
              <div className="text-xs text-gray-400">Memoria</div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="h-32 mb-4">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Warnings */}
          {currentMetrics?.warnings.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-yellow-400 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Alertas de Rendimiento
              </h4>
              {currentMetrics.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* Performance Tips */}
          <div className="border-t border-gray-700 pt-3">
            <h4 className="text-sm font-medium text-purple-400 mb-2">
              Consejos de Optimización
            </h4>
            <div className="space-y-1 text-xs text-gray-400">
              {currentMetrics?.renderTime > warningThresholds.renderTime && (
                <div>• Activar virtualización en tablas grandes</div>
              )}
              {currentMetrics?.memoryPercentage > warningThresholds.memoryPercentage && (
                <div>• Reducir datos en memoria o aplicar filtros</div>
              )}
              {currentMetrics?.fps < warningThresholds.fps && (
                <div>• Desactivar animaciones innecesarias</div>
              )}
              {currentMetrics?.warnings.length === 0 && (
                <div className="text-green-400">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Rendimiento óptimo
                </div>
              )}
            </div>
          </div>

          {/* Performance Score */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Puntuación de Rendimiento</span>
              <div className="flex items-center space-x-2">
                <div className={`text-lg font-bold ${performanceStatus.color}`}>
                  {calculatePerformanceScore(currentMetrics, warningThresholds)}
                </div>
                <div className="text-xs text-gray-400">/100</div>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
              <motion.div
                className={`h-2 rounded-full ${
                  performanceStatus.status === 'good' ? 'bg-green-400' :
                  performanceStatus.status === 'warning' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${calculatePerformanceScore(currentMetrics, warningThresholds)}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Calculate performance score out of 100
const calculatePerformanceScore = (
  metrics: PerformanceMetrics | undefined,
  thresholds: { renderTime: number; memoryPercentage: number; fps: number }
): number => {
  if (!metrics) return 0;

  let score = 100;

  // FPS score (30% weight)
  const fpsScore = Math.min(100, (metrics.fps / 60) * 100);
  score = score * 0.7 + fpsScore * 0.3;

  // Render time penalty (25% weight)
  if (metrics.renderTime > thresholds.renderTime) {
    const renderPenalty = Math.min(50, (metrics.renderTime - thresholds.renderTime) * 2);
    score -= renderPenalty * 0.25;
  }

  // Memory usage penalty (25% weight)
  if (metrics.memoryPercentage > thresholds.memoryPercentage) {
    const memoryPenalty = Math.min(50, metrics.memoryPercentage - thresholds.memoryPercentage);
    score -= memoryPenalty * 0.25;
  }

  // Warning penalty (20% weight)
  const warningPenalty = metrics.warnings.length * 10;
  score -= warningPenalty * 0.2;

  return Math.max(0, Math.round(score));
};

export default PerformanceMonitor;