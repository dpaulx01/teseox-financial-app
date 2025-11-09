import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  CreditCard,
  Factory,
  Calendar,
  Ruler,
  Package,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { useFinancialData } from '../../contexts/DataContext';
import { useYear } from '../../contexts/YearContext';
import { formatCurrency } from '../../utils/formatters';
import financialAPI from '../../services/api';
import api from '../../services/api';
import type { DashboardKpisResponse } from '../../types/production';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, color, trend, loading }) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/15 to-primary/10 border-blue-500/40',
    green: 'from-emerald-500/15 to-primary/10 border-emerald-500/40',
    purple: 'from-purple-500/15 to-primary/10 border-purple-500/40',
    amber: 'from-amber-500/15 to-primary/10 border-amber-500/40',
    cyan: 'from-cyan-500/15 to-primary/10 border-cyan-500/40',
    orange: 'from-orange-500/15 to-primary/10 border-orange-500/40',
    red: 'from-red-500/15 to-primary/10 border-red-500/40',
    indigo: 'from-indigo-500/15 to-primary/10 border-indigo-500/40',
    teal: 'from-teal-500/15 to-primary/10 border-teal-500/40',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
    teal: 'text-teal-400',
  };

  return (
    <div className={`glass-card rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-6 shadow-hologram transition-all duration-300 hover:shadow-glow-md hover:scale-105`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-muted uppercase tracking-wide">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-dark-card/70 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-text-primary mt-2 data-display">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-dark-card/60 border border-border/40">
          <Icon className={`h-6 w-6 ${iconColors[color]}`} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-2 mt-2">
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trend >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-text-muted">vs período anterior</span>
        </div>
      )}
    </div>
  );
};

const ExecutiveSummary: React.FC = () => {
  const { data, loading } = useFinancialData();
  const { selectedYear } = useYear();
  const [productionData, setProductionData] = useState<DashboardKpisResponse | null>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [loadingProduction, setLoadingProduction] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  // Load production data from API (filtrado por año global)
  useEffect(() => {
    if (!selectedYear) return;

    const loadProductionData = async () => {
      try {
        const response = await financialAPI.getDashboardKpis();
        setProductionData(response);
      } catch (error) {
        console.error('Error loading production data:', error);
      } finally {
        setLoadingProduction(false);
      }
    };

    loadProductionData();
  }, [selectedYear]);

  // Load sales BI data (filtrado por año global)
  useEffect(() => {
    if (!selectedYear) return;

    const loadSalesData = async () => {
      try {
        // Filtrar por año seleccionado
        const params = new URLSearchParams();
        params.append('year', selectedYear.toString());

        const response = await api.get(`/api/sales-bi/dashboard/summary?${params.toString()}`);
        if (response.data.success) {
          setSalesData(response.data.data);
        }
      } catch (error) {
        console.error('Error loading sales data:', error);
      } finally {
        setLoadingSales(false);
      }
    };

    loadSalesData();
  }, [selectedYear]);

  // Financial data
  const ingresos = data?.yearly?.ingresos || 0;
  const ebitda = data?.yearly?.ebitda || 0;
  const margenEbitda = ingresos > 0 ? ((ebitda / ingresos) * 100) : 0;

  // Production data - Real data from Production API
  const valorActivo = productionData?.financial_summary?.total_en_produccion || 0;
  const saldoPorCobrar = productionData?.financial_summary?.saldo_por_cobrar || 0;
  const valorListoRetiro = productionData?.financial_summary?.valor_listo_para_retiro || 0;
  const productosActivos = productionData?.status_breakdown?.reduce((sum, item) => sum + item.count, 0) || 0;
  const proximasEntregas = productionData?.upcoming_deliveries?.length || 0;
  const alertasPendientes = productionData?.risk_alerts?.length || 0;

  // Metros y unidades específicamente en status "Producción"
  const enProduccion = productionData?.status_breakdown?.find(
    item => item.status.toLowerCase().includes('producción') || item.status.toLowerCase().includes('produccion')
  );
  const metrosEnProduccion = enProduccion?.total_metros || 0;
  const unidadesEnProduccion = enProduccion?.total_units || 0;

  // Sales BI data
  const ticketPromedio = salesData?.ticket_promedio || 0;
  const ventaNeta = salesData?.venta_neta_total || 0;
  const margenBruto = salesData?.margen_bruto_porcentaje || 0;

  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-EC', { maximumFractionDigits: 0 });
  };

  const kpis = [
    {
      title: 'Ingresos Anuales',
      value: formatCurrency(ingresos),
      subtitle: 'Ingresos totales del año',
      icon: DollarSign,
      color: 'blue',
    },
    {
      title: 'EBITDA Anual',
      value: formatCurrency(ebitda),
      subtitle: `Margen ${margenEbitda.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Ticket Promedio Ventas',
      value: formatCurrency(ticketPromedio),
      subtitle: `Margen bruto ${margenBruto.toFixed(1)}%`,
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      title: 'Valor Activo',
      value: formatCurrency(valorActivo),
      subtitle: `${productosActivos} productos activos`,
      icon: Factory,
      color: 'cyan',
    },
    {
      title: 'Saldo por Cobrar',
      value: formatCurrency(saldoPorCobrar),
      subtitle: 'Pendiente de cobro',
      icon: CreditCard,
      color: 'amber',
    },
    {
      title: 'Listo para Retiro',
      value: formatCurrency(valorListoRetiro),
      subtitle: 'Productos terminados',
      icon: Package,
      color: 'teal',
    },
    {
      title: 'M² en Producción',
      value: `${formatNumber(metrosEnProduccion)} m²`,
      subtitle: `${formatNumber(unidadesEnProduccion)} unidades`,
      icon: Ruler,
      color: 'indigo',
    },
    {
      title: 'Próximas Entregas',
      value: `${proximasEntregas}`,
      subtitle: 'Entregas programadas (7 días)',
      icon: Calendar,
      color: 'orange',
    },
    {
      title: 'Alertas Operativas',
      value: `${alertasPendientes}`,
      subtitle: 'Requieren atención',
      icon: AlertTriangle,
      color: alertasPendientes > 0 ? 'red' : 'green',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display text-primary neon-text">
            Resumen Ejecutivo
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Vista 360° del estado del negocio en tiempo real
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            {...kpi}
            loading={loading || loadingProduction || loadingSales}
          />
        ))}
      </div>
    </div>
  );
};

export default ExecutiveSummary;
