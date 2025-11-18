// Context para el dashboard personalizable
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DashboardLayout, WidgetConfig, DashboardPreset, DashboardTheme } from '../types/dashboard';
import TenantStorage from '../utils/tenantStorage';

interface DashboardContextType {
  // Layout Management
  currentLayout: DashboardLayout | null;
  layouts: DashboardLayout[];
  
  // Widget Operations
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  duplicateWidget: (widgetId: string) => void;
  
  // Layout Operations
  saveLayout: (name: string) => void;
  loadLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => void;
  resetLayout: () => void;
  
  // Presets
  presets: DashboardPreset[];
  loadPreset: (presetId: string) => void;
  
  // Theme
  currentTheme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  
  // Edit Mode
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  
  // Grid Settings
  gridSettings: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
  };
  updateGridSettings: (settings: Partial<DashboardContextType['gridSettings']>) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Default theme - cyber/neon style matching your current design
const defaultTheme: DashboardTheme = {
  name: 'Cyber Neon',
  colors: {
    primary: '#8b5cf6',
    secondary: '#06b6d4', 
    accent: '#10b981',
    background: '#0f172a',
    surface: 'rgba(15, 23, 42, 0.8)',
    text: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  effects: {
    glow: true,
    glassmorphism: true,
    animations: true,
    particles: false,
  }
};

// Default presets with optimized layouts
const defaultPresets: DashboardPreset[] = [
  {
    id: 'executive',
    name: 'Vista Ejecutiva',
    description: 'KPIs principales y resumen de alto nivel',
    category: 'executive',
    layout: {
      name: 'Vista Ejecutiva',
      gridCols: 12,
      widgets: [
        {
          id: 'kpi-ingresos',
          type: 'kpi',
          title: 'Ingresos Totales',
          size: { w: 4, h: 3 },
          position: { x: 0, y: 0 },
          settings: { metric: 'ingresos', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'kpi-utilidad',
          type: 'kpi', 
          title: 'Utilidad Neta',
          size: { w: 4, h: 3 },
          position: { x: 4, y: 0 },
          settings: { metric: 'utilidad', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'kpi-costos',
          type: 'kpi',
          title: 'Costos Totales',
          size: { w: 4, h: 3 },
          position: { x: 8, y: 0 },
          settings: { metric: 'costos', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'waterfall-main',
          type: 'waterfall',
          title: 'Flujo de Resultados',
          size: { w: 8, h: 4 },
          position: { x: 0, y: 3 },
          settings: { showValues: true, animate: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'predictive-analysis',
          type: 'predictive',
          title: 'Análisis Predictivo',
          size: { w: 4, h: 4 },
          position: { x: 8, y: 3 },
          settings: { 
            view: 'trends', 
            timeHorizon: 'quarter', 
            confidenceLevel: 80,
            showRisks: true,
            showOpportunities: true
          },
          isVisible: true,
          isLocked: false,
        }
      ]
    }
  },
  {
    id: 'analyst',
    name: 'Vista Analista',
    description: 'Análisis detallado con tablas y comparaciones',
    category: 'analyst',
    layout: {
      name: 'Vista Analista',
      gridCols: 12,
      widgets: [
        {
          id: 'kpi-ingresos-analyst',
          type: 'kpi',
          title: 'Ingresos',
          size: { w: 3, h: 2 },
          position: { x: 0, y: 0 },
          settings: { metric: 'ingresos', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'kpi-costos-analyst',
          type: 'kpi',
          title: 'Costos',
          size: { w: 3, h: 2 },
          position: { x: 3, y: 0 },
          settings: { metric: 'costos', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'kpi-utilidad-analyst',
          type: 'kpi',
          title: 'Utilidad',
          size: { w: 3, h: 2 },
          position: { x: 6, y: 0 },
          settings: { metric: 'utilidad', format: 'currency', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'kpi-margen-analyst',
          type: 'kpi',
          title: 'Margen Neto',
          size: { w: 3, h: 2 },
          position: { x: 9, y: 0 },
          settings: { metric: 'margen_neto', format: 'percentage', showTrend: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'table-detailed',
          type: 'table',
          title: 'Análisis Jerárquico Detallado',
          size: { w: 6, h: 5 },
          position: { x: 0, y: 2 },
          settings: { view: 'tree', showVertical: true, showHorizontal: true },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'predictive-analysis-analyst',
          type: 'predictive',
          title: 'Análisis Predictivo',
          size: { w: 6, h: 5 },
          position: { x: 6, y: 2 },
          settings: { 
            view: 'trends', 
            timeHorizon: 'quarter', 
            confidenceLevel: 80,
            showRisks: true,
            showOpportunities: true
          },
          isVisible: true,
          isLocked: false,
        },
        {
          id: 'scenarios-analysis',
          type: 'scenarios',
          title: 'Escenarios What-If',
          size: { w: 12, h: 4 },
          position: { x: 0, y: 7 },
          settings: { 
            activeScenarios: ['realistic', 'optimistic'], 
            comparisonMode: 'side-by-side',
            showConfidence: true,
            maxScenarios: 3,
            autoSave: false
          },
          isVisible: true,
          isLocked: false,
        }
      ]
    }
  }
];

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null);
  const [currentTheme, setCurrentTheme] = useState<DashboardTheme>(defaultTheme);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [gridSettings, setGridSettings] = useState({
    cols: 12,
    rowHeight: 60,
    margin: [16, 16] as [number, number],
  });

  // Load saved layouts from tenant-scoped storage
  useEffect(() => {
    const savedLayouts = TenantStorage.getItem('pnl-dashboard-layouts');
    const savedTheme = TenantStorage.getItem('pnl-dashboard-theme');
    const savedGrid = TenantStorage.getItem('pnl-dashboard-grid');
    
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts);
        setLayouts(parsed);
        if (parsed.length > 0) {
          setCurrentLayout(parsed[0]);
        }
      } catch (error) {
        // console.error('Error loading dashboard layouts:', error);
      }
    }

    if (savedTheme) {
      try {
        setCurrentTheme(JSON.parse(savedTheme));
      } catch (error) {
        // console.error('Error loading dashboard theme:', error);
      }
    }

    if (savedGrid) {
      try {
        setGridSettings(JSON.parse(savedGrid));
      } catch (error) {
        // console.error('Error loading grid settings:', error);
      }
    }
  }, []);

  // Save to tenant storage when layouts change
  useEffect(() => {
    if (layouts.length > 0) {
      TenantStorage.setItem('pnl-dashboard-layouts', JSON.stringify(layouts));
    }
  }, [layouts]);

  useEffect(() => {
    TenantStorage.setItem('pnl-dashboard-theme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  useEffect(() => {
    TenantStorage.setItem('pnl-dashboard-grid', JSON.stringify(gridSettings));
  }, [gridSettings]);

  const generateId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addWidget = (widget: Omit<WidgetConfig, 'id'>) => {
    if (!currentLayout) return;
    
    const newWidget: WidgetConfig = {
      ...widget,
      id: generateId(),
    };
    
    const updatedLayout = {
      ...currentLayout,
      widgets: [...currentLayout.widgets, newWidget],
      updatedAt: new Date(),
    };
    
    setCurrentLayout(updatedLayout);
    setLayouts(prev => prev.map(l => l.id === currentLayout.id ? updatedLayout : l));
  };

  const removeWidget = (widgetId: string) => {
    if (!currentLayout) return;
    
    const updatedLayout = {
      ...currentLayout,
      widgets: currentLayout.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date(),
    };
    
    setCurrentLayout(updatedLayout);
    setLayouts(prev => prev.map(l => l.id === currentLayout.id ? updatedLayout : l));
  };

  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    if (!currentLayout) return;
    
    const updatedLayout = {
      ...currentLayout,
      widgets: currentLayout.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
      updatedAt: new Date(),
    };
    
    setCurrentLayout(updatedLayout);
    setLayouts(prev => prev.map(l => l.id === currentLayout.id ? updatedLayout : l));
  };

  const duplicateWidget = (widgetId: string) => {
    if (!currentLayout) return;
    
    const originalWidget = currentLayout.widgets.find(w => w.id === widgetId);
    if (!originalWidget) return;
    
    const duplicatedWidget: WidgetConfig = {
      ...originalWidget,
      id: generateId(),
      title: `${originalWidget.title} (Copia)`,
      position: { 
        x: originalWidget.position.x + 1, 
        y: originalWidget.position.y + 1 
      },
    };
    
    addWidget(duplicatedWidget);
  };

  const saveLayout = (name: string) => {
    if (!currentLayout) return;
    
    const newLayout: DashboardLayout = {
      id: `layout_${Date.now()}`,
      name,
      widgets: currentLayout.widgets,
      gridCols: gridSettings.cols,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setLayouts(prev => [...prev, newLayout]);
    setCurrentLayout(newLayout);
  };

  const loadLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (layout) {
      setCurrentLayout(layout);
    }
  };

  const deleteLayout = (layoutId: string) => {
    setLayouts(prev => prev.filter(l => l.id !== layoutId));
    if (currentLayout?.id === layoutId) {
      const remaining = layouts.filter(l => l.id !== layoutId);
      setCurrentLayout(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const resetLayout = () => {
    loadPreset('executive');
  };

  const loadPreset = (presetId: string) => {
    const preset = defaultPresets.find(p => p.id === presetId);
    if (preset) {
      const newLayout: DashboardLayout = {
        id: `preset_${presetId}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...preset.layout,
      };
      
      setCurrentLayout(newLayout);
      setLayouts(prev => [newLayout, ...prev.filter(l => !l.id.startsWith(`preset_${presetId}`))]);
    }
  };

  const setTheme = (theme: DashboardTheme) => {
    setCurrentTheme(theme);
  };

  const updateGridSettings = (settings: Partial<typeof gridSettings>) => {
    setGridSettings(prev => ({ ...prev, ...settings }));
  };

  // Edit mode function
  const setEditMode = (enabled: boolean) => {
    setIsEditMode(enabled);
  };

  const contextValue: DashboardContextType = {
    currentLayout,
    layouts,
    addWidget,
    removeWidget,
    updateWidget,
    duplicateWidget,
    saveLayout,
    loadLayout,
    deleteLayout,
    resetLayout,
    presets: defaultPresets,
    loadPreset,
    currentTheme,
    setTheme,
    isEditMode,
    setEditMode,
    gridSettings,
    updateGridSettings,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
