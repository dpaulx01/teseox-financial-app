import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  FileText,
  Target,
  Menu,
  X,
  Settings,
  Factory,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Shield,
  Calculator,
  ClipboardList,
  PieChart,
} from 'lucide-react';
import { NavigationProps } from '../../types';
import ThemeToggle from '../ui/ThemeToggle';

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

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  
  // Get user from localStorage to check if admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.is_superuser || false;
  
  const navItems = [
    { id: 'kpi', label: 'Dashboard KPIs', icon: 'BarChart2' },
    { id: 'pnl', label: 'Análisis PyG', icon: 'FileText' },
    { id: 'pyg', label: 'PyG Comparativo', icon: 'TrendingUp' },
    { id: 'balance', label: 'Balance Interno', icon: 'Calculator' },
    { id: 'breakeven', label: 'Punto de Equilibrio', icon: 'Target' },
    { id: 'operational', label: 'Análisis Operativo', icon: 'Factory' },
    { id: 'status', label: 'Status Producción', icon: 'ClipboardList' },
    { id: 'bi-ventas', label: 'BI Ventas', icon: 'PieChart' },
    { id: 'config', label: 'Configuración', icon: 'Settings' },
    ...(isAdmin ? [{ id: 'rbac', label: 'Gestión RBAC', icon: 'Shield' }] : []),
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // Auto-collapse después de un tiempo sin hover
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isHovering && !isCollapsed) {
      timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000); // 3 segundos de inactividad
    }
    return () => clearTimeout(timer);
  }, [isHovering, isCollapsed]);

  const shouldShowExpanded = !isCollapsed || isHovering;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-card text-primary rounded-lg shadow-glow-md border border-border hover:shadow-glow-lg transition-all duration-300"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-dark-bg bg-opacity-70 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Collapsible */}
      <aside 
        className={`
          hidden lg:flex glass-panel text-text-secondary flex-col flex-shrink-0 shadow-hologram
          fixed inset-y-0 left-0 z-40 transition-all duration-500 ease-in-out backdrop-blur-xl
          ${shouldShowExpanded ? 'w-64' : 'w-16'}
        `}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="p-4 border-b border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-hologram" />
          <div className="flex items-center justify-between relative z-10">
            {shouldShowExpanded ? (
              <div className="text-center flex-1">
                <h1 className="text-2xl font-display text-primary neon-text animate-pulse-glow">ARTYCO</h1>
                <p className="text-xs text-text-muted font-mono">// Inteligencia Financiera</p>
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center text-primary font-display text-xl neon-text">
                A
              </div>
            )}
            
            {/* Toggle button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-glass rounded transition-colors text-text-muted hover:text-primary"
            >
              {shouldShowExpanded ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map(item => {
            const IconComponent = iconMap[item.icon as keyof typeof iconMap];
            return (
              <button 
                key={item.id} 
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center rounded-lg transition-all duration-300 relative group
                  ${shouldShowExpanded ? 'px-3 py-2' : 'px-2 py-2 justify-center'}
                  ${activeTab === item.id 
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary shadow-glow-md animate-pulse-glow' 
                    : 'text-text-secondary hover:bg-glass hover:text-primary hover:border hover:border-border hover:shadow-glow-sm'
                  }`}
                title={!shouldShowExpanded ? item.label : undefined}
              >
                <IconComponent className="h-5 w-5 flex-shrink-0" />
                {shouldShowExpanded && (
                  <span className="ml-3 font-medium truncate">{item.label}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {!shouldShowExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-dark-card border border-border rounded text-sm font-mono text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-center">
            <ThemeToggle className={`${shouldShowExpanded ? '' : 'scale-75'}`} />
          </div>
        </div>
        
        {/* Footer */}
        {shouldShowExpanded && (
          <div className="p-4 border-t border-border relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <p className="text-xs text-text-dim text-center font-mono relative z-10">
              &copy; 2025 ARTYCO | <span className="text-primary">v2.0</span>
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`
        lg:hidden w-64 glass-panel text-text-secondary flex flex-col flex-shrink-0 shadow-hologram
        fixed inset-y-0 left-0 z-40 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-all duration-500 ease-in-out backdrop-blur-xl
      `}>
        <div className="p-6 text-center border-b border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-hologram" />
          <h1 className="text-3xl font-display text-primary neon-text relative z-10 animate-pulse-glow">ARTYCO</h1>
          <p className="text-sm text-text-muted relative z-10 font-mono">// Inteligencia Financiera</p>
        </div>
        <nav className="flex-1 px-4 py-6">
          {navItems.map(item => {
            const IconComponent = iconMap[item.icon as keyof typeof iconMap];
            return (
              <button 
                key={item.id} 
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-300 relative group
                  ${activeTab === item.id 
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary shadow-glow-md animate-pulse-glow scale-105' 
                    : 'text-text-secondary hover:bg-glass hover:text-primary hover:border hover:border-border hover:shadow-glow-sm hover:scale-102'
                  }`}
              >
                <IconComponent className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Theme Toggle */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="p-4 border-t border-border relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          <p className="text-xs text-text-dim text-center font-mono relative z-10">
            &copy; 2025 ARTYCO | <span className="text-primary">v2.0</span>
          </p>
        </div>
      </aside>
    </>
  );
};

export default Navigation;
