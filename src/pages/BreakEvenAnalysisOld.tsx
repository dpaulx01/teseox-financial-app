import React, { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
import { useFinancialData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/formatters';
import { SimulatedData } from '../types';
import { Target, TrendingUp, DollarSign, Activity, Zap, BarChart3 } from 'lucide-react';
import AccountClassificationPanel from '../components/breakeven/AccountClassificationPanel';

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  icon?: React.ReactNode;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  icon
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;
  
  const handleChange = (newValue: number) => {
    setIsAnimating(true);
    onChange(newValue);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="hologram-card p-6 rounded-xl border border-border relative overflow-hidden group hover:shadow-glow-lg transition-all duration-500">
      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && <div className="text-primary">{icon}</div>}
            <label className="text-sm font-display text-text-secondary uppercase tracking-wider">
              {label}
            </label>
          </div>
          <div className={`text-xl font-mono data-display transition-all duration-300 ${isAnimating ? 'scale-110 text-glow-strong' : ''}`}>
            {unit === '%' ? `${value}%` : unit === '$' ? formatCurrency(value) : value}{unit && unit !== '%' && unit !== '$' ? ` ${unit}` : ''}
          </div>
        </div>
        
        {/* Custom slider with holographic track */}
        <div className="relative">
          <div className="h-3 bg-glass rounded-full border border-border-muted relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300 relative"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
          />
          
          {/* Slider thumb */}
          <div 
            className="absolute top-1/2 w-6 h-6 -mt-3 bg-gradient-to-br from-primary to-accent rounded-full border-2 border-white shadow-glow-lg transition-all duration-300 hover:scale-125 cursor-pointer"
            style={{ left: `calc(${percentage}% - 12px)` }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse" />
          </div>
        </div>
        
        {/* Value indicators */}
        <div className="flex justify-between mt-2 text-xs text-text-dim font-mono">
          <span>{unit === '$' ? formatCurrency(min) : min}</span>
          <span>{unit === '$' ? formatCurrency(max) : max}</span>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'accent' | 'danger';
  subtitle?: string;
  isAnimated?: boolean;
}> = ({ title, value, icon, color, subtitle, isAnimated = false }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (isAnimated) {
      const interval = setInterval(() => {
        setDisplayValue(prev => {
          const diff = value - prev;
          if (Math.abs(diff) < 1) {
            clearInterval(interval);
            return value;
          }
          return prev + diff * 0.1;
        });
      }, 16);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [value, isAnimated]);

  const colorClasses = {
    primary: 'text-primary shadow-glow-md border-primary/30',
    accent: 'text-accent shadow-glow-accent border-accent/30',
    danger: 'text-danger shadow-glow-danger border-danger/30'
  };

  return (
    <div className={`hologram-card p-6 rounded-xl border-2 ${colorClasses[color]} relative overflow-hidden group hover:scale-105 transition-all duration-500`}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-3 rounded-lg bg-glass border border-border ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="text-right">
            <div className="text-sm font-display text-text-muted uppercase tracking-wider">
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-text-dim font-mono">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        
        <div className={`text-3xl font-mono font-bold ${colorClasses[color]} transition-all duration-300`}>
          {formatCurrency(displayValue)}
        </div>
      </div>
    </div>
  );
};

const BreakEvenAnalysis: React.FC = () => {
  const { data } = useFinancialData();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [priceChange, setPriceChange] = useState<number>(0);
  const [fixedCostChange, setFixedCostChange] = useState<number>(0);
  const [variableCostRateChange, setVariableCostRateChange] = useState<number>(0);
  const [isAnimated, setIsAnimated] = useState(false);
  const [customClassifications, setCustomClassifications] = useState<Record<string, string>>({});
  const [useCustomClassifications, setUseCustomClassifications] = useState(false);

  // Cargar clasificaciones guardadas
  React.useEffect(() => {
    const saved = localStorage.getItem('artyco-breakeven-classifications');
    if (saved) {
      try {
        const parsedClassifications = JSON.parse(saved);
        const hasRealCustomizations = Object.keys(parsedClassifications).length > 0;
        if (hasRealCustomizations) {
          setCustomClassifications(parsedClassifications);
          setUseCustomClassifications(true);
        }
      } catch (error) {
        // console.error('Error parsing saved classifications:', error);
        localStorage.removeItem('artyco-breakeven-classifications');
      }
    }
  }, []);

  // Helper function to parse numeric values
  const parseNumericValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and whitespace
      const cleaned = value.replace(/[$\s]/g, '');
      // Replace comma with dot for European format
      const normalized = cleaned.replace(',', '.');
      return parseFloat(normalized) || 0;
    }
    return 0;
  };

  if (!data) return null;

  const months = ['Anual', ...Object.keys(data.monthly)];
  const currentMonth = selectedMonth || months[1]; // Default to first actual month
  
  // Safety check
  if (!currentMonth || (currentMonth !== 'Anual' && !data.monthly[currentMonth])) {
    return (
      <div className="p-8 text-center">
        <div className="hologram-card p-8 rounded-xl">
          <p className="text-text-muted font-display">No hay datos disponibles para mostrar.</p>
        </div>
      </div>
    );
  }
  
  const originalMonthData = currentMonth === 'Anual' ? data.yearly : data.monthly[currentMonth];

  // Función para verificar si una cuenta tiene subcuentas
  const hasChildren = (parentCode: string): boolean => {
    if (!data?.raw) return false;
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data.raw.some(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    });
  };

  // Función para verificar si una cuenta tiene subcuentas
  const hasClassifiedChildren = (parentCode: string): boolean => {
    if (!data?.raw) return false;
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data.raw.some(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    });
  };

  // Función para obtener clasificación con lógica jerárquica simple
  const getAccountClassification = (codigo: string): string => {
    // Si ya tiene una clasificación personalizada, usarla
    if (customClassifications[codigo]) {
      return customClassifications[codigo];
    }

    // CLASIFICACIÓN GRANULAR Y JERÁRQUICA
    if (codigo === '4' || codigo.startsWith('4.')) {
      return 'PVU'; // TODOS los ingresos
    } else if (codigo.startsWith('5.1.')) {
      return 'CVU'; // Costos de Venta y Producción (por defecto variables)
    } else if (codigo.startsWith('5.2.')) {
      return 'CFT'; // Gastos (por defecto fijos)
    } else if (codigo === '5.1') {
      return 'CVU'; // Cuenta padre costos de venta
    } else if (codigo === '5.2') {
      return 'CFT'; // Cuenta padre gastos
    } else if (codigo === '5') {
      return 'CVU'; // Cuenta raíz (se calculará dinámicamente)
    }
    
    return 'CVU'; // Por defecto todo participa como variable
  };

  // Calcular valores basados en clasificaciones personalizadas
  const customMonthData = useMemo(() => {
    if (!useCustomClassifications || Object.keys(customClassifications).length === 0) {
      return originalMonthData;
    }

    let ingresos = 0;
    let costosVariables = 0;
    let costosFijos = 0;

    // Iterar solo sobre cuentas de detalle (sin subcuentas) para evitar duplicación
    (data.raw || []).forEach(row => {
      const codigo = row['COD.'] || '';
      const clasificacion = getAccountClassification(codigo);
      
      // Todas las cuentas participan en el análisis
      
      // LÓGICA JERÁRQUICA UNIVERSAL: Solo cuentas de detalle (sin subcuentas)
      if (hasChildren(codigo)) {
        // console.log('🚫 Cuenta con subcuentas EXCLUIDA:', codigo, row['CUENTA']);
        return;
      }

      // Obtener el valor para el período actual
      let valor = 0;
      if (currentMonth === 'Anual') {
        // Sumar todos los meses
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            valor += typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
          }
        });
      } else {
        const monthValue = row[currentMonth];
        if (monthValue) {
          valor = typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
        }
      }

      // Debug temporal para PVU
      if (clasificacion === 'PVU') {
        // console.log('✅ Cuenta PVU INCLUIDA:', codigo, row['CUENTA'], 'Valor:', valor);
      }

      // Clasificar según configuración del usuario (respetando valores negativos)
      switch (clasificacion) {
        case 'PVU':
          ingresos += valor; // Mantener negativos (descuentos, rebajas)
          break;
        case 'CVU':
          costosVariables += Math.abs(valor); // Costos siempre positivos
          break;
        case 'CFT':
          costosFijos += Math.abs(valor); // Costos siempre positivos
          break;
      }
    });

    // Calcular valores derivados
    const utilidadBruta = ingresos - costosVariables;
    const gastosOperativos = costosFijos;
    const utilidadNeta = utilidadBruta - gastosOperativos;
    const margenContribucionPorc = ingresos > 0 ? (ingresos - costosVariables) / ingresos : 0;
    const puntoEquilibrio = margenContribucionPorc > 0 ? costosFijos / margenContribucionPorc : 0;

    return {
      ...originalMonthData,
      ingresos,
      costosVariables,
      costosFijos,
      utilidadBruta,
      gastosOperativos,
      utilidadNeta,
      puntoEquilibrio,
      // Mantener otros valores del original si existen
      costoVentasTotal: costosVariables,
      gastosAdminTotal: costosFijos,
      gastosVentasTotal: 0,
    };
  }, [useCustomClassifications, customClassifications, currentMonth, data, originalMonthData]);

  // Calcular estadísticas basadas en clasificaciones - SOLO cuentas de detalle
  const stats = useMemo(() => {
    if (!useCustomClassifications || !data?.raw) {
      return { CFT: 0, CVU: 0, PVU: 0 };
    }

    let CFT = 0, CVU = 0, PVU = 0;
    
    (data.raw || []).forEach(row => {
      const codigo = row['COD.'] || '';
      const clasificacion = getAccountClassification(codigo);
      
      // LÓGICA JERÁRQUICA UNIVERSAL: Solo cuentas de detalle (sin subcuentas)
      if (hasChildren(codigo)) return;

      // Obtener el valor para el período actual
      let valor = 0;
      if (currentMonth === 'Anual') {
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            valor += typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
          }
        });
      } else {
        const monthValue = row[currentMonth];
        if (monthValue) {
          valor = typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
        }
      }

      switch (clasificacion) {
        case 'PVU': PVU += valor; break; // Mantener negativos para ingresos
        case 'CVU': CVU += Math.abs(valor); break; // Costos siempre positivos
        case 'CFT': CFT += Math.abs(valor); break; // Costos siempre positivos
      }
    });

    return { CFT, CVU, PVU };
  }, [useCustomClassifications, customClassifications, currentMonth, data]);

  // Usar datos personalizados si están disponibles
  const monthData = useCustomClassifications ? customMonthData : originalMonthData;

  const simulatedData: SimulatedData = useMemo(() => {
    const ingresos = monthData.ingresos * (1 + priceChange / 100);
    const costosFijos = monthData.costosFijos + fixedCostChange;
    const variableCostRate = monthData.ingresos > 0
      ? monthData.costosVariables / monthData.ingresos
      : 0;
    const newVariableCostRate = variableCostRate * (1 + variableCostRateChange / 100);
    const costosVariables = ingresos * newVariableCostRate;
    const margenContribucion = ingresos - costosVariables;
    const margenContribucionPorc = ingresos > 0 ? margenContribucion / ingresos : 0;
    const puntoEquilibrio = margenContribucionPorc > 0 ? costosFijos / margenContribucionPorc : 0;
    const utilidadNeta = ingresos - costosVariables - costosFijos;

    return { 
      ingresos, 
      costosFijos, 
      costosVariables, 
      puntoEquilibrio,
      margenContribucion,
      margenContribucionPorc,
      utilidadNeta
    };
  }, [monthData, priceChange, fixedCostChange, variableCostRateChange]);

  const breakEvenChartData = useMemo(() => {
    const maxSales = Math.max(simulatedData.ingresos, simulatedData.puntoEquilibrio) * 1.8 || 20000;
    const steps = 50;
    const chartData = [];

    for (let i = 0; i <= steps; i++) {
      const sales = (maxSales / steps) * i;
      const variableCosts = sales * (simulatedData.ingresos > 0 ? simulatedData.costosVariables / simulatedData.ingresos : 0);
      const totalCosts = simulatedData.costosFijos + variableCosts;
      const profit = sales - totalCosts;
      
      chartData.push({
        ventas: sales,
        'Costos Fijos': simulatedData.costosFijos,
        'Costos Variables': variableCosts,
        'Costos Totales': totalCosts,
        'Ingresos': sales,
        'Beneficio': profit,
        'Punto Equilibrio': simulatedData.puntoEquilibrio
      });
    }
    return chartData;
  }, [simulatedData]);

  const resetSimulation = () => {
    setIsAnimated(true);
    setPriceChange(0);
    setFixedCostChange(0);
    setVariableCostRateChange(0);
    setTimeout(() => setIsAnimated(false), 1000);
  };

  

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">
          <div className="space-y-2">
            <h2 className="text-4xl lg:text-5xl font-display text-primary neon-text animate-digital-in">
              Análisis de Punto de Equilibrio
            </h2>
            <p className="text-text-muted font-mono text-lg">
              // Sistema de simulación financiera avanzado
              {useCustomClassifications && (
                <span className="ml-4 text-accent text-sm animate-pulse">
                  [MODO PERSONALIZADO ACTIVO]
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <AccountClassificationPanel 
              onClassificationChange={(classifications) => {
                setCustomClassifications(classifications);
                const hasRealCustomizations = Object.keys(classifications).length > 0;
                setUseCustomClassifications(hasRealCustomizations);
                
                // Guardar en localStorage
                if (hasRealCustomizations) {
                  localStorage.setItem('artyco-breakeven-classifications', JSON.stringify(classifications));
                } else {
                  localStorage.removeItem('artyco-breakeven-classifications');
                }
              }}
            />
            
            <select 
              value={currentMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="p-4 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 hover:shadow-glow-sm font-mono text-lg rounded-xl"
            >
              {months.map(m => (
                <option key={m} value={m} className="bg-dark-card text-text-secondary">
                  {m === 'Anual' ? '📊 Consolidado Anual' : m}
                </option>
              ))}
            </select>
            
            <button 
              onClick={resetSimulation}
              className="cyber-button px-6 py-4 text-sm font-display group"
            >
              <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Warning if missing classifications */}
      {useCustomClassifications && (stats.CFT === 0 || stats.CVU === 0 || stats.PVU === 0) && (
        <div className="hologram-card p-4 rounded-xl border-2 border-warning/50 bg-warning/10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-warning animate-pulse" />
            <p className="text-warning font-mono">
              ⚠️ Advertencia: Faltan clasificaciones importantes. 
              {stats.PVU === 0 && 'No hay ingresos (PVU) clasificados. '}
              {stats.CVU === 0 && 'No hay costos variables (CVU) clasificados. '}
              {stats.CFT === 0 && 'No hay costos fijos (CFT) clasificados.'}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title={useCustomClassifications ? "Punto Equilibrio (Original)" : "Punto Equilibrio Original"}
          value={originalMonthData.puntoEquilibrio || 0}
          icon={<Target className="w-6 h-6" />}
          color="primary"
          subtitle={currentMonth === 'Anual' ? 'Anual' : currentMonth}
          isAnimated={isAnimated}
        />
        
        <MetricCard
          title={useCustomClassifications ? "Punto Equilibrio (Personalizado)" : "Punto Equilibrio Simulado"}
          value={simulatedData.puntoEquilibrio}
          icon={<TrendingUp className="w-6 h-6" />}
          color="accent"
          subtitle={useCustomClassifications ? "Con clasificaciones propias" : "Proyección"}
          isAnimated={true}
        />
        
        <MetricCard
          title="Margen Contribución"
          value={simulatedData.margenContribucion}
          icon={<DollarSign className="w-6 h-6" />}
          color="primary"
          subtitle={`${(simulatedData.margenContribucionPorc * 100).toFixed(1)}%`}
          isAnimated={true}
        />
        
        <MetricCard
          title="Utilidad Neta"
          value={simulatedData.utilidadNeta}
          icon={<Activity className="w-6 h-6" />}
          color={simulatedData.utilidadNeta >= 0 ? 'accent' : 'danger'}
          subtitle="Simulada"
          isAnimated={true}
        />
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Interactive Chart */}
        <div className="xl:col-span-2 hologram-card p-8 rounded-2xl shadow-hologram hover:shadow-glow-xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-hologram" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-display text-primary text-glow flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                Gráfico de Punto de Equilibrio Dinámico
              </h3>
              <div className="flex items-center space-x-2 text-xs font-mono text-text-dim">
                <div className="w-3 h-3 bg-primary rounded animate-pulse"></div>
                <span>SIMULACIÓN ACTIVA</span>
              </div>
            </div>
            
            <div className="relative h-[450px]">
              <Line
                data={{
                  labels: breakEvenChartData.map(d => d.ventas),
                  datasets: [
                    {
                      label: 'Ingresos',
                      data: breakEvenChartData.map(d => d.Ingresos),
                      borderColor: '#00FF99',
                      backgroundColor: 'rgba(0, 255, 153, 0.3)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 0,
                      pointHoverRadius: 8,
                      pointHoverBorderWidth: 3,
                      pointHoverBorderColor: '#00FF99',
                      pointHoverBackgroundColor: '#00FF99',
                    },
                    {
                      label: 'Costos Totales',
                      data: breakEvenChartData.map(d => d['Costos Totales']),
                      borderColor: '#FF0080',
                      backgroundColor: 'rgba(255, 0, 128, 0.3)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 0,
                      pointHoverRadius: 8,
                      pointHoverBorderWidth: 3,
                      pointHoverBorderColor: '#FF0080',
                      pointHoverBackgroundColor: '#FF0080',
                    },
                    {
                      label: 'Costos Fijos',
                      data: breakEvenChartData.map(d => d['Costos Fijos']),
                      borderColor: '#00F0FF',
                      backgroundColor: 'transparent',
                      borderDash: [5, 5],
                      pointRadius: 0,
                      tension: 0.4,
                    },
                    {
                      label: 'Punto de Equilibrio',
                      data: [{ x: simulatedData.puntoEquilibrio, y: 0 }, { x: simulatedData.puntoEquilibrio, y: Math.max(...breakEvenChartData.map(d => d.Ingresos)) * 1.2 }],
                      borderColor: '#FFB800',
                      borderDash: [4, 4],
                      pointRadius: 0,
                      fill: false,
                      showLine: true,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: '#E0E7FF',
                        font: {
                          size: 14,
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y);
                          }
                          return label;
                        },
                        title: function(context) {
                          return `Ventas: ${formatCurrency(context[0].parsed.x)}`;
                        }
                      },
                      backgroundColor: 'rgba(26, 26, 37, 0.8)',
                      borderColor: 'rgba(0, 240, 255, 0.2)',
                      borderWidth: 1,
                      titleColor: '#00F0FF',
                      bodyColor: '#E0E7FF',
                      titleFont: {
                        size: 16,
                        family: 'Orbitron',
                      },
                      bodyFont: {
                        size: 14,
                        family: 'Roboto Mono',
                      },
                      padding: 12,
                      cornerRadius: 8,
                    },
                  },
                  scales: {
                    x: {
                      type: 'linear',
                      title: {
                        display: true,
                        text: 'Ventas',
                        color: '#8B9DC3',
                      },
                      ticks: {
                        color: '#8B9DC3',
                        font: {
                          size: 12,
                        },
                        callback: function(value) {
                          return `${(Number(value)/1000).toFixed(0)}k`;
                        }
                      },
                      grid: {
                        color: 'rgba(0, 240, 255, 0.1)',
                      },
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Valor',
                        color: '#8B9DC3',
                      },
                      ticks: {
                        color: '#8B9DC3',
                        font: {
                          size: 12,
                        },
                        callback: function(value) {
                          return `${(Number(value)/1000).toFixed(0)}k`;
                        }
                      },
                      grid: {
                        color: 'rgba(0, 240, 255, 0.1)',
                      },
                    },
                  },
                  elements: {
                    line: {
                      borderWidth: 2,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-6">
          <div className="hologram-card p-6 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 animate-pulse" />
            <div className="relative z-10">
              <h3 className="text-xl font-display text-primary mb-6 text-glow flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Simulación de Escenarios
              </h3>
              
              <div className="space-y-6">
                <SliderControl
                  label="Cambio en Precios"
                  value={priceChange}
                  onChange={setPriceChange}
                  min={-50}
                  max={50}
                  step={1}
                  unit="%"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                
                <SliderControl
                  label="Cambio en Costos Fijos"
                  value={fixedCostChange}
                  onChange={setFixedCostChange}
                  min={-originalMonthData.costosFijos * 0.5}
                  max={originalMonthData.costosFijos * 0.5}
                  step={100}
                  unit="$"
                  icon={<DollarSign className="w-4 h-4" />}
                />
                
                <SliderControl
                  label="Tasa Costos Variables"
                  value={variableCostRateChange}
                  onChange={setVariableCostRateChange}
                  min={-50}
                  max={50}
                  step={1}
                  unit="%"
                  icon={<Activity className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="hologram-card p-6 rounded-xl border border-accent/30 shadow-glow-accent">
            <h4 className="text-lg font-display text-accent mb-4 text-glow">
              Resumen de Impacto
            </h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card rounded-lg">
                <span className="text-text-muted font-mono">Diferencia P.E.:</span>
                <span className={`font-mono text-lg ${
                  simulatedData.puntoEquilibrio - (originalMonthData.puntoEquilibrio || 0) >= 0 
                    ? 'text-danger shadow-glow-danger' 
                    : 'text-accent shadow-glow-accent'
                }`}>
                  {formatCurrency(simulatedData.puntoEquilibrio - (originalMonthData.puntoEquilibrio || 0))}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card rounded-lg">
                <span className="text-text-muted font-mono">Margen %:</span>
                <span className="font-mono text-lg text-primary data-display">
                  {(simulatedData.margenContribucionPorc * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card rounded-lg">
                <span className="text-text-muted font-mono">ROI Estimado:</span>
                <span className={`font-mono text-lg ${
                  simulatedData.utilidadNeta >= 0 ? 'text-accent' : 'text-danger'
                }`}>
                  {simulatedData.ingresos > 0 
                    ? `${((simulatedData.utilidadNeta / simulatedData.ingresos) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakEvenAnalysis;