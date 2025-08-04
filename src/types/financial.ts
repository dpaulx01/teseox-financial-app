// Tipos de datos financieros para el frontend TypeScript

export interface AccountNode {
  code: string;
  name: string;
  level: number;
  value: number;
  percentage?: number;
  horizontal_change?: number;
  children: AccountNode[];
  account_type: 'cuenta' | 'subtotal' | 'total';
  is_expanded: boolean;
  metadata: Record<string, any>;
}

export interface PyGConfig {
  view_type: 'contable' | 'operativo' | 'caja' | 'ebitda';
  analysis_month?: string; // "2024-01" format
  enable_vertical_analysis: boolean;
  enable_horizontal_analysis: boolean;
  comparison_month?: string;
  excluded_accounts?: string[];
}

export interface PyGResult {
  account_tree: AccountNode;
  kpis: Record<string, number>;
  summary: {
    period_type: 'monthly' | 'annual';
    total_accounts: number;
    performance_indicator: 'positive' | 'negative';
    key_metrics: {
      revenue: number;
      net_margin: number;
      profitability: 'high' | 'medium' | 'low';
    };
  };
  insights: string[];
  config: PyGConfig;
  generated_at: string;
}

export interface FinancialData {
  accounts: AccountRecord[];
  period: string;
  company: string;
  currency: string;
}

export interface AccountRecord {
  code: string;
  name?: string;
  nombre?: string;
  value?: number;
  annual_total?: number;
  total?: number;
  monthly_data?: Record<string, number>;
  [key: string]: any; // Para campos dinámicos como "2024_01", etc.
}

export interface KPIMetric {
  name: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  target?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    type?: 'bar' | 'line' | 'area';
  }[];
}

export interface WaterfallData {
  category: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BrainResponse {
  response: string;
  reasoning: string;
  confidence: number;
  tools_used: string[];
}

// Analysis Types
export interface PortfolioAnalysis {
  total_portfolio_value: number;
  total_cost: number;
  total_return_percentage: number;
  profit_loss: number;
  analysis_date: string;
  diversification?: Record<string, number>;
}

export interface RiskAnalysis {
  mean_return: number;
  volatility: number;
  value_at_risk: number;
  sharpe_ratio: number;
  risk_level: 'High' | 'Medium' | 'Low';
}

export interface TransactionAnalysis {
  total_transactions: number;
  total_amount: number;
  average_transaction: number;
  categories_breakdown: Record<string, number>;
  potential_anomalies: number;
  analysis_date: string;
}

// UI State Types
export interface PyGViewState {
  selectedMonth: string | null;
  viewType: PyGConfig['view_type'];
  expandedNodes: Set<string>;
  showVerticalAnalysis: boolean;
  showHorizontalAnalysis: boolean;
  comparisonMonth: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'insight';
  title: string;
  size: { w: number; h: number };
  position: { x: number; y: number };
  config: Record<string, any>;
  data?: any;
}

export interface FilterOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  accountCategories?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

// Predictive Analysis Types
export interface PredictiveScenario {
  name: string;
  description: string;
  variables: Record<string, number>; // variable name -> change percentage
  projected_results: PyGResult;
}

export interface WhatIfAnalysis {
  baseline: PyGResult;
  scenarios: PredictiveScenario[];
  sensitivity_analysis: {
    variable: string;
    impact_on_profit: number;
  }[];
}