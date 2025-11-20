export interface ProductionPayment {
  id?: number;
  monto: number;
  fecha_pago: string | null;
  descripcion?: string | null;
}

export interface ProductionItem {
  id: number;
  cotizacionId: number;
  numeroCotizacion: string;
  tipoProduccion: 'cliente' | 'stock';
  numeroPedidoStock?: string | null;
  cliente: string | null;
  contacto: string | null;
  proyecto: string | null;
  odc: string | null;
  valorTotal: number | null;
  fechaIngreso: string | null;
  fechaVencimiento: string | null;
  archivoOriginal: string | null;
  producto: string;
  cantidad: string | null;
  valorSubtotal: number | null;
  fechaEntrega: string | null;
  estatus: string | null;
  notasEstatus: string | null;
  factura: string | null;
  guiaRemision?: string | null;
  fechaDespacho?: string | null;
  metadataNotes?: string[];
  pagos: ProductionPayment[];
  totalAbonado: number;
  saldoPendiente: number | null;
  esServicio?: boolean;
  bodega?: string | null;
  responsable?: string | null;
  fechaInicioPeriodo?: string | null;
  fechaFinPeriodo?: string | null;
}

export interface ProductionUploadResult {
  archivo: string;
  cotizacion: string;
  productos: number;
}

export interface ProductionUploadResponse {
  message: string;
  resultados: ProductionUploadResult[];
}

export interface ProductionStatusResponse {
  items: ProductionItem[];
  statusOptions: string[];
}

export interface ProductionDeleteResponse {
  message: string;
  quoteId: number;
}

export interface ProductionPaymentPayload {
  monto: number;
  fecha_pago: string | null;
  descripcion?: string | null;
}

export interface ProductionUpdatePayload {
  fechaIngreso?: string | null;
  fechaEntrega: string | null;
  estatus: string | null;
  notasEstatus: string | null;
  factura: string | null;
  guiaRemision: string | null;
  fechaDespacho: string | null;
  fechaVencimiento: string | null;
  valorTotal: number | null;
  pagos: ProductionPaymentPayload[];
  odc?: string | null;
}

export interface DailyProductionPlanEntry {
  fecha: string;
  metros: number;
  unidades: number;
  notas?: string | null;
}

export type DailyPlan = DailyProductionPlanEntry;

export interface DailyProductionPlanResponse {
  item_id: number;
  plan: DailyProductionPlanEntry[];
}

export interface DailyScheduleItem {
  item_id: number;
  numero_cotizacion?: string | null;
  cliente?: string | null;
  descripcion: string;
  metros: number;
  unidades: number;
  estatus?: string | null;
  manual: boolean;
}

export interface DailyScheduleDay {
  fecha: string;
  metros: number;
  unidades: number;
  capacidad?: number | null;
  manual: boolean;
  items: DailyScheduleItem[];
}

export interface DailyScheduleResponse {
  days: DailyScheduleDay[];
}

export interface StockDailyProgrammingEntry {
  fecha: string;
  cantidad: number;
}

export interface StockPlanningProduct {
  nombre: string;
  categoria?: string | null;
  unidad?: string | null;
  programacion_diaria: StockDailyProgrammingEntry[];
}

export interface StockPlanningParsedData {
  numero_pedido: string;
  responsable?: string | null;
  local?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  productos: StockPlanningProduct[];
}

export interface StockPlanningParseResponse {
  parsed_data: StockPlanningParsedData;
  message: string;
}

export interface StockPlanningConfirmPayload {
  parsed_data: StockPlanningParsedData;
  bodega: string;
  notas?: string | null;
}

export interface StockPlanningConfirmResponse {
  message: string;
  numero_pedido: string;
  cotizacion_id: number;
  numero_cotizacion: string;
  productos_creados: number;
  planes_diarios_creados: number;
  bodega: string;
}

// Types for Production Dashboard
export interface KpiCard {
  label: string;
  value: string;
  color?: string;
}

export interface DistributionChartItem {
  name: string;
  value: number;
}

export interface UpcomingDeliveryItem {
  id: number;
  numero_cotizacion?: string | null;
  descripcion: string;
  cliente?: string | null;
  fecha_entrega: string;
  dias_restantes: number;
  estatus?: string | null;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  total_value: number;
  percent: number;
  total_units: number;
  total_metros: number;
}

export type RiskAlertType = 'overdue' | 'due_soon' | 'missing_date' | 'missing_status';
export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskAlertItem {
  id: number;
  numero_cotizacion?: string | null;
  descripcion: string;
  cliente?: string | null;
  fecha_entrega?: string | null;
  dias: number;
  tipo: RiskAlertType;
  severidad: RiskSeverity;
  estatus?: string | null;
}

export interface WorkloadSnapshot {
  ingresos_hoy_unidades: number;
  ingresos_hoy_metros: number;
  ingresos_semana_unidades: number;
  ingresos_semana_metros: number;
  entregas_semana_unidades: number;
  entregas_semana_metros: number;
  promedio_plazo_dias?: number | null;
  promedio_retraso_dias?: number | null;
}

export interface FinancialSummary {
  total_en_produccion: number;  // Suma de valor_subtotal de productos activos
  total_cotizaciones_activas: number;  // Suma de valor_total de cotizaciones activas
  valor_atrasado: number;
  valor_listo_para_retiro: number;
  saldo_por_cobrar: number;
}

export type DataGapIssue =
  | 'sin_fecha_entrega'
  | 'sin_estatus'
  | 'sin_cliente'
  | 'sin_cantidad'
  | 'sin_programacion'
  | 'sin_factura';

export interface DataGapDetail {
  item_id: number;
  numero_cotizacion?: string | null;
  descripcion: string;
  cliente?: string | null;
  estatus?: string | null;
  issues: DataGapIssue[];
}

export interface DataGapSummary {
  sin_fecha_entrega: number;
  sin_estatus: number;
  sin_cliente: number;
  sin_cantidad: number;
  sin_programacion: number;
  sin_factura: number;
  detalles: DataGapDetail[];
}

export interface TopClientItem {
  name: string;
  item_count: number;
  total_value: number;
  total_units: number;
  total_metros: number;
}

export interface DailyWorkloadItem {
  fecha: string;
  metros: number;
  unidades: number;
}

export interface DashboardKpisResponse {
  kpi_cards: KpiCard[];
  production_load_chart: DistributionChartItem[];
  status_breakdown: StatusBreakdownItem[];
  risk_alerts: RiskAlertItem[];
  workload_snapshot: WorkloadSnapshot;
  financial_summary: FinancialSummary;
  top_clients: TopClientItem[];
  upcoming_deliveries: UpcomingDeliveryItem[];
  data_gaps: DataGapSummary;
  daily_workload: DailyWorkloadItem[];
}
