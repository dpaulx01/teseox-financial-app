import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartConfiguration,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WaterfallData {
  name: string;
  value: number;
  isTotal?: boolean;
  color?: string;
}

interface EbitdaDetails {
  totalExcluido: number;
  cuentasDetalle: string;
}

interface WaterfallChartProps {
  data: WaterfallData[];
  title: string;
  className?: string;
  view?: 'contable' | 'ebitda';
  ebitdaDetails?: EbitdaDetails;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  data,
  title,
  className = '',
  view = 'contable',
  ebitdaDetails
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  // Process data for waterfall effect
  const processedData = data.reduce((acc, item, index) => {
    const prevTotal = index > 0 ? acc[index - 1].runningTotal : 0;
    const isNegative = item.value < 0;
    const absoluteValue = Math.abs(item.value);
    
    if (item.isTotal) {
      // For totals, show from 0 to total value
      acc.push({
        ...item,
        stackBase: 0,
        stackValue: item.value,
        runningTotal: item.value,
        isNegative: item.value < 0
      });
    } else {
      // For regular items, stack from previous total
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

  const chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 20
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 37, 0.95)',
        titleColor: '#00F0FF',
        bodyColor: '#E0E7FF',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        position: 'nearest',
        callbacks: {
          title: (context) => {
            return context[0].label;
          },
          label: (context) => {
            const value = data[context.dataIndex].value;
            const label = context.label;
            
            // Basic info for all tooltips
            const lines = [`Valor: $${value.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`];
            
            // Add description
            const description = {
              'Ingresos': '📊 Ingresos totales del período',
              'Costos Variables': '📊 Costos que varían con la producción',
              'Costos Fijos (sin depr.)': '📊 Costos fijos excluyendo depreciación',
              'Ahorro por Depreciación': '📊 Beneficio por exclusión de depreciación',
              'Costo Ventas': '📊 Costos directos de ventas y producción',
              'Gastos Oper.': '📊 Gastos administrativos y de ventas',
              'Utilidad/Pérdida Neta': '📊 Resultado neto después de todos los gastos',
              'EBITDA': '📊 Utilidad antes de intereses, impuestos, depreciación y amortización'
            }[label];
            
            if (description) {
              lines.push(description);
            }
            
            // Special content for EBITDA
            if (view === 'ebitda' && label === 'EBITDA' && ebitdaDetails) {
              lines.push('');
              lines.push('🔬 ANÁLISIS DETALLADO EBITDA:');
              lines.push(`💰 Total Excluido: $${ebitdaDetails.totalExcluido.toLocaleString('es-EC')}`);
              lines.push('');
              lines.push('📊 Principales Cuentas Excluidas:');
              
              // Add first few accounts with proper character cleaning
              const accounts = ebitdaDetails.cuentasDetalle.split('\n').slice(0, 6);
              accounts.forEach(account => {
                if (account.trim()) {
                  // Limpiar caracteres especiales en el tooltip
                  const cleanAccount = account
                    .replace(/\uFFFD/g, 'ñ')
                    .replace(/\uFFFDn/g, 'ón')
                    .replace(/\uFFFD/g, 'í')
                    .replace(/\uFFFD/g, 'á')
                    .replace(/\uFFFD/g, 'é')
                    .replace(/\uFFFD/g, 'ó')
                    .replace(/\uFFFD/g, 'ú');
                  lines.push(`  • ${cleanAccount.trim()}`);
                }
              });
              
              if (ebitdaDetails.cuentasDetalle.split('\n').length > 6) {
                lines.push('  • ... y más cuentas');
              }
            }
            
            return lines;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#8B9DC3',
          font: {
            family: 'Orbitron',
            size: 12
          }
        },
        border: {
          color: 'rgba(0, 240, 255, 0.3)'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#8B9DC3',
          font: {
            family: 'Roboto Mono',
            size: 11
          },
          callback: (value) => {
            return `$${(value as number / 1000).toFixed(0)}k`;
          }
        },
        border: {
          color: 'rgba(0, 240, 255, 0.3)'
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
      onComplete: () => {
        // Add glow effect when animation completes
        if (chartRef.current) {
          const canvas = chartRef.current.canvas;
          canvas.style.filter = 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.3))';
        }
      }
    },
    onHover: (event, elements) => {
      if (chartRef.current?.canvas) {
        chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  const chartData = {
    labels: processedData.map(d => d.name),
    datasets: [
      // Invisible base bars for stacking
      {
        label: 'Base',
        data: processedData.map(d => d.stackBase || 0),
        backgroundColor: 'transparent',
        borderWidth: 0,
        barThickness: 60,
      },
      // Visible value bars
      {
        label: 'Valores',
        data: processedData.map(d => d.stackValue || Math.abs(d.value)),
        backgroundColor: processedData.map(d => {
          if (d.isTotal) {
            return d.isNegative
              ? 'rgba(255, 0, 128, 0.9)' // danger
              : 'rgba(0, 240, 255, 0.9)'; // primary
          }
          return d.isNegative
            ? 'rgba(255, 0, 128, 0.8)' // danger
            : 'rgba(0, 255, 153, 0.8)'; // accent
        }),
        borderColor: processedData.map(d => {
          if (d.isTotal) return '#00F0FF'; // primary
          return d.isNegative ? '#FF0080' : '#00FF99'; // danger : accent
        }),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 60,
      }
    ]
  };

  // Custom gradient creation
  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current;
      const ctx = chart.ctx;
      
      // Update bar colors with gradients
      chart.data.datasets[1].backgroundColor = processedData.map((d, index) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        
        if (d.isTotal) {
          if (d.isNegative) {
            gradient.addColorStop(0, 'rgba(255, 0, 128, 0.9)'); // danger
            gradient.addColorStop(1, 'rgba(255, 0, 128, 0.6)'); // danger
          } else {
            gradient.addColorStop(0, 'rgba(0, 240, 255, 0.9)'); // primary
            gradient.addColorStop(1, 'rgba(0, 240, 255, 0.6)'); // primary
          }
        } else {
          if (d.isNegative) {
            gradient.addColorStop(0, 'rgba(255, 0, 128, 0.8)'); // danger
            gradient.addColorStop(1, 'rgba(255, 0, 128, 0.4)'); // danger
          }
          else {
            gradient.addColorStop(0, 'rgba(0, 255, 153, 0.8)'); // accent
            gradient.addColorStop(1, 'rgba(0, 255, 153, 0.4)'); // accent
          }
        }
        
        return gradient;
      });
      
      chart.update('none');
    }
  }, [processedData]);

  return (
    <motion.div
      className={`hologram-card p-6 rounded-2xl shadow-hologram hover:shadow-glow-xl transition-all duration-500 relative overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-hologram" />
      
      {/* Scan line effect */}
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
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display text-primary text-glow">
            {title}
          </h3>
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
            <span>ANÁLISIS ACTIVO</span>
          </div>
        </div>
        
        <div className="h-96 relative">
          <Bar
            ref={chartRef}
            data={chartData}
            options={chartOptions}
          />
        </div>
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6 text-sm font-mono">
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
        </div>
      </div>
    </motion.div>
  );
};

export default WaterfallChart;
