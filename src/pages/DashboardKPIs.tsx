import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon } from 'lucide-react';
import { useFinancialData } from '../contexts/DataContext';
import { useMixedCosts } from '../contexts/MixedCostContext';
import KpiCard from '../components/ui/KpiCard';
import { getSortedMonths } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';
import MonthlyEvolutionChart from '../components/charts/MonthlyEvolutionChart';
// Removidos imports no utilizados - solo usa datos base de la API

const DashboardKPIs: React.FC = () => {
  const { data } = useFinancialData();
  const { mixedCosts, customClassifications } = useMixedCosts();
  
  if (!data) return null;

  const { monthly, yearly, kpis } = data;

  // Validación defensiva para evitar errores con Object.entries
  if (!monthly || typeof monthly !== 'object') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-display text-primary">
            Datos financieros incompletos
          </h2>
          <p className="text-text-muted">
            Por favor, carga tu archivo CSV en la sección de Configuración.
          </p>
        </div>
      </div>
    );
  }

  // USAR DATOS DIRECTOS DE LA API V2 - SOLO mostrar datos base, NO recalcular automáticamente
  const adjustedData = useMemo(() => {
    if (!data) {
      return null;
    }
    
    // SIEMPRE usar datos base de la API para evitar recálculos automáticos
    // Los recálculos deben ser MANUALES desde BreakEven Analysis
    return {
      costosFijosAjustados: data.yearly.costosFijos,
      costosVariablesAjustados: data.yearly.costosVariables,
      puntoEquilibrio: data.yearly.puntoEquilibrio || 0,
      margenContribucion: data.yearly.utilidadBruta,
      margenContribucionPorc: data.yearly.ingresos > 0 ? (data.yearly.utilidadBruta / data.yearly.ingresos) * 100 : 0,
      utilidadNetaAjustada: data.yearly.utilidadNeta,
      usingMixedCosts: false // Siempre false para evitar recálculos automáticos
    };
  }, [data]); // SOLO depende de data, NO de mixedCosts ni customClassifications

  const chartData = useMemo(() => 
    Object.entries(monthly).map(([month, values]) => ({
      month: month,
      ingresos: values?.ingresos || 0,
      ebitda: values?.ebitda || 0,
      utilidadNeta: values?.utilidadNeta || 0,
      costoVentasTotal: values?.costoVentasTotal || 0,
      margenEbitda: (values?.ingresos || 0) > 0 ? ((values?.ebitda || 0) / (values?.ingresos || 0)) * 100 : 0,
    })), [monthly]
  );

  // Tooltip helper con último mes vs anterior
  const months = useMemo(() => getSortedMonths(monthly), [monthly]);
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const lastVal = (k: keyof typeof monthly[string]) => (last ? (monthly as any)[last]?.[k] || 0 : 0);
  const prevVal = (k: keyof typeof monthly[string]) => (prev ? (monthly as any)[prev]?.[k] || 0 : 0);

  const heroKPIs = [
    { 
      title: 'Ingresos Anuales', 
      value: formatCurrency(yearly.ingresos), 
      icon: DollarSign, 
      color: 'accent',
      tooltip: last && prev ? `Últimos meses: ${prev} → ${last}\n${formatCurrency(prevVal('ingresos'))} → ${formatCurrency(lastVal('ingresos'))}` : undefined
    },
    { 
      title: 'EBITDA Anual', 
      value: formatCurrency(yearly.ebitda), 
      icon: TrendingUp, 
      color: 'blue',
      tooltip: last && prev ? `Últimos meses: ${prev} → ${last}\n${formatCurrency(prevVal('ebitda'))} → ${formatCurrency(lastVal('ebitda'))}` : undefined
    },
    { 
      title: adjustedData ? 'Margen Contribución' : 'Margen EBITDA', 
      value: adjustedData 
        ? adjustedData.margenContribucionPorc.toFixed(2)
        : (kpis.find(k => k.name === 'Margen EBITDA')?.value.toFixed(2) || '0.00'), 
      unit: '%', 
      icon: PieIcon, 
      color: 'blue',
      tooltip: adjustedData ? `MC% = UB / Ingresos (base anual)` : (last && prev ? `Últimos meses: ${prev} → ${last}` : undefined)
    },
    { 
      title: 'Utilidad Neta Anual', 
      value: formatCurrency(adjustedData ? adjustedData.utilidadNetaAjustada : yearly.utilidadNeta), 
      icon: (adjustedData ? adjustedData.utilidadNetaAjustada : yearly.utilidadNeta) >= 0 ? TrendingUp : TrendingDown, 
      color: (adjustedData ? adjustedData.utilidadNetaAjustada : yearly.utilidadNeta) >= 0 ? 'accent' : 'danger',
      tooltip: last && prev ? `Últimos meses: ${prev} → ${last}\n${formatCurrency(prevVal('utilidadNeta'))} → ${formatCurrency(lastVal('utilidadNeta'))}` : undefined
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-4xl font-display text-primary neon-text mb-2 animate-digital-in">
          Cuadro de Mando de KPIs
        </h2>
        <p className="text-sm text-text-muted">
          Datos base del sistema contable - Para análisis avanzado usa la sección Punto de Equilibrio
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
        {heroKPIs.map(kpi => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <MonthlyEvolutionChart 
        data={chartData} 
        className="col-span-1 xl:col-span-2"
      />
    </div>
  );
};

export default DashboardKPIs;
