import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getTenantBrand } from '../../../utils/tenantBrand';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileDown,
  Info,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  DailyProductionPlanEntry,
  ProductionItem,
  ProductionPayment,
  ProductionUpdatePayload,
} from '../../../types/production';
import useProductionSchedule from '../hooks/useProductionSchedule';
import ProductionCalendarBoard from './ProductionCalendarBoard';
import ProductSummaryView from './ProductSummaryView';
import ClientDetailDrawer from './ClientDetailDrawer';
import financialAPI from '../../../services/api';
import DailyProductionModal from './DailyProductionModal';
import FinancialDetailModal from './FinancialDetailModal';
import { useDailyPlans } from '../hooks/useDailyPlans';
import { getWorkingDaysBetween, parseISODate } from '../utils/dateUtils';
import { extractQuantityInfo, formatNumber } from '../utils/quantityUtils';

type SortKey =
  | 'fechaIngreso'
  | 'odc'
  | 'numeroCotizacion'
  | 'cliente'
  | 'totalCotizacion'
  | 'totalAbonado'
  | 'saldoPendiente';

type ProductSortKey =
  | 'producto'
  | 'cliente'
  | 'numeroCotizacion'
  | 'fechaIngreso'
  | 'cantidad'
  | 'fechaEntrega'
  | 'estatus';

type ViewMode = 'quotes' | 'products' | 'clients' | 'calendar';
type ProductionTypeFilter = 'all' | 'cliente' | 'stock';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface Filters {
  query: string;
  client: string;
  status: string;
  from: string;
  to: string;
  productionType: ProductionTypeFilter;
}

type PaymentForm = {
  monto: string;
  fecha_pago: string;
  descripcion: string;
};

interface RowFormState {
  fechaEntrega: string;
  estatus: string;
  notasEstatus: string;
  factura: string;
  guiaRemision: string;
  fechaDespacho: string;
  fechaVencimiento: string;
  pagos: PaymentForm[];
}

interface DeliveryPromptState {
  item: ProductionItem;
  previousForm: RowFormState;
  nextForm: RowFormState;
}

interface QuoteRowFormState {
  fechaIngreso: string;
  factura: string;
  fechaVencimiento: string;
  pagos: PaymentForm[];
}

interface QuoteGroup {
  cotizacionId: number;
  numeroCotizacion: string;
  tipoProduccion: 'cliente' | 'stock';
  numeroPedidoStock: string | null;
  odc: string | null;
  cliente: string | null;
  contacto: string | null;
  proyecto: string | null;
  fechaIngreso: string | null;
  archivoOriginal: string | null;
  bodega: string | null;
  responsable: string | null;
  fechaInicioPeriodo: string | null;
  fechaFinPeriodo: string | null;
  fechaVencimiento: string | null;
  totalCotizacion: number | null;
  totalAbonado: number;
  saldoPendiente: number | null;
  estatusSummary: string[];
  facturas: string[];
  pagos: PaymentForm[];
  metadataNotes: string[];
  items: ProductionItem[];
}

interface ProductViewRowModel {
  item: ProductionItem;
  form: RowFormState;
  progress: ProgressInfo | null;
  quantity: { amount: number | null; unit: 'metros' | 'unidades' };
  quote: QuoteGroup | undefined;
  saving: 'idle' | 'saving' | 'success' | 'error';
  colorClass: string;
  readOnly: boolean;
  isHighlighted: boolean;
  validationError?: string | null;
}

interface ClientSummaryRow {
  client: string;
  cotizacionCount: number;
  productoCount: number;
  metros: number;
  unidades: number;
  saldo: number;
  entregasProximas: number;
  fechaProxima?: string;
}

interface ExternalFocusPayload {
  focusItemId?: number | null;
  focusQuoteNumber?: string | null;
  viewMode?: ViewMode;
  searchQuery?: string | null;
  productViewType?: 'summary' | 'detailed';
}

interface StatusTableProps {
  items: ProductionItem[];
  statusOptions: string[];
  onSave: (id: number, payload: ProductionUpdatePayload) => Promise<void>;
  isSaving: (id: number) => boolean;
  onDeleteQuote: (quoteId: number) => Promise<void>;
  viewMode: ViewMode;
  externalFocus?: ExternalFocusPayload | null;
  onConsumeExternalFocus?: () => void;
  onRequestViewChange?: (viewMode: ViewMode) => void;
  readOnlyStatuses?: string[];
  showDeliverySummary?: boolean;
}

interface ProgressInfo {
  percent: number;
  color: string;
  label: string;
  tooltip: string;
  producedEstimate: number | null;
  quantity: number | null;
  quantityUnit: 'metros' | 'unidades';
}

const defaultFilters: Filters = {
  query: '',
  client: '',
  status: '',
  from: '',
  to: '',
  productionType: 'all',
};

const SETTLED_TOLERANCE = 0.01;

const openPdfPreview = (doc: jsPDF, fileName: string) => {
  try {
    const pdfDataUri = doc.output('datauristring');
    const previewWindow = window.open('', '_blank', 'noopener,noreferrer');

    if (!previewWindow) {
      throw new Error('PDF preview blocked');
    }

    previewWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${fileName}</title>
          <meta charset="utf-8" />
          <style>
            html, body { margin: 0; height: 100%; background: #111; }
            iframe { border: 0; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <iframe src="${pdfDataUri}" title="${fileName}"></iframe>
        </body>
      </html>
    `);
    previewWindow.document.close();
  } catch (error) {
    console.warn('No se pudo abrir el PDF en una pestaña nueva, descargando directamente.', error);
    doc.save(fileName);
  }
};

const statusBadgeVariants: Record<string, string> = {
  'En cola': 'bg-dark-card/70 text-text-muted border border-border/40',
  'En producción': 'bg-primary-glow text-primary border border-primary/30',
  'Producción parcial': 'bg-warning-glow text-warning border border-warning/30',
  'Listo para retiro': 'bg-accent-glow text-accent border border-accent/30',
  'En bodega': 'bg-accent/20 text-accent border border-accent/40',
  Entregado: 'bg-accent/20 text-accent border border-accent/40',
};

const STATUS_SEQUENCE = [
  'En cola',
  'En producción',
  'Producción parcial',
  'Listo para retiro',
  'En bodega',
  'Entregado',
] as const;

const STATUS_ORDER_MAP: Record<string, number> = STATUS_SEQUENCE.reduce(
  (acc, status, index) => {
    acc[status] = index;
    return acc;
  },
  {} as Record<string, number>,
);

const metadataKeywords = [
  'TIEMPO DE PRODUCCION',
  'TIEMPO ESTIMADO',
  'DIAS CALENDARIO',
  'DIAS HABILES',
  'ENTREGA ESTIMADA',
  'CONDICIONES DE PAGO',
  'CONDICIONES GENERALES',
  'OBSERVACIONES',
  'PROGRAMACION',
  'DESPACHO',
  'REFERENCIA TRANSPORTE',
];

function resolveProductionType(item: ProductionItem): 'cliente' | 'stock' {
  return (item.tipoProduccion ?? 'cliente') as 'cliente' | 'stock';
}

function getClientLabel(item: ProductionItem): string {
  if (resolveProductionType(item) === 'stock') {
    const parts: string[] = [];
    if (item.numeroPedidoStock) {
      parts.push(item.numeroPedidoStock);
    }
    if (item.bodega) {
      parts.push(item.bodega);
    }
    if (item.responsable) {
      parts.push(item.responsable);
    }
    const descriptor = parts.length > 0 ? parts.join(' • ') : item.numeroCotizacion;
    return `Stock • ${descriptor}`;
  }
  return item.cliente?.trim() || 'Sin cliente';
}

function getSearchableFields(item: ProductionItem): Array<string | null | undefined> {
  return [
    item.numeroCotizacion,
    item.producto,
    item.cantidad,
    item.cliente,
    item.contacto,
    item.proyecto,
    item.odc,
    item.factura,
    item.notasEstatus,
    item.numeroPedidoStock,
    item.bodega,
    item.responsable,
  ];
}

const DAY_IN_MS = 86_400_000;
const baseDateInputClass =
  'bg-dark-card/70 border border-border rounded-lg text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed dark:bg-[#11131a] dark:text-white dark:border-border dark:[color-scheme:dark]';

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function includesNormalized(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return normalizeText(haystack).includes(needle);
}

const WAITING_STATUS_SIGNATURE = normalizeText('En cola');

function resolveStatusFromDelivery(
  status: string | null | undefined,
  fechaEntrega: string | null | undefined,
): string | null {
  const hasDeliveryDate = Boolean(fechaEntrega && fechaEntrega.trim().length > 0);
  const trimmedStatus = status?.trim() ?? '';

  if (hasDeliveryDate) {
    if (!trimmedStatus) {
      return 'En producción';
    }
    if (normalizeText(trimmedStatus) === WAITING_STATUS_SIGNATURE) {
      return 'En producción';
    }
  }

  return trimmedStatus || null;
}

function normalizeStatusForSave(
  status: string | null | undefined,
  fechaEntrega: string | null | undefined,
): string | null {
  return resolveStatusFromDelivery(status, fechaEntrega);
}

function parseDateValue(dateLike: string | null | undefined): number | null {
  if (!dateLike) {
    return null;
  }
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}

function isMetadataDescription(descripcion: string | null | undefined): boolean {
  const normalized = normalizeText(descripcion);
  if (!normalized) {
    return false;
  }
  if (normalized.includes('||')) {
    return true;
  }
  if (/^(odc|orden\s+de\s+compra)\b/.test(normalized)) {
    return true;
  }
  return metadataKeywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function normalizePaymentsToForm(
  payments: Array<ProductionPayment | PaymentForm>,
): PaymentForm[] {
  return payments.map((pago) => ({
    monto:
      typeof pago.monto === 'number'
        ? String(pago.monto ?? '')
        : (pago.monto as string) ?? '',
    fecha_pago: pago.fecha_pago ?? '',
    descripcion: pago.descripcion ?? '',
  }));
}

function cloneRowFormState(form: RowFormState | null | undefined): RowFormState | null {
  if (!form) {
    return null;
  }
  return {
    ...form,
    pagos: form.pagos.map((pago) => ({ ...pago })),
  };
}

function buildFormStateFromItem(item: ProductionItem): RowFormState {
  return {
    fechaEntrega: item.fechaEntrega ?? '',
    estatus: item.estatus ?? '',
    notasEstatus: item.notasEstatus ?? '',
    factura: item.factura ?? '',
    guiaRemision: item.guiaRemision ?? '',
    fechaDespacho: item.fechaDespacho ?? '',
    fechaVencimiento: item.fechaVencimiento ?? '',
    pagos: normalizePaymentsToForm(item.pagos),
  };
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumberWithDash(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateLabel(dateIso: string | null | undefined): string {
  if (!dateIso) {
    return 'Sin fecha';
  }
  const trimmed = dateIso.trim();
  const [datePart] = trimmed.split('T');
  if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
}

function compareValues<T>(aValue: T, bValue: T): number {
  if (aValue === bValue) return 0;
  if (aValue === null || aValue === undefined) return -1;
  if (bValue === null || bValue === undefined) return 1;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return aValue - bValue;
  }
  return String(aValue).localeCompare(String(bValue), 'es', { sensitivity: 'base' });
}

function buildQuoteFileUrl(filename: string | null | undefined): string | null {
  if (!filename) {
    return null;
  }
  const baseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
  const normalizedBase = String(baseUrl).replace(/\/$/, '');
  return `${normalizedBase}/uploads/production/${filename}`;
}

function parseQuantityFromString(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

const meterKeywords = ['m2', 'm3', 'metro', 'metros', 'mt', 'mts', 'ml'];
const unitKeywords = ['unidad', 'unidades', 'und', 'unds', 'pieza', 'piezas', 'pza', 'pzas', 'pz', 'pzs', ' u'];
const productColorPalette = [
  'bg-accent/15 border border-accent/50 rounded-lg shadow-sm',
  'bg-primary/15 border border-primary/50 rounded-lg shadow-sm',
  'bg-warning/15 border border-warning/50 rounded-lg shadow-sm',
  'bg-danger/15 border border-danger/50 rounded-lg shadow-sm',
  'bg-accent/10 border border-accent/40 rounded-lg shadow-sm',
  'bg-primary/10 border border-primary/40 rounded-lg shadow-sm',
];

function getStatusProgressPercent(estatus: string | null | undefined): number {
  const status = estatus ?? '';
  switch (status) {
    case 'Entregado':
      return 100;
    case 'Listo para retiro':
      return 90;
    case 'Producción parcial':
      return 70;
    case 'En producción':
      return 50;
    case 'En cola':
      return 10;
    default:
      return 0;
  }
}

function progressColorFromPercent(percent: number): string {
  if (percent >= 100) return 'bg-accent';
  if (percent > 85) return 'bg-accent';
  if (percent > 60) return 'bg-warning';
  if (percent > 40) return 'bg-primary';
  return 'bg-dark-card border border-border';
}

function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  // Loop through each day, checking if it's a weekday
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

function _iter_working_days(startDate: Date, endDate: Date): Date[] {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return [];
  }
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const start = new Date(startDate.getTime());
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getTime());
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    return [];
  }

  const productionEnd = (() => {
    const candidate = new Date(end.getTime());
    if (candidate > start) {
      candidate.setDate(candidate.getDate() - 1);
      while (candidate > start && (candidate.getDay() === 0 || candidate.getDay() === 6)) {
        candidate.setDate(candidate.getDate() - 1);
      }
    }
    if (candidate < start) {
      return new Date(start.getTime());
    }
    return candidate;
  })();

  const days: Date[] = [];
  for (
    let current = new Date(start.getTime());
    current <= productionEnd;
    current.setDate(current.getDate() + 1)
  ) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(current.getTime()));
    }
  }

  if (days.length === 0 && start.getDay() !== 0 && start.getDay() !== 6) {
    days.push(start);
  }

  return days;
}

function computeProgress(
  item: ProductionItem,
  fechaEntrega: string | null | undefined,
  estatus: string | null | undefined,
  dailyPlan?: DailyProductionPlanEntry[] | null,
): ProgressInfo | null {
  const effectiveStatus = resolveStatusFromDelivery(estatus, fechaEntrega);
  const statusLabel = effectiveStatus || 'Sin estatus';
  const tooltipParts: string[] = [];
  const percentFromStatus = getStatusProgressPercent(effectiveStatus);
  const quantity = parseQuantityFromString(item.cantidad);
  const quantityInfo = extractQuantityInfo(item.cantidad);
  const targetUnit = quantityInfo.unit;
  const unitLabel = targetUnit === 'metros' ? 'm²' : 'u';

  if (effectiveStatus) {
    tooltipParts.push(`Estatus: ${effectiveStatus}`);
  }
  if (fechaEntrega) {
    tooltipParts.push(`Entrega: ${formatDateLabel(fechaEntrega)}`);
  }

  const fechaIngresoDate = item.fechaIngreso ? new Date(item.fechaIngreso.split('T')[0]) : null;
  const fechaEntregaDate = fechaEntrega ? new Date(fechaEntrega) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let percentFromTime = 0;
  let producedEstimate: number | null = null;

  const statusFloors: Record<string, number> = {
    'Producción parcial': 70,
    'Listo para retiro': 90,
    Entregado: 100,
  };

  // Si tenemos plan diario real, usarlo en lugar del cálculo estimado
  if (dailyPlan && dailyPlan.length > 0 && quantity !== null && quantity > 0) {
    // Calcular producción real hasta hoy
    const producedSoFar = dailyPlan
      .filter(entry => {
        const entryDate = parseISODate(entry.fecha);
        return entryDate && entryDate <= today;
      })
      .reduce((sum, entry) => {
        return sum + (targetUnit === 'metros' ? entry.metros : entry.unidades);
      }, 0);

    // Calcular total planificado
    const totalPlanned = dailyPlan.reduce((sum, entry) => {
      return sum + (targetUnit === 'metros' ? entry.metros : entry.unidades);
    }, 0);

    if (totalPlanned > 0) {
      percentFromTime = (producedSoFar / totalPlanned) * 100;
      producedEstimate = producedSoFar;
      
      const totalDays = dailyPlan.length;
      const completedDays = dailyPlan.filter(entry => {
        const entryDate = parseISODate(entry.fecha);
        return entryDate && entryDate <= today;
      }).length;
      
      tooltipParts.push(
        `Plan real: ${Math.round(percentFromTime)}% (${formatNumber(producedSoFar)}/${formatNumber(totalPlanned)} ${unitLabel})`
      );
      tooltipParts.push(`Días completados: ${completedDays}/${totalDays}`);
    }
  } else if (
    fechaIngresoDate &&
    fechaEntregaDate &&
    fechaEntregaDate >= fechaIngresoDate &&
    quantity !== null &&
    quantity > 0
  ) {
    // Fallback a cálculo estimado con días hábiles mejorados
    const workingDays = getWorkingDaysBetween(fechaIngresoDate, fechaEntregaDate);
    const totalDays = workingDays.length;
    if (totalDays > 0) {
      const elapsedDays = workingDays.filter((day) => day <= today).length;
      percentFromTime = (elapsedDays / totalDays) * 100;
      const produccionDiaria = quantity / totalDays;
      producedEstimate = produccionDiaria * elapsedDays;
      tooltipParts.push(
        `Avance estimado: ${Math.round(percentFromTime)}% (${elapsedDays}/${totalDays} días hábiles)`
      );
    }
  } else if (fechaEntregaDate && fechaEntregaDate < today) {
    percentFromTime = 95;
    tooltipParts.push('Avance por tiempo: 95% (entrega vencida)');
  }

  const hasTimeProgress = percentFromTime > 0;
  let percent = hasTimeProgress ? percentFromTime : 0;

  const statusFloor = statusFloors[estatus ?? ''];
  if (typeof statusFloor === 'number') {
    percent = Math.max(percent, statusFloor);
  } else if (!hasTimeProgress && percentFromStatus > 0) {
    percent = Math.min(percentFromStatus, 10);
  }

  if (quantity !== null && producedEstimate === null && percent > 0) {
    producedEstimate = (percent / 100) * quantity;
  }

  return {
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    color: progressColorFromPercent(percent),
    label: statusLabel,
    tooltip: tooltipParts.join(' • '),
    producedEstimate,
    quantity,
    quantityUnit: targetUnit,
  };
}

function matchesFilters(item: ProductionItem, filters: Filters): boolean {
  const tipo = resolveProductionType(item);
  if (filters.productionType !== 'all' && filters.productionType !== tipo) {
    return false;
  }

  if (filters.status) {
    const effectiveStatus = resolveStatusFromDelivery(item.estatus, item.fechaEntrega) ?? '';
    if (effectiveStatus !== filters.status) {
      return false;
    }
  }

  if (filters.client) {
    const needle = normalizeText(filters.client);
    const clientCandidates = [
      item.cliente,
      item.contacto,
      item.proyecto,
      item.numeroPedidoStock,
      item.bodega,
      item.responsable,
      getClientLabel(item),
    ];
    const matchesClient = clientCandidates.some((value) => includesNormalized(value, needle));
    if (!matchesClient) {
      return false;
    }
  }

  if (filters.query) {
    const needle = normalizeText(filters.query);
    const haystacks = getSearchableFields(item);
    const matchesQuery =
      haystacks.some((value) => includesNormalized(value, needle)) ||
      includesNormalized(
        item.valorSubtotal !== null && item.valorSubtotal !== undefined
          ? formatNumberWithDash(item.valorSubtotal)
          : '',
        needle,
      ) ||
      includesNormalized(
        item.valorTotal !== null && item.valorTotal !== undefined
          ? formatNumberWithDash(item.valorTotal)
          : '',
        needle,
      );
    if (!matchesQuery) {
      return false;
    }
  }

  const ingresoTime = parseDateValue(item.fechaIngreso);
  if (filters.from) {
    const fromTime = parseDateValue(filters.from);
    if (fromTime && (ingresoTime === null || ingresoTime < fromTime)) {
      return false;
    }
  }
  if (filters.to) {
    const toTime = parseDateValue(filters.to);
    if (toTime && (ingresoTime === null || ingresoTime > toTime)) {
      return false;
    }
  }

  return true;
}

const StatusTable: React.FC<StatusTableProps> = ({
  items,
  statusOptions,
  onSave,
  isSaving,
  onDeleteQuote,
  viewMode = 'quotes',
  externalFocus,
  onConsumeExternalFocus,
  onRequestViewChange,
  readOnlyStatuses,
  showDeliverySummary = false,
}) => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'fechaIngreso',
    direction: 'desc',
  });
  const [productSortConfig, setProductSortConfig] = useState<{ key: ProductSortKey; direction: 'asc' | 'desc' }>({
    key: 'fechaEntrega',
    direction: 'asc',
  });
  const [forms, setForms] = useState<Record<number, RowFormState>>({});
  const [validationErrors, setValidationErrors] = useState<Record<number, string | null>>({});
  const [savingStatus, setSavingStatus] = useState<Record<number, 'idle' | 'saving' | 'success' | 'error'>>({});
  const [planModalItem, setPlanModalItem] = useState<ProductionItem | null>(null);
  const [planModalData, setPlanModalData] = useState<DailyProductionPlanEntry[]>([]);
  const [planModalLoading, setPlanModalLoading] = useState<boolean>(false);
  const [planModalSaving, setPlanModalSaving] = useState<boolean>(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);
  const [deliveryPrompt, setDeliveryPrompt] = useState<DeliveryPromptState | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);
  const [highlightedQuoteId, setHighlightedQuoteId] = useState<number | null>(null);
  const [productViewType, setProductViewType] = useState<'summary' | 'detailed'>('detailed');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const previousViewModeRef = useRef<ViewMode>(viewMode);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const baseItems = useMemo(() => items.filter((item) => !item.esServicio), [items]);
  
  // Hook para obtener planes diarios
  const { getDailyPlan, preloadPlans } = useDailyPlans();
  
  // Estado para cachear planes diarios
  const [dailyPlans, setDailyPlans] = useState<Record<number, DailyProductionPlanEntry[]>>({});

  const readOnlyStatusSet = useMemo(() => {
    const statuses = readOnlyStatuses === undefined ? ['Entregado'] : readOnlyStatuses;
    return new Set(statuses.map((status) => normalizeText(status)));
  }, [readOnlyStatuses]);

  const orderedStatusOptions = useMemo(() => {
    const fallback = STATUS_SEQUENCE.length;
    return [...statusOptions].sort((a, b) => {
      const orderA = STATUS_ORDER_MAP[a] ?? fallback;
      const orderB = STATUS_ORDER_MAP[b] ?? fallback;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });
  }, [statusOptions]);

  const isStatusReadOnly = useCallback(
    (status: string | null | undefined) => readOnlyStatusSet.has(normalizeText(status)),
    [readOnlyStatusSet],
  );

  const isItemReadOnly = useCallback(
    (item: ProductionItem) => {
      const effectiveStatus = resolveStatusFromDelivery(item.estatus, item.fechaEntrega);
      return effectiveStatus ? isStatusReadOnly(effectiveStatus) : false;
    },
    [isStatusReadOnly],
  );

  const ensureDeliveryRequirements = useCallback(
    (item: ProductionItem, form: RowFormState): { valid: boolean; message: string | null } => {
      const normalizedStatus = normalizeStatusForSave(
        form.estatus || item.estatus || null,
        form.fechaEntrega || item.fechaEntrega || null,
      );
      if (normalizedStatus !== 'Entregado') {
        return { valid: true, message: null };
      }
      if (!(form.fechaEntrega || item.fechaEntrega)) {
        return {
          valid: false,
          message: 'Para marcar como Entregado debes ingresar la fecha de entrega.',
        };
      }
      if (!(form.guiaRemision?.trim().length)) {
        return {
          valid: false,
          message: 'Ingresa el número de guía de remisión para completar la entrega.',
        };
      }
      if (!(form.fechaDespacho || item.fechaDespacho)) {
        return {
          valid: false,
          message: 'Registra la fecha de despacho para completar la entrega.',
        };
      }
      return { valid: true, message: null };
    },
    [],
  );

  // En la vista de productos, seleccionar la versión detallada la primera vez que llegamos desde otra pestaña
  useEffect(() => {
    if (viewMode === 'products' && previousViewModeRef.current !== 'products') {
      setProductViewType('detailed');
    }
    previousViewModeRef.current = viewMode;
  }, [viewMode]);

  // Initialize or update the forms state when the base items change
  useEffect(() => {
    const initialForms: Record<number, RowFormState> = {};
    for (const item of baseItems) {
      if (isMetadataDescription(item.producto)) continue;
      initialForms[item.id] = buildFormStateFromItem(item);
    }
    setForms(initialForms);
    setValidationErrors({});
  }, [baseItems]);

  // Cargar planes diarios para todos los items
  useEffect(() => {
    const loadDailyPlans = async () => {
      const itemIds = baseItems
        .filter(item => !isMetadataDescription(item.producto))
        .map(item => item.id);

      if (itemIds.length === 0) {
        setDailyPlans({});
        return;
      }

      const plans = await preloadPlans(itemIds);
      const newDailyPlans: Record<number, DailyProductionPlanEntry[]> = {};

      itemIds.forEach((itemId, index) => {
        newDailyPlans[itemId] = plans[index] ?? [];
      });

      setDailyPlans(newDailyPlans);
    };

    loadDailyPlans();
  }, [baseItems, getDailyPlan]);

  const { days: scheduleDays, loading: scheduleLoading, error: scheduleError, refetch: refetchSchedule } = useProductionSchedule();

  const dirtyRowIds = useMemo(() => {
    const dirty = new Set<number>();
    for (const item of baseItems) {
      const original = {
        fechaEntrega: item.fechaEntrega ?? '',
        estatus: item.estatus ?? '',
        notasEstatus: item.notasEstatus ?? '',
        guiaRemision: item.guiaRemision ?? '',
        fechaDespacho: item.fechaDespacho ?? '',
      };
      const current = forms[item.id];
      if (!current) continue;

      if (
        original.fechaEntrega !== current.fechaEntrega ||
        original.estatus !== current.estatus ||
        original.notasEstatus !== current.notasEstatus ||
        original.guiaRemision !== current.guiaRemision ||
        original.fechaDespacho !== current.fechaDespacho
      ) {
        dirty.add(item.id);
      }
    }
    return dirty;
  }, [baseItems, forms]);

  const handleRowChange = useCallback(
    (itemId: number, newFormData: RowFormState) => {
      const item = baseItems.find((entry) => entry.id === itemId);
      if (item && isItemReadOnly(item)) {
        return;
      }
      const previousForm = forms[itemId];
      setForms(prev => ({
        ...prev,
        [itemId]: newFormData,
      }));
      setSavingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
      if (item) {
        setValidationErrors(prev => {
          const validation = ensureDeliveryRequirements(item, newFormData);
          const currentMessage = prev[itemId] ?? null;
          if (validation.valid) {
            if (!currentMessage) {
              return prev;
            }
            return { ...prev, [itemId]: null };
          }
          if (currentMessage === validation.message) {
            return prev;
          }
          return { ...prev, [itemId]: validation.message };
        });

        const previousStatus = normalizeStatusForSave(
          previousForm?.estatus ?? item.estatus ?? null,
          previousForm?.fechaEntrega ?? item.fechaEntrega ?? null,
        );
        const nextStatus = normalizeStatusForSave(
          newFormData.estatus || item.estatus || null,
          newFormData.fechaEntrega || item.fechaEntrega || null,
        );
        const shouldPromptDeliveryDetails =
          nextStatus === 'Entregado' && previousStatus !== 'Entregado';
        if (shouldPromptDeliveryDetails) {
          const previousSnapshot =
            cloneRowFormState(previousForm) ?? buildFormStateFromItem(item);
          const targetSnapshot =
            cloneRowFormState(newFormData) ?? buildFormStateFromItem(item);
          setDeliveryPrompt({
            item,
            previousForm: previousSnapshot,
            nextForm: targetSnapshot,
          });
        }
      }
    },
    [baseItems, forms, isItemReadOnly, ensureDeliveryRequirements],
  );

  const handleDeliveryPromptConfirm = useCallback(
    (details: { guiaRemision: string; fechaDespacho: string }) => {
      if (!deliveryPrompt) {
        return;
      }
      const updatedForm: RowFormState = {
        ...deliveryPrompt.nextForm,
        guiaRemision: details.guiaRemision,
        fechaDespacho: details.fechaDespacho,
      };
      setDeliveryPrompt(null);
      handleRowChange(deliveryPrompt.item.id, updatedForm);
    },
    [deliveryPrompt, handleRowChange],
  );

  const handleDeliveryPromptCancel = useCallback(() => {
    if (!deliveryPrompt) {
      return;
    }
    const rollbackForm = deliveryPrompt.previousForm;
    setDeliveryPrompt(null);
    handleRowChange(deliveryPrompt.item.id, rollbackForm);
  }, [deliveryPrompt, handleRowChange]);

  const handleOpenPlanModal = useCallback(async (item: ProductionItem) => {
    if (isItemReadOnly(item)) {
      return;
    }
    setPlanModalItem(item);
    setPlanModalLoading(true);
    setPlanModalError(null);
    try {
      const response = await financialAPI.getProductionDailyPlan(item.id);
      setPlanModalData(response?.plan ?? []);
    } catch (err: any) {
      console.error('[StatusProduccion] getDailyPlan error', err);
      setPlanModalData([]);
      setPlanModalError(err?.response?.data?.detail || err?.message || 'No se pudo cargar el plan diario.');
    } finally {
      setPlanModalLoading(false);
    }
  }, [forms, isItemReadOnly]);

  const handleClosePlanModal = useCallback(() => {
    setPlanModalItem(null);
    setPlanModalData([]);
    setPlanModalError(null);
  }, []);


  const handleSavePlanModal = useCallback(
    async (entries: DailyProductionPlanEntry[]) => {
      if (!planModalItem) {
        return;
      }
      setPlanModalSaving(true);
      setPlanModalError(null);
      try {
        const response = await financialAPI.saveProductionDailyPlan(planModalItem.id, entries);
        setPlanModalData(response?.plan ?? []);
      } catch (err: any) {
        console.error('[StatusProduccion] saveDailyPlan error', err);
        setPlanModalError(err?.response?.data?.detail || err?.message || 'No se pudo guardar el plan diario.');
        throw err;
      } finally {
        setPlanModalSaving(false);
      }
    },
    [planModalItem],
  );

  const handleAutoSave = useCallback(
    async (idsToSave: Set<number>) => {
      if (idsToSave.size === 0) return;

      const entries: Array<{ id: number; form: RowFormState; item: ProductionItem }> = [];
      const validationUpdates: Record<number, string | null> = {};

      idsToSave.forEach((itemId) => {
        const form = forms[itemId];
        const item = baseItems.find((entry) => entry.id === itemId);
        if (!form || !item) {
          return;
        }
        const validation = ensureDeliveryRequirements(item, form);
        validationUpdates[itemId] = validation.message;
        if (validation.valid) {
          entries.push({ id: itemId, form, item });
        }
      });

      if (Object.keys(validationUpdates).length > 0) {
        setValidationErrors((prev) => ({ ...prev, ...validationUpdates }));
      }

      if (entries.length === 0) {
        return;
      }

      setSavingStatus((prev) => {
        const next = { ...prev };
        entries.forEach(({ id }) => {
          next[id] = 'saving';
        });
        return next;
      });

      const savePromises = entries.map(({ id, form, item }) => {
        const payload: ProductionUpdatePayload = {
          fechaEntrega: form.fechaEntrega || null,
          estatus: normalizeStatusForSave(form.estatus || null, form.fechaEntrega || item.fechaEntrega || null),
          notasEstatus: form.notasEstatus || null,
          factura: item.factura || null,
          guiaRemision: form.guiaRemision?.trim() || null,
          fechaDespacho: form.fechaDespacho || item.fechaDespacho || null,
          fechaVencimiento: item.fechaVencimiento || null,
          valorTotal: item.valorTotal || null,
          pagos: item.pagos.map((p) => ({ ...p, monto: Number(p.monto) })) || [],
        };
        return onSave(id, payload);
      });

      const results = await Promise.allSettled(savePromises);

      setSavingStatus((prev) => {
        const next = { ...prev };
        results.forEach((result, index) => {
          const { id } = entries[index];
          next[id] = result.status === 'fulfilled' ? 'success' : 'error';
        });
        return next;
      });

      setTimeout(() => {
        setSavingStatus((prev) => {
          const next = { ...prev };
          entries.forEach(({ id }) => {
            if (next[id] === 'success') {
              next[id] = 'idle';
            }
          });
          return next;
        });
      }, 2000);
    },
    [forms, baseItems, onSave, ensureDeliveryRequirements],
  );

  // Debounced effect for autosaving
  useEffect(() => {
    if (dirtyRowIds.size === 0) {
      return;
    }

    const handler = setTimeout(() => {
      handleAutoSave(dirtyRowIds);
    }, 1500); // 1.5 second debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [dirtyRowIds, handleAutoSave]);


  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setHighlightedProductId(null);
    setHighlightedQuoteId(null);
  }, []);

  const handleFilterByClient = useCallback((client: string) => {
    if (client) {
      setFilters((prev) => ({ ...prev, client }));

      // Hacer scroll al área de filtros
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, []);

  const handleFilterByQuote = useCallback((quote: string) => {
    if (quote) {
      setFilters((prev) => ({ ...prev, query: quote }));

      // Hacer scroll y focus al input de búsqueda
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInputRef.current.focus();
          // Efecto visual de highlight
          searchInputRef.current.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            searchInputRef.current?.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 1500);
        }
      }, 100);
    }
  }, []);

  const handleFilterByProduct = useCallback((product: string) => {
    if (product) {
      setFilters((prev) => ({ ...prev, query: product }));

      // Hacer scroll y focus al input de búsqueda
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInputRef.current.focus();
          // Efecto visual de highlight
          searchInputRef.current.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            searchInputRef.current?.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 1500);
        }
      }, 100);
    }
  }, []);

  const filteredItems = useMemo(() => {
    const evaluate = (item: ProductionItem) => matchesFilters(item, filters);
    const strictMatches = baseItems.filter(evaluate);

    if (viewMode !== 'quotes') {
      return strictMatches;
    }

    if (strictMatches.length === 0) {
      return [];
    }

    if (strictMatches.length === baseItems.length) {
      return baseItems;
    }

    const matchingQuoteIds = new Set(strictMatches.map((item) => item.cotizacionId));
    return baseItems.filter((item) => matchingQuoteIds.has(item.cotizacionId));
  }, [baseItems, filters, viewMode]);

  const productViewItems = useMemo(() => {
    return filteredItems.filter((item) => {
      const effectiveStatus = resolveStatusFromDelivery(item.estatus, item.fechaEntrega);
      return normalizeText(effectiveStatus) !== 'entregado';
    });
  }, [filteredItems]);

  const handleExportProductsPDF = () => {
    const exportItems = productViewItems.filter((item) => !isMetadataDescription(item.producto));

    if (exportItems.length === 0) {
      window.alert('No hay productos activos para exportar con los filtros actuales.');
      return;
    }

    const includeProgressColumn = window.confirm(
      '¿Deseas incluir la columna de progreso y avance del estatus en el PDF?',
    );

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Colores modernos
    const colors = {
      primary: [99, 102, 241],      // Indigo
      secondary: [139, 92, 246],    // Purple
      accent: [236, 72, 153],       // Pink
      success: [34, 197, 94],       // Green
      warning: [234, 179, 8],       // Yellow
      danger: [239, 68, 68],        // Red
      dark: [15, 23, 42],           // Slate 900
      muted: [100, 116, 139],       // Slate 500
      light: [248, 250, 252],       // Slate 50
      border: [226, 232, 240],      // Slate 200
    };

    // === HEADER MODERNO ===
    // Fondo del header con gradiente simulado
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setFillColor(99, 102, 241, 0.8);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRODUCCIÓN', 14, 15);

    // Subtítulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Vista Por Producto', 14, 22);

    // Fecha en el header
    const fecha = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(9);
    doc.text(fecha.charAt(0).toUpperCase() + fecha.slice(1), 14, 28);

    // Logo/marca placeholder en la derecha
    const brandName = getTenantBrand().displayName;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(brandName, pageWidth - 14, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Control de Producción multitenant', pageWidth - 14, 24, { align: 'right' });

    const formatDateForPdf = (value: string | null | undefined) => {
      const label = formatDateLabel(value);
      return label === 'Sin fecha' ? '—' : label;
    };

    // === MÉTRICAS RESUMEN ===
    let yPos = 42;

    const metrics = {
      total: exportItems.length,
      metros: exportItems.reduce((sum, item) => {
        const qty = extractQuantityInfo(item.cantidad);
        return sum + (qty.unit === 'metros' ? (qty.amount || 0) : 0);
      }, 0),
      unidades: exportItems.reduce((sum, item) => {
        const qty = extractQuantityInfo(item.cantidad);
        return sum + (qty.unit === 'unidades' ? (qty.amount || 0) : 0);
      }, 0),
      productosUnicos: new Set(exportItems.map((i) => i.producto)).size,
    };

    // Cards de métricas
    const cardWidth = (pageWidth - 28 - 9) / 4; // 4 cards con espaciado
    const cardHeight = 18;
    const cardY = yPos;

    doc.setTextColor(...colors.dark);

    // Card 1: Total Items
    doc.setFillColor(...colors.light);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text('ITEMS ACTIVOS', 14 + cardWidth/2, cardY + 6, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(String(metrics.total), 14 + cardWidth/2, cardY + 14, { align: 'center' });

    // Card 2: Productos Únicos
    const card2X = 14 + cardWidth + 3;
    doc.setFillColor(...colors.light);
    doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('PRODUCTOS ÚNICOS', card2X + cardWidth/2, cardY + 6, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    doc.text(String(metrics.productosUnicos), card2X + cardWidth/2, cardY + 14, { align: 'center' });

    // Card 3: Metros
    const card3X = card2X + cardWidth + 3;
    doc.setFillColor(...colors.light);
    doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('METROS TOTALES', card3X + cardWidth/2, cardY + 6, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.accent);
    doc.text(formatNumber(metrics.metros), card3X + cardWidth/2, cardY + 14, { align: 'center' });

    // Card 4: Unidades
    const card4X = card3X + cardWidth + 3;
    doc.setFillColor(...colors.light);
    doc.roundedRect(card4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('UNIDADES TOTALES', card4X + cardWidth/2, cardY + 6, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.success);
    doc.text(formatNumber(metrics.unidades), card4X + cardWidth/2, cardY + 14, { align: 'center' });

    yPos = cardY + cardHeight + 8;

    // === FILTROS APLICADOS ===
    if (filters.query || filters.client || filters.status || filters.productionType !== 'all') {
      doc.setFillColor(254, 249, 195); // Yellow-50
      doc.setDrawColor(...colors.warning);
      doc.roundedRect(14, yPos, pageWidth - 28, 15, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      // Reemplazar emoji con texto simple
      doc.text('FILTROS APLICADOS:', 18, yPos + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let filterText = '';
      if (filters.query) filterText += `Busqueda: "${filters.query}"  `;
      if (filters.client) filterText += `Cliente: "${filters.client}"  `;
      if (filters.status) filterText += `Estatus: ${filters.status}  `;
      if (filters.productionType !== 'all') filterText += `Tipo: ${filters.productionType}`;

      doc.text(filterText, 18, yPos + 10);
      yPos += 18;
    }

    // === TABLA DE DATOS INTELIGENTE ===
    // Determinar qué columnas mostrar según los filtros y datos
    const showClientColumn = !filters.client; // Ocultar si hay filtro de cliente
    const showStatusColumn = !filters.status; // Ocultar si hay filtro de estatus
    const showCotizacionColumn = !filters.query || exportItems.length > 1; // Ocultar si es búsqueda específica de una sola cotización
    const showFacturaColumn = exportItems.some((item) => item.factura && item.factura.trim() !== ''); // Mostrar solo si hay facturas

    // Construir headers dinámicamente
    const tableHeaders: string[] = ['Producto'];
    if (showClientColumn) tableHeaders.push('Cliente');
    if (showCotizacionColumn) tableHeaders.push('Cotización');
    tableHeaders.push('ODC / Pedido', 'Ingreso', 'Cantidad', 'Entrega');
    if (includeProgressColumn) {
      tableHeaders.push('Progreso');
    }
    if (showStatusColumn) tableHeaders.push('Estatus');
    if (showFacturaColumn) tableHeaders.push('Factura');

    // Mapear índices de columnas para los estilos
    let colIndex = 0;
    const colMap: Record<string, number> = {};
    const registerColumn = (key: string) => {
      colMap[key] = colIndex;
      colIndex += 1;
    };

    registerColumn('producto');
    if (showClientColumn) registerColumn('cliente');
    if (showCotizacionColumn) registerColumn('cotizacion');
    registerColumn('orden');
    registerColumn('ingreso');
    registerColumn('cantidad');
    registerColumn('entrega');
    if (includeProgressColumn) registerColumn('progreso');
    if (showStatusColumn) registerColumn('estatus');
    if (showFacturaColumn) registerColumn('factura');

    const tableData = exportItems.map((item) => {
      const quantity = extractQuantityInfo(item.cantidad);
      const quantityText =
        quantity.amount !== null
          ? `${formatNumber(quantity.amount)} ${quantity.unit === 'metros' ? 'm²' : 'u'}`
          : item.cantidad || '—';

      const form = forms[item.id];
      const orderLabel = item.odc?.trim() || item.numeroPedidoStock?.trim() || '—';
      const ingresoLabel = formatDateForPdf(item.fechaIngreso);
      const entregaLabel = formatDateForPdf(form?.fechaEntrega ?? item.fechaEntrega);

      let progressText = '';
      if (includeProgressColumn) {
        const progressInfo = computeProgress(
          item,
          form?.fechaEntrega ?? item.fechaEntrega,
          form?.estatus ?? item.estatus,
          dailyPlans[item.id],
        );
        const progressPercent = progressInfo ? Math.round(progressInfo.percent) : 0;
        progressText = `${progressPercent}%`;
        if (progressInfo?.producedEstimate !== null && progressInfo.quantity !== null) {
          progressText += ` (${formatNumberWithDash(progressInfo.producedEstimate)} / ${formatNumberWithDash(
            progressInfo.quantity,
          )}${progressInfo.quantityUnit === 'metros' ? ' m²' : ' u'})`;
        } else if (progressInfo?.label) {
          progressText += ` - ${progressInfo.label}`;
        }
      }

      const row: (string | number)[] = [item.producto];
      if (showClientColumn) row.push(item.cliente || item.bodega || '—');
      if (showCotizacionColumn) row.push(item.numeroCotizacion);
      row.push(orderLabel, ingresoLabel, quantityText, entregaLabel);
      if (includeProgressColumn) {
        row.push(progressText || '—');
      }
      if (showStatusColumn) {
        row.push(
          resolveStatusFromDelivery(form?.estatus ?? item.estatus, form?.fechaEntrega ?? item.fechaEntrega) || '—',
        );
      }
      if (showFacturaColumn) row.push(item.factura || '—');

      return row;
    });

    // Construir estilos de columna dinámicamente (sin cellWidth fijo, usar 'auto')
    const columnStyles: any = {
      [colMap.producto]: { fontStyle: 'bold' },
    };
    if (showClientColumn) columnStyles[colMap.cliente] = { halign: 'left' };
    if (showCotizacionColumn) columnStyles[colMap.cotizacion] = { halign: 'left' };
    columnStyles[colMap.orden] = { halign: 'left' };
    columnStyles[colMap.ingreso] = { halign: 'center' };
    columnStyles[colMap.cantidad] = { halign: 'right' };
    columnStyles[colMap.entrega] = { halign: 'center' };
    if (includeProgressColumn) {
      columnStyles[colMap.progreso] = { halign: 'left', fontStyle: 'bold' };
    }
    if (showStatusColumn) columnStyles[colMap.estatus] = { halign: 'center' };
    if (showFacturaColumn) columnStyles[colMap.factura] = { halign: 'center', fontSize: 8 };

    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles,
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Necesitamos redibujar el texto sobre los fondos de color
        // Este es un workaround para jsPDF autoTable
      },
      willDrawCell: (data) => {
        // Aplicar fondos de color ANTES del texto
        if (data.section === 'body') {
          // Columna de Progreso
          if (includeProgressColumn && data.column.index === colMap.progreso) {
            const progressText = String(data.cell.raw);
            const progressValue = parseInt(progressText);
            let bgColor: number[] = [245, 247, 250]; // Default

            if (progressValue >= 100) {
              bgColor = [220, 252, 231]; // Green-100
            } else if (progressValue >= 50) {
              bgColor = [254, 249, 195]; // Yellow-100
            } else if (progressValue > 0) {
              bgColor = [254, 226, 226]; // Red-100
            }

            doc.setFillColor(...bgColor);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          }

          // Columna de Estatus (si existe)
          if (showStatusColumn && data.column.index === colMap.estatus) {
            const estatus = String(data.cell.raw);
            let bgColor: number[] = [245, 247, 250]; // Default light gray

            if (estatus.includes('producción') || estatus.includes('Producción')) {
              bgColor = [224, 231, 255]; // Indigo-100
            } else if (estatus.includes('Listo') || estatus.includes('bodega') || estatus.includes('Bodega')) {
              bgColor = [220, 252, 231]; // Green-100
            } else if (estatus.includes('Entregado')) {
              bgColor = [241, 245, 249]; // Slate-100
            } else if (estatus.includes('cola') || estatus.includes('Cola')) {
              bgColor = [254, 249, 195]; // Yellow-100
            }

            doc.setFillColor(...bgColor);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          }

          // Columna de Factura (si existe) - resaltar con fondo cyan si tiene factura
          if (showFacturaColumn && data.column.index === colMap.factura) {
            const factura = String(data.cell.raw);
            if (factura !== '—' && factura.trim() !== '') {
              // Fondo cyan claro para facturas existentes
              doc.setFillColor(207, 250, 254); // Cyan-100
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              // Texto en azul oscuro para mejor contraste
              doc.setTextColor(8, 47, 73); // Cyan-900
            }
          }

          // Asegurar que el texto sea visible (excepto facturas que ya tienen su color)
          if (!showFacturaColumn || data.column.index !== colMap.factura) {
            doc.setTextColor(...colors.dark);
          }
        }
      },
    });

    // === FOOTER MEJORADO ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);

      // Línea decorativa
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

      // Número de página
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' },
      );

      // Info adicional en footer
      doc.setFontSize(7);
      const brandName = getTenantBrand().displayName;
      doc.text(`${brandName} - Sistema de Control de Producción multitenant`, 14, pageHeight - 8);
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CO')}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' },
      );
    }

    const fileName = `Reporte_Produccion_${new Date().toISOString().split('T')[0]}.pdf`;
    openPdfPreview(doc, fileName);
  };

  const handleExportQuotesPDF = () => {
    if (sortedQuotes.length === 0) {
      window.alert('No hay cotizaciones para exportar con los filtros actuales.');
      return;
    }

    const quotesForPdf = sortedQuotes.filter((group) => {
      if (group.items.length === 0) {
        return true;
      }
      const allDelivered = group.items.every(
        (item) => normalizeText(resolveStatusFromDelivery(item.estatus, item.fechaEntrega)) === 'entregado',
      );
      if (!allDelivered) {
        return true;
      }

      const saldo = typeof group.saldoPendiente === 'number' ? group.saldoPendiente : null;
      if (saldo !== null) {
        return saldo > SETTLED_TOLERANCE;
      }

      const total = group.totalCotizacion ?? null;
      if (total === null) {
        return true;
      }
      const abonado = group.totalAbonado ?? 0;
      return total - abonado > SETTLED_TOLERANCE;
    });

    if (quotesForPdf.length === 0) {
      window.alert('Todas las cotizaciones visibles están entregadas y saldadas. No hay nada para exportar.');
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colors = {
      primary: [99, 102, 241],
      secondary: [139, 92, 246],
      accent: [236, 72, 153],
      success: [34, 197, 94],
      warning: [234, 179, 8],
      danger: [239, 68, 68],
      dark: [15, 23, 42],
      muted: [100, 116, 139],
      light: [248, 250, 252],
      border: [226, 232, 240],
    } as const;

    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFillColor(99, 102, 241, 0.8);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRODUCCIÓN', 14, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Vista Por Cotización', 14, 22);

    const fecha = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(9);
    doc.text(fecha.charAt(0).toUpperCase() + fecha.slice(1), 14, 28);

    const brandName = getTenantBrand().displayName;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(brandName, pageWidth - 14, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Control de Producción multitenant', pageWidth - 14, 24, { align: 'right' });

    let cursor = 42;

    if (
      filters.query ||
      filters.client ||
      filters.status ||
      filters.productionType !== 'all'
    ) {
      doc.setFillColor(254, 249, 195);
      doc.setDrawColor(...colors.warning);
      doc.roundedRect(14, cursor, pageWidth - 28, 15, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('Filtros aplicados:', 18, cursor + 5);

      const lines: string[] = [];
      if (filters.query) lines.push(`Búsqueda: "${filters.query}"`);
      if (filters.client) lines.push(`Cliente/Contacto: "${filters.client}"`);
      if (filters.status) lines.push(`Estatus: ${filters.status}`);
      if (filters.productionType !== 'all') {
        const typeLabel = filters.productionType === 'cliente' ? 'Clientes' : 'Stock';
        lines.push(`Tipo de pedido: ${typeLabel}`);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(lines.join('  •  '), 18, cursor + 10);
      cursor += 18;
    }

    const totalCotizaciones = quotesForPdf.length;
    const totalProductos = quotesForPdf.reduce((sum, group) => sum + group.items.length, 0);
    const totalValor = quotesForPdf.reduce(
      (sum, group) => sum + (group.totalCotizacion ?? 0),
      0,
    );
    const totalSaldo = quotesForPdf.reduce(
      (sum, group) => sum + (group.saldoPendiente ?? 0),
      0,
    );

    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 18;
    doc.setTextColor(...colors.dark);

    const cards: Array<{ label: string; value: string; color: number[] }> = [
      { label: 'Cotizaciones visibles', value: formatNumberWithDash(totalCotizaciones), color: colors.primary },
      { label: 'Productos asociados', value: formatNumberWithDash(totalProductos), color: colors.secondary },
      { label: 'Valor total', value: formatCurrency(totalValor), color: colors.accent },
      { label: 'Saldo pendiente', value: formatCurrency(totalSaldo), color: colors.warning },
    ];

    cards.forEach((card, index) => {
      const x = 14 + index * (cardWidth + 3);
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(x, cursor, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(card.label.toUpperCase(), x + cardWidth / 2, cursor + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(card.value, x + cardWidth / 2, cursor + 14, { align: 'center' });
    });

    cursor += cardHeight + 8;

    const tableHeaders = [
      'Cotización',
      'Cliente / Destino',
      'Ingreso',
      'Productos',
      'Valor',
      'Saldo',
      'Estatus',
    ];

    const tableData = quotesForPdf.map((group) => [
      group.numeroCotizacion,
      group.cliente || group.bodega || '—',
      group.fechaIngreso ? formatDateLabel(group.fechaIngreso) : '—',
      formatNumberWithDash(group.items.length),
      group.totalCotizacion !== null ? formatCurrency(group.totalCotizacion) : '—',
      group.saldoPendiente !== null ? formatCurrency(group.saldoPendiente) : '—',
      group.estatusSummary.length > 0 ? group.estatusSummary.join(', ') : '—',
    ]);

    autoTable(doc, {
      startY: cursor,
      head: [tableHeaders],
      body: tableData,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'left' },
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setFontSize(7);
      const brandName = getTenantBrand().displayName;
      doc.text(`${brandName} - Sistema de Control de Producción multitenant`, 14, pageHeight - 8);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    const fileName = `Reporte_Cotizaciones_${todayIso}.pdf`;
    openPdfPreview(doc, fileName);
  };

  const handleExportClientsPDF = () => {
    if (clientViewData.length === 0) {
      window.alert('No hay clientes para exportar con los filtros actuales.');
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colors = {
      primary: [99, 102, 241],
      secondary: [139, 92, 246],
      accent: [236, 72, 153],
      success: [34, 197, 94],
      warning: [234, 179, 8],
      dark: [15, 23, 42],
      muted: [100, 116, 139],
      light: [248, 250, 252],
      border: [226, 232, 240],
    } as const;

    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFillColor(99, 102, 241, 0.8);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRODUCCIÓN', 14, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Vista Por Cliente', 14, 22);

    const fecha = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(9);
    doc.text(fecha.charAt(0).toUpperCase() + fecha.slice(1), 14, 28);

    const brandName = getTenantBrand().displayName;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(brandName, pageWidth - 14, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Control de Producción multitenant', pageWidth - 14, 24, { align: 'right' });

    let cursor = 42;

    if (
      filters.query ||
      filters.client ||
      filters.status ||
      filters.productionType !== 'all'
    ) {
      doc.setFillColor(254, 249, 195);
      doc.setDrawColor(...colors.warning);
      doc.roundedRect(14, cursor, pageWidth - 28, 15, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('Filtros aplicados:', 18, cursor + 5);

      const lines: string[] = [];
      if (filters.query) lines.push(`Búsqueda: "${filters.query}"`);
      if (filters.client) lines.push(`Cliente/Contacto: "${filters.client}"`);
      if (filters.status) lines.push(`Estatus: ${filters.status}`);
      if (filters.productionType !== 'all') {
        const typeLabel = filters.productionType === 'cliente' ? 'Clientes' : 'Stock';
        lines.push(`Tipo de pedido: ${typeLabel}`);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(lines.join('  •  '), 18, cursor + 10);
      cursor += 18;
    }

    const totalClientes = clientViewData.length;
    const totalMetros = clientViewData.reduce((sum, row) => sum + row.metros, 0);
    const totalUnidades = clientViewData.reduce((sum, row) => sum + row.unidades, 0);
    const totalSaldo = clientViewData.reduce((sum, row) => sum + row.saldo, 0);

    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 18;
    const cards: Array<{ label: string; value: string; color: number[] }> = [
      { label: 'Clientes visibles', value: formatNumberWithDash(totalClientes), color: colors.primary },
      { label: 'Metros totales', value: `${formatNumberWithDash(totalMetros)} m²`, color: colors.accent },
      { label: 'Unidades totales', value: formatNumberWithDash(totalUnidades), color: colors.secondary },
      { label: 'Saldo acumulado', value: formatCurrency(totalSaldo), color: colors.warning },
    ];

    cards.forEach((card, index) => {
      const x = 14 + index * (cardWidth + 3);
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(x, cursor, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(card.label.toUpperCase(), x + cardWidth / 2, cursor + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(card.value, x + cardWidth / 2, cursor + 14, { align: 'center' });
    });

    cursor += cardHeight + 8;

    const headers = [
      'Cliente',
      'Cotizaciones',
      'Productos',
      'Metros',
      'Unidades',
      'Saldo',
      'Próxima entrega',
    ];

    const body = clientViewData.map((row) => [
      row.client,
      formatNumberWithDash(row.cotizacionCount),
      formatNumberWithDash(row.productoCount),
      `${formatNumberWithDash(row.metros)} m²`,
      formatNumberWithDash(row.unidades),
      formatCurrency(row.saldo),
      row.fechaProxima ? formatDateLabel(row.fechaProxima) : 'Sin programación',
    ]);

    autoTable(doc, {
      startY: cursor,
      head: [headers],
      body,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setFontSize(7);
      const brandName = getTenantBrand().displayName;
      doc.text(`${brandName} - Sistema de Control de Producción multitenant`, 14, pageHeight - 8);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    openPdfPreview(doc, `Reporte_Clientes_${todayIso}.pdf`);
  };

  const handleExportCalendarPDF = () => {
    if (scheduleDays.length === 0) {
      window.alert('No hay entregas programadas para exportar.');
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colors = {
      primary: [99, 102, 241],
      secondary: [139, 92, 246],
      accent: [236, 72, 153],
      success: [34, 197, 94],
      warning: [234, 179, 8],
      dark: [15, 23, 42],
      muted: [100, 116, 139],
      light: [248, 250, 252],
      border: [226, 232, 240],
    } as const;

    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFillColor(99, 102, 241, 0.8);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRODUCCIÓN', 14, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Calendario de entregas (7 días)', 14, 22);

    const fecha = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(9);
    doc.text(fecha.charAt(0).toUpperCase() + fecha.slice(1), 14, 28);

    const brandName = getTenantBrand().displayName;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(brandName, pageWidth - 14, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Control de Producción multitenant', pageWidth - 14, 24, { align: 'right' });

    let cursor = 42;

    const totalMetros = scheduleDays.reduce((sum, day) => sum + day.metros, 0);
    const totalUnidades = scheduleDays.reduce((sum, day) => sum + day.unidades, 0);
    const totalItems = scheduleDays.reduce((sum, day) => sum + day.items.length, 0);

    const cards: Array<{ label: string; value: string; color: number[] }> = [
      { label: 'Días programados', value: formatNumberWithDash(scheduleDays.length), color: colors.primary },
      { label: 'Metros planificados', value: `${formatNumberWithDash(totalMetros)} m²`, color: colors.accent },
      { label: 'Unidades planificadas', value: formatNumberWithDash(totalUnidades), color: colors.secondary },
      { label: 'Items programados', value: formatNumberWithDash(totalItems), color: colors.success },
    ];

    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 18;
    doc.setTextColor(...colors.dark);
    cards.forEach((card, index) => {
      const x = 14 + index * (cardWidth + 3);
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(x, cursor, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(card.label.toUpperCase(), x + cardWidth / 2, cursor + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(card.value, x + cardWidth / 2, cursor + 14, { align: 'center' });
    });

    cursor += cardHeight + 8;

    const summaryHeaders = ['Fecha', 'Metros', 'Unidades', 'Items', 'Modo'];
    const summaryBody = scheduleDays.map((day) => [
      formatDateLabel(day.fecha),
      `${formatNumberWithDash(day.metros)} m²`,
      formatNumberWithDash(day.unidades),
      formatNumberWithDash(day.items.length),
      day.manual ? 'Manual' : 'Automática',
    ]);

    autoTable(doc, {
      startY: cursor,
      head: [summaryHeaders],
      body: summaryBody,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    const detailHeaders = ['Fecha', 'Producto', 'Cliente', 'Cotización', 'Metros', 'Unidades', 'Estatus'];
    const detailBody = scheduleDays.flatMap((day) =>
      day.items.map((item) => {
        const deliveryFromItem =
          ((item as any)?.fecha_entrega as string | undefined | null) ??
          ((item as any)?.fechaEntrega as string | undefined | null) ??
          null;
        const scheduleStatus = resolveStatusFromDelivery(item.estatus, deliveryFromItem) || '—';
        return [
          formatDateLabel(day.fecha),
          item.descripcion,
          item.cliente || '—',
          item.numero_cotizacion || '—',
          `${formatNumberWithDash(item.metros)} m²`,
          formatNumberWithDash(item.unidades),
          scheduleStatus,
        ];
      }),
    );

    const lastTable = (doc as any).lastAutoTable;
    const detailStart = lastTable ? lastTable.finalY + 8 : cursor + 8;

    autoTable(doc, {
      startY: detailStart,
      head: [detailHeaders],
      body: detailBody,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'left' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'left' },
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setFontSize(7);
      const brandName = getTenantBrand().displayName;
      doc.text(`${brandName} - Sistema de Control de Producción multitenant`, 14, pageHeight - 8);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    openPdfPreview(doc, `Reporte_Calendario_${todayIso}.pdf`);
  };

  // Callbacks para la vista resumida de productos
  const handleViewDetails = useCallback((itemIds: number[]) => {
    setProductViewType('detailed');
    if (itemIds.length > 0) {
      setHighlightedProductId(itemIds[0]);
    }
  }, []);

  const handleOpenDailyPlanFromCard = useCallback((itemId: number) => {
    const item = productViewItems.find((it) => it.id === itemId);
    if (item) {
      handleOpenPlanModal(item);
    }
  }, [productViewItems, handleOpenPlanModal]);

  // Handlers para el drawer de cliente
  const handleOpenClientDrawer = useCallback((clientName: string) => {
    setSelectedClient(clientName);
    setClientDrawerOpen(true);
  }, []);

  const handleCloseClientDrawer = useCallback(() => {
    setClientDrawerOpen(false);
    setTimeout(() => setSelectedClient(null), 300); // Delay para animación de cierre
  }, []);

  const handleViewProductFromClient = useCallback((itemId: number) => {
    // Cerrar el drawer y cambiar a vista de productos con enfoque
    handleCloseClientDrawer();
    setHighlightedProductId(itemId);
    // Cambiar a vista de productos
    onRequestViewChange?.('products');
    // Cambiar a vista detallada dentro de productos
    setProductViewType('detailed');
  }, [handleCloseClientDrawer, onRequestViewChange]);

  const quoteTotals = useMemo(() => {
    const accumulator = new Map<
      number,
      {
        explicit: number | null;
        subtotalSum: number;
      }
    >();

    for (const item of baseItems) {
      if (isMetadataDescription(item.producto)) {
        continue;
      }
      const entry =
        accumulator.get(item.cotizacionId) ??
        {
          explicit: null,
          subtotalSum: 0,
        };

      if (item.valorSubtotal !== null && item.valorSubtotal !== undefined) {
        entry.subtotalSum += item.valorSubtotal;
      }

      if (item.valorTotal !== null && item.valorTotal !== undefined) {
        if (entry.explicit === null || item.valorTotal > entry.explicit) {
          entry.explicit = item.valorTotal;
        }
      }

      accumulator.set(item.cotizacionId, entry);
    }

    const totals = new Map<number, number>();
    for (const [quoteId, { explicit, subtotalSum }] of accumulator.entries()) {
      const candidates: Array<number | null> = [
        explicit,
        subtotalSum > 0 ? subtotalSum : null,
      ];

      const best = candidates.reduce<number | null>((current, value) => {
        if (value === null || Number.isNaN(value)) {
          return current;
        }
        if (current === null || value > current) {
          return value;
        }
        return current;
      }, null);

      if (best !== null) {
        totals.set(quoteId, best);
      }
    }

    return totals;
  }, [baseItems]);

  const groupedQuotes = useMemo<QuoteGroup[]>(() => {
    const groups = new Map<
      number,
      QuoteGroup & {
        estatusSet: Set<string>;
        totalAbonadoRaw: number;
        facturaSet: Set<string>;
        metadataSet: Set<string>;
      }
    >();

    for (const item of filteredItems) {
      const quoteTotal = quoteTotals.get(item.cotizacionId) ?? null;
      const pagos = item.pagos ?? [];
      const totalAbonadoFromItem = pagos.reduce((acc, pago) => {
        const monto =
          typeof pago.monto === 'number' && Number.isFinite(pago.monto) ? Number(pago.monto) : 0;
        return acc + monto;
      }, 0);
      const facturaValue = item.factura?.trim();
      const metadataNote = isMetadataDescription(item.producto) ? item.producto.trim() : null;
      const metadataNotesFromItem = (item.metadataNotes ?? [])
        .map((note) => note.trim())
        .filter((note) => note.length > 0);
      const normalizedPayments = normalizePaymentsToForm(item.pagos);

      let group = groups.get(item.cotizacionId);
      if (!group) {
        const estatusSet = new Set<string>();
        const initialStatus = resolveStatusFromDelivery(item.estatus, item.fechaEntrega);
        if (initialStatus) {
          estatusSet.add(initialStatus);
        }

        const totalAbonado = Number.isFinite(totalAbonadoFromItem) ? totalAbonadoFromItem : 0;
        const saldoPendiente =
          quoteTotal !== null && Number.isFinite(totalAbonado)
            ? Math.max(quoteTotal - totalAbonado, 0)
            : item.saldoPendiente ?? null;

        group = {
          cotizacionId: item.cotizacionId,
          numeroCotizacion: item.numeroCotizacion,
          tipoProduccion: resolveProductionType(item),
          numeroPedidoStock: item.numeroPedidoStock ?? null,
          odc: item.odc,
          cliente: item.cliente,
          contacto: item.contacto,
          proyecto: item.proyecto,
          fechaIngreso: item.fechaIngreso,
          archivoOriginal: item.archivoOriginal,
          bodega: item.bodega ?? null,
          responsable: item.responsable ?? null,
          fechaInicioPeriodo: item.fechaInicioPeriodo ?? null,
          fechaFinPeriodo: item.fechaFinPeriodo ?? null,
          fechaVencimiento: item.fechaVencimiento ?? null,
          totalCotizacion: quoteTotal,
          totalAbonado,
          saldoPendiente,
          estatusSummary: [],
          facturas: [],
          pagos: normalizedPayments,
          metadataNotes: [],
          items: [],
          estatusSet,
          totalAbonadoRaw: totalAbonado,
          facturaSet: new Set(facturaValue ? [facturaValue] : []),
          metadataSet: new Set<string>(),
        };
      }

      for (const note of metadataNotesFromItem) {
        group.metadataSet.add(note);
      }

      if (metadataNote) {
        group.metadataSet.add(metadataNote);
        if (!group.fechaVencimiento && item.fechaVencimiento) {
          group.fechaVencimiento = item.fechaVencimiento;
        }
        if (group.pagos.length === 0 && normalizedPayments.length > 0) {
          group.pagos = normalizedPayments;
        }
        groups.set(item.cotizacionId, group);
        continue;
      }

      group.items.push(item);
      if (!group.numeroPedidoStock && item.numeroPedidoStock) {
        group.numeroPedidoStock = item.numeroPedidoStock;
      }
      if (!group.bodega && item.bodega) {
        group.bodega = item.bodega;
      }
      if (!group.responsable && item.responsable) {
        group.responsable = item.responsable;
      }
      if (item.fechaInicioPeriodo) {
        if (!group.fechaInicioPeriodo || item.fechaInicioPeriodo < group.fechaInicioPeriodo) {
          group.fechaInicioPeriodo = item.fechaInicioPeriodo;
        }
      }
      if (item.fechaFinPeriodo) {
        if (!group.fechaFinPeriodo || item.fechaFinPeriodo > group.fechaFinPeriodo) {
          group.fechaFinPeriodo = item.fechaFinPeriodo;
        }
      }

      const derivedStatus = resolveStatusFromDelivery(item.estatus, item.fechaEntrega);
      if (derivedStatus) {
        group.estatusSet.add(derivedStatus);
      }

      if (!group.fechaVencimiento && item.fechaVencimiento) {
        group.fechaVencimiento = item.fechaVencimiento;
      }

      if (group.pagos.length === 0 && normalizedPayments.length > 0) {
        group.pagos = normalizedPayments;
      }

      if (facturaValue) {
        group.facturaSet.add(facturaValue);
      }

      if (quoteTotal !== null && (group.totalCotizacion === null || quoteTotal > group.totalCotizacion)) {
        group.totalCotizacion = quoteTotal;
      }

      const totalAbonado = Number.isFinite(totalAbonadoFromItem) ? totalAbonadoFromItem : 0;
      if (totalAbonado > group.totalAbonadoRaw) {
        group.totalAbonadoRaw = totalAbonado;
        group.totalAbonado = totalAbonado;
      }

      if (group.totalCotizacion !== null) {
        group.saldoPendiente = Math.max(group.totalCotizacion - group.totalAbonado, 0);
      } else if (item.saldoPendiente !== null && item.saldoPendiente !== undefined) {
        if (group.saldoPendiente === null || item.saldoPendiente > group.saldoPendiente) {
          group.saldoPendiente = item.saldoPendiente;
        }
      }

      groups.set(item.cotizacionId, group);
    }

    return Array.from(groups.values()).map(({ estatusSet, totalAbonadoRaw, facturaSet, metadataSet, ...group }) => ({
      ...group,
      estatusSummary: Array.from(estatusSet),
      facturas: Array.from(facturaSet),
      metadataNotes: Array.from(metadataSet),
    }));
  }, [filteredItems, quoteTotals]);

  const quoteGroupMap = useMemo(() => {
    const map = new Map<number, QuoteGroup>();
    for (const group of groupedQuotes) {
      map.set(group.cotizacionId, group);
    }
    return map;
  }, [groupedQuotes]);

  useEffect(() => {
    if (!externalFocus) {
      return;
    }

    if (externalFocus.productViewType) {
      setProductViewType(externalFocus.productViewType);
    } else if (externalFocus.viewMode === 'products') {
      setProductViewType('detailed');
    }

    if (typeof externalFocus.searchQuery === 'string') {
      setFilters((prev) =>
        prev.query === externalFocus.searchQuery
          ? prev
          : {
              ...prev,
              query: externalFocus.searchQuery ?? '',
            },
      );
    }

    if (externalFocus.focusItemId) {
      setHighlightedProductId(externalFocus.focusItemId);
    }

    if (externalFocus.focusQuoteNumber) {
      const targetGroup = groupedQuotes.find(
        (group) => group.numeroCotizacion === externalFocus.focusQuoteNumber,
      );
      if (targetGroup) {
        setExpandedQuotes((prev) => ({
          ...prev,
          [targetGroup.cotizacionId]: true,
        }));
        setHighlightedQuoteId(targetGroup.cotizacionId);
      }
    } else if (externalFocus.focusItemId) {
      const targetGroup = groupedQuotes.find((group) =>
        group.items.some((item) => item.id === externalFocus.focusItemId),
      );
      if (targetGroup) {
        setExpandedQuotes((prev) => ({
          ...prev,
          [targetGroup.cotizacionId]: true,
        }));
        setHighlightedQuoteId(targetGroup.cotizacionId);
      }
    }

    onConsumeExternalFocus?.();
  }, [externalFocus, groupedQuotes, onConsumeExternalFocus]);

  const productViewData = useMemo(() => {
    const rows: ProductViewRowModel[] = [];
    const uniqueProducts = new Set<string>();
    const activeUniqueProducts = new Set<string>();
    const productColorMap = new Map<string, string>();
    let paletteIndex = 0;
    let totalMetros = 0;
    let totalUnidades = 0;
    let metrosProximos7 = 0;
    let unidadesProximos7 = 0;
    let metrosHoy = 0;
    let unidadesHoy = 0;
    let activeRowCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today.getTime() + 7 * DAY_IN_MS);

    for (const item of productViewItems) {
      const form = forms[item.id];
      if (!form) {
        continue;
      }
      const progress = computeProgress(item, form.fechaEntrega, form.estatus, dailyPlans[item.id]);
      const quantity = extractQuantityInfo(item.cantidad);
      const quote = quoteGroupMap.get(item.cotizacionId);
      const saving = savingStatus[item.id] || 'idle';
      const readOnly = isItemReadOnly(item);

      const productKey = normalizeText(item.producto || '');
      uniqueProducts.add(productKey);
      let colorClass = productColorMap.get(productKey);
      if (!colorClass) {
        colorClass = productColorPalette[paletteIndex % productColorPalette.length];
        productColorMap.set(productKey, colorClass);
        paletteIndex += 1;
      }

      if (!readOnly) {
        activeUniqueProducts.add(productKey);
        activeRowCount += 1;

        if (quantity.amount !== null) {
          if (quantity.unit === 'metros') {
            totalMetros += quantity.amount;
          } else {
            totalUnidades += quantity.amount;
          }
        }

        const entregaSource = form.fechaEntrega || item.fechaEntrega;
        if (entregaSource) {
          const entregaDate = new Date(entregaSource);
          if (!Number.isNaN(entregaDate.getTime())) {
            entregaDate.setHours(0, 0, 0, 0);
            const diff = entregaDate.getTime() - today.getTime();
            if (quantity.amount !== null) {
              if (diff === 0) {
                if (quantity.unit === 'metros') {
                  metrosHoy += quantity.amount;
                } else {
                  unidadesHoy += quantity.amount;
                }
              }
              if (diff >= 0 && entregaDate.getTime() <= next7.getTime()) {
                if (quantity.unit === 'metros') {
                  metrosProximos7 += quantity.amount;
                } else {
                  unidadesProximos7 += quantity.amount;
                }
              }
            }
          }
        }
      }

      rows.push({
        item,
        form,
        progress,
        quantity: { amount: quantity.amount, unit: quantity.unit },
        quote,
        saving,
        colorClass,
        readOnly,
        isHighlighted: highlightedProductId === item.id,
        validationError: validationErrors[item.id] || null,
      });
    }

    // Ordenamiento dinámico basado en productSortConfig
    rows.sort((a, b) => {
      let result = 0;
      switch (productSortConfig.key) {
        case 'producto': {
          result = normalizeText(a.item.producto).localeCompare(
            normalizeText(b.item.producto),
            'es',
            { sensitivity: 'base' },
          );
          break;
        }
        case 'cliente': {
          const clienteA = a.item.cliente || '';
          const clienteB = b.item.cliente || '';
          result = clienteA.localeCompare(clienteB, 'es', { sensitivity: 'base' });
          break;
        }
        case 'numeroCotizacion': {
          const cotizA = a.item.numeroCotizacion || '';
          const cotizB = b.item.numeroCotizacion || '';
          result = cotizA.localeCompare(cotizB);
          break;
        }
        case 'fechaIngreso': {
          const fechaA = a.item.fechaIngreso ? new Date(a.item.fechaIngreso).getTime() : 0;
          const fechaB = b.item.fechaIngreso ? new Date(b.item.fechaIngreso).getTime() : 0;
          result = fechaA - fechaB;
          break;
        }
        case 'cantidad': {
          const cantA = a.quantity.amount || 0;
          const cantB = b.quantity.amount || 0;
          result = cantA - cantB;
          break;
        }
        case 'fechaEntrega': {
          const fechaA = a.form.fechaEntrega || a.item.fechaEntrega || '';
          const fechaB = b.form.fechaEntrega || b.item.fechaEntrega || '';
          if (!fechaA && !fechaB) result = 0;
          else if (!fechaA) result = 1;
          else if (!fechaB) result = -1;
          else result = fechaA.localeCompare(fechaB);
          break;
        }
        case 'estatus': {
          const estatusA =
            resolveStatusFromDelivery(
              a.form.estatus || a.item.estatus,
              a.form.fechaEntrega || a.item.fechaEntrega,
            ) || '';
          const estatusB =
            resolveStatusFromDelivery(
              b.form.estatus || b.item.estatus,
              b.form.fechaEntrega || b.item.fechaEntrega,
            ) || '';
          result = estatusA.localeCompare(estatusB, 'es', { sensitivity: 'base' });
          break;
        }
        default:
          result = 0;
      }
      return productSortConfig.direction === 'asc' ? result : -result;
    });

    return {
      rows,
      metrics: {
        totalMetros,
        totalUnidades,
        metrosProximos7,
        unidadesProximos7,
        metrosHoy,
        unidadesHoy,
        uniqueProducts: activeUniqueProducts.size,
        totalItems: activeRowCount,
        metrosDiarios: metrosProximos7 / 7,
        unidadesDiarias: unidadesProximos7 / 7,
      },
    };
  }, [
    productViewItems,
    forms,
    savingStatus,
    quoteGroupMap,
    dailyPlans,
    highlightedProductId,
    productSortConfig,
    isItemReadOnly,
    validationErrors,
  ]);

  const clientViewData = useMemo(() => {
    const aggregates = new Map<string, {
      quoteIds: Set<number>;
      productos: number;
      metros: number;
      unidades: number;
      saldo: number;
      entregasProximas: number;
      fechaProxima?: string;
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of filteredItems) {
      const form = forms[item.id];
      if (isItemReadOnly(item)) {
        continue;
      }

      const clientName = getClientLabel(item);
      let entry = aggregates.get(clientName);
      if (!entry) {
        entry = {
          quoteIds: new Set(),
          productos: 0,
          metros: 0,
          unidades: 0,
          saldo: 0,
          entregasProximas: 0,
          fechaProxima: undefined,
        };
        aggregates.set(clientName, entry);
      }

      entry.productos += 1;

      const quantity = extractQuantityInfo(item.cantidad);
      if (quantity.amount !== null) {
        if (quantity.unit === 'metros') {
          entry.metros += quantity.amount;
        } else {
          entry.unidades += quantity.amount;
        }
      }

      const quote = quoteGroupMap.get(item.cotizacionId);
      if (quote && !entry.quoteIds.has(item.cotizacionId)) {
        entry.quoteIds.add(item.cotizacionId);
        entry.saldo += quote.saldoPendiente ?? 0;
      }

      const entregaSource = form?.fechaEntrega || item.fechaEntrega;
      if (entregaSource) {
        const entregaDate = new Date(entregaSource);
        if (!Number.isNaN(entregaDate.getTime())) {
          const normalized = entregaDate.toISOString().split('T')[0];
          if (!entry.fechaProxima || normalized < entry.fechaProxima) {
            entry.fechaProxima = normalized;
          }
          const diff = entregaDate.getTime() - today.getTime();
          if (diff >= 0 && diff <= 7 * DAY_IN_MS) {
            entry.entregasProximas += 1;
          }
        }
      }
    }

    const rows: ClientSummaryRow[] = [];
    for (const [client, data] of aggregates.entries()) {
      rows.push({
        client,
        cotizacionCount: data.quoteIds.size,
        productoCount: data.productos,
        metros: data.metros,
        unidades: data.unidades,
        saldo: data.saldo,
        entregasProximas: data.entregasProximas,
        fechaProxima: data.fechaProxima,
      });
    }

    rows.sort((a, b) => b.metros - a.metros || b.unidades - a.unidades || a.client.localeCompare(b.client, 'es', { sensitivity: 'base' }));

    return rows;
  }, [filteredItems, forms, quoteGroupMap, isItemReadOnly]);

  const sortedQuotes = useMemo(() => {
    const sortable = [...groupedQuotes];
    sortable.sort((a, b) => {
      let result = 0;
      switch (sortConfig.key) {
        case 'fechaIngreso': {
          const dateA = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : -Infinity;
          const dateB = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : -Infinity;
          result = compareValues(dateA, dateB);
          break;
        }
        case 'numeroCotizacion':
          result = compareValues(a.numeroCotizacion, b.numeroCotizacion);
          break;
        case 'odc':
          result = compareValues(a.odc, b.odc);
          break;
        case 'cliente':
          result = compareValues(a.cliente, b.cliente);
          break;
        case 'totalCotizacion':
          result = compareValues(a.totalCotizacion ?? 0, b.totalCotizacion ?? 0);
          break;
        case 'totalAbonado':
          result = compareValues(a.totalAbonado ?? 0, b.totalAbonado ?? 0);
          break;
        case 'saldoPendiente':
          result = compareValues(a.saldoPendiente ?? 0, b.saldoPendiente ?? 0);
          break;
        default:
          result = 0;
      }
      return sortConfig.direction === 'asc' ? result : -result;
    });
    return sortable;
  }, [groupedQuotes, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        direction: 'asc',
      };
    });
  };

  const sortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return (
      <ArrowUpDown
        className={`w-3 h-3 ${sortConfig.direction === 'asc' ? 'rotate-180 text-primary' : 'text-primary'}`}
      />
    );
  };

  const handleProductSort = (key: ProductSortKey) => {
    setProductSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        direction: 'asc',
      };
    });
  };

  const productSortIndicator = (key: ProductSortKey) => {
    if (productSortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return (
      <ArrowUpDown
        className={`w-3 h-3 ${productSortConfig.direction === 'asc' ? 'rotate-180 text-primary' : 'text-primary'}`}
      />
    );
  };

  const toggleQuote = (quoteId: number) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [quoteId]: !prev[quoteId],
    }));
  };

  const renderQuoteView = () => (
    <div className="glass-panel rounded-2xl border border-border shadow-hologram overflow-hidden">
      <div className="flex justify-end px-4 py-3 border-b border-border/60 bg-dark-card/50">
        <button
          type="button"
          onClick={handleExportQuotesPDF}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/20 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/30 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar reporte
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-dark-card/80 border-b border-border">
            <tr className="text-xs uppercase tracking-wide text-text-muted">
              {[
                { key: undefined, label: '' },
                { key: 'fechaIngreso' as SortKey, label: 'Ingreso' },
                { key: 'odc' as SortKey, label: 'ODC / Pedido' },
                { key: 'numeroCotizacion' as SortKey, label: 'Cotización' },
                { key: 'cliente' as SortKey, label: 'Cliente / Destino' },
                { key: undefined, label: 'Factura(s)' },
                { key: 'saldoPendiente' as SortKey, label: 'Valor / saldo' },
                { key: undefined, label: 'Estatus' },
              ].map(({ key, label }, index) => (
                <th key={`${label}-${index}`} className={`px-4 py-3 text-left ${index === 0 ? 'w-10' : ''}`}>
                  {key ? (
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                    >
                      <span>{label}</span>
                      {sortIndicator(key)}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-text-muted">{label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-text-secondary">
            {sortedQuotes.map((group) => (
              <QuoteRow
                key={group.cotizacionId}
                group={group}
                expanded={Boolean(expandedQuotes[group.cotizacionId])}
                onToggle={() => toggleQuote(group.cotizacionId)}
                statusOptions={orderedStatusOptions}
                onSave={onSave}
                isSaving={isSaving}
                onDeleteQuote={onDeleteQuote}
                forms={forms}
                onRowChange={handleRowChange}
                savingStatus={savingStatus}
                dailyPlans={dailyPlans}
                onOpenDailyPlan={handleOpenPlanModal}
                isItemReadOnly={isItemReadOnly}
                highlightedItemId={highlightedProductId}
                highlightedQuoteId={highlightedQuoteId}
                onFilterByClient={handleFilterByClient}
                onFilterByQuote={handleFilterByQuote}
                onFilterByProduct={handleFilterByProduct}
                validationErrors={validationErrors}
                showDeliverySummary={showDeliverySummary}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductView = () => {
    const { rows, metrics } = productViewData;

    return (
      <div className="space-y-4">
        {/* Toggle entre Vista Resumida y Detallada */}
        <div className="flex items-center justify-between p-3 bg-dark-card/40 rounded-xl border border-border/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProductViewType('detailed')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${productViewType === 'detailed'
                  ? 'bg-primary/20 border border-primary/40 text-primary shadow-lg'
                  : 'bg-dark-bg/40 border border-border/30 text-text-secondary hover:bg-dark-bg/60 hover:border-border/50'}
              `}
            >
              <List className="w-4 h-4" />
              Vista Detallada
            </button>
            <button
              onClick={() => setProductViewType('summary')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${productViewType === 'summary'
                  ? 'bg-primary/20 border border-primary/40 text-primary shadow-lg'
                  : 'bg-dark-bg/40 border border-border/30 text-text-secondary hover:bg-dark-bg/60 hover:border-border/50'}
              `}
            >
              <LayoutGrid className="w-4 h-4" />
              Vista Resumida
            </button>
            <button
              onClick={handleExportProductsPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 hover:shadow-lg"
              title="Exportar vista actual"
            >
              <FileDown className="w-4 h-4" />
              Exportar reporte
            </button>
          </div>

          <p className="text-xs text-text-muted">
            {productViewType === 'summary'
              ? 'Resumen ejecutivo con progreso por producto'
              : 'Tabla detallada con todos los ítems de producción'}
          </p>
        </div>

        {/* Renderizado condicional según el tipo de vista */}
        {productViewType === 'summary' ? (
          <ProductSummaryView
            items={productViewItems}
            dailyPlans={dailyPlans}
            onViewDetails={handleViewDetails}
            onOpenDailyPlan={handleOpenDailyPlanFromCard}
          />
        ) : (
          <>
            {/* KPIs de la vista detallada (original) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
                <span className="text-xs uppercase tracking-wide text-text-muted">Productos activos</span>
                <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(metrics.totalItems)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
                <span className="text-xs uppercase tracking-wide text-text-muted">Productos únicos</span>
                <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(metrics.uniqueProducts)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
                <span className="text-xs uppercase tracking-wide text-text-muted">Metros totales</span>
                <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(metrics.totalMetros)}</p>
                <p className="text-[11px] text-text-secondary">Próx. 7 días: {formatNumberWithDash(metrics.metrosProximos7)}</p>
                <p className="text-[11px] text-text-secondary">Promedio diario 7d: {formatNumberWithDash(metrics.metrosDiarios)}</p>
                <p className="text-[11px] text-text-secondary">Hoy: {formatNumberWithDash(metrics.metrosHoy)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
                <span className="text-xs uppercase tracking-wide text-text-muted">Unidades totales</span>
                <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(metrics.totalUnidades)}</p>
                <p className="text-[11px] text-text-secondary">Próx. 7 días: {formatNumberWithDash(metrics.unidadesProximos7)}</p>
                <p className="text-[11px] text-text-secondary">Promedio diario 7d: {formatNumberWithDash(metrics.unidadesDiarias)}</p>
                <p className="text-[11px] text-text-secondary">Hoy: {formatNumberWithDash(metrics.unidadesHoy)}</p>
              </div>
            </div>

            {/* Tabla detallada (original) */}
            <div className="glass-panel rounded-2xl border border-border shadow-hologram overflow-hidden">
              {rows.length === 0 ? (
                <div className="p-6 text-sm text-text-secondary">No hay productos activos para mostrar.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                    <thead className="bg-dark-card/80 border-b border-border">
                      <tr className="text-xs uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-3 text-left w-10"></th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('producto')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Producto</span>
                            {productSortIndicator('producto')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('cliente')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Cliente</span>
                            {productSortIndicator('cliente')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('numeroCotizacion')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Cotización</span>
                            {productSortIndicator('numeroCotizacion')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('fechaIngreso')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Ingreso</span>
                            {productSortIndicator('fechaIngreso')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('cantidad')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Cantidad</span>
                            {productSortIndicator('cantidad')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('fechaEntrega')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Entrega</span>
                            {productSortIndicator('fechaEntrega')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">Progreso</th>
                        <th className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleProductSort('estatus')}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary hover:text-primary focus:outline-none"
                          >
                            <span>Estatus</span>
                            {productSortIndicator('estatus')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-text-secondary">
                    {rows.map((row) => (
                      <ProductViewRow
                        key={row.item.id}
                        data={row}
                        statusOptions={orderedStatusOptions}
                        onChange={handleRowChange}
                        onPlanClick={handleOpenPlanModal}
                        onFilterByClient={handleFilterByClient}
                        onFilterByQuote={handleFilterByQuote}
                        onFilterByProduct={handleFilterByProduct}
                        showDeliverySummary={showDeliverySummary}
                      />
                    ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderClientView = () => {
    const rows = clientViewData;
    const totalMetros = rows.reduce((acc, row) => acc + row.metros, 0);
    const totalUnidades = rows.reduce((acc, row) => acc + row.unidades, 0);
    const totalSaldo = rows.reduce((acc, row) => acc + row.saldo, 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleExportClientsPDF}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/20 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/30 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar reporte
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-text-muted">Clientes activos</span>
            <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(rows.length)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-text-muted">Metros comprometidos</span>
            <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(totalMetros)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-text-muted">Unidades comprometidas</span>
            <p className="mt-2 text-xl font-semibold text-text-primary">{formatNumberWithDash(totalUnidades)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-text-muted">Saldo pendiente</span>
            <p className="mt-2 text-xl font-semibold text-text-primary">{formatCurrency(totalSaldo)}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-border shadow-hologram overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-text-secondary">No hay clientes con producción activa.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-dark-card/80 border-b border-border">
                  <tr className="text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Cotizaciones</th>
                    <th className="px-4 py-3 text-left">Productos</th>
                    <th className="px-4 py-3 text-left">Metros</th>
                    <th className="px-4 py-3 text-left">Unidades</th>
                    <th className="px-4 py-3 text-left">Saldo</th>
                    <th className="px-4 py-3 text-left">Entregas 7d</th>
                    <th className="px-4 py-3 text-left">Próxima entrega</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-text-secondary">
                  {rows.map((row) => (
                    <tr
                      key={row.client}
                      className="border-b border-border/40 hover:bg-dark-card/40 transition-colors cursor-pointer group"
                      onClick={() => handleOpenClientDrawer(row.client)}
                      title="Click para ver detalles del cliente"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary group-hover:text-primary transition-colors">
                        {row.client}
                      </td>
                      <td className="px-4 py-3">{formatNumberWithDash(row.cotizacionCount)}</td>
                      <td className="px-4 py-3">{formatNumberWithDash(row.productoCount)}</td>
                      <td className="px-4 py-3">{formatNumberWithDash(row.metros)}</td>
                      <td className="px-4 py-3">{formatNumberWithDash(row.unidades)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.saldo)}</td>
                      <td className="px-4 py-3">{formatNumberWithDash(row.entregasProximas)}</td>
                      <td className="px-4 py-3">
                        {row.fechaProxima ? formatDateLabel(row.fechaProxima) : 'Sin programación'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExportCalendarPDF}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/20 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/30 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar reporte
        </button>
      </div>
      <ProductionCalendarBoard
        days={scheduleDays}
        loading={scheduleLoading}
        error={scheduleError}
        onRefresh={refetchSchedule}
      />
    </div>
  );

  if (baseItems.length === 0) {
    return (
      <>
        <section className="glass-panel rounded-2xl border border-border shadow-hologram p-12 text-center text-text-muted">
          <p className="text-lg font-medium text-text-primary mb-2">Aún no hay ítems de producción</p>
          <p className="text-sm">Carga cotizaciones en Excel para comenzar a gestionar el flujo de producción.</p>
        </section>
        {planModalItem && (
          <DailyProductionModal
            item={planModalItem}
            plan={planModalData}
            open={Boolean(planModalItem)}
            loading={planModalLoading}
            saving={planModalSaving}
            error={planModalError}
            onClose={handleClosePlanModal}
            onSave={handleSavePlanModal}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="space-y-4">
      <div className="glass-panel rounded-2xl border border-border shadow-hologram p-4 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Búsqueda general
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-2 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full bg-dark-card/70 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary focus:border-primary outline-none transition-all"
                  placeholder="Cotización, producto, código..."
                  value={filters.query}
                  onChange={(event) => handleFilterChange('query', event.target.value)}
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Cliente / contacto
              <input
                type="text"
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                placeholder="Acotar por cliente"
                value={filters.client}
                onChange={(event) => handleFilterChange('client', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Tipo de pedido
              <select
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                value={filters.productionType}
                onChange={(event) =>
                  handleFilterChange('productionType', event.target.value as ProductionTypeFilter)
                }
              >
                <option value="all">Todos</option>
                <option value="cliente">Clientes</option>
                <option value="stock">Stock</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Estatus
              <select
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                <option value="">Todos</option>
                {orderedStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted lg:col-span-2">
              <label className="flex flex-col gap-1">
                Desde
                <input
                  type="date"
                  className={`w-full ${baseDateInputClass} px-3 py-2`}
                  value={filters.from}
                  onChange={(event) => handleFilterChange('from', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                Hasta
                <input
                  type="date"
                  className={`w-full ${baseDateInputClass} px-3 py-2`}
                  value={filters.to}
                  onChange={(event) => handleFilterChange('to', event.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'products'
        ? renderProductView()
        : viewMode === 'clients'
        ? renderClientView()
        : viewMode === 'calendar'
        ? renderCalendarView()
        : renderQuoteView()}
      </section>
      {planModalItem && (
        <DailyProductionModal
          item={planModalItem}
          plan={planModalData}
          open={Boolean(planModalItem)}
          loading={planModalLoading}
          saving={planModalSaving}
          error={planModalError}
          onClose={handleClosePlanModal}
          onSave={handleSavePlanModal}
        />
      )}

      {/* Drawer de detalle de cliente */}
      <ClientDetailDrawer
        clientName={selectedClient || ''}
        items={
          selectedClient
            ? filteredItems.filter((item) => getClientLabel(item) === selectedClient)
            : []
        }
        open={clientDrawerOpen}
        onClose={handleCloseClientDrawer}
        onViewProduct={handleViewProductFromClient}
      />

      {deliveryPrompt && (
        <DeliveryDetailsModal
          item={deliveryPrompt.item}
          initialGuide={deliveryPrompt.nextForm.guiaRemision}
          initialDispatchDate={deliveryPrompt.nextForm.fechaDespacho}
          onConfirm={handleDeliveryPromptConfirm}
          onCancel={handleDeliveryPromptCancel}
        />
      )}
    </>
  );
};

const QuoteRow: React.FC<{
  group: QuoteGroup;
  expanded: boolean;
  onToggle: () => void;
  statusOptions: string[];
  onSave: (id: number, payload: ProductionUpdatePayload) => Promise<void>;
  isSaving: (id: number) => boolean;
  onDeleteQuote: (quoteId: number) => Promise<void>;
  forms: Record<number, RowFormState>;
  onRowChange: (itemId: number, newFormData: RowFormState) => void;
  savingStatus: Record<number, 'idle' | 'saving' | 'success' | 'error'>;
  dailyPlans: Record<number, DailyProductionPlanEntry[]>;
  onOpenDailyPlan: (item: ProductionItem) => void;
  isItemReadOnly: (item: ProductionItem) => boolean;
  highlightedItemId?: number | null;
  highlightedQuoteId?: number | null;
  onFilterByClient: (client: string) => void;
  onFilterByQuote: (quote: string) => void;
  onFilterByProduct: (product: string) => void;
  validationErrors: Record<number, string | null>;
  showDeliverySummary?: boolean;
}> = ({
  group,
  expanded,
  onToggle,
  statusOptions,
  onSave,
  isSaving,
  onDeleteQuote,
  forms,
  onRowChange,
  savingStatus,
  dailyPlans,
  onOpenDailyPlan,
  isItemReadOnly,
  highlightedItemId,
  highlightedQuoteId,
  onFilterByClient,
  onFilterByQuote,
  onFilterByProduct,
  validationErrors,
  showDeliverySummary = false,
}) => {
  const fileUrl = buildQuoteFileUrl(group.archivoOriginal);
  const [quoteForm, setQuoteForm] = useState<QuoteRowFormState>(() => ({
    fechaIngreso: group.fechaIngreso ? group.fechaIngreso.substring(0, 10) : '',
    factura: group.facturas[0] ?? '',
    fechaVencimiento: group.fechaVencimiento ?? '',
    pagos: normalizePaymentsToForm(group.pagos),
  }));
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [showMetadataNotes, setShowMetadataNotes] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showFechaIngresoConfirm, setShowFechaIngresoConfirm] = useState(false);
  const [pendingFechaIngreso, setPendingFechaIngreso] = useState<string | null>(null);
  const headerRef = useRef<HTMLTableRowElement>(null);
  const isStock = group.tipoProduccion === 'stock';
  const periodLabel = useMemo(() => {
    if (!group.fechaInicioPeriodo && !group.fechaFinPeriodo) {
      return '';
    }
    if (group.fechaInicioPeriodo && group.fechaFinPeriodo) {
      return `${formatDateLabel(group.fechaInicioPeriodo)} - ${formatDateLabel(group.fechaFinPeriodo)}`;
    }
    if (group.fechaInicioPeriodo) {
      return `Desde ${formatDateLabel(group.fechaInicioPeriodo)}`;
    }
    if (group.fechaFinPeriodo) {
      return `Hasta ${formatDateLabel(group.fechaFinPeriodo)}`;
    }
    return '';
  }, [group.fechaInicioPeriodo, group.fechaFinPeriodo]);
  const isHighlightedQuote = useMemo(() => {
    if (highlightedQuoteId !== null && highlightedQuoteId !== undefined) {
      return highlightedQuoteId === group.cotizacionId;
    }
    if (highlightedItemId !== null && highlightedItemId !== undefined) {
      return group.items.some((item) => item.id === highlightedItemId);
    }
    return false;
  }, [group.cotizacionId, group.items, highlightedItemId, highlightedQuoteId]);

  const quoteReadOnly = useMemo(() => {
    return group.items.every((item) => {
      const form = forms[item.id];
      if (!form) {
        return true;
      }
      return isItemReadOnly(item);
    });
  }, [group.items, forms, isItemReadOnly]);

  useEffect(() => {
    if (isHighlightedQuote && headerRef.current) {
      headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlightedQuote]);

  useEffect(() => {
    if (!expanded) {
      setShowMetadataNotes(false);
    }
  }, [expanded]);

  useEffect(() => {
    setQuoteForm({
      factura: group.facturas[0] ?? '',
      fechaVencimiento: group.fechaVencimiento ?? '',
      pagos: normalizePaymentsToForm(group.pagos),
    });
  }, [group.facturas, group.fechaVencimiento, group.pagos, group.cotizacionId]);

  const overallProgress = useMemo(() => {
    const progressEntries = group.items
      .map((item) => {
        const form = forms[item.id];
        if (!form) return null;
        return computeProgress(item, form.fechaEntrega, form.estatus, dailyPlans[item.id]);
      })
      .filter((entry): entry is NonNullable<ReturnType<typeof computeProgress>> => Boolean(entry));

    if (progressEntries.length === 0) {
      return null;
    }

    const percent = Math.round(
      progressEntries.reduce((acc, entry) => acc + entry.percent, 0) / progressEntries.length,
    );

    return {
      percent,
      color: progressColorFromPercent(percent),
    };
  }, [group.items, forms, dailyPlans]);

  const quoteTotals = useMemo(() => {
    const totalAbonado = quoteForm.pagos.reduce((acc, pago) => {
      const value = Number.parseFloat(pago.monto);
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);

    const saldo =
      group.totalCotizacion !== null && Number.isFinite(group.totalCotizacion)
        ? Math.max(group.totalCotizacion - totalAbonado, 0)
        : null;

    return { totalAbonado, saldo };
  }, [quoteForm.pagos, group.totalCotizacion]);

  const dueDateStatus = useMemo(() => {
    const iso = quoteForm.fechaVencimiento;
    if (!iso) {
      return {
        message: 'Sin fecha de vencimiento',
        isOverdue: false,
        isSoon: false,
      };
    }

    const timestamp = parseDateValue(iso);
    if (!timestamp) {
      return {
        message: 'Fecha de vencimiento inválida',
        isOverdue: false,
        isSoon: false,
      };
    }

    const diffDays = Math.floor((timestamp - Date.now()) / DAY_IN_MS);
    if (diffDays < 0) {
      return {
        message: `Vencido (${formatDateLabel(iso)})`,
        isOverdue: true,
        isSoon: false,
      };
    }
    if (diffDays === 0) {
      return {
        message: 'Vence hoy',
        isOverdue: false,
        isSoon: true,
      };
    }
    if (diffDays <= 5) {
      return {
        message: `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`,
        isOverdue: false,
        isSoon: true,
      };
    }
    return {
      message: `Vence el ${formatDateLabel(iso)}`,
      isOverdue: false,
      isSoon: false,
    };
  }, [quoteForm.fechaVencimiento]);

  const dueDateHintClass = dueDateStatus.isOverdue
    ? 'text-red-400'
    : dueDateStatus.isSoon
    ? 'text-amber-300'
    : 'text-text-secondary';

  const dueDateBorderClass = dueDateStatus.isOverdue
    ? 'border-red-500/60 focus:border-red-400'
    : dueDateStatus.isSoon
    ? 'border-amber-400/60 focus:border-amber-400'
    : 'border-border';
  const dueDateBadgeClass = dueDateStatus.isOverdue
    ? 'bg-red-500/15 text-red-200 border border-red-500/40'
    : dueDateStatus.isSoon
    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
    : 'bg-primary/10 text-primary border border-primary/30';

  const openQuoteFile = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteQuote = async () => {
    const confirmed = window.confirm(
      `¿Eliminar la cotización ${group.numeroCotizacion} y todos sus productos asociados? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await onDeleteQuote(group.cotizacionId);
  };

  const updateQuoteField = (key: keyof QuoteRowFormState, value: string) => {
    setQuoteForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFechaIngresoChange = (newFecha: string) => {
    if (quoteReadOnly) {
      return;
    }
    if (!newFecha) {
      return;
    }

    // Comparar solo la parte de fecha (ignorar hora)
    const originalDate = group.fechaIngreso ? group.fechaIngreso.substring(0, 10) : '';
    if (newFecha === originalDate) {
      return;
    }

    // Mostrar modal de confirmación
    setPendingFechaIngreso(newFecha);
    setShowFechaIngresoConfirm(true);
  };

  const confirmFechaIngresoChange = async () => {
    if (!pendingFechaIngreso) return;

    setShowFechaIngresoConfirm(false);
    setIsSavingQuote(true);

    try {
      await Promise.all(
        group.items.map((item) =>
          onSave(item.id, {
            fechaIngreso: pendingFechaIngreso,
            fechaEntrega: item.fechaEntrega || null,
            estatus: normalizeStatusForSave(item.estatus || null, item.fechaEntrega || null),
            notasEstatus: item.notasEstatus || null,
            factura: item.factura || null,
            guiaRemision: (forms[item.id]?.guiaRemision || item.guiaRemision || '').trim() || null,
            fechaDespacho: forms[item.id]?.fechaDespacho || item.fechaDespacho || null,
            fechaVencimiento: group.fechaVencimiento,
            valorTotal: group.totalCotizacion,
            pagos: [],
          }),
        ),
      );
      // Actualizar el form state con el nuevo valor
      setQuoteForm((prev) => ({ ...prev, fechaIngreso: pendingFechaIngreso }));
      setPendingFechaIngreso(null);
    } catch (error) {
      console.error('Error al actualizar fecha de ingreso:', error);
      // Revertir en caso de error
      const originalDate = group.fechaIngreso ? group.fechaIngreso.substring(0, 10) : '';
      setQuoteForm((prev) => ({ ...prev, fechaIngreso: originalDate }));
      alert('Error al guardar la fecha de ingreso. Por favor intente nuevamente.');
    } finally {
      setIsSavingQuote(false);
    }
  };

  const cancelFechaIngresoChange = () => {
    // Revertir al valor original
    const originalDate = group.fechaIngreso ? group.fechaIngreso.substring(0, 10) : '';
    setQuoteForm((prev) => ({ ...prev, fechaIngreso: originalDate }));
    setPendingFechaIngreso(null);
    setShowFechaIngresoConfirm(false);
  };

  const updateQuotePayment = (index: number, field: keyof PaymentForm, value: string) => {
    if (quoteReadOnly) {
      return;
    }
    setQuoteForm((prev) => ({
      ...prev,
      pagos: prev.pagos.map((pago, idx) => (idx === index ? { ...pago, [field]: value } : pago)),
    }));
  };

  const addQuotePayment = () => {
    if (quoteReadOnly) {
      return;
    }
    setQuoteForm((prev) => ({
      ...prev,
      pagos: [...prev.pagos, { monto: '', fecha_pago: '', descripcion: '' }],
    }));
  };

  const removeQuotePayment = (index: number) => {
    if (quoteReadOnly) {
      return;
    }
    setQuoteForm((prev) => ({
      ...prev,
      pagos: prev.pagos.filter((_, idx) => idx !== index),
    }));
  };

  const isAnyItemSaving = useMemo(() => group.items.some((item) => isSaving(item.id)), [group.items, isSaving]);

  const handleQuoteSave = async () => {
    if (quoteReadOnly) {
      return;
    }
    const pagos = quoteForm.pagos
      .map((pago) => ({
        monto: Number.parseFloat(pago.monto),
        fecha_pago: pago.fecha_pago || null,
        descripcion: pago.descripcion ? pago.descripcion.trim() : null,
      }))
      .filter((pago) => Number.isFinite(pago.monto) && pago.monto > 0);

    const facturaValue = quoteForm.factura.trim();
    const fechaVenc = quoteForm.fechaVencimiento ? quoteForm.fechaVencimiento : null;
    const fechaIng = quoteForm.fechaIngreso ? quoteForm.fechaIngreso : null;

    setIsSavingQuote(true);
    try {
      await Promise.all(
        group.items.map((item) =>
          onSave(item.id, {
            fechaIngreso: fechaIng,
            fechaEntrega: item.fechaEntrega || null,
            estatus: normalizeStatusForSave(item.estatus || null, item.fechaEntrega || null),
            notasEstatus: item.notasEstatus || null,
            factura: facturaValue || null,
            guiaRemision: (forms[item.id]?.guiaRemision || item.guiaRemision || '').trim() || null,
            fechaDespacho: forms[item.id]?.fechaDespacho || item.fechaDespacho || null,
            fechaVencimiento: fechaVenc,
            valorTotal: group.totalCotizacion,
            pagos,
          }),
        ),
      );
      setShowPaymentsModal(false);
    } finally {
      setIsSavingQuote(false);
    }
  };

  const canSave = !isSavingQuote && !isAnyItemSaving && !quoteReadOnly;

  return (
    <>
      <tr
        ref={headerRef}
        className={`border-b border-border/60 transition-colors ${
          isHighlightedQuote
            ? 'ring-2 ring-primary/40 bg-primary/10'
            : isStock
            ? 'bg-amber-500/10 hover:bg-amber-500/15'
            : 'bg-dark-card/30 hover:bg-dark-card/40'
        }`}
      >
        <td className="align-top px-2 py-3">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
              aria-label={expanded ? 'Contraer detalle' : 'Expandir detalle'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleDeleteQuote}
              className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-2 py-1 text-[11px] font-medium text-red-400 hover:text-red-200 hover:border-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={quoteReadOnly}
              title="Eliminar cotización"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <input
            type="date"
            className={`${baseDateInputClass} px-2 py-1.5`}
            value={quoteForm.fechaIngreso}
            onChange={(event) => handleFechaIngresoChange(event.target.value)}
            disabled={isSavingQuote || quoteReadOnly}
          />
        </td>
        <td className="align-top px-4 py-3">
          {isStock ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Pedido stock</span>
              <span className="text-sm font-semibold text-text-primary">
                {group.numeroPedidoStock || 'Sin número'}
              </span>
            </div>
          ) : group.odc ? (
            <button
              type="button"
              onClick={openQuoteFile}
              className="text-sm font-medium text-primary hover:underline disabled:text-text-muted"
              disabled={!fileUrl}
            >
              {group.odc}
            </button>
          ) : (
            <span className="text-sm text-text-muted">—</span>
          )}
        </td>
        <td className="align-top px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFilterByQuote(group.numeroCotizacion)}
                className="text-left text-sm font-semibold text-primary hover:underline cursor-pointer transition-colors"
                title="Clic para filtrar por esta cotización"
              >
                {group.numeroCotizacion}
              </button>
              {fileUrl && (
                <button
                  type="button"
                  onClick={openQuoteFile}
                  className="inline-flex items-center justify-center w-5 h-5 rounded text-text-secondary hover:text-primary transition-colors"
                  title="Abrir archivo de cotización"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isStock ? (
              <span className="inline-flex w-max items-center gap-1 rounded-full border-2 border-warning bg-warning/30 px-2 py-0.5 text-[11px] font-bold text-warning shadow-sm">
                Stock
              </span>
            ) : (
              <span className="inline-flex w-max items-center gap-1 rounded-full border-2 border-primary bg-primary/30 px-2 py-0.5 text-[11px] font-bold text-primary shadow-sm">
                Cot.
              </span>
            )}
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <div className="flex flex-col gap-1 relative">
            {isStock ? (
              <>
                <button
                  type="button"
                  onClick={() => onFilterByClient(group.bodega || '')}
                  className="font-medium text-text-primary hover:text-primary hover:underline cursor-pointer text-left transition-colors"
                  title="Clic para filtrar por esta bodega"
                >
                  {group.bodega || 'Stock sin bodega asignada'}
                </button>
                {group.responsable && (
                  <span className="text-xs text-text-muted">Responsable: {group.responsable}</span>
                )}
                {periodLabel && (
                  <span className="text-xs text-text-secondary">{periodLabel}</span>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onFilterByClient(group.cliente || '')}
                  className="font-medium text-text-primary hover:text-primary hover:underline cursor-pointer text-left transition-colors"
                  title="Clic para filtrar por este cliente"
                >
                  {group.cliente || '—'}
                </button>
                {group.contacto && (
                  <span className="text-xs text-text-muted">Atención: {group.contacto}</span>
                )}
                {group.proyecto && (
                  <span className="text-xs text-text-muted">Proyecto: {group.proyecto}</span>
                )}
              </>
            )}
            <span className="text-xs text-text-secondary">
              {group.items.length} {group.items.length === 1 ? 'producto' : 'productos'}
            </span>
            {group.metadataNotes.length > 0 && (
              <div
                className="absolute top-0 right-0"
                onMouseLeave={() => setShowMetadataNotes(false)}
              >
                <button
                  type="button"
                  onMouseEnter={() => setShowMetadataNotes(true)}
                  onClick={() => setShowMetadataNotes((prev) => !prev)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
                  aria-label="Ver descripción de la cotización"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                {showMetadataNotes && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-80 max-w-sm rounded-lg border border-border bg-dark-card/95 p-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-primary mb-2">
                      <span>Descripción de la cotización</span>
                      <button
                        type="button"
                        onClick={() => setShowMetadataNotes(false)}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="space-y-2 text-xs text-text-secondary max-h-56 overflow-auto">
                      {group.metadataNotes.map((note, index) => (
                        <p key={index} className="leading-snug whitespace-pre-wrap">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
        <td className="align-top px-4 py-3 w-[160px]">
          <span className="text-sm font-semibold text-text-primary">
            {quoteForm.factura ? quoteForm.factura : 'Sin factura'}
          </span>
        </td>
      <td className="align-top px-4 py-3 w-[160px]">
        <button
          type="button"
          onClick={() => setShowFinancialModal(true)}
          className="w-full text-left rounded-xl border border-border/50 bg-dark-card/40 hover:bg-dark-card/60 px-4 py-3 space-y-2 transition-all duration-200 hover:border-primary/40 hover:shadow-glow-sm group"
        >
          <div className="flex items-center justify-between text-sm font-semibold text-text-primary">
            <span className="inline-flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-primary group-hover:text-primary/80" />
              Total
            </span>
            <span>{group.totalCotizacion !== null ? formatCurrency(group.totalCotizacion) : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-accent">
            <span>Saldo</span>
            <span>{quoteTotals.saldo !== null ? formatCurrency(quoteTotals.saldo) : '—'}</span>
          </div>
          <div className="text-[11px] text-text-muted group-hover:text-text-secondary transition-colors">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>Clic para ver detalle</span>
            </div>
          </div>
        </button>
      </td>
        <td className="align-top px-4 py-3 w-[220px]">
          <div className="flex flex-col gap-3 min-w-[180px]">
            <div className="space-y-1">
              {overallProgress ? (
                <>
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Progreso promedio</span>
                    <span className="font-semibold text-text-primary">{overallProgress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${overallProgress.color}`}
                      style={{ width: `${overallProgress.percent}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-xs text-text-muted">Sin progreso registrado</span>
              )}
            </div>
            {group.estatusSummary.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {group.estatusSummary.slice(0, 3).map((status) => (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1 rounded-full ${
                      statusBadgeVariants[status] || 'bg-primary/15 text-primary border border-primary/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {status}
                  </span>
                ))}
                {group.estatusSummary.length > 3 && (
                  <span className="text-[11px] text-text-muted">+{group.estatusSummary.length - 3} más</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-text-muted">Sin estatus</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-dark-card/40 border-b border-border/60">
          <td colSpan={8} className="px-0">
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-border bg-dark-card/50 overflow-hidden">
                <table className="min-w-full border-collapse">
                  <thead className="bg-dark-card/70 text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 text-left w-10"></th>
                      {[
                        'Producto',
                        'Cantidad',
                        'Fecha entrega',
                        'Progreso',
                        'Estatus',
                        'Notas',
                      ].map((label) => (
                        <th key={label} className="px-4 py-3 text-left">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm text-text-secondary">
                    {group.items.map((item) =>
                      forms[item.id] ? (
                        <ProductionRow
                          key={item.id}
                          item={item}
                          form={forms[item.id]}
                          statusOptions={statusOptions}
                          onChange={(newFormData) => onRowChange(item.id, newFormData)}
                          quoteTotal={group.totalCotizacion}
                          saveStatus={savingStatus[item.id] || 'idle'}
                          dailyPlan={dailyPlans[item.id]}
                          onPlanClick={onOpenDailyPlan}
                          readOnly={isItemReadOnly(item)}
                          highlighted={item.id === highlightedItemId}
                          onFilterByProduct={onFilterByProduct}
                          validationError={validationErrors[item.id] || null}
                          showDeliverySummary={showDeliverySummary}
                        />
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
      {showPaymentsModal && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/40 bg-white text-slate-900 shadow-[0_40px_80px_rgba(0,0,0,0.35)] dark:border-border/60 dark:bg-dark-card dark:text-text-primary">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/30 to-transparent opacity-70 dark:from-primary/20 dark:via-transparent dark:to-transparent dark:opacity-80" />
              <div className="relative px-6 py-7 space-y-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentsModal(false)}
                  className="absolute top-5 right-5 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Cerrar gestión de cobros"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">Gestión de cobros</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Administra facturación, compromisos y abonos de la cotización {group.numeroCotizacion}.
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${dueDateBadgeClass}`}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {dueDateStatus.message}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-dark-card/75 p-4 shadow-inner">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      Valor total
                    </div>
                    <span className="mt-2 block text-sm font-semibold text-text-primary">
                      {group.totalCotizacion !== null ? formatCurrency(group.totalCotizacion) : '—'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-dark-card/75 p-4 shadow-inner">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                      Total abonado
                    </div>
                    <span className="mt-2 block text-sm font-semibold text-text-primary">
                      {formatCurrency(quoteTotals.totalAbonado)}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-dark-card/75 p-4 shadow-inner">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                      Saldo pendiente
                    </div>
                    <span className="mt-2 block text-sm font-semibold text-text-primary">
                      {quoteTotals.saldo !== null ? formatCurrency(quoteTotals.saldo) : '—'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs text-text-muted">
                    Factura
                    <input
                      type="text"
                      className="bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Asignar factura"
                      value={quoteForm.factura}
                      onChange={(event) => updateQuoteField('factura', event.target.value)}
                      disabled={quoteReadOnly}
                    />
                  </label>
                <label className="flex flex-col gap-2 text-xs text-text-muted">
                  Fecha de vencimiento
                  <input
                    type="date"
                    className={`bg-dark-card/70 border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed dark:[color-scheme:dark] ${dueDateBorderClass}`}
                    value={quoteForm.fechaVencimiento}
                    onChange={(event) => updateQuoteField('fechaVencimiento', event.target.value)}
                    disabled={quoteReadOnly}
                  />
                  <span className={`text-[11px] ${dueDateHintClass}`}>{dueDateStatus.message}</span>
                </label>
              </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-text-primary">Pagos registrados</h4>
                    <button
                      type="button"
                      onClick={addQuotePayment}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={quoteReadOnly}
                    >
                      <Plus className="w-3 h-3" />
                      Añadir pago
                    </button>
                  </div>
                  {quoteForm.pagos.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-text-secondary">
                      Aún no se registran pagos para esta cotización.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {quoteForm.pagos.map((pago, index) => (
                        <div key={index} className="rounded-2xl border border-border/60 bg-dark-card/70 p-4 shadow-inner space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-text-muted">
                            <span>Pago #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeQuotePayment(index)}
                              className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={quoteReadOnly}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              type="number"
                              placeholder="Monto"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                              value={pago.monto}
                              onChange={(event) => updateQuotePayment(index, 'monto', event.target.value)}
                              disabled={quoteReadOnly}
                            />
                            <input
                              type="date"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed dark:[color-scheme:dark]"
                              value={pago.fecha_pago}
                              onChange={(event) => updateQuotePayment(index, 'fecha_pago', event.target.value)}
                              disabled={quoteReadOnly}
                            />
                            <input
                              type="text"
                              placeholder="Descripción"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                              value={pago.descripcion}
                              onChange={(event) => updateQuotePayment(index, 'descripcion', event.target.value)}
                              disabled={quoteReadOnly}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentsModal(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuoteSave}
                    disabled={!canSave}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingQuote ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {showFinancialModal && typeof document !== 'undefined' &&
        createPortal(
          <FinancialDetailModal
            group={group}
            quoteTotals={quoteTotals}
            dueDateStatus={dueDateStatus}
            open={showFinancialModal}
            onClose={() => setShowFinancialModal(false)}
            onManagePayments={() => {
              setShowFinancialModal(false);
              setShowPaymentsModal(true);
            }}
          />,
          document.body
        )}

      {/* Modal de confirmación para cambio de fecha de ingreso */}
      {showFechaIngresoConfirm && pendingFechaIngreso &&
        createPortal(
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-dark-bg/90 backdrop-blur-md px-4">
            <div className="w-full max-w-md glass-panel rounded-2xl border border-amber-500/40 bg-dark-card/95 shadow-hologram overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Confirmar cambio de fecha</h3>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Fecha actual:</span>
                    <span className="font-semibold text-text-primary">
                      {group.fechaIngreso ? formatDateLabel(group.fechaIngreso.substring(0, 10)) : 'Sin fecha'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowUpDown className="h-4 w-4 text-primary rotate-90" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Nueva fecha:</span>
                    <span className="font-semibold text-primary">
                      {formatDateLabel(pendingFechaIngreso)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-200">Advertencia importante</p>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Este cambio recalculará automáticamente la distribución de producción para todos los{' '}
                        <span className="font-semibold text-text-primary">{group.items.length} producto(s)</span> de esta cotización.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-border/40 bg-dark-card/40 px-6 py-4">
                <button
                  type="button"
                  onClick={cancelFechaIngresoChange}
                  disabled={isSavingQuote}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmFechaIngresoChange}
                  disabled={isSavingQuote}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingQuote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar cambio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

interface DeliveryDetailsModalProps {
  item: ProductionItem;
  initialGuide: string;
  initialDispatchDate: string;
  onConfirm: (details: { guiaRemision: string; fechaDespacho: string }) => void;
  onCancel: () => void;
}

const DeliveryDetailsModal: React.FC<DeliveryDetailsModalProps> = ({
  item,
  initialGuide,
  initialDispatchDate,
  onConfirm,
  onCancel,
}) => {
  const [guide, setGuide] = useState(initialGuide ?? '');
  const [dispatchDate, setDispatchDate] = useState(initialDispatchDate ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGuide(initialGuide ?? '');
    setDispatchDate(initialDispatchDate ?? '');
    setError(null);
  }, [initialGuide, initialDispatchDate]);

  if (typeof document === 'undefined') {
    return null;
  }

  const clientLabel = item.cliente || 'Cliente sin nombre';
  const handleConfirm = () => {
    if (!guide.trim()) {
      setError('Ingresa la guía de remisión para completar la entrega.');
      return;
    }
    if (!dispatchDate) {
      setError('Selecciona la fecha de despacho para completar la entrega.');
      return;
    }
    onConfirm({
      guiaRemision: guide.trim(),
      fechaDespacho: dispatchDate,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-dark-bg/90 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-dark-card/95 p-6 shadow-hologram space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 border border-accent/40">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-1">Confirmar entrega</p>
            <h2 className="text-lg font-semibold text-text-primary">Registra los datos logísticos</h2>
            <p className="text-sm text-text-muted mt-1">
              Necesitamos la guía de remisión y la fecha de despacho para cerrar la entrega de{' '}
              <span className="font-semibold text-text-primary">{item.producto}</span> ({clientLabel}).
            </p>
            <p className="text-xs text-text-secondary mt-2 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              {item.numeroCotizacion ? `Cotización ${item.numeroCotizacion}` : 'Sin número de cotización'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Guía de remisión
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-dark-card/70 px-3 py-2 text-text-primary outline-none focus:border-accent disabled:opacity-60"
              placeholder="Ej: GR-00123"
              value={guide}
              onChange={(event) => setGuide(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Fecha de despacho
            <input
              type="date"
              className={`${baseDateInputClass} px-3 py-2`}
              value={dispatchDate}
              onChange={(event) => setDispatchDate(event.target.value)}
            />
          </label>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Guardar datos
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ProductViewRow: React.FC<{
  data: ProductViewRowModel;
  statusOptions: string[];
  onChange: (itemId: number, newFormData: RowFormState) => void;
  onPlanClick: (item: ProductionItem) => void;
  onFilterByClient: (client: string) => void;
  onFilterByQuote: (quote: string) => void;
  onFilterByProduct: (product: string) => void;
  showDeliverySummary?: boolean;
}> = ({
  data,
  statusOptions,
  onChange,
  onPlanClick,
  onFilterByClient,
  onFilterByQuote,
  onFilterByProduct,
  showDeliverySummary = false,
}) => {
  const { item, form, progress, quantity, saving, readOnly, validationError } = data;
  const isStock = resolveProductionType(item) === 'stock';
  const clientLabel = getClientLabel(item);
  const stockPeriodLabel = useMemo(() => {
    if (!item.fechaInicioPeriodo && !item.fechaFinPeriodo) {
      return '';
    }
    if (item.fechaInicioPeriodo && item.fechaFinPeriodo) {
      return `${formatDateLabel(item.fechaInicioPeriodo)} - ${formatDateLabel(item.fechaFinPeriodo)}`;
    }
    if (item.fechaInicioPeriodo) {
      return `Desde ${formatDateLabel(item.fechaInicioPeriodo)}`;
    }
    if (item.fechaFinPeriodo) {
      return `Hasta ${formatDateLabel(item.fechaFinPeriodo)}`;
    }
    return '';
  }, [item.fechaInicioPeriodo, item.fechaFinPeriodo]);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const displayStatus = useMemo(
    () =>
      resolveStatusFromDelivery(
        form.estatus || item.estatus,
        form.fechaEntrega || item.fechaEntrega,
      ),
    [form.estatus, form.fechaEntrega, item.estatus, item.fechaEntrega],
  );

  useEffect(() => {
    if (data.isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [data.isHighlighted]);

  const updateField = (key: keyof RowFormState, value: string) => {
    if (readOnly) {
      return;
    }
    const updatedForm = { ...form, [key]: value };

    // Si se asigna fecha de entrega, cambiar automáticamente el estatus a "En producción"
    if (key === 'fechaEntrega' && value && (!form.estatus || form.estatus === 'En cola')) {
      updatedForm.estatus = 'En producción';
    }

    onChange(item.id, updatedForm);
  };

  const handlePlanClick = () => {
    if (readOnly) {
      return;
    }
    onPlanClick(item);
  };

  const fechaIngresoLabel = item.fechaIngreso ? formatDateLabel(item.fechaIngreso) : '—';
  const fechaEntregaLabel = form.fechaEntrega ? formatDateLabel(form.fechaEntrega) : 'Sin definir';
  const highlightClasses = data.isHighlighted ? 'ring-2 ring-accent/40 bg-accent/10' : '';
  const guiaRemisionDisplay = (form.guiaRemision?.trim() || item.guiaRemision || '').trim();
  const fechaDespachoDisplay = form.fechaDespacho || item.fechaDespacho || '';
  const formattedFechaDespacho = fechaDespachoDisplay ? formatDateLabel(fechaDespachoDisplay) : 'Sin fecha';

  return (
    <tr
      ref={rowRef}
      className={`transition-colors ${data.colorClass} ${highlightClasses} hover:brightness-110`}
    >
      <td className="px-4 py-2 text-center align-top w-12 first:rounded-l-lg last:rounded-r-lg">
        {saving === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        {saving === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
        {saving === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
      </td>
      <td className="px-4 py-2 align-top min-w-[220px]">
        <button
          type="button"
          onClick={() => onFilterByProduct(item.producto)}
          className="font-semibold text-text-primary hover:text-primary hover:underline cursor-pointer text-left transition-colors"
          title="Clic para filtrar por este producto"
        >
          {item.producto}
        </button>
        {item.proyecto && <p className="text-[11px] text-text-secondary mt-1">Proyecto: {item.proyecto}</p>}
        <button
          type="button"
          onClick={handlePlanClick}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-primary disabled:opacity-60 disabled:cursor-not-allowed"
          title="Abrir plan diario de producción"
          disabled={readOnly}
        >
          <CalendarDays className="h-3 w-3" />
          Plan diario de producción
        </button>
      </td>
      <td className="px-4 py-2 align-top min-w-[180px]" title={clientLabel}>
        <button
          type="button"
          onClick={() => onFilterByClient(isStock ? (item.bodega || '') : (item.cliente || ''))}
          className="text-sm text-text-primary font-medium hover:text-primary hover:underline cursor-pointer text-left transition-colors"
          title="Clic para filtrar por este cliente"
        >
          {isStock ? (item.bodega || 'Stock sin bodega') : item.cliente || 'Sin cliente'}
        </button>
        {isStock ? (
          <>
            {item.responsable && (
              <p className="text-[11px] text-text-secondary">Responsable: {item.responsable}</p>
            )}
            {stockPeriodLabel && (
              <p className="text-[11px] text-text-secondary">{stockPeriodLabel}</p>
            )}
          </>
        ) : (
          item.contacto && <p className="text-[11px] text-text-secondary">Atención: {item.contacto}</p>
        )}
      </td>
      <td className="px-4 py-2 align-top">
        <button
          type="button"
          onClick={() => onFilterByQuote(item.numeroCotizacion)}
          className="text-sm font-medium text-primary hover:text-accent hover:underline cursor-pointer text-left transition-colors"
          title="Clic para filtrar por esta cotización"
        >
          {item.numeroCotizacion}
        </button>
        {isStock ? (
          <p className="text-[11px] text-text-secondary">Pedido: {item.numeroPedidoStock || '—'}</p>
        ) : (
          item.odc && <p className="text-[11px] text-text-secondary">ODC: {item.odc}</p>
        )}
      </td>
      <td className="px-4 py-2 align-top whitespace-nowrap text-sm text-text-secondary">{fechaIngresoLabel}</td>
      <td className="px-4 py-2 align-top min-w-[120px]">
        <span className="text-sm text-text-primary">{item.cantidad || '—'}</span>
        {quantity.amount !== null && (
          <p className="text-[11px] text-text-secondary">
            {formatNumberWithDash(quantity.amount)} {quantity.unit === 'metros' ? 'm²' : 'u'}
          </p>
        )}
      </td>
      <td className="px-4 py-2 align-top">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            className={`${baseDateInputClass} px-2 py-1`}
            value={form.fechaEntrega}
            onChange={(event) => updateField('fechaEntrega', event.target.value)}
            disabled={readOnly}
          />
        </div>
      </td>
      <td className="px-4 py-2 align-top">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {progress ? (
              <div className="min-w-[120px]" title={progress.tooltip}>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${progress.color}`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-secondary mt-1">{progress.label}</p>
              </div>
            ) : (
              <span className="text-xs text-text-muted">Sin fecha objetivo</span>
            )}
          </div>
          <button
            type="button"
            onClick={handlePlanClick}
            className="inline-flex items-center gap-1 rounded-md border border-accent/50 bg-accent/20 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Control diario"
            disabled={readOnly}
          >
            <CalendarDays className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="px-4 py-2 align-top min-w-[220px]">
        <div className="space-y-2">
          <select
            className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus-border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.estatus}
            onChange={(event) => updateField('estatus', event.target.value)}
            disabled={readOnly}
          >
            <option value="">Seleccionar...</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border ${
              displayStatus
                ? statusBadgeVariants[displayStatus] || 'bg-primary/10 text-primary border-primary/40'
                : 'border-border text-text-muted'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {displayStatus || 'Sin estatus'}
          </span>
          {showDeliverySummary && (
            <div className="rounded-xl border border-border/60 bg-dark-card/50 px-3 py-2 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Guía de remisión</span>
                <span className="text-text-primary font-semibold">
                  {guiaRemisionDisplay || 'Sin dato'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Fecha de despacho</span>
                <span className="text-text-primary font-semibold">
                  {formattedFechaDespacho}
                </span>
              </div>
            </div>
          )}
          {validationError && (
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-2 py-1">
              {validationError}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-2 align-top">
        <textarea
          className="w-full min-h-[60px] bg-dark-card/70 border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus-border-primary outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Notas de producción"
          value={form.notasEstatus}
          onChange={(event) => updateField('notasEstatus', event.target.value)}
          disabled={readOnly}
        />
      </td>
    </tr>
  );
};

const ProductionRow: React.FC<{
  item: ProductionItem;
  form: RowFormState;
  statusOptions: string[];
  onChange: (form: RowFormState) => void;
  quoteTotal: number | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  dailyPlan?: DailyProductionPlanEntry[];
  onPlanClick: (item: ProductionItem) => void;
  readOnly: boolean;
  highlighted?: boolean;
  onFilterByProduct?: (product: string) => void;
  validationError?: string | null;
  showDeliverySummary?: boolean;
}> = ({
  item,
  form,
  statusOptions,
  onChange,
  quoteTotal,
  saveStatus,
  dailyPlan,
  onPlanClick,
  readOnly,
  highlighted = false,
  onFilterByProduct,
  validationError,
  showDeliverySummary = false,
}) => {
  const totalCotizacion = useMemo(() => {
    if (quoteTotal !== null && quoteTotal !== undefined) {
      return quoteTotal;
    }
    if (item.valorTotal !== null && item.valorTotal !== undefined) {
      return item.valorTotal;
    }
    if (item.valorSubtotal !== null && item.valorSubtotal !== undefined) {
      return item.valorSubtotal;
    }
    return null;
  }, [quoteTotal, item.valorSubtotal, item.valorTotal]);

  const totalAbonado = useMemo(() => {
    return form.pagos.reduce((acc, pago) => {
      const value = Number.parseFloat(pago.monto);
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [form.pagos]);

  const displayStatus = useMemo(
    () =>
      resolveStatusFromDelivery(
        form.estatus || item.estatus,
        form.fechaEntrega || item.fechaEntrega,
      ),
    [form.estatus, form.fechaEntrega, item.estatus, item.fechaEntrega],
  );

  const saldoPendiente = totalCotizacion !== null ? Math.max(totalCotizacion - totalAbonado, 0) : null;
  const progress = computeProgress(item, form.fechaEntrega, form.estatus, dailyPlan);
  const guiaRemisionDisplay = (form.guiaRemision?.trim() || item.guiaRemision || '').trim();
  const fechaDespachoDisplay = form.fechaDespacho || item.fechaDespacho || '';
  const formattedFechaDespacho = fechaDespachoDisplay ? formatDateLabel(fechaDespachoDisplay) : 'Sin fecha';

  const updateField = (key: keyof RowFormState, value: string) => {
    if (readOnly) {
      return;
    }
    const updatedForm = { ...form, [key]: value };

    // Si se asigna fecha de entrega, cambiar automáticamente el estatus a "En producción"
    if (key === 'fechaEntrega' && value && (!form.estatus || form.estatus === 'En cola')) {
      updatedForm.estatus = 'En producción';
    }

    onChange(updatedForm);
  };

  const handlePlanClick = () => {
    if (readOnly) {
      return;
    }
    onPlanClick(item);
  };

  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <tr
      ref={rowRef}
      className={`border-t border-border/40 hover:bg-dark-card/40 transition-colors ${
        highlighted ? 'ring-1 ring-primary/40 bg-primary/10' : ''
      }`}
    >
      <td className="align-top px-2 py-4 w-10 text-center">
        {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        {saveStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
        {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
      </td>
      <td className="align-top px-4 py-4 max-w-md">
        {onFilterByProduct ? (
          <button
            type="button"
            onClick={() => onFilterByProduct(item.producto)}
            className="font-medium text-text-primary hover:text-primary hover:underline cursor-pointer text-left transition-colors"
            title="Clic para filtrar por este producto"
          >
            {item.producto}
          </button>
        ) : (
          <p className="font-medium text-text-primary">{item.producto}</p>
        )}
      </td>
      <td className="align-top px-4 py-4 whitespace-nowrap">{item.cantidad || '—'}</td>
      <td className="align-top px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="date"
              className={`${baseDateInputClass} px-2 py-1`}
              value={form.fechaEntrega}
              onChange={(event) => updateField('fechaEntrega', event.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="text-xs text-text-muted">
            {form.fechaEntrega ? formatDateLabel(form.fechaEntrega) : 'Sin definir'}
          </div>
        </div>
      </td>
      <td className="align-top px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="min-w-[160px] flex-1">
            {progress ? (
              <div title={progress.tooltip}>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${progress.color}`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {progress.label}
                  {progress.producedEstimate !== null && progress.quantity !== null && (
                    <span className="block text-[11px] text-text-secondary">
                      Estimado: {formatNumberWithDash(progress.producedEstimate)} / {formatNumberWithDash(progress.quantity)}
                      {progress.quantityUnit === 'metros' ? ' m²' : ' u.'}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <span className="text-xs text-text-muted">Sin fecha objetivo</span>
            )}
          </div>
          <button
            type="button"
            onClick={handlePlanClick}
            className="inline-flex items-center gap-1 rounded-md border border-accent/50 bg-accent/20 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Control diario"
            disabled={readOnly}
          >
            <CalendarDays className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="align-top px-4 py-4">
        <div className="space-y-3 min-w-[200px]">
          <select
            className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-text-primary focus-border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            value={form.estatus}
            onChange={(event) => updateField('estatus', event.target.value)}
            disabled={readOnly}
          >
            <option value="">Seleccionar...</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {displayStatus ? (
            <span
              className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${
                statusBadgeVariants[displayStatus] || 'bg-primary/10 text-primary border-primary/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {displayStatus}
            </span>
          ) : (
            <span className="text-[11px] text-text-muted">Sin estatus</span>
          )}
          {showDeliverySummary && (
            <div className="rounded-xl border border-border/60 bg-dark-card/50 px-3 py-2 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Guía de remisión</span>
                <span className="text-text-primary font-semibold">
                  {guiaRemisionDisplay || 'Sin dato'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Fecha de despacho</span>
                <span className="text-text-primary font-semibold">
                  {formattedFechaDespacho}
                </span>
              </div>
            </div>
          )}
          {validationError && (
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-2 py-1">
              {validationError}
            </p>
          )}
        </div>
      </td>
      <td className="align-top px-4 py-4">
        <textarea
          className="w-full min-h-[80px] bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-xs text-text-primary focus-border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Notas de produccion o entregas parciales"
          value={form.notasEstatus}
          onChange={(event) => updateField('notasEstatus', event.target.value)}
          disabled={readOnly}
        />
      </td>
    </tr>
  );
};

export default StatusTable;
