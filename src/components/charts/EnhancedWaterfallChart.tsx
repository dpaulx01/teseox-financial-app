// Enhanced Waterfall Chart with advanced interactivity
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartConfiguration,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Expand,
  ChevronDown,
  Info,
  BarChart3
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface WaterfallData {
  name: string;
  value: number;
  isTotal?: boolean;
  color?: string;
  drillDownData?: DrillDownItem[];
  metadata?: Record<string, any>;
}

interface DrillDownItem {
  name: string;
  value: number;
  percentage?: number;
  description?: string;
}

interface EnhancedWaterfallChartProps {
  data: WaterfallData[];
  title: string;
  className?: string;
  view?: 'contable' | 'ebitda' | 'operativo' | 'caja';
  onBarClick?: (index: number, item: WaterfallData) => void;
  enableDrillDown?: boolean;
  enableZoom?: boolean;
  showComparison?: boolean;
  comparisonData?: WaterfallData[];
  height?: number;
}

const EnhancedWaterfallChart: React.FC<EnhancedWaterfallChartProps> = ({
  data,
  title,
  className = '',
  view = 'contable',
  onBarClick,
  enableDrillDown = true,
  enableZoom = true,
  showComparison = false,
  comparisonData,
  height = 400
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [drillDownVisible, setDrillDownVisible] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState<any>(null);

  // Process data for waterfall effect
  const processedData = data.reduce((acc, item, index) => {
    const prevTotal = index > 0 ? acc[index - 1].runningTotal : 0;
    const isNegative = item.value < 0;
    const absoluteValue = Math.abs(item.value);
    
    if (item.isTotal) {
      acc.push({
        ...item,
        stackBase: 0,
        stackValue: item.value,
        runningTotal: item.value,
        isNegative: item.value < 0
      });
    } else {
      const newTotal = prevTotal + item.value;
      acc.push({
        ...item,
        stackBase: isNegative ? newTotal : prevTotal,
        stackValue: absoluteValue,
        runningTotal: newTotal,
        isNegative
      });
    }
    
    return acc;
  }, [] as any[]);

  // Enhanced tooltip content
  const generateTooltipContent = useCallback((context: TooltipItem<'bar'>) => {
    const dataIndex = context.dataIndex;
    const item = data[dataIndex];
    const processedItem = processedData[dataIndex];
    
    return {
      title: item.name,
      value: item.value,
      formattedValue: new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(item.value),
      percentage: processedData[0]?.runningTotal ? 
        ((Math.abs(item.value) / Math.abs(processedData[0].runningTotal)) * 100).toFixed(1) : 0,
      runningTotal: processedItem.runningTotal,
      isTotal: item.isTotal,
      isNegative: item.value < 0,
      description: getItemDescription(item.name, view),
      drillDownData: item.drillDownData,
      metadata: item.metadata
    };
  }, [data, processedData, view]);

  const getItemDescription = (itemName: string, viewType: string) => {
    const descriptions = {
      'Ingresos': {
        contable: 'Ingresos totales registrados según principios contables',
        operativo: 'Ingresos de las actividades principales del negocio',
        caja: 'Efectivo recibido por ventas y servicios',
        ebitda: 'Ingresos antes de ajustes no monetarios'
      },
      'Costos': {
        contable: 'Todos los costos y gastos del período',
        operativo: 'Costos directamente relacionados con operaciones',
        caja: 'Desembolsos de efectivo por costos',
        ebitda: 'Costos excluyendo depreciación y amortización'
      },
      'Utilidad': {
        contable: 'Resultado neto según NIIF/GAAP',
        operativo: 'Utilidad de las operaciones principales',
        caja: 'Flujo de caja operativo neto',
        ebitda: 'Utilidad antes de intereses, impuestos, depreciación y amortización'
      }
    };
    
    const baseKey = itemName.includes('Ingreso') ? 'Ingresos' :
                   itemName.includes('Costo') || itemName.includes('Gasto') ? 'Costos' :
                   'Utilidad';
    
    return descriptions[baseKey]?.[viewType] || 'Componente del análisis financiero';
  };

  // Chart options with enhanced interactivity
  const chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, bottom: 20 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false, // We'll use custom tooltip
        external: (context) => {
          const tooltip = context.tooltip;
          if (tooltip.opacity === 0) {
            setTooltipVisible(false);
            return;
          }

          if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
            const content = generateTooltipContent(tooltip.dataPoints[0]);
            setTooltipContent(content);
            setTooltipPosition({
              x: tooltip.caretX,
              y: tooltip.caretY
            });
            setTooltipVisible(true);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#8B9DC3',
          font: { family: 'Orbitron', size: 12 }
        },
        border: { color: 'rgba(0, 240, 255, 0.3)' }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#8B9DC3',
          font: { family: 'Roboto Mono', size: 11 },
          callback: (value) => {
            return new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              notation: 'compact'
            }).format(value as number);
          }
        },
        border: { color: 'rgba(0, 240, 255, 0.3)' }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    },
    onHover: (event, elements) => {
      if (chartRef.current?.canvas) {
        chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const item = data[index];
        setSelectedBar(index);
        
        if (enableDrillDown && item.drillDownData) {
          setDrillDownVisible(true);
        }
        
        if (onBarClick) {
          onBarClick(index, item);
        }
      }
    }
  };

  // Chart data with comparison support
  const chartData = {
    labels: processedData.map(d => d.name),
    datasets: [
      // Base bars (invisible)
      {
        label: 'Base',
        data: processedData.map(d => d.stackBase || 0),
        backgroundColor: 'transparent',
        borderWidth: 0,
        barThickness: 60,
      },
      // Main values
      {
        label: 'Valores',
        data: processedData.map(d => d.stackValue || Math.abs(d.value)),
        backgroundColor: processedData.map((d, index) => {
          const alpha = selectedBar === index ? 1 : 0.8;
          if (d.isTotal) {
            return d.isNegative
              ? `rgba(255, 0, 128, ${alpha})`
              : `rgba(0, 240, 255, ${alpha})`;
          }
          return d.isNegative
            ? `rgba(255, 0, 128, ${alpha})`
            : `rgba(0, 255, 153, ${alpha})`;
        }),
        borderColor: processedData.map(d => {
          if (d.isTotal) return '#00F0FF';
          return d.isNegative ? '#FF0080' : '#00FF99';
        }),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 60,
      },
      // Comparison data (if enabled)
      ...(showComparison && comparisonData ? [{
        label: 'Comparación',
        data: comparisonData.map(d => Math.abs(d.value)),
        backgroundColor: 'rgba(156, 163, 175, 0.5)',
        borderColor: 'rgba(156, 163, 175, 0.8)',
        borderWidth: 1,
        barThickness: 30,
      }] : [])
    ]
  };

  // Custom tooltip component
  const CustomTooltip = () => (
    <AnimatePresence>
      {tooltipVisible && tooltipContent && (
        <motion.div
          className="absolute z-50 bg-slate-900/95 backdrop-blur-md rounded-lg border border-purple-500/30 shadow-glow-lg p-4 max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-400">{tooltipContent.title}</h4>
              <div className={`w-3 h-3 rounded-full ${
                tooltipContent.isNegative ? 'bg-red-400' : 'bg-green-400'
              }`} />
            </div>
            
            {/* Value */}
            <div className="text-2xl font-bold neon-text">
              {tooltipContent.formattedValue}
            </div>
            
            {/* Percentage */}
            <div className="text-sm text-gray-400">
              {tooltipContent.percentage}% del total
            </div>
            
            {/* Description */}
            <div className="text-xs text-gray-300 border-t border-gray-700 pt-2">
              {tooltipContent.description}
            </div>
            
            {/* Running Total */}
            {!tooltipContent.isTotal && (
              <div className="text-xs text-purple-300">
                Total acumulado: {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0
                }).format(tooltipContent.runningTotal)}
              </div>
            )}
            
            {/* Drill-down indicator */}
            {tooltipContent.drillDownData && (
              <div className="flex items-center text-xs text-blue-400 border-t border-gray-700 pt-2">
                <ChevronDown className="h-4 w-4 mr-1" />
                Click para ver detalles ({tooltipContent.drillDownData.length} items)
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Drill-down modal
  const DrillDownModal = () => (
    <AnimatePresence>
      {drillDownVisible && selectedBar !== null && data[selectedBar]?.drillDownData && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDrillDownVisible(false)}
        >
          <motion.div
            className="glass-card p-6 rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold neon-text">
                Detalle: {data[selectedBar]?.name}
              </h3>
              <button
                onClick={() => setDrillDownVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {data[selectedBar]?.drillDownData?.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-400">{item.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-400">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                      }).format(item.value)}
                    </div>
                    {item.percentage && (
                      <div className="text-xs text-gray-400">
                        {item.percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      className={`hologram-card p-6 rounded-2xl shadow-hologram hover:shadow-glow-xl transition-all duration-500 relative overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <BarChart3 className="h-6 w-6 text-purple-400" />
          <h3 className="text-2xl font-display text-primary text-glow">
            {title}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Zoom toggle */}
          {enableZoom && (
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className={`p-2 rounded-lg border transition-all duration-300 ${
                isZoomed 
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                  : 'border-gray-600 text-gray-400 hover:border-blue-400'
              }`}
              title="Zoom"
            >
              <Expand className="h-4 w-4" />
            </button>
          )}
          
          {/* Info button */}
          <button
            className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:border-purple-400 hover:text-purple-400 transition-all duration-300"
            title="Información del gráfico"
          >
            <Info className="h-4 w-4" />
          </button>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2 text-xs font-mono text-text-dim">
            <motion.div
              className="w-3 h-3 bg-primary rounded-full"
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
            <span>ANÁLISIS INTERACTIVO</span>
          </div>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        className={`relative transition-all duration-300 ${
          isZoomed ? 'h-[600px]' : `h-[${height}px]`
        }`}
      >
        <Bar ref={chartRef} data={chartData} options={chartOptions} />
        
        {/* Custom Tooltip */}
        <CustomTooltip />
      </div>
      
      {/* Enhanced Legend */}
      <div className="flex justify-center mt-6 space-x-6 text-sm font-mono">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-accent to-accent/60 rounded border border-accent/50"></div>
          <span className="text-text-secondary">Ingresos/Positivos</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-danger to-danger/60 rounded border border-danger/50"></div>
          <span className="text-text-secondary">Costos/Negativos</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-primary to-primary/60 rounded border border-primary/50"></div>
          <span className="text-text-secondary">Resultado Final</span>
        </div>
        {showComparison && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-400/60 rounded border border-gray-400/50"></div>
            <span className="text-text-secondary">Comparación</span>
          </div>
        )}
      </div>
      
      {/* Drill-down Modal */}
      <DrillDownModal />
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-hologram" />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
          ease: "linear"
        }}
      />
    </motion.div>
  );
};

export default EnhancedWaterfallChart;