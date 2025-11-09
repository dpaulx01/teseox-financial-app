import React, { useMemo } from 'react';
import {
  BarChart2,
  FileText,
  Target,
  Settings,
  Factory,
  TrendingUp,
  Shield,
  Calculator,
  ClipboardList,
  PieChart,
} from 'lucide-react';

const iconMap = {
  BarChart2,
  FileText,
  Target,
  Settings,
  Factory,
  TrendingUp,
  Shield,
  Calculator,
  ClipboardList,
  PieChart,
};

const colorMap: Record<string, string> = {
  kpi: 'from-blue-500/20 to-primary/20 border-blue-500/40 hover:border-blue-500/60',
  pnl: 'from-emerald-500/20 to-primary/20 border-emerald-500/40 hover:border-emerald-500/60',
  pyg: 'from-cyan-500/20 to-primary/20 border-cyan-500/40 hover:border-cyan-500/60',
  'balance-general': 'from-purple-500/20 to-primary/20 border-purple-500/40 hover:border-purple-500/60',
  balance: 'from-indigo-500/20 to-primary/20 border-indigo-500/40 hover:border-indigo-500/60',
  breakeven: 'from-amber-500/20 to-primary/20 border-amber-500/40 hover:border-amber-500/60',
  operational: 'from-orange-500/20 to-primary/20 border-orange-500/40 hover:border-orange-500/60',
  status: 'from-pink-500/20 to-primary/20 border-pink-500/40 hover:border-pink-500/60',
  'bi-ventas': 'from-green-500/20 to-primary/20 border-green-500/40 hover:border-green-500/60',
  config: 'from-slate-500/20 to-primary/20 border-slate-500/40 hover:border-slate-500/60',
  rbac: 'from-red-500/20 to-primary/20 border-red-500/40 hover:border-red-500/60',
};

interface QuickAccessGridProps {
  onNavigate: (tabId: string) => void;
}

const QuickAccessGrid: React.FC<QuickAccessGridProps> = ({ onNavigate }) => {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const isAdmin = user.is_superuser || false;

  // Same structure as Navigation.tsx - scalable for future modules
  const navItems = useMemo(() => [
    { id: 'kpi', label: 'Dashboard KPIs', icon: 'BarChart2', description: 'Métricas principales del negocio' },
    { id: 'pnl', label: 'Análisis PyG', icon: 'FileText', description: 'Estado de resultados detallado' },
    { id: 'pyg', label: 'PyG Comparativo', icon: 'TrendingUp', description: 'Comparación periódica de resultados' },
    { id: 'balance-general', label: 'Balance General', icon: 'Calculator', description: 'Estado de situación financiera' },
    { id: 'balance', label: 'Balance Interno', icon: 'Target', description: 'Balance ajustado interno' },
    { id: 'breakeven', label: 'Punto de Equilibrio', icon: 'Target', description: 'Análisis de costos fijos y variables' },
    { id: 'operational', label: 'Análisis Operativo', icon: 'Factory', description: 'Indicadores operacionales' },
    { id: 'status', label: 'Status Producción', icon: 'ClipboardList', description: 'Seguimiento de producción en tiempo real' },
    { id: 'bi-ventas', label: 'BI Ventas', icon: 'PieChart', description: 'Inteligencia de negocios comercial' },
    { id: 'config', label: 'Configuración', icon: 'Settings', description: 'Ajustes y carga de datos' },
    ...(isAdmin ? [
      { id: 'rbac', label: 'Gestión RBAC', icon: 'Shield', description: 'Control de acceso y permisos' },
    ] : []),
  ], [isAdmin]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap];
        const colorClass = colorMap[item.id] || 'from-primary/20 to-accent/20 border-primary/40 hover:border-primary/60';

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              group relative overflow-hidden rounded-2xl border bg-gradient-to-br
              ${colorClass}
              p-6 text-left transition-all duration-300
              hover:scale-105 hover:shadow-glow-md
              glass-card
            `}
          >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-dark-card/60 border border-border/40 group-hover:border-primary/60 transition-colors">
                  <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickAccessGrid;
