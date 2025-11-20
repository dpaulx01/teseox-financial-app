import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileDown,
  Loader2,
  RefreshCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import financialAPI from '../../../services/api';
import { getTenantBrand } from '../../../utils/tenantBrand';

interface AccountStatusItem {
  id: number;
  fecha_ingreso: string | null;
  numero_cotizacion: string;
  tipo_produccion: 'cliente' | 'stock' | null;
  odc: string | null;
  cliente: string | null;
  facturas: string[];
  status_general: string;
  valor_total: number;
  total_pagado: number;
  saldo_pendiente: number;
  estado_vencimiento: string;
  dias_vencimiento: number | null;
  fecha_vencimiento: string | null;
  fecha_entrega: string | null;
  fecha_despacho: string | null;
  is_pagado: boolean;
  entregado_completo: boolean;
  tiene_factura: boolean;
  created_at: string;
}

interface AccountStatusResponse {
  items: AccountStatusItem[];
  summary: {
    total_cotizaciones: number;
    valor_total: number;
    total_pagado: number;
    saldo_pendiente: number;
    vencimiento_breakdown: {
      vencido: number;
      por_vencer: number;
      al_dia: number;
    };
  };
  filters_applied: Record<string, any>;
}

type SortKey =
  | 'severity'
  | 'fechaIngreso'
  | 'cotizacion'
  | 'odc'
  | 'cliente'
  | 'statusGeneral'
  | 'valorTotal'
  | 'totalPagado'
  | 'saldoPendiente'
  | 'estadoVencimiento'
  | 'fechaEntrega'
  | 'fechaDespacho';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface Filters {
  query: string;
  client: string;
  status: string;
  from: string;
  to: string;
  productionType: 'all' | 'cliente' | 'stock';
  vencimiento: string;
  preset: 'all' | 'pending' | 'closed';
  sinFactura: boolean;
}

const formatCurrencyValue = (value: number) =>
  `$${value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatNumberValue = (value: number) => value.toLocaleString('es-EC');

const STATUS_PRIORITY: Record<string, number> = {
  'En cola': 0,
  'En producción': 1,
  'Producción parcial': 2,
  'Listo para retiro': 3,
  'En bodega': 4,
  Entregado: 5,
};

const VENCIMIENTO_PRIORITY: Record<string, number> = {
  Vencido: 0,
  'Por vencer': 1,
  'Al día': 2,
};

const AccountStatusReport: React.FC = () => {
  const [data, setData] = useState<AccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    query: '',
    client: '',
    status: '',
    from: '',
    to: '',
    productionType: 'all',
    vencimiento: '',
    preset: 'pending',
    sinFactura: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'severity', direction: 'asc' });

  const primaryHex = '#6366f1';
  const primaryRgb: [number, number, number] = [99, 102, 241];
  const activeFilterCount = useMemo(() => {
    const { productionType, preset, sinFactura, ...rest } = filters;
    let baseCount = Object.values(rest).filter((value) => value !== '').length;
    if (productionType !== 'all') baseCount += 1;
    if (preset !== 'all') baseCount += 1;
    if (sinFactura) baseCount += 1;
    return baseCount;
  }, [filters]);
  const hasActiveFilters = activeFilterCount > 0;

  const formatDateValue = (value: string | null | undefined) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('es-EC');
  };

  const parseDateToTimestamp = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime();
  };

  const severityScore = (item: AccountStatusItem) => {
    // Prioriza pendientes, vencidos, por vencer, saldo alto
    const hasDebt = item.saldo_pendiente > 0.01;
    let score = 100;
    const estado = item.estado_vencimiento || '';
    if (hasDebt) {
      if (estado.includes('Vencido')) score = 0;
      else if (estado.includes('Por vencer')) score = 10;
      else score = 20;
    } else {
      // Pagados o al día
      score = 50;
    }
    // Ajuste por saldo (mayor saldo -> más arriba)
    return score + Math.max(0, 100 - Math.min(item.saldo_pendiente, 1_000_000) / 100);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.client) params.append('cliente', filters.client);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('fecha_desde', filters.from);
      if (filters.to) params.append('fecha_hasta', filters.to);
      if (filters.productionType !== 'all') params.append('production_type', filters.productionType);
      if (filters.vencimiento) params.append('vencimiento_estado', filters.vencimiento);
      if (filters.preset !== 'all') params.append('preset', filters.preset);
      if (filters.sinFactura) params.append('sin_factura', 'true');

      const response = await financialAPI.get(`/api/production/account-status?${params.toString()}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar el estado de cuenta');
      console.error('Error fetching account status:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(handler);
  }, [fetchData]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      query: '',
      client: '',
      status: '',
      from: '',
      to: '',
      productionType: 'all',
      vencimiento: '',
      preset: 'pending',
      sinFactura: false,
    });
  };

  const handleFilterByClient = (clientName: string | null) => {
    if (!clientName) return;
    setFilters((prev) => ({ ...prev, client: clientName }));
  };

  const handleFilterByStatus = (statusName: string | null) => {
    if (!statusName) return;
    setFilters((prev) => ({ ...prev, status: prev.status === statusName ? '' : statusName }));
  };

  const exportToPDF = () => {
    if (!data || sortedItems.length === 0) {
      window.alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

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
      accent: [14, 165, 233],
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
    doc.setFillColor(88, 80, 236);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ESTADO DE CUENTA', 14, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte financiero de producción', 14, 22);

    const fecha = new Date().toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(9);
    doc.text(fecha.charAt(0).toUpperCase() + fecha.slice(1), 14, 28);

    const brandName = getTenantBrand().displayName;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(brandName, pageWidth - 14, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Control financiero - Módulo producción', pageWidth - 14, 24, { align: 'right' });

    let cursor = 42;

    if (hasActiveFilters) {
      const applied: string[] = [];
      if (filters.query) applied.push(`Búsqueda: "${filters.query}"`);
      if (filters.client) applied.push(`Cliente: ${filters.client}`);
      if (filters.status) applied.push(`Status: ${filters.status}`);
      if (filters.productionType !== 'all') {
        const typeLabel = filters.productionType === 'cliente' ? 'Clientes' : 'Stock';
        applied.push(`Tipo de pedido: ${typeLabel}`);
      }
      if (filters.vencimiento) {
        const vencLabel =
          filters.vencimiento === 'vencido'
            ? 'Vencido'
            : filters.vencimiento === 'por_vencer'
            ? 'Por vencer'
            : 'Al día';
        applied.push(`Vencimiento: ${vencLabel}`);
      }
      if (filters.from) applied.push(`Desde: ${filters.from}`);
      if (filters.to) applied.push(`Hasta: ${filters.to}`);
      if (filters.sinFactura) applied.push('Solo sin factura');
      if (filters.preset !== 'all') {
        applied.push(`Preset: ${filters.preset === 'pending' ? 'Pendientes' : 'Completado'}`);
      }

      doc.setFillColor(254, 249, 195);
      doc.setDrawColor(...colors.warning);
      doc.roundedRect(14, cursor, pageWidth - 28, 16, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.dark);
      doc.text('Filtros aplicados:', 18, cursor + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(applied.join(' • '), 18, cursor + 11, { maxWidth: pageWidth - 40 });
      cursor += 22;
    }

    const cards = [
      {
        label: 'Total cotizaciones',
        value: formatNumberValue(data.summary.total_cotizaciones),
        color: colors.primary,
      },
      {
        label: 'Valor total',
        value: formatCurrencyValue(data.summary.valor_total),
        color: colors.secondary,
      },
      {
        label: 'Total pagado',
        value: formatCurrencyValue(data.summary.total_pagado),
        color: colors.success,
      },
      {
        label: 'Saldo pendiente',
        value: formatCurrencyValue(data.summary.saldo_pendiente),
        color: colors.warning,
      },
    ] as const;

    const cardWidth = (pageWidth - 28 - 12) / cards.length;
    const cardHeight = 20;

    cards.forEach((card, index) => {
      const x = 14 + index * (cardWidth + 4);
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(x, cursor, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(card.label.toUpperCase(), x + cardWidth / 2, cursor + 6, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...card.color);
      doc.text(card.value, x + cardWidth / 2, cursor + 14, { align: 'center' });
    });

    cursor += cardHeight + 10;

    const vencimiento = data.summary.vencimiento_breakdown;
    const breakdownText = `Vencidos: ${vencimiento.vencido}   •   Por vencer: ${vencimiento.por_vencer}   •   Al día: ${vencimiento.al_dia}`;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text(breakdownText, 14, cursor);
    cursor += 6;

    const columnHeaders = [
      'Ingreso',
      'Cotización',
      'ODC',
      'Cliente',
      'Facturas',
      'Status',
      'Valor Total',
      'Pagado',
      'Saldo',
      'Vencimiento',
      'F. Entrega',
      'F. Despacho',
    ];

    const tableRows = sortedItems.map((item) => [
      formatDateValue(item.fecha_ingreso || item.created_at),
      item.numero_cotizacion,
      item.odc || '-',
      item.cliente || '-',
      item.facturas.length > 0 ? item.facturas.join(', ') : '-',
      item.status_general,
      formatCurrencyValue(item.valor_total),
      formatCurrencyValue(item.total_pagado),
      formatCurrencyValue(item.saldo_pendiente),
      item.estado_vencimiento,
      item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleDateString('es-EC') : '-',
      item.fecha_despacho ? new Date(item.fecha_despacho).toLocaleDateString('es-EC') : '-',
    ]);

    const columnIndexes = {
      status: 5,
      valor: 6,
      pagado: 7,
      saldo: 8,
      vencimiento: 9,
    };

    autoTable(doc, {
      startY: cursor,
      head: [columnHeaders],
      body: tableRows,
      tableWidth: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.1,
        font: 'helvetica',
        textColor: colors.dark,
      },
      headStyles: {
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'left' },
        3: { halign: 'left' },
        4: { halign: 'left' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'center' },
        10: { halign: 'center' },
        11: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      willDrawCell: (dataCell) => {
        if (dataCell.section !== 'body') return;
        const { column, cell } = dataCell;
        if (column.index === columnIndexes.status) {
          const statusText = String(cell.raw || '');
          let bgColor: [number, number, number] = [243, 244, 246]; // slate-100
          if (statusText.includes('cola')) bgColor = [254, 249, 195];
          if (statusText.includes('Producción') || statusText.includes('producción')) bgColor = [224, 231, 255];
          if (statusText.includes('retiro') || statusText.includes('bodega')) bgColor = [220, 252, 231];
          if (statusText.includes('Entregado')) bgColor = [226, 232, 240];
          doc.setFillColor(...bgColor);
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
        }
        if (column.index === columnIndexes.vencimiento) {
          const estado = String(cell.raw || '');
          let bgColor: [number, number, number] = [248, 250, 252];
          if (estado.includes('Vencido')) bgColor = [254, 226, 226];
          else if (estado.includes('Por vencer')) bgColor = [254, 249, 195];
          else if (estado.includes('Al día')) bgColor = [220, 252, 231];
          doc.setFillColor(...bgColor);
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
        }
      },
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
      doc.text(`${brandName} · Plataforma de producción`, 14, pageHeight - 8);
      doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    doc.save(`estado-cuenta-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getVencimientoColor = (estado: string) => {
    switch (estado) {
      case 'Vencido':
        return 'text-red-600 bg-red-50';
      case 'Por vencer':
        return 'text-yellow-600 bg-yellow-50';
      case 'Al día':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getVencimientoIcon = (estado: string) => {
    switch (estado) {
      case 'Vencido':
        return <XCircle className="h-4 w-4" />;
      case 'Por vencer':
        return <AlertCircle className="h-4 w-4" />;
      case 'Al día':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSortValue = (item: AccountStatusItem, key: SortKey): string | number | null => {
    switch (key) {
      case 'fechaIngreso':
        return parseDateToTimestamp(item.fecha_ingreso || item.created_at);
      case 'cotizacion':
        return item.numero_cotizacion;
      case 'odc':
        return item.odc || '';
      case 'cliente':
        return item.cliente || '';
      case 'statusGeneral':
        return STATUS_PRIORITY[item.status_general] ?? Number.MAX_SAFE_INTEGER;
      case 'valorTotal':
        return item.valor_total;
      case 'totalPagado':
        return item.total_pagado;
      case 'saldoPendiente':
        return item.saldo_pendiente;
      case 'estadoVencimiento':
        return VENCIMIENTO_PRIORITY[item.estado_vencimiento] ?? Number.MAX_SAFE_INTEGER;
      case 'fechaEntrega':
        return parseDateToTimestamp(item.fecha_entrega);
      case 'fechaDespacho':
        return parseDateToTimestamp(item.fecha_despacho);
      case 'severity':
      default:
        return severityScore(item);
    }
  };

  const compareValues = (a: string | number | null, b: string | number | null) => {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return 0;
      if (Number.isNaN(a)) return -1;
      if (Number.isNaN(b)) return 1;
      return a - b;
    }
    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
  };

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const items = [...data.items];
    return items.sort((a, b) => {
      const result = compareValues(getSortValue(a, sortConfig.key), getSortValue(b, sortConfig.key));
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [data, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: key === 'severity' ? 'asc' : 'asc' };
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

  const tableColumns: { label: string; key?: SortKey; align?: 'left' | 'right' }[] = [
    { label: 'Ingreso', key: 'fechaIngreso' },
    { label: 'Cotización', key: 'cotizacion' },
    { label: 'ODC', key: 'odc' },
    { label: 'Cliente', key: 'cliente' },
    { label: 'Facturas' },
    { label: 'Status', key: 'statusGeneral' },
    { label: 'Valor Total', key: 'valorTotal', align: 'right' },
    { label: 'Pagado', key: 'totalPagado', align: 'right' },
    { label: 'Saldo', key: 'saldoPendiente', align: 'right' },
    { label: 'Vencimiento', key: 'estadoVencimiento' },
    { label: 'F. Entrega', key: 'fechaEntrega' },
    { label: 'F. Despacho', key: 'fechaDespacho' },
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryHex }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Estado de Cuenta</h2>
          <p className="text-sm text-text-muted mt-1">Reporte de cartera y estado financiero de cotizaciones</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-dark-card/60 border border-border/60 p-1">
            {[
              { key: 'pending', label: 'Pendientes' },
              { key: 'closed', label: 'Completado' },
              { key: 'all', label: 'Todos' },
            ].map(({ key, label }) => {
              const active = filters.preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, preset: key as Filters['preset'] }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-dark-card shadow-glow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={exportToPDF}
            disabled={!data || data.items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filters (alineado con otras vistas) */}
      <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/70 p-4 lg:p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Búsqueda general
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-2 text-text-muted" />
                <input
                  type="text"
                  className="w-full bg-dark-card/70 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary focus:border-primary outline-none transition-all"
                  placeholder="Cotización, ODC, cliente..."
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
                placeholder="Filtrar por cliente"
                value={filters.client}
                onChange={(event) => handleFilterChange('client', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Tipo de pedido
              <select
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                value={filters.productionType}
                onChange={(event) => handleFilterChange('productionType', event.target.value)}
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
                <option value="En cola">En cola</option>
                <option value="En producción">En producción</option>
                <option value="Producción parcial">Producción parcial</option>
                <option value="Listo para retiro">Listo para retiro</option>
                <option value="En bodega">En bodega</option>
                <option value="Entregado">Entregado</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Estado de vencimiento
              <select
                className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                value={filters.vencimiento}
                onChange={(event) => handleFilterChange('vencimiento', event.target.value)}
              >
                <option value="">Todos</option>
                <option value="vencido">Vencido</option>
                <option value="por_vencer">Por vencer</option>
                <option value="al_dia">Al día</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted lg:col-span-2">
              <label className="flex flex-col gap-1">
                Desde
                <input
                  type="date"
                  className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                  value={filters.from}
                  onChange={(event) => handleFilterChange('from', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                Hasta
                <input
                  type="date"
                  className="w-full bg-dark-card/70 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                  value={filters.to}
                  onChange={(event) => handleFilterChange('to', event.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start flex-wrap">
            <div className="flex items-center gap-2 bg-dark-card/60 border border-border/60 rounded-lg px-3 py-2 text-[11px] text-text-secondary">
              <span>Accesos rápidos:</span>
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    vencimiento: prev.vencimiento === 'vencido' ? '' : 'vencido',
                    preset: 'pending',
                  }))
                }
                className={`px-2 py-1 rounded-md font-semibold ${
                  filters.vencimiento === 'vencido'
                    ? 'bg-red-500/20 text-red-200 border border-red-400/60'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Vencido
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    vencimiento: prev.vencimiento === 'por_vencer' ? '' : 'por_vencer',
                    preset: 'pending',
                  }))
                }
                className={`px-2 py-1 rounded-md font-semibold ${
                  filters.vencimiento === 'por_vencer'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Por vencer
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    sinFactura: !prev.sinFactura,
                    preset: 'pending',
                  }))
                }
                className={`px-2 py-1 rounded-md font-semibold ${
                  filters.sinFactura
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sin factura
              </button>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold border border-primary/30">
                {activeFilterCount} filtro{activeFilterCount === 1 ? '' : 's'} activos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cotizaciones</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_cotizaciones}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.summary.valor_total.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pagado</p>
                <p className="text-2xl font-bold text-green-600">
                  ${data.summary.total_pagado.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${data.summary.saldo_pendiente.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vencimiento Breakdown */}
      {data && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Estado de Vencimiento</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vencidos</p>
                <p className="text-xl font-bold text-red-600">{data.summary.vencimiento_breakdown.vencido}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Por vencer (≤7 días)</p>
                <p className="text-xl font-bold text-yellow-600">{data.summary.vencimiento_breakdown.por_vencer}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Al día</p>
                <p className="text-xl font-bold text-green-600">{data.summary.vencimiento_breakdown.al_dia}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {data && sortedItems.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {tableColumns.map(({ label, key, align }) => {
                    const alignClass = align === 'right' ? 'text-right' : 'text-left';
                    return (
                      <th
                        key={label}
                        className={`px-4 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${alignClass}`}
                      >
                        {key ? (
                          <button
                            type="button"
                            onClick={() => handleSort(key)}
                            className={`inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-primary focus:outline-none ${
                              align === 'right' ? 'ml-auto' : ''
                            }`}
                          >
                            <span>{label}</span>
                            {sortIndicator(key)}
                          </button>
                        ) : (
                          <span>{label}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatDateValue(item.fecha_ingreso || item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{item.numero_cotizacion}</span>
                        {item.tipo_produccion === 'stock' && (
                          <span className="inline-flex w-max items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold text-gray-700 bg-gray-100">
                            Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.odc || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.cliente ? (
                        <button
                          type="button"
                          onClick={() => handleFilterByClient(item.cliente)}
                          className="font-semibold text-primary hover:underline"
                        >
                          {item.cliente}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.facturas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.facturas.map((factura, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                            >
                              {factura}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleFilterByStatus(item.status_general)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold transition-colors ${
                          filters.status === item.status_general
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.status_general}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      ${item.valor_total.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      ${item.total_pagado.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                      ${item.saldo_pendiente.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${getVencimientoColor(item.estado_vencimiento)}`}>
                        {getVencimientoIcon(item.estado_vencimiento)}
                        <span className="text-xs font-medium">
                          {item.estado_vencimiento === 'Pagado' ? 'Pagado' : item.estado_vencimiento}
                        </span>
                        {item.dias_vencimiento !== null && item.estado_vencimiento !== 'Pagado' && (
                          <span className="text-xs">({item.dias_vencimiento > 0 ? '+' : ''}{item.dias_vencimiento}d)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.fecha_entrega ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(item.fecha_entrega).toLocaleDateString('es-EC')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.fecha_despacho ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(item.fecha_despacho).toLocaleDateString('es-EC')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : data ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Search className="h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium text-gray-900">No se encontraron resultados</p>
            <p className="text-sm text-gray-500">Intenta ajustar los filtros para ver más cotizaciones</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AccountStatusReport;
