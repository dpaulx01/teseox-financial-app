import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';

import type {
  ProductionItem,
  ProductionPayment,
  ProductionUpdatePayload,
} from '../../../types/production';

type SortKey =
  | 'fechaIngreso'
  | 'odc'
  | 'numeroCotizacion'
  | 'cliente'
  | 'totalCotizacion'
  | 'totalAbonado'
  | 'saldoPendiente';

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

interface StatusTableProps {
  items: ProductionItem[];
  statusOptions: string[];
  onSave: (id: number, payload: ProductionUpdatePayload) => Promise<void>;
  isSaving: (id: number) => boolean;
  onDeleteQuote: (quoteId: number) => Promise<void>;
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
  'En cola': 'bg-slate-500/20 border-slate-400/30 text-slate-100',
  'En producción': 'bg-sky-500/20 border-sky-500/40 text-sky-100',
  'Producción parcial': 'bg-amber-500/20 border-amber-500/40 text-amber-100',
  'Listo para retiro': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100',
  Entregado: 'bg-emerald-600/25 border-emerald-500/40 text-emerald-50',
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

function formatNumber(value: number | null | undefined): string {
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

function computeProgress(
  item: ProductionItem,
  fechaEntrega: string | null | undefined,
  estatus: string | null | undefined,
): ProgressInfo | null {
  const percentFromStatus = getStatusProgressPercent(estatus);
  const hasTargetDate = Boolean(fechaEntrega);

  if (!estatus && !hasTargetDate) {
    return null;
  }

  let percent = percentFromStatus;
  const tooltipParts: string[] = [];
  const statusLabel = estatus || 'Sin estatus';

  if (estatus) {
    tooltipParts.push(`Estatus: ${estatus}`);
  }

  if (fechaEntrega) {
    tooltipParts.push(`Entrega objetivo: ${formatDateLabel(fechaEntrega)}`);
    const targetTimestamp = parseDateValue(fechaEntrega);
    if (percent === 0 && targetTimestamp) {
      const now = Date.now();
      const diffDays = Math.max(
        -30,
        Math.min(30, Math.round((targetTimestamp - now) / (1000 * 60 * 60 * 24))),
      );
      percent = Math.max(5, Math.min(95, 70 - diffDays));
    }
  }

  const quantity = parseQuantityFromString(item.cantidad);
  const producedEstimate =
    quantity !== null && percent > 0 ? Math.max(0, Math.round((percent / 100) * quantity)) : null;

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
          ? formatNumber(item.valorSubtotal)
          : '',
        needle,
      ) ||
      includesNormalized(
        item.valorTotal !== null && item.valorTotal !== undefined
          ? formatNumber(item.valorTotal)
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
}) => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'fechaIngreso',
    direction: 'desc',
  });

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
      return items;
    }

    const quoteMatches = new Map<number, boolean>();

    const evaluate = (item: ProductionItem) => matchesFilters(item, filters);

    for (const item of items) {
      const matches = evaluate(item);
      if (matches) {
        quoteMatches.set(item.cotizacionId, true);
      } else if (!quoteMatches.has(item.cotizacionId)) {
        quoteMatches.set(item.cotizacionId, false);
      }
    }

    return items.filter((item) => quoteMatches.get(item.cotizacionId) ?? evaluate(item));
  }, [items, filters]);

  const quoteTotals = useMemo(() => {
    const accumulator = new Map<
      number,
      {
        explicit: number | null;
        subtotalSum: number;
      }
    >();

    for (const item of items) {
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
  }, [items]);

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

  if (items.length === 0) {
    return (
      <section className="glass-panel rounded-2xl border border-border shadow-hologram p-12 text-center text-text-muted">
        <p className="text-lg font-medium text-text-primary mb-2">Aún no hay ítems de producción</p>
        <p className="text-sm">Carga cotizaciones en PDF para comenzar a gestionar el flujo de producción.</p>
      </section>
    );
  }

  return (
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
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 self-start text-xs font-medium px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        </div>
      </div>

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
                  { key: 'totalCotizacion' as SortKey, label: 'Valor' },
                  { key: 'saldoPendiente' as SortKey, label: 'Cobro' },
                  { key: undefined, label: 'Estatus' },
                  { key: undefined, label: 'Acciones' },
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
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
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
}> = ({ group, expanded, onToggle, statusOptions, onSave, isSaving, onDeleteQuote }) => {
  const fileUrl = buildQuoteFileUrl(group.archivoOriginal);
  const [quoteForm, setQuoteForm] = useState<QuoteRowFormState>(() => ({
    factura: group.facturas[0] ?? '',
    fechaVencimiento: group.fechaVencimiento ?? '',
    pagos: normalizePaymentsToForm(group.pagos),
  }));
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [showMetadataNotes, setShowMetadataNotes] = useState(false);

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
      .map((item) => computeProgress(item, item.fechaEntrega ?? '', item.estatus ?? ''))
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
  }, [group.items]);

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
    ? 'border-red-500/60 text-red-200'
    : dueDateStatus.isSoon
    ? 'border-amber-400/60 text-amber-200'
    : 'border-border';

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
    } finally {
      setIsSavingQuote(false);
    }
  };

  const canSave = !isSavingQuote && !isAnyItemSaving;

  return (
    <>
      <tr className="border-b border-border/60 bg-dark-card/30 hover:bg-dark-card/40 transition-colors">
        <td className="align-top px-2 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
            aria-label={expanded ? 'Contraer detalle' : 'Expandir detalle'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
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
        <td className="align-top px-4 py-3">
          <div className="flex flex-col gap-2 text-xs text-text-muted">
            <input
              type="text"
              className="bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-sm text-text-primary focus:border-primary outline-none"
              placeholder="Asignar factura"
              value={quoteForm.factura}
              onChange={(event) => updateQuoteField('factura', event.target.value)}
            />
            {group.facturas.length > 0 && (
              <span className="text-[11px] text-text-secondary">
                Historial: {group.facturas.join(', ')}
              </span>
            )}
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-text-primary">
              {group.totalCotizacion !== null ? formatCurrency(group.totalCotizacion) : '—'}
            </span>
            {overallProgress ? (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${overallProgress.color}`}
                    style={{ width: `${overallProgress.percent}%` }}
                  />
                </div>
                <span className="text-[11px] text-text-secondary">Avance promedio: {overallProgress.percent}%</span>
              </div>
            ) : (
              <span className="text-[11px] text-text-muted">Sin progreso registrado</span>
            )}
          </div>
        </td>
        <td className="align-top px-4 py-3">
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex items-center justify-between gap-2">
              <span>Fecha vencimiento</span>
              <input
                type="date"
                className={`bg-dark-card/70 border rounded-lg px-2 py-1 text-text-primary focus:border-primary outline-none ${dueDateBorderClass}`}
                value={quoteForm.fechaVencimiento}
                onChange={(event) => updateQuoteField('fechaVencimiento', event.target.value)}
              />
            </div>
            <span className={`text-[11px] ${dueDateHintClass}`}>{dueDateStatus.message}</span>
            <div className="flex items-center justify-between">
              <span>Saldo pendiente</span>
              <span className="font-semibold text-text-primary">
                {quoteTotals.saldo !== null ? formatCurrency(quoteTotals.saldo) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total abonado</span>
              <span className="font-semibold text-text-primary">{formatCurrency(quoteTotals.totalAbonado)}</span>
            </div>
            <div className="space-y-2">
              {quoteForm.pagos.map((pago, index) => (
                <div key={index} className="rounded-lg border border-border bg-dark-card/50 p-2 space-y-2">
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
                  <input
                    type="number"
                    placeholder="Monto"
                    className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-text-primary focus-border-primary outline-none"
                    value={pago.monto}
                    onChange={(event) => updateQuotePayment(index, 'monto', event.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-text-primary focus-border-primary outline-none"
                    value={pago.fecha_pago}
                    onChange={(event) => updateQuotePayment(index, 'fecha_pago', event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    className="w-full bg-dark-card/70 border border-border rounded-lg px-2 py-1 text-text-primary focus-border-primary outline-none"
                    value={pago.descripcion}
                    onChange={(event) => updateQuotePayment(index, 'descripcion', event.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addQuotePayment}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
              >
                <Plus className="w-3 h-3" />
                Añadir pago
              </button>
            </div>
            <button
              type="button"
              onClick={handleQuoteSave}
              disabled={!canSave}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingQuote ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Guardar cartera
            </button>
          </div>
        </td>
        <td className="align-top px-4 py-3">
          {group.estatusSummary.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {group.estatusSummary.slice(0, 3).map((status) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1 rounded-full border ${
                    statusBadgeVariants[status] || 'bg-primary/10 text-primary border-primary/40'
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
        </td>
        <td className="align-top px-4 py-3">
          <button
            type="button"
            onClick={handleDeleteQuote}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-dark-card/40 border-b border-border/60">
          <td colSpan={10} className="px-0">
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-border bg-dark-card/50 overflow-hidden">
                <table className="min-w-full border-collapse">
                  <thead className="bg-dark-card/70 text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      {[
                        'Producto',
                        'Cantidad',
                        'Fecha entrega',
                        'Progreso',
                        'Estatus',
                        'Notas',
                        'Acciones',
                      ].map((label) => (
                        <th key={label} className="px-4 py-3 text-left">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm text-text-secondary">
                    {group.items.map((item) => (
                      <ProductionRow
                        key={item.id}
                        item={item}
                        statusOptions={statusOptions}
                        onSave={onSave}
                        isSaving={isSaving(item.id)}
                        quoteTotal={group.totalCotizacion}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const ProductionRow: React.FC<{
  item: ProductionItem;
  statusOptions: string[];
  onSave: (id: number, payload: ProductionUpdatePayload) => Promise<void>;
  isSaving: boolean;
  quoteTotal: number | null;
}> = ({ item, statusOptions, onSave, isSaving, quoteTotal }) => {
  const [form, setForm] = useState<RowFormState>(() => ({
    fechaEntrega: item.fechaEntrega ?? '',
    estatus: item.estatus ?? '',
    notasEstatus: item.notasEstatus ?? '',
    factura: item.factura ?? '',
    fechaVencimiento: item.fechaVencimiento ?? '',
    pagos:
      item.pagos.length > 0
        ? item.pagos.map((pago) => ({
            monto: pago.monto ? String(pago.monto) : '',
            fecha_pago: pago.fecha_pago ?? '',
            descripcion: pago.descripcion ?? '',
          }))
        : [],
  }));

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
  const progress = computeProgress(item, form.fechaEntrega, form.estatus);

  const updateField = (key: keyof RowFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePago = (index: number, field: keyof PaymentForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      pagos: prev.pagos.map((pago, idx) => (idx === index ? { ...pago, [field]: value } : pago)),
    }));
  };

  const addPago = () => {
    setForm((prev) => ({
      ...prev,
      pagos: [...prev.pagos, { monto: '', fecha_pago: '', descripcion: '' }],
    }));
  };

  const removePago = (index: number) => {
    setForm((prev) => ({
      ...prev,
      pagos: prev.pagos.filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = async () => {
    const payload: ProductionUpdatePayload = {
      fechaEntrega: form.fechaEntrega || null,
      estatus: form.estatus || null,
      notasEstatus: form.notasEstatus || null,
      factura: form.factura || null,
      fechaVencimiento: form.fechaVencimiento || null,
      valorTotal: totalCotizacion,
      pagos: form.pagos
        .map((pago) => ({
          monto: Number.parseFloat(pago.monto),
          fecha_pago: pago.fecha_pago || null,
          descripcion: pago.descripcion ? pago.descripcion.trim() : null,
        }))
        .filter((pago) => Number.isFinite(pago.monto) && pago.monto > 0),
    };

    await onSave(item.id, payload);
  };

  return (
    <tr className="border-t border-border/40 hover:bg-dark-card/40 transition-colors">
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
                  Estimado: {formatNumber(progress.producedEstimate)} / {formatNumber(progress.quantity)} u.
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
      <td className="align-top px-4 py-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/50 text-primary font-medium px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
};

export default StatusTable;
