// Tipos para el dashboard personalizable

export interface WidgetConfig {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'insight' | 'waterfall' | 'trend' | 'predictive' | 'scenarios';
  title: string;
  size: { w: number; h: number };
  position: { x: number; y: number };
  settings: Record<string, any>;
  isVisible: boolean;
  isLocked: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  gridCols: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIWidgetSettings {
  metric: 'ingresos' | 'costos' | 'utilidad' | 'margen_neto' | 'margen_bruto' | 'ebitda';
  format: 'currency' | 'percentage' | 'number';
  showTrend: boolean;
  showTarget: boolean;
  target?: number;
  period: 'current' | 'ytd' | 'custom';
}

export interface ChartWidgetSettings {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'waterfall' | 'treemap';
  dataSource: 'pnl' | 'breakdown' | 'trend' | 'comparison';
  period: 'monthly' | 'quarterly' | 'yearly';
  showLegend: boolean;
  showValues: boolean;
  colorScheme: 'default' | 'monochrome' | 'vibrant' | 'professional';
}

export interface TableWidgetSettings {
  view: 'tree' | 'flat' | 'summary';
  level: number; // Nivel de profundidad para mostrar
  showVertical: boolean;
  showHorizontal: boolean;
  sortBy: 'code' | 'name' | 'value' | 'percentage';
  sortOrder: 'asc' | 'desc';
  pageSize: number;
}

export interface InsightWidgetSettings {
  insightTypes: ('trend' | 'anomaly' | 'comparison' | 'recommendation')[];
  maxInsights: number;
  severity: 'all' | 'high' | 'medium' | 'low';
  autoRefresh: boolean;
}

export interface PredictiveWidgetSettings {
  view: 'trends' | 'scenarios' | 'forecast';
  timeHorizon: 'quarter' | 'year' | 'custom';
  confidenceLevel: number;
  showRisks: boolean;
  showOpportunities: boolean;
}

export interface ScenariosWidgetSettings {
  activeScenarios: string[];
  comparisonMode: 'side-by-side' | 'overlay' | 'diff';
  showConfidence: boolean;
  maxScenarios: number;
  autoSave: boolean;
}

export interface DashboardTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  effects: {
    glow: boolean;
    glassmorphism: boolean;
    animations: boolean;
    particles: boolean;
  };
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>;
  thumbnail?: string;
  category: 'executive' | 'analyst' | 'operational' | 'custom';
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'xlarge';
export type WidgetPosition = { x: number; y: number };

export interface WidgetTemplate {
  type: WidgetConfig['type'];
  name: string;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  icon: string;
  category: 'analytics' | 'visualization' | 'insights' | 'performance';
}