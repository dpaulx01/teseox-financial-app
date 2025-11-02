import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  RefreshCcw,
  Layers,
  CheckCircle,
  TrendingUp,
  Shield,
  GaugeCircle,
  Activity,
  BarChart2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

import { useYear } from '../contexts/YearContext';
import { BalanceDataResponse, BalanceNode, BalanceRatios, BalanceTrendPoint } from '../types';
import {
  getBalanceYears,
  loadBalanceData,
  loadBalanceRatios,
  loadBalanceTrends,
} from '../utils/balanceStorage';

const formatNumber = (value: number | null | undefined) =>
  (value ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMultiple = (value: number | null | undefined) =>
  value == null ? '—' : `${value.toFixed(2)}x`;

const formatPercent = (value: number | null | undefined) =>
  value == null ? '—' : `${(value * 100).toFixed(1)}%`;

type IndicatorStatus = 'excelente' | 'saludable' | 'vigilancia' | 'riesgo' | 'sin_dato';

interface IndicatorMeta {
  status: IndicatorStatus;
  insight: string;
}

const statusStyles: Record<IndicatorStatus, { tone: string; badge: string }> = {
  excelente: { tone: 'text-success', badge: 'Excelente' },
  saludable: { tone: 'text-primary', badge: 'Saludable' },
  vigilancia: { tone: 'text-warning', badge: 'Vigilancia' },
  riesgo: { tone: 'text-danger', badge: 'Alerta' },
  sin_dato: { tone: 'text-text-muted', badge: 'Sin dato' },
};

const interpretLiquidityCorriente = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'No encontramos activo/pasivo corriente cargado para calcular la liquidez. Verifica que el balance tenga las cuentas 1.1 y 2.1.',
    };
  }
  if (value >= 2) {
    return {
      status: 'excelente',
      insight: `La empresa puede cubrir ${value.toFixed(2)}x sus pasivos corrientes con activos líquidos; existe margen para invertir o asumir más ventas a crédito.`,
    };
  }
  if (value >= 1.2) {
    return {
      status: 'saludable',
      insight: `Se cubren las obligaciones de corto plazo con ${value.toFixed(2)}x de respaldo. Mantén la disciplina de cobranza para sostener el nivel.`,
    };
  }
  if (value >= 1) {
    return {
      status: 'vigilancia',
      insight: `El colchón es muy justo (${value.toFixed(2)}x). Un repunte en cuentas por pagar podría tensionar la caja.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `El activo corriente sólo cubre ${value.toFixed(2)}x del pasivo corriente. Ajusta capital de trabajo o renegocia plazos.`,
  };
};

const interpretQuickRatio = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'Necesitamos el detalle de inventarios (1.1.3) para calcular la razón rápida. Verifica el archivo cargado.',
    };
  }
  if (value >= 1.5) {
    return {
      status: 'excelente',
      insight: `Sin inventarios, aún se cubre ${value.toFixed(2)}x el pasivo corriente. Liquidez inmediata muy sólida.`,
    };
  }
  if (value >= 1) {
    return {
      status: 'saludable',
      insight: `Se puede responder a las obligaciones inmediatas con ${value.toFixed(2)}x de respaldo sin depender del stock.`,
    };
  }
  if (value >= 0.8) {
    return {
      status: 'vigilancia',
      insight: `El efectivo y las cuentas por cobrar sólo cubren el ${formatPercent(value)} de los pasivos corrientes. Vigila cobros.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `Hay dependencia del inventario para pagar deudas de corto plazo (${formatMultiple(value)}). Prioriza liquidez rápida.`,
  };
};

const interpretEndeudamiento = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'No podemos calcular el apalancamiento sin total de pasivos y patrimonio. Revisa las cuentas 2 y 3.',
    };
  }
  if (value <= 0.35) {
    return {
      status: 'excelente',
      insight: `Sólo el ${formatPercent(value)} del financiamiento proviene de deuda. Hay espacio para apalancarse si conviene.`,
    };
  }
  if (value <= 0.55) {
    return {
      status: 'saludable',
      insight: `El apalancamiento está balanceado: deuda representa el ${formatPercent(value)} de la estructura.`,
    };
  }
  if (value <= 0.7) {
    return {
      status: 'vigilancia',
      insight: `La deuda pesa ${formatPercent(value)}. Analiza tasas y plazos para no comprometer flujo de caja.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `La deuda supera el ${formatPercent(value)} del financiamiento. Considera capitalizar utilidades o refinanciar.`,
  };
};

const interpretDebtToEquity = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'Sin saldo de patrimonio no podemos medir la relación deuda/patrimonio. Revisa la cuenta 3.',
    };
  }
  if (value <= 0.8) {
    return {
      status: 'excelente',
      insight: `Por cada dólar de patrimonio hay ${value.toFixed(2)} dólares de deuda. Capacidad de endeudamiento holgada.`,
    };
  }
  if (value <= 1.5) {
    return {
      status: 'saludable',
      insight: `El apalancamiento patrimonial está dentro de estándares (${value.toFixed(2)}x).`,
    };
  }
  if (value <= 2) {
    return {
      status: 'vigilancia',
      insight: `La deuda equivale a ${value.toFixed(2)}x el patrimonio. Evalúa reinvertir utilidades para reforzar capital.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `El apalancamiento es alto (${value.toFixed(2)}x). Una caída en ingresos impactará directamente la solvencia.`,
  };
};

const interpretROE = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'No se pudo calcular el ROE sin utilidad neta o patrimonio del año.',
    };
  }
  if (value >= 0.18) {
    return {
      status: 'excelente',
      insight: `Cada dólar de patrimonio generó ${formatPercent(value)} de utilidad. Retorno sobresaliente.`,
    };
  }
  if (value >= 0.1) {
    return {
      status: 'saludable',
      insight: `El capital propio rinde ${formatPercent(value)}. Mantén el ritmo optimizando márgenes.`,
    };
  }
  if (value >= 0.03) {
    return {
      status: 'vigilancia',
      insight: `El retorno al capital es discreto (${formatPercent(value)}). Revisa costos y cartera de productos.`,
    };
  }
  if (value >= 0) {
    return {
      status: 'riesgo',
      insight: `El ROE es casi nulo (${formatPercent(value)}). Se está destruyendo valor frente al costo de oportunidad.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `ROE negativo (${formatPercent(value)}). Se consumió patrimonio; investiga pérdidas y recupera margen.`,
  };
};

const interpretROA = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'Sin utilidad neta o activos totales no se puede medir el ROA.',
    };
  }
  if (value >= 0.12) {
    return {
      status: 'excelente',
      insight: `Los activos generan ${formatPercent(value)} de utilidad neta. Gran eficiencia operativa.`,
    };
  }
  if (value >= 0.06) {
    return {
      status: 'saludable',
      insight: `ROA positivo de ${formatPercent(value)}. Mantén la rotación de activos y márgenes.`,
    };
  }
  if (value >= 0.02) {
    return {
      status: 'vigilancia',
      insight: `Los activos rinden poco (${formatPercent(value)}). Evalúa ventas de activos improductivos.`,
    };
  }
  if (value >= 0) {
    return {
      status: 'riesgo',
      insight: `ROA muy bajo (${formatPercent(value)}). Ajusta gastos operativos para devolver rentabilidad.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `ROA negativo (${formatPercent(value)}). La operación está absorbiendo recursos; revisa estructura de costos.`,
  };
};

const interpretOperatingMargin = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'No encontramos utilidad operativa o ingresos en PyG para estimar el margen operativo.',
    };
  }
  if (value >= 0.18) {
    return {
      status: 'excelente',
      insight: `El ${formatPercent(value)} de las ventas queda como utilidad operativa. Hay espacio para inversión y crecimiento.`,
    };
  }
  if (value >= 0.1) {
    return {
      status: 'saludable',
      insight: `Margen operativo de ${formatPercent(value)}. Controla gastos para mantenerlo.`,
    };
  }
  if (value >= 0.03) {
    return {
      status: 'vigilancia',
      insight: `Solo ${formatPercent(value)} de las ventas llega a la operación. Analiza costos fijos y eficiencia comercial.`,
    };
  }
  if (value >= 0) {
    return {
      status: 'riesgo',
      insight: `Margen operativo casi nulo. Ajusta estructura de costos o precios para evitar pérdidas.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `Margen operativo negativo (${formatPercent(value)}). Hay gastos operativos superiores a la utilidad bruta.`,
  };
};

const interpretProfitMargin = (value: number | null | undefined): IndicatorMeta => {
  if (value == null) {
    return {
      status: 'sin_dato',
      insight: 'Sin utilidad neta o ingresos no es posible calcular el margen neto.',
    };
  }
  if (value >= 0.15) {
    return {
      status: 'excelente',
      insight: `Cada dólar vendido deja ${formatPercent(value)} de ganancia neta. Excelente conversión de ventas a utilidades.`,
    };
  }
  if (value >= 0.08) {
    return {
      status: 'saludable',
      insight: `Margen neto de ${formatPercent(value)}. Asegura una estructura tributaria y financiera eficiente para sostenerlo.`,
    };
  }
  if (value >= 0.03) {
    return {
      status: 'vigilancia',
      insight: `Margen discreto (${formatPercent(value)}). Identifica fugas en gastos financieros o extraordinarios.`,
    };
  }
  if (value >= 0) {
    return {
      status: 'riesgo',
      insight: `Margen neto muy bajo (${formatPercent(value)}). Ajusta gastos no operativos para recuperar rentabilidad.`,
    };
  }
  return {
    status: 'riesgo',
    insight: `Pérdida neta (${formatPercent(value)}). Revisa la contribución de ventas, costos y gastos financieros.`,
  };
};

const getStatusStyle = (meta: IndicatorMeta) => statusStyles[meta.status];

const BalanceTree: React.FC<{ nodes: BalanceNode[] }> = ({ nodes }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.map((node) => node.code)));

  useEffect(() => {
    const collectCodes = (items: BalanceNode[]): Set<string> => {
      const codes = new Set<string>();
      const traverse = (entry: BalanceNode) => {
        codes.add(entry.code);
        entry.children.forEach(traverse);
      };
      items.forEach(traverse);
      return codes;
    };

    const validCodes = collectCodes(nodes);
    setExpanded((previous) => {
      const next = new Set<string>();
      // Mantener nodos previamente expandidos aún presentes
      previous.forEach((code) => {
        if (validCodes.has(code)) {
          next.add(code);
        }
      });
      // Expandir nodos raíz por defecto
      nodes.forEach((node) => next.add(node.code));
      return next;
    });
  }, [nodes]);

  const toggleNode = (code: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const renderNode = (node: BalanceNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.code);

    return (
      <li key={node.code} className="border border-border/40 rounded-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-dark-card/60">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                type="button"
                onClick={() => toggleNode(node.code)}
                className="p-1 rounded hover:bg-dark-bg/60 transition-colors"
                aria-label={isExpanded ? 'Contraer cuenta' : 'Expandir cuenta'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-primary" />
                )}
              </button>
            )}
            <Layers className="w-3 h-3 text-primary" />
            <span className="text-sm font-mono text-text-secondary">
              {node.code} · {node.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-text-primary">
            {formatNumber(node.value)}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="pl-6 py-2 bg-dark-bg/40">
            <ul className="space-y-2">{node.children.map((child) => renderNode(child))}</ul>
          </div>
        )}
      </li>
    );
  };

  if (!nodes.length) {
    return <p className="text-sm text-text-muted">No hay cuentas disponibles.</p>;
  }

  return <ul className="space-y-2">{nodes.map((node) => renderNode(node))}</ul>;
};

const BalanceAnalysis: React.FC = () => {
  const { selectedYear } = useYear();
  const year = selectedYear ?? new Date().getFullYear();

  const [data, setData] = useState<BalanceDataResponse | null>(null);
  const [ratios, setRatios] = useState<BalanceRatios | null>(null);
  const [trendData, setTrendData] = useState<BalanceTrendPoint[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [range, setRange] = useState<{ start: number; end: number }>({ start: year, end: year });
  const [granularity, setGranularity] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState<boolean>(false);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getBalanceYears()
      .then((years) => {
        if (!mounted) return;
        const sorted = [...years].sort((a, b) => a - b);
        setAvailableYears(sorted);
        if (!sorted.length) {
          setRange({ start: year, end: year });
          return;
        }
        const minYear = sorted[0];
        const maxYear = sorted[sorted.length - 1];
        const boundedEnd = Math.max(minYear, Math.min(year, maxYear));
        const defaultStart = Math.max(minYear, boundedEnd - 2);
        setRange({ start: defaultStart, end: boundedEnd });
      })
      .catch(() => {
        if (mounted) {
          setAvailableYears([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [year]);

  useEffect(() => {
    setRange((prev) => {
      if (!availableYears.length) {
        return { start: year, end: year };
      }
      const minYear = availableYears[0];
      const maxYear = availableYears[availableYears.length - 1];
      const boundedEnd = Math.max(minYear, Math.min(year, maxYear));
      const boundedStart = Math.max(minYear, Math.min(prev.start, boundedEnd));
      if (prev.start === boundedStart && prev.end === boundedEnd) {
        return prev;
      }
      return { start: boundedStart, end: boundedEnd };
    });
  }, [year, availableYears]);

  const fetchBalanceInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfo(null);

      const balance = await loadBalanceData(year);
      setData(balance);

      if (!balance) {
        setRatios(null);
        setInfo(
          'Aún no se ha cargado el balance general para este periodo. Ve a Configuración → Datos Producción y sube el archivo exportado desde Contífico para habilitar este análisis.',
        );
        return;
      }

      const ratiosResponse = await loadBalanceRatios(year);
      setRatios(ratiosResponse);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el balance general.');
      setData(null);
      setRatios(null);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    let mounted = true;

    if (!availableYears.length || range.start > range.end) {
      setTrendData([]);
      return;
    }

    const loadTrends = async () => {
      try {
        setTrendLoading(true);
        setTrendError(null);
        const points = await loadBalanceTrends(range.start, range.end, granularity);
        if (mounted) {
          setTrendData(points);
        }
      } catch (err: any) {
        if (mounted) {
          setTrendData([]);
          setTrendError(err?.message || 'No pudimos obtener la serie histórica del balance.');
        }
      } finally {
        if (mounted) {
          setTrendLoading(false);
        }
      }
    };

    loadTrends();
    return () => {
      mounted = false;
    };
  }, [availableYears, range, granularity]);

  const metrics = useMemo(() => data?.metrics, [data]);
  const sortedYearsAsc = useMemo(() => [...availableYears].sort((a, b) => a - b), [availableYears]);
  const trendChartData = useMemo(
    () =>
      trendData.map((point) => ({
        ...point,
        label:
          granularity === 'monthly' && point.month
            ? `${point.year}-${String(point.month).padStart(2, '0')}`
            : `${point.year}`,
      })),
    [trendData, granularity],
  );

  const ratioHighlights = useMemo(() => {
    if (!ratios) return [];
    const liquidity = interpretLiquidityCorriente(ratios.liquidez_corriente ?? null);
    const quick = interpretQuickRatio(ratios.razon_rapida ?? null);
    const leverage = interpretEndeudamiento(ratios.endeudamiento ?? null);
    const debtEquity = interpretDebtToEquity(ratios.debt_to_equity ?? null);
    const roe = interpretROE(ratios.roe ?? null);
    const roa = interpretROA(ratios.roa ?? null);
    const opMargin = interpretOperatingMargin(ratios.operating_margin ?? null);
    const netMargin = interpretProfitMargin(ratios.profit_margin ?? null);

    return [
      {
        key: 'liquidez_corriente',
        label: 'Liquidez Corriente',
        value: formatMultiple(ratios.liquidez_corriente ?? null),
        icon: GaugeCircle,
        ...getStatusStyle(liquidity),
        insight: liquidity.insight,
      },
      {
        key: 'razon_rapida',
        label: 'Razón Rápida',
        value: formatMultiple(ratios.razon_rapida ?? null),
        icon: Activity,
        ...getStatusStyle(quick),
        insight: quick.insight,
      },
      {
        key: 'endeudamiento',
        label: 'Endeudamiento',
        value: formatPercent(ratios.endeudamiento ?? null),
        icon: Shield,
        ...getStatusStyle(leverage),
        insight: leverage.insight,
      },
      {
        key: 'debt_to_equity',
        label: 'Deuda / Patrimonio',
        value: formatMultiple(ratios.debt_to_equity ?? null),
        icon: TrendingUp,
        ...getStatusStyle(debtEquity),
        insight: debtEquity.insight,
      },
      {
        key: 'roe',
        label: 'ROE',
        value: formatPercent(ratios.roe ?? null),
        icon: BarChart2,
        ...getStatusStyle(roe),
        insight: roe.insight,
      },
      {
        key: 'roa',
        label: 'ROA',
        value: formatPercent(ratios.roa ?? null),
        icon: BarChart2,
        ...getStatusStyle(roa),
        insight: roa.insight,
      },
      {
        key: 'operating_margin',
        label: 'Margen Operativo',
        value: formatPercent(ratios.operating_margin ?? null),
        icon: Activity,
        ...getStatusStyle(opMargin),
        insight: opMargin.insight,
      },
      {
        key: 'profit_margin',
        label: 'Margen Neto',
        value: formatPercent(ratios.profit_margin ?? null),
        icon: Activity,
        ...getStatusStyle(netMargin),
        insight: netMargin.insight,
      },
    ];
  }, [ratios]);

  const balanceMismatch = metrics ? Math.abs(metrics.balance_check) > 1 : false;

  const handleStartChange = (value: string) => {
    const numeric = Number(value);
    setRange((prev) => {
      const newStart = Math.min(numeric, prev.end);
      return { start: newStart, end: prev.end };
    });
  };

  const handleEndChange = (value: string) => {
    const numeric = Number(value);
    setRange((prev) => {
      const newEnd = Math.max(numeric, prev.start);
      return { start: prev.start, end: newEnd };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display text-primary text-glow">Balance General</h1>
          <p className="text-text-muted">
            Análisis financiero consolidado · Año {year}
            {data?.lastUpdated && (
              <span className="ml-2 text-xs text-text-secondary">
                Última actualización: {new Date(data.lastUpdated).toLocaleString('es-EC')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchBalanceInsights}
          disabled={loading}
          className="cyber-button-sm flex items-center gap-2 self-start lg:self-auto"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {(error || info) && (
        <div className="glass-card border border-danger/40 bg-danger/10 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 ${error ? 'text-danger' : 'text-accent'}`} />
          <div>
            <h3 className={`${error ? 'text-danger' : 'text-accent'} font-semibold`}>
              {error ? 'No pudimos cargar el balance' : 'Balance no disponible'}
            </h3>
            <p className="text-sm text-text-muted">{error || info}</p>
            {!error && (
              <button
                onClick={() => (window.location.hash = '#config')}
                className="mt-3 px-3 py-1.5 text-xs rounded bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 transition-colors"
              >
                Ir a Configuración
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-card border border-border/40 bg-dark-card/60 p-6 rounded-xl text-center">
          <RefreshCcw className="w-6 h-6 text-primary mx-auto mb-2 animate-spin" />
          <p className="text-sm text-text-muted">Procesando balance...</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border border-accent/30 rounded-2xl shadow-glow-sm">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Activos Totales</span>
              </div>
              <p className="mt-2 text-2xl font-display text-text-primary">
                ${formatNumber(metrics?.activos)}
              </p>
            </div>
            <div className="glass-card p-5 border border-warning/30 rounded-2xl shadow-glow-sm">
              <div className="flex items-center gap-2 text-warning">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Pasivos Totales</span>
              </div>
              <p className="mt-2 text-2xl font-display text-text-primary">
                ${formatNumber(metrics?.pasivos)}
              </p>
            </div>
            <div className="glass-card p-5 border border-primary/30 rounded-2xl shadow-glow-sm">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Patrimonio</span>
              </div>
              <p className="mt-2 text-2xl font-display text-text-primary">
                ${formatNumber(metrics?.patrimonio)}
              </p>
            </div>
            <div className="glass-card p-5 border border-accent/30 rounded-2xl shadow-glow-sm">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Capital de Trabajo</span>
              </div>
              <p className="mt-2 text-2xl font-display text-text-primary">
                ${formatNumber(metrics?.capital_trabajo)}
              </p>
              {metrics?.liquidez_corriente != null && (
                <p className="text-xs text-text-muted mt-1">
                  Liquidez corriente: {formatMultiple(metrics.liquidez_corriente)}
                </p>
              )}
            </div>
          </div>

          {balanceMismatch && (
            <div className="glass-card border border-warning/50 bg-warning/10 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <p className="text-sm text-warning">
                El balance no está cuadrado. Revisa los saldos de activo, pasivo y patrimonio; la
                diferencia actual es de ${formatNumber(metrics?.balance_check)}.
              </p>
            </div>
          )}

          {ratios && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass-card border border-border/60 rounded-3xl p-6 shadow-hologram"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div>
                  <h2 className="text-xl font-display text-primary">Indicadores Clave</h2>
                  <p className="text-sm text-text-muted">
                    Ratios de liquidez, apalancamiento y rentabilidad calculados sobre el balance y
                    el PYG del periodo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {ratioHighlights.map(({ key, label, value, icon: Icon, tone, badge, insight }) => (
                  <div key={key} className="relative group">
                    <div
                      className="glass-card border border-border/40 bg-dark-card/40 rounded-2xl px-4 py-5 flex flex-col gap-3 focus:outline-none"
                      tabIndex={0}
                    >
                      <div className={`flex items-center gap-2 ${tone}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide text-text-secondary">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-semibold text-text-primary">{value}</span>
                        <span className={`text-[0.65rem] font-semibold uppercase tracking-wide ${tone}`}>
                          {badge}
                        </span>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-2xl border border-border/60 bg-dark-card/90 p-3 text-xs text-text-secondary shadow-lg group-hover:block group-focus-within:block">
                      {insight}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card border border-accent/30 bg-dark-card/40 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-accent uppercase tracking-wide">
                    Ingresos
                  </h3>
                  <p className="text-2xl font-display text-text-primary mt-1">
                    ${formatNumber(ratios.financials.ingresos)}
                  </p>
                </div>
                <div className="glass-card border border-primary/30 bg-dark-card/40 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                    Utilidad Operativa
                  </h3>
                  <p className="text-2xl font-display text-text-primary mt-1">
                    ${formatNumber(ratios.financials.utilidad_operacional)}
                  </p>
                </div>
                <div className="glass-card border border-success/30 bg-dark-card/40 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-success uppercase tracking-wide">
                    Utilidad Neta
                  </h3>
                  <p className="text-2xl font-display text-text-primary mt-1">
                    ${formatNumber(ratios.financials.utilidad_neta)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card border border-border/60 rounded-3xl p-6 shadow-hologram"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h2 className="text-xl font-display text-primary">Serie Histórica</h2>
                <p className="text-sm text-text-muted">
                  Evolución de activos, pasivos y patrimonio para análisis de tendencias.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-text-secondary uppercase tracking-wide">
                  Inicio
                  <select
                    value={range.start}
                    onChange={(event) => handleStartChange(event.target.value)}
                    className="ml-2 bg-dark-card border border-border/40 rounded-lg px-2 py-1 text-sm text-text-primary"
                  >
                    {sortedYearsAsc.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-text-secondary uppercase tracking-wide">
                  Fin
                  <select
                    value={range.end}
                    onChange={(event) => handleEndChange(event.target.value)}
                    className="ml-2 bg-dark-card border border-border/40 rounded-lg px-2 py-1 text-sm text-text-primary"
                  >
                    {sortedYearsAsc.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-text-secondary uppercase tracking-wide">
                  Granularidad
                  <select
                    value={granularity}
                    onChange={(event) => setGranularity(event.target.value as 'annual' | 'monthly')}
                    className="ml-2 bg-dark-card border border-border/40 rounded-lg px-2 py-1 text-sm text-text-primary"
                  >
                    <option value="annual">Anual</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </label>
              </div>
            </div>

            {trendError && (
              <div className="mb-4 flex items-center gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4" />
                {trendError}
              </div>
            )}

            {trendLoading ? (
              <div className="py-12 text-center text-text-muted">
                <RefreshCcw className="w-6 h-6 text-primary mx-auto mb-3 animate-spin" />
                Calculando serie histórica...
              </div>
            ) : trendChartData.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activos" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pasivos" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="patrimonio" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="capital_trabajo" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-text-muted">
                No hay suficientes datos históricos en el rango seleccionado.
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card border border-border/60 rounded-3xl p-6 shadow-hologram"
          >
            <h2 className="text-xl font-display text-primary mb-4">Estructura Jerárquica</h2>
            <BalanceTree nodes={data.tree} />
          </motion.div>
        </>
      )}
    </div>
  );
};

export default BalanceAnalysis;
