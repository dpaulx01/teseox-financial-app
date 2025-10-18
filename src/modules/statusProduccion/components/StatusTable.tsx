import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Info,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import type {
  DailyProductionPlanEntry,
  ProductionItem,
  ProductionPayment,
  ProductionUpdatePayload,
} from '../../../types/production';
import useProductionSchedule from '../hooks/useProductionSchedule';
import ProductionCalendarBoard from './ProductionCalendarBoard';
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

type ViewMode = 'quotes' | 'products' | 'clients' | 'calendar';

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
  fechaVencimiento: string;
  pagos: PaymentForm[];
}

interface QuoteRowFormState {
  factura: string;
  fechaVencimiento: string;
  pagos: PaymentForm[];
}

interface QuoteGroup {
  cotizacionId: number;
  numeroCotizacion: string;
  odc: string | null;
  cliente: string | null;
  contacto: string | null;
  proyecto: string | null;
  fechaIngreso: string | null;
  archivoOriginal: string | null;
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

interface StatusTableProps {
  items: ProductionItem[];
  statusOptions: string[];
  onSave: (id: number, payload: ProductionUpdatePayload) => Promise<void>;
  isSaving: (id: number) => boolean;
  onDeleteQuote: (quoteId: number) => Promise<void>;
  viewMode: ViewMode;
}

interface ProgressInfo {
  percent: number;
  color: string;
  label: string;
  tooltip: string;
  producedEstimate: number | null;
  quantity: number | null;
}

const defaultFilters: Filters = {
  query: '',
  client: '',
  status: '',
  from: '',
  to: '',
};

const statusBadgeVariants: Record<string, string> = {
  'En cola': 'bg-slate-700 text-white border-transparent shadow-sm',
  'En producción': 'bg-sky-600 text-white border-transparent shadow-sm',
  'Producción parcial': 'bg-amber-500 text-slate-900 border-transparent shadow-sm',
  'Listo para retiro': 'bg-emerald-500 text-white border-transparent shadow-sm',
  Entregado: 'bg-emerald-700 text-white border-transparent shadow-sm',
};

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

const DAY_IN_MS = 86_400_000;

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
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return dateIso;
  }
  return parsed.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  'bg-emerald-500/10 border-l-4 border-emerald-500/60',
  'bg-sky-500/10 border-l-4 border-sky-500/60',
  'bg-amber-500/10 border-l-4 border-amber-500/60',
  'bg-fuchsia-500/10 border-l-4 border-fuchsia-500/60',
  'bg-rose-500/10 border-l-4 border-rose-500/60',
  'bg-lime-500/10 border-l-4 border-lime-500/60',
];

function extractQuantityInfo(value: string | null | undefined): { amount: number | null; unit: 'metros' | 'unidades' } {
  if (!value) {
    return { amount: null, unit: 'unidades' };
  }
  const amount = parseQuantityFromString(value);
  const normalized = normalizeText(value);
  const isMeters = meterKeywords.some((keyword) => normalized.includes(keyword));
  return {
    amount,
    unit: isMeters ? 'metros' : 'unidades',
  };
}

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
  if (percent >= 100) return 'bg-emerald-500';
  if (percent > 85) return 'bg-emerald-500';
  if (percent > 60) return 'bg-amber-500';
  if (percent > 40) return 'bg-sky-500';
  return 'bg-slate-500';
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
  const statusLabel = estatus || 'Sin estatus';
  const tooltipParts: string[] = [];
  const percentFromStatus = getStatusProgressPercent(estatus);
  const quantity = parseQuantityFromString(item.cantidad);

  if (estatus) {
    tooltipParts.push(`Estatus: ${estatus}`);
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
    const quantityInfo = extractQuantityInfo(item.cantidad);
    const targetField = quantityInfo.unit;
    
    // Calcular producción real hasta hoy
    const producedSoFar = dailyPlan
      .filter(entry => {
        const entryDate = parseISODate(entry.fecha);
        return entryDate && entryDate <= today;
      })
      .reduce((sum, entry) => {
        return sum + (targetField === 'metros' ? entry.metros : entry.unidades);
      }, 0);

    // Calcular total planificado
    const totalPlanned = dailyPlan.reduce((sum, entry) => {
      return sum + (targetField === 'metros' ? entry.metros : entry.unidades);
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
        `Plan real: ${Math.round(percentFromTime)}% (${formatNumber(producedSoFar)}/${formatNumber(totalPlanned)} ${targetField})`
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
  };
}

function matchesFilters(item: ProductionItem, filters: Filters): boolean {
  if (filters.status && (item.estatus ?? '') !== filters.status) {
    return false;
  }

  if (filters.client) {
    const needle = normalizeText(filters.client);
    const matchesClient =
      includesNormalized(item.cliente, needle) ||
      includesNormalized(item.contacto, needle) ||
      includesNormalized(item.proyecto, needle);
    if (!matchesClient) {
      return false;
    }
  }

  if (filters.query) {
    const needle = normalizeText(filters.query);
    const haystacks = [
      item.numeroCotizacion,
      item.producto,
      item.cantidad,
      item.cliente,
      item.contacto,
      item.proyecto,
      item.odc,
      item.factura,
      item.notasEstatus,
    ];
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
}) => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'fechaIngreso',
    direction: 'desc',
  });
  const [forms, setForms] = useState<Record<number, RowFormState>>({});
  const [savingStatus, setSavingStatus] = useState<Record<number, 'idle' | 'saving' | 'success' | 'error'>>({});
  const [planModalItem, setPlanModalItem] = useState<ProductionItem | null>(null);
  const [planModalData, setPlanModalData] = useState<DailyProductionPlanEntry[]>([]);
  const [planModalLoading, setPlanModalLoading] = useState<boolean>(false);
  const [planModalSaving, setPlanModalSaving] = useState<boolean>(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);
  const baseItems = useMemo(() => items.filter((item) => !item.esServicio), [items]);
  
  // Hook para obtener planes diarios
  const { getDailyPlan, preloadPlans } = useDailyPlans();
  
  // Estado para cachear planes diarios
  const [dailyPlans, setDailyPlans] = useState<Record<number, DailyProductionPlanEntry[]>>({});

  // Initialize or update the forms state when the base items change
  useEffect(() => {
    const initialForms: Record<number, RowFormState> = {};
    for (const item of baseItems) {
      if (isMetadataDescription(item.producto)) continue;
      initialForms[item.id] = {
        fechaEntrega: item.fechaEntrega ?? '',
        estatus: item.estatus ?? '',
        notasEstatus: item.notasEstatus ?? '',
        factura: item.factura ?? '',
        fechaVencimiento: item.fechaVencimiento ?? '',
        pagos: normalizePaymentsToForm(item.pagos),
      };
    }
    setForms(initialForms);
  }, [baseItems]);

  // Cargar planes diarios para todos los items
  useEffect(() => {
    const loadDailyPlans = async () => {
      const itemIds = baseItems
        .filter(item => !isMetadataDescription(item.producto))
        .map(item => item.id);
      
      const planPromises = itemIds.map(async (itemId) => {
        try {
          const plan = await getDailyPlan(itemId);
          return { itemId, plan };
        } catch (error) {
          console.warn(`Failed to load daily plan for item ${itemId}:`, error);
          return { itemId, plan: [] };
        }
      });

      const results = await Promise.allSettled(planPromises);
      const newDailyPlans: Record<number, DailyProductionPlanEntry[]> = {};
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          newDailyPlans[result.value.itemId] = result.value.plan;
        }
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
      };
      const current = forms[item.id];
      if (!current) continue;

      if (
        original.fechaEntrega !== current.fechaEntrega ||
        original.estatus !== current.estatus ||
        original.notasEstatus !== current.notasEstatus
      ) {
        dirty.add(item.id);
      }
    }
    return dirty;
  }, [baseItems, forms]);

  const handleRowChange = (itemId: number, newFormData: RowFormState) => {
    setForms(prev => ({
      ...prev,
      [itemId]: newFormData,
    }));
    setSavingStatus(prev => ({ ...prev, [itemId]: 'idle' }));
  };

  const handleOpenPlanModal = useCallback(async (item: ProductionItem) => {
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
  }, []);

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

  const handleAutoSave = useCallback(async (idsToSave: Set<number>) => {
    if (idsToSave.size === 0) return;

    setSavingStatus(prev => {
      const next = { ...prev };
      idsToSave.forEach(id => { next[id] = 'saving'; });
      return next;
    });

    const savePromises = Array.from(idsToSave).map(itemId => {
      const form = forms[itemId];
      const item = baseItems.find(i => i.id === itemId);
      if (!form || !item) return Promise.resolve();

      const payload: ProductionUpdatePayload = {
        fechaEntrega: form.fechaEntrega || null,
        estatus: form.estatus || null,
        notasEstatus: form.notasEstatus || null,
        factura: item.factura || null,
        fechaVencimiento: item.fechaVencimiento || null,
        valorTotal: item.valorTotal || null,
        pagos: item.pagos.map(p => ({...p, monto: Number(p.monto)})) || [],
      };
      return onSave(itemId, payload);
    });

    const results = await Promise.allSettled(savePromises);

    setSavingStatus(prev => {
      const next = { ...prev };
      results.forEach((result, index) => {
        const itemId = Array.from(idsToSave)[index];
        if (result.status === 'fulfilled') {
          next[itemId] = 'success';
        } else {
          next[itemId] = 'error';
        }
      });
      return next;
    });

    // Reset success status after a delay
    setTimeout(() => {
      setSavingStatus(prev => {
        const next = { ...prev };
        results.forEach((result, index) => {
          const itemId = Array.from(idsToSave)[index];
          if (next[itemId] === 'success') {
            next[itemId] = 'idle';
          }
        });
        return next;
      });
    }, 2000);

  }, [forms, baseItems, onSave]);

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
  }, []);

  const filteredItems = useMemo(() => {
    const hasFilters =
      filters.query.trim() ||
      filters.client.trim() ||
      filters.status ||
      filters.from ||
      filters.to;

    if (!hasFilters) {
      return baseItems;
    }

    const quoteMatches = new Map<number, boolean>();

    const evaluate = (item: ProductionItem) => matchesFilters(item, filters);

    for (const item of baseItems) {
      const matches = evaluate(item);
      if (matches) {
        quoteMatches.set(item.cotizacionId, true);
      } else if (!quoteMatches.has(item.cotizacionId)) {
        quoteMatches.set(item.cotizacionId, false);
      }
    }

    return baseItems.filter((item) => quoteMatches.get(item.cotizacionId) ?? evaluate(item));
  }, [baseItems, filters]);

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
        if (item.estatus) {
          estatusSet.add(item.estatus);
        }

        const totalAbonado = Number.isFinite(totalAbonadoFromItem) ? totalAbonadoFromItem : 0;
        const saldoPendiente =
          quoteTotal !== null && Number.isFinite(totalAbonado)
            ? Math.max(quoteTotal - totalAbonado, 0)
            : item.saldoPendiente ?? null;

        group = {
          cotizacionId: item.cotizacionId,
          numeroCotizacion: item.numeroCotizacion,
          odc: item.odc,
          cliente: item.cliente,
          contacto: item.contacto,
          proyecto: item.proyecto,
          fechaIngreso: item.fechaIngreso,
          archivoOriginal: item.archivoOriginal,
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
      if (item.estatus) {
        group.estatusSet.add(item.estatus);
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

  const productViewData = useMemo(() => {
    const rows: ProductViewRowModel[] = [];
    const uniqueProducts = new Set<string>();
    const productColorMap = new Map<string, string>();
    let paletteIndex = 0;
    let totalMetros = 0;
    let totalUnidades = 0;
    let metrosProximos7 = 0;
    let unidadesProximos7 = 0;
    let metrosHoy = 0;
    let unidadesHoy = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today.getTime() + 7 * DAY_IN_MS);

    for (const item of filteredItems) {
      const form = forms[item.id];
      if (!form) {
        continue;
      }
      const progress = computeProgress(item, form.fechaEntrega, form.estatus, dailyPlans[item.id]);
      const quantity = extractQuantityInfo(item.cantidad);
      const quote = quoteGroupMap.get(item.cotizacionId);
      const saving = savingStatus[item.id] || 'idle';

      const productKey = normalizeText(item.producto || '');
      uniqueProducts.add(productKey);
      let colorClass = productColorMap.get(productKey);
      if (!colorClass) {
        colorClass = productColorPalette[paletteIndex % productColorPalette.length];
        productColorMap.set(productKey, colorClass);
        paletteIndex += 1;
      }

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

      rows.push({
        item,
        form,
        progress,
        quantity: { amount: quantity.amount, unit: quantity.unit },
        quote,
        saving,
        colorClass,
      });
    }

    rows.sort((a, b) => {
      const productCompare = normalizeText(a.item.producto).localeCompare(
        normalizeText(b.item.producto),
        'es',
        { sensitivity: 'base' },
      );
      if (productCompare !== 0) return productCompare;
      const fechaA = a.form.fechaEntrega || a.item.fechaEntrega || '';
      const fechaB = b.form.fechaEntrega || b.item.fechaEntrega || '';
      return fechaA.localeCompare(fechaB);
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
        uniqueProducts: uniqueProducts.size,
        totalItems: rows.length,
        metrosDiarios: metrosProximos7 / 7,
        unidadesDiarias: unidadesProximos7 / 7,
      },
    };
  }, [filteredItems, forms, savingStatus, quoteGroupMap]);

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
      const clientName = item.cliente?.trim() || 'Sin cliente';
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

      const entregaSource = forms[item.id]?.fechaEntrega || item.fechaEntrega;
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
  }, [filteredItems, forms, quoteGroupMap]);

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

  const toggleQuote = (quoteId: number) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [quoteId]: !prev[quoteId],
    }));
  };

  const renderQuoteView = () => (
    <div className="glass-panel rounded-2xl border border-border shadow-hologram overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-dark-card/80 border-b border-border">
            <tr className="text-xs uppercase tracking-wide text-text-muted">
              {[
                { key: undefined, label: '' },
                { key: 'fechaIngreso' as SortKey, label: 'Ingreso' },
                { key: 'odc' as SortKey, label: 'ODC' },
                { key: 'numeroCotizacion' as SortKey, label: 'Cotización' },
                { key: 'cliente' as SortKey, label: 'Cliente / Proyecto' },
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
                statusOptions={statusOptions}
                onSave={onSave}
                isSaving={isSaving}
                onDeleteQuote={onDeleteQuote}
                forms={forms}
                onRowChange={handleRowChange}
                savingStatus={savingStatus}
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

        <div className="glass-panel rounded-2xl border border-border shadow-hologram overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-text-secondary">No hay productos activos para mostrar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-dark-card/80 border-b border-border">
                  <tr className="text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 text-left w-10"></th>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Cotización</th>
                    <th className="px-4 py-3 text-left">Ingreso</th>
                    <th className="px-4 py-3 text-left">Cantidad</th>
                    <th className="px-4 py-3 text-left">Entrega</th>
                    <th className="px-4 py-3 text-left">Progreso</th>
                    <th className="px-4 py-3 text-left">Estatus</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-text-secondary">
                  {rows.map((row) => (
                    <ProductViewRow
                      key={row.item.id}
                      data={row}
                      statusOptions={statusOptions}
                      onChange={handleRowChange}
                      onPlanClick={handleOpenPlanModal}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                    <tr key={row.client} className="border-b border-border/40 hover:bg-dark-card/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{row.client}</td>
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

  if (baseItems.length === 0) {
    return (
      <>
        <section className="glass-panel rounded-2xl border border-border shadow-hologram p-12 text-center text-text-muted">
          <p className="text-lg font-medium text-text-primary mb-2">Aún no hay ítems de producción</p>
          <p className="text-sm">Carga cotizaciones en PDF para comenzar a gestionar el flujo de producción.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Búsqueda general
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-2 text-text-muted" />
                <input
                  type="text"
                  className="w-full bg-dark-card/70 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
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
              Estatus
              <select
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                <option value="">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
              <label className="flex flex-col gap-1">
                Desde
                <input
                  type="date"
                  className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus-border-primary outline-none"
                  value={filters.from}
                  onChange={(event) => handleFilterChange('from', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                Hasta
                <input
                  type="date"
                  className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus-border-primary outline-none"
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
        ? (
            <ProductionCalendarBoard
              days={scheduleDays}
              loading={scheduleLoading}
              error={scheduleError}
              onRefresh={refetchSchedule}
            />
          )
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
}> = ({ group, expanded, onToggle, statusOptions, onSave, isSaving, onDeleteQuote, forms, onRowChange, savingStatus }) => {
  const fileUrl = buildQuoteFileUrl(group.archivoOriginal);
  const [quoteForm, setQuoteForm] = useState<QuoteRowFormState>(() => ({
    factura: group.facturas[0] ?? '',
    fechaVencimiento: group.fechaVencimiento ?? '',
    pagos: normalizePaymentsToForm(group.pagos),
  }));
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [showMetadataNotes, setShowMetadataNotes] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);

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
  }, [group.items, forms]);

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

  const updateQuotePayment = (index: number, field: keyof PaymentForm, value: string) => {
    setQuoteForm((prev) => ({
      ...prev,
      pagos: prev.pagos.map((pago, idx) => (idx === index ? { ...pago, [field]: value } : pago)),
    }));
  };

  const addQuotePayment = () => {
    setQuoteForm((prev) => ({
      ...prev,
      pagos: [...prev.pagos, { monto: '', fecha_pago: '', descripcion: '' }],
    }));
  };

  const removeQuotePayment = (index: number) => {
    setQuoteForm((prev) => ({
      ...prev,
      pagos: prev.pagos.filter((_, idx) => idx !== index),
    }));
  };

  const isAnyItemSaving = useMemo(() => group.items.some((item) => isSaving(item.id)), [group.items, isSaving]);

  const handleQuoteSave = async () => {
    const pagos = quoteForm.pagos
      .map((pago) => ({
        monto: Number.parseFloat(pago.monto),
        fecha_pago: pago.fecha_pago || null,
        descripcion: pago.descripcion ? pago.descripcion.trim() : null,
      }))
      .filter((pago) => Number.isFinite(pago.monto) && pago.monto > 0);

    const facturaValue = quoteForm.factura.trim();
    const fechaVenc = quoteForm.fechaVencimiento ? quoteForm.fechaVencimiento : null;

  setIsSavingQuote(true);
  try {
    await Promise.all(
      group.items.map((item) =>
        onSave(item.id, {
            fechaEntrega: item.fechaEntrega || null,
            estatus: item.estatus || null,
            notasEstatus: item.notasEstatus || null,
            factura: facturaValue || null,
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

  const canSave = !isSavingQuote && !isAnyItemSaving;

  return (
    <>
      <tr className="border-b border-border/60 bg-dark-card/30 hover:bg-dark-card/40 transition-colors">
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
              className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-2 py-1 text-[11px] font-medium text-red-400 hover:text-red-200 hover:border-red-400 transition-colors"
              title="Eliminar cotización"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <span className="font-medium text-text-primary">{formatDateLabel(group.fechaIngreso)}</span>
        </td>
        <td className="align-top px-4 py-3">
          {group.odc ? (
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
            <button
              type="button"
              onClick={openQuoteFile}
              className="text-left text-sm font-semibold text-primary hover:underline disabled:text-text-muted"
              disabled={!fileUrl}
            >
              {group.numeroCotizacion}
            </button>
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <div className="flex flex-col gap-1 relative">
            <span className="font-medium text-text-primary">{group.cliente || '—'}</span>
            {group.contacto && <span className="text-xs text-text-muted">Atención: {group.contacto}</span>}
            {group.proyecto && <span className="text-xs text-text-muted">Proyecto: {group.proyecto}</span>}
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
                    {group.items.map((item) => (
                      forms[item.id] && <ProductionRow
                        key={item.id}
                        item={item}
                        form={forms[item.id]}
                        statusOptions={statusOptions}
                        onChange={(newFormData) => onRowChange(item.id, newFormData)}
                        quoteTotal={group.totalCotizacion}
                        saveStatus={savingStatus[item.id] || 'idle'}
                        dailyPlan={dailyPlans[item.id]}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
      {showPaymentsModal && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur px-4">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-dark-card/95 shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-80" />
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
                      className="bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                      placeholder="Asignar factura"
                      value={quoteForm.factura}
                      onChange={(event) => updateQuoteField('factura', event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-text-muted">
                    Fecha de vencimiento
                    <input
                      type="date"
                      className={`bg-dark-card/70 border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none ${dueDateBorderClass}`}
                      value={quoteForm.fechaVencimiento}
                      onChange={(event) => updateQuoteField('fechaVencimiento', event.target.value)}
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
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
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
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              type="number"
                              placeholder="Monto"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none"
                              value={pago.monto}
                              onChange={(event) => updateQuotePayment(index, 'monto', event.target.value)}
                            />
                            <input
                              type="date"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none"
                              value={pago.fecha_pago}
                              onChange={(event) => updateQuotePayment(index, 'fecha_pago', event.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Descripción"
                              className="bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-primary outline-none"
                              value={pago.descripcion}
                              onChange={(event) => updateQuotePayment(index, 'descripcion', event.target.value)}
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
    </>
  );
};

const ProductViewRow: React.FC<{
  data: ProductViewRowModel;
  statusOptions: string[];
  onChange: (itemId: number, newFormData: RowFormState) => void;
  onPlanClick: (item: ProductionItem) => void;
}> = ({ data, statusOptions, onChange, onPlanClick }) => {
  const { item, form, progress, quantity, saving } = data;

  const updateField = (key: keyof RowFormState, value: string) => {
    onChange(item.id, { ...form, [key]: value });
  };

  const fechaIngresoLabel = item.fechaIngreso ? formatDateLabel(item.fechaIngreso) : '—';
  const fechaEntregaLabel = form.fechaEntrega ? formatDateLabel(form.fechaEntrega) : 'Sin definir';

  return (
    <tr className={`border-b border-border/40 transition-colors ${data.colorClass} hover:brightness-[1.08]`}>
      <td className="px-4 py-3 text-center align-top w-12">
        {saving === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        {saving === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
        {saving === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
      </td>
      <td className="px-4 py-3 align-top min-w-[220px]">
        <p className="font-semibold text-text-primary">{item.producto}</p>
        {item.proyecto && <p className="text-[11px] text-text-secondary">Proyecto: {item.proyecto}</p>}
        {data.quote?.saldoPendiente !== null && data.quote?.saldoPendiente !== undefined && (
          <p className="text-[11px] text-text-secondary">Saldo: {formatCurrency(data.quote.saldoPendiente)}</p>
        )}
        <button
          type="button"
          onClick={() => onPlanClick(item)}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Control diario
        </button>
      </td>
      <td className="px-4 py-3 align-top min-w-[180px]">
        <p className="text-sm text-text-primary font-medium">{item.cliente || 'Sin cliente'}</p>
        {item.contacto && <p className="text-[11px] text-text-secondary">Atención: {item.contacto}</p>}
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-sm font-medium text-primary">{item.numeroCotizacion}</p>
        {item.odc && <p className="text-[11px] text-text-secondary">ODC: {item.odc}</p>}
      </td>
      <td className="px-4 py-3 align-top whitespace-nowrap text-sm text-text-secondary">{fechaIngresoLabel}</td>
      <td className="px-4 py-3 align-top min-w-[120px]">
        <span className="text-sm text-text-primary">{item.cantidad || '—'}</span>
        {quantity.amount !== null && (
          <p className="text-[11px] text-text-secondary">
            {formatNumberWithDash(quantity.amount)} {quantity.unit === 'metros' ? 'm' : 'u'}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="date"
              className="bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-text-primary focus-border-primary outline-none"
              value={form.fechaEntrega}
              onChange={(event) => updateField('fechaEntrega', event.target.value)}
            />
          </div>
          <div className="text-xs text-text-muted">{fechaEntregaLabel}</div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        {progress ? (
          <div className="min-w-[140px]" title={progress.tooltip}>
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
      </td>
      <td className="px-4 py-3 align-top">
        <select
          className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-text-primary focus-border-primary outline-none"
          value={form.estatus}
          onChange={(event) => updateField('estatus', event.target.value)}
        >
          <option value="">Seleccionar...</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 align-top">
        <textarea
          className="w-full min-h-[80px] bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-xs text-text-primary focus-border-primary outline-none"
          placeholder="Notas de producción"
          value={form.notasEstatus}
          onChange={(event) => updateField('notasEstatus', event.target.value)}
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
}> = ({ item, form, statusOptions, onChange, quoteTotal, saveStatus, dailyPlan }) => {
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

  const saldoPendiente = totalCotizacion !== null ? Math.max(totalCotizacion - totalAbonado, 0) : null;
  const progress = computeProgress(item, form.fechaEntrega, form.estatus, dailyPlan);

  const updateField = (key: keyof RowFormState, value: string) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <tr className="border-t border-border/40 hover:bg-dark-card/40 transition-colors">
      <td className="align-top px-2 py-4 w-10 text-center">
        {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
        {saveStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
        {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
      </td>
      <td className="align-top px-4 py-4 max-w-md">
        <p className="font-medium text-text-primary">{item.producto}</p>
      </td>
      <td className="align-top px-4 py-4 whitespace-nowrap">{item.cantidad || '—'}</td>
      <td className="align-top px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="date"
              className="bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-text-primary focus-border-primary outline-none"
              value={form.fechaEntrega}
              onChange={(event) => updateField('fechaEntrega', event.target.value)}
            />
          </div>
          <div className="text-xs text-text-muted">
            {form.fechaEntrega ? formatDateLabel(form.fechaEntrega) : 'Sin definir'}
          </div>
        </div>
      </td>
      <td className="align-top px-4 py-4">
        {progress ? (
          <div className="min-w-[160px]" title={progress.tooltip}>
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
                  Estimado: {formatNumberWithDash(progress.producedEstimate)} / {formatNumberWithDash(progress.quantity)} u.
                </span>
              )}
            </p>
          </div>
        ) : (
          <span className="text-xs text-text-muted">Sin fecha objetivo</span>
        )}
      </td>
      <td className="align-top px-4 py-4">
        <div className="space-y-2 min-w-[180px]">
          <select
            className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-text-primary focus-border-primary outline-none"
            value={form.estatus}
            onChange={(event) => updateField('estatus', event.target.value)}
          >
            <option value="">Seleccionar...</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {form.estatus && (
            <span
              className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${
                statusBadgeVariants[form.estatus] || 'bg-primary/10 text-primary border-primary/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {form.estatus}
            </span>
          )}
        </div>
      </td>
      <td className="align-top px-4 py-4">
        <textarea
          className="w-full min-h-[80px] bg-dark-card/70 border border-border rounded-lg px-2 py-2 text-xs text-text-primary focus-border-primary outline-none"
          placeholder="Notas de produccion o entregas parciales"
          value={form.notasEstatus}
          onChange={(event) => updateField('notasEstatus', event.target.value)}
        />
      </td>
    </tr>
  );
};

export default StatusTable;
