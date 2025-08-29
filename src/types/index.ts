// === TIPOS DE CLASIFICACIÓN DE COSTOS ===
export type CostClassification = 'Variable' | 'Fijo' | 'Semi-variable' | 'Escalonado';
export type BreakEvenClassification = 'CFT' | 'CVU' | 'PVU' | 'MIX';

export interface FinancialData {
  monthly: Record<string, MonthlyData>;
  yearly: YearlyData;
  average?: MonthlyData; // Datos promedio calculados desde SQL views
  kpis: KPI[];
  breakEven: BreakEvenData;
  raw: RawDataRow[];
  source?: string; // Fuente de los datos (ej: 'mysql_views_v2')
}

export interface MonthlyData {
  ingresos: number;
  costosVariables: number;
  costosFijos: number;
  utilidadBruta: number;
  gastosOperativos: number;
  ebitda: number;
  utilidadNeta: number;
  depreciacion: number;
  costoVentasTotal: number;
  gastosAdminTotal: number;
  gastosVentasTotal: number;
  puntoEquilibrio: number;
  puntoEquilibrioAcumulado: number;
  // Segmentación detallada de costos
  costoMateriaPrima: number;
  costoProduccion: number;
  costoOperativo: number;
}

export interface YearlyData extends Omit<MonthlyData, 'puntoEquilibrio' | 'puntoEquilibrioAcumulado'> {}

export interface KPI {
  name: string;
  value: number;
  unit: string;
}

export interface BreakEvenData {
  yearly: number;
}

export interface RawDataRow {
  'COD.'?: string;
  'CUENTA'?: string;
  [month: string]: string | number | undefined;
}

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tooltip?: string;
  onViewDetails?: () => void;
}

export interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export interface DataUploaderProps {
  onDataLoaded: (data: FinancialData) => void;
}

// === NUEVAS INTERFACES PARA PRODUCCIÓN ===

export interface ProductionData {
  month: string;
  metrosProducidos: number;
  metrosVendidos: number;
  fechaRegistro: string;
}

export interface OperationalMetrics {
  month: string;
  costoProduccionPorMetro: number; // Costo total de producción por metro (incluye fijos y variables)
  costoVariablePorMetro: number; // Costo variable por metro
  precioVentaPorMetro: number;
  margenPorMetro: number;
  margenPorcentual: number;
  productividad: number; // metros producidos vs capacidad
  eficienciaVentas: number; // metros vendidos vs producidos
}

// === TIPOS PARA INSIGHTS ===

export interface FinancialDataMonthly {
  month: string;
  accounts: AccountData[];
  operationalResults?: {
    ingresos: number;
    costosVariables: number;
    costosFijos: number;
    ebitda: number;
    ebit: number;
    utilidadNeta: number;
  };
  productionData?: {
    installedCapacity: number;
    capacityUtilization: number;
    unitsProduced: number;
    unitsSold: number;
  };
}

export interface AccountData {
  code: string;
  name: string;
  amount: number;
  type: 'revenue' | 'fixed_cost' | 'variable_cost' | 'mixed_cost';
}

export interface ProductionConfig {
  capacidadMaximaMensual: number;
  costoFijoProduccion: number;
  metaPrecioPromedio: number;
  metaMargenMinimo: number;
}

export interface CombinedData {
  financial: FinancialData;
  production: ProductionData[];
  operational: OperationalMetrics[];
  config: ProductionConfig;
  lastUpdated: string;
}

export interface DataConfigProps {
  onDataConfigured: (data: CombinedData) => void;
}

// Movido abajo con definición extendida

export interface SimulatedData {
  ingresos: number;
  costosFijos: number;
  costosVariables: number;
  puntoEquilibrio: number;
  margenContribucion: number;
  margenContribucionPorc: number;
  utilidadNeta: number;
}

// === TIPOS PARA ANÁLISIS MULTINIVEL DE PUNTO DE EQUILIBRIO ===

export type BreakEvenAnalysisType = 'contable' | 'operativo' | 'caja';

export interface BreakEvenLevelConfig {
  includeDepreciacion: boolean;
  includeIntereses: boolean;
  description: string;
  objective: string;
}

export interface MultiLevelBreakEvenData {
  contable: BreakEvenResult;
  operativo: BreakEvenResult;
  caja: BreakEvenResult;
}

export interface BreakEvenResult {
  puntoEquilibrio: number;
  costosFijos: number;
  costosVariables: number;
  ingresos: number;
  margenContribucion: number;
  margenContribucionPorc: number;
  utilidadNeta: number;
  depreciacion: number;
  intereses: number;
  ebitda: number;
  ebit: number;
}

export interface AccountTypeConfig {
  depreciacion: string[];
  intereses: string[];
  amortizacion: string[];
}

// === TIPOS PARA COSTOS MIXTOS/SEMIVARIABLES ===

export interface MixedCost {
  accountCode: string;
  accountName: string;
  fixedComponent: number;
  variableRate: number; // Por unidad vendida o por $ de ingresos
  baseMeasure: 'units' | 'revenue'; // Base para el componente variable
  totalValue: number;
  isActive: boolean;
  // Nuevos campos para modo manual
  inputMode?: 'auto' | 'manual'; // Modo de entrada
  variableAmount?: number; // Valor monetario directo del componente variable
}

export interface MixedCostAnalysis {
  totalFixed: number;
  totalVariable: number;
  totalMixed: number;
  costs: MixedCost[];
}

// === NUEVAS INTERFACES PARA ANÁLISIS MULTIPRODUCTO ===

export interface ProductBreakEven {
  productId: string;
  productName: string;
  precioVentaUnitario: number;
  costoVariableUnitario: number;
  margenContribucionUnitario: number;
  participacionVentas: number; // % del mix total (debe sumar 100%)
  unidadesVendidas?: number;
  unidadMedida?: string; // ej: "unidades", "kg", "m²", "horas"
  categoria?: string; // Para agrupación
  costosFijosDirectos?: number; // Costos fijos específicos del producto
}

export interface MultiProductBreakEvenData {
  products: ProductBreakEven[];
  mcppTotal: number; // Margen Contribución Promedio Ponderado
  breakEvenTotalUnidades: number;
  breakEvenTotalValor: number;
  breakEvenByProduct: Record<string, { unidades: number; valor: number }>;
  salesMixActual: Record<string, number>;
  salesMixOptimo?: Record<string, number>; // Para optimización futura
  rentabilidadByProduct: Record<string, number>; // ROI por producto
}

// === INTERFACES PARA COSTOS MIXTOS ===

export type CostClassification = 'Variable' | 'Fijo' | 'Semi-variable' | 'Escalonado';

export interface MixedCostDetails {
  accountCode: string;
  accountName: string;
  totalCost: number;
  fixedComponent: number;
  variableRate: number; // costo variable por unidad de actividad
  method: 'manual' | 'high-low' | 'regression';
  activityBase: string; // ej: "unidades producidas", "horas máquina", "m² vendidos"
  dataPoints?: Array<{ activity: number; totalCost: number; period: string }>;
  r2?: number; // coeficiente de determinación (bondad de ajuste)
  confidence?: 'high' | 'medium' | 'low';
}

export interface ExtendedBreakEvenResult extends BreakEvenResult {
  multiProductData?: MultiProductBreakEvenData;
  mixedCosts?: MixedCostDetails[];
  unitAnalysis?: {
    unitType: string;
    unitsToBreakEven: number;
    revenuePerUnit: number;
    variableCostPerUnit: number;
    contributionMarginPerUnit: number;
  };
}

// === INTERFACES PARA ESCENARIOS GUARDADOS ===

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
  parameters: {
    month: string;
    analysisType: BreakEvenAnalysisType;
    priceChange: number;
    fixedCostChange: number;
    variableCostRateChange: number;
    targetProfit?: number;
    productMix?: ProductBreakEven[];
    customClassifications?: Record<string, CostClassification>;
  };
  results: ExtendedBreakEvenResult;
  tags?: string[];
  isBaseline?: boolean; // Escenario base para comparaciones
}

// === INTERFACES PARA ANÁLISIS ADAPTATIVO ===

export type VolatilityProfile = 'stable' | 'moderate' | 'volatile';

export interface OutlierData {
  monthIndex: number;
  month: string;
  metric: string;
  value: number;
  deviation: number;
  severity: 'mild' | 'moderate' | 'extreme';
}

export interface VolatilityAnalysis {
  coefficientOfVariation: number;
  profile: VolatilityProfile;
  stabilityScore: number; // 0-1, donde 1 es más estable
  trendDetected: boolean;
  seasonalityDetected: boolean;
}

export interface MetricVolatilityProfile {
  ingresos: VolatilityAnalysis;
  costosFijos: VolatilityAnalysis;
  costosVariables: VolatilityAnalysis;
  margenContribucion: VolatilityAnalysis;
  overall: VolatilityProfile;
}

export interface OutlierAnalysis {
  detectedOutliers: OutlierData[];
  totalOutliers: number;
  cleanDatasetSize: number;
  outlierPercentage: number;
  affectedMetrics: string[];
  recommendation: 'include' | 'exclude' | 'investigate';
}

export interface AdaptiveStrategy {
  primary: string;
  secondary?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  actionableSteps: string[];
  riskFactors: string[];
  opportunities: string[];
}

export interface EnhancedBreakEvenStatistics {
  // Datos base (extendiendo el tipo existente)
  contable: any;
  operativo: any;
  caja: any;
  recommendation: any;
  
  // Nuevas funcionalidades adaptativas
  volatilityProfile: MetricVolatilityProfile;
  outlierAnalysis: OutlierAnalysis;
  adaptiveStrategy: AdaptiveStrategy;
  diagnostics: {
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    analysisReliability: number; // 0-1
    recommendedActions: string[];
  };
}
