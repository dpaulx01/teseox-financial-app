import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFinancialData } from '../../contexts/DataContext';
import { useScenario } from '../../contexts/ScenarioContext';
import { EditableCell } from './EditableCell';
import { FinancialData, MonthlyData } from '../../types';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { Save, RefreshCw, Calculator, AlertTriangle, TrendingUp, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { getSortedMonths } from '../../utils/dateUtils';
import ProjectionEngine from '../../utils/projectionEngine';
import { formatCurrency } from '../../utils/formatters';
import { RawDataRow } from '../../types';
import { parseNumericValue } from '../../utils/formatters';
import { calculatePnl } from '../../utils/pnlCalculator';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ToastContainer } from '../ui/Toast';
import { saveFinancialData } from '../../utils/financialStorage';
import { useRef } from 'react';

type AnalysisType = 'contable' | 'operativo' | 'caja';


interface PygRow {
  code: string;
  name: string;
  level: number;
  isParent: boolean;
  isCalculated?: boolean;
  children?: string[];
  formula?: (data: MonthlyData, month?: string, getValueFn?: (code: string) => number) => number;
}

const EditablePygMatrixV2: React.FC = () => {
  // IMPORTANTE: Este componente es para BALANCE INTERNO, debe usar datos del escenario/simulación
  const { scenarioData, isSimulationMode } = useScenario();
  const { data: realFinancialData } = useFinancialData();
  const { mixedCosts, customClassifications } = useMixedCosts();
  
  // Usar datos del escenario si está en modo simulación, sino usar datos reales
  const financialData = isSimulationMode && scenarioData ? scenarioData : realFinancialData;

  const [enhancedData, setEnhancedData] = useState<FinancialData | null>(null);
  // Eliminado analysisType - Las 3 utilidades se muestran en las últimas filas
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  // Selector de algoritmo de proyección
  const [projectionMode, setProjectionMode] = useState<'advanced' | 'movingAvg' | 'flatMedian'>('advanced');
  const [showPatternColors, setShowPatternColors] = useState<boolean>(false);
  const [userToggledPatterns, setUserToggledPatterns] = useState<boolean>(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [openChildrenFor, setOpenChildrenFor] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Record<string, number>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { errors, addError, removeError } = useErrorHandler();
  // Datos de trabajo (escenario con proyecciones si existe)
  const workingData = enhancedData || financialData;
  const workingDataRef = useRef<FinancialData | null>(workingData || null);
  const cellCacheRef = useRef<Map<string, number>>(new Map());
  const pendingEditsRef = useRef<Record<string, number>>({});
  const enhancedDataRef = useRef<FinancialData | null>(enhancedData);

  useEffect(() => { workingDataRef.current = workingData || null; }, [workingData]);
  useEffect(() => { pendingEditsRef.current = pendingEdits; }, [pendingEdits]);
  useEffect(() => { enhancedDataRef.current = enhancedData; }, [enhancedData]);

  // Persistencia de preferencia de patrones
  useEffect(() => {
    try {
      const stored = localStorage.getItem('BI_showPatterns');
      if (stored !== null) setShowPatternColors(stored === '1');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('BI_showPatterns', showPatternColors ? '1' : '0'); } catch {}
  }, [showPatternColors]);

  // Persistir ediciones pendientes en sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('BI_pendingEdits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setPendingEdits(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(pendingEdits).length > 0) {
        sessionStorage.setItem('BI_pendingEdits', JSON.stringify(pendingEdits));
      } else {
        sessionStorage.removeItem('BI_pendingEdits');
      }
    } catch {}
  }, [pendingEdits]);

  // Estado de PyG y utilidades (debe estar antes de calculateUtilities)
  const [pygTreeData, setPygTreeData] = useState<any[]>([]);
  const [utilityCalculations, setUtilityCalculations] = useState<Record<string, Record<string, number>>>(
    {
      'Utilidad Bruta (UB)': {},
      'Utilidad Neta (UN)': {},
      'EBITDA': {}
    }
  );

  // Cálculo de utilidades (definir antes de usar en dependencias)
  const calculateUtilities = useCallback(async (data: FinancialData, months: string[]) => {
    const calculations = {
      'Utilidad Bruta (UB)': {},
      'Utilidad Neta (UN)': {},
      'EBITDA': {}
    } as Record<string, Record<string, number>>;

    for (const month of months) {
      try {
        const monthForCalculation = month.toLowerCase();
        console.log(`🔍 BALANCE INTERNO - Calculando utilidades para ${month} (usando: ${monthForCalculation})`);
        const ubResult = await calculatePnl(data, monthForCalculation, 'contable', undefined, 1);
        calculations['Utilidad Bruta (UB)'][month] = ubResult.summaryKpis?.utilidad || 0;

        const unResult = await calculatePnl(data, monthForCalculation, 'operativo', undefined, 1);
        calculations['Utilidad Neta (UN)'][month] = unResult.summaryKpis?.utilidad || 0;

        const ebitdaResult = await calculatePnl(data, monthForCalculation, 'caja', undefined, 1);
        calculations['EBITDA'][month] = ebitdaResult.summaryKpis?.utilidad || 0;

        console.log(`💰 BALANCE INTERNO UTILIDADES ${month}:`, {
          ub: calculations['Utilidad Bruta (UB)'][month],
          un: calculations['Utilidad Neta (UN)'][month],
          ebitda: calculations['EBITDA'][month],
          inputMonth: monthForCalculation
        });
      } catch (error) {
        console.error(`Error calculando utilidades para ${month}:`, error);
        calculations['Utilidad Bruta (UB)'][month] = 0;
        calculations['Utilidad Neta (UN)'][month] = 0;
        calculations['EBITDA'][month] = 0;
      }
    }
    setUtilityCalculations(calculations);
  }, []);

  // Helpers de proyección simples para selector de algoritmo (definidos ANTES de usarlos)
  const projectWithMovingAverage = useCallback((dataToEnhance: FinancialData): FinancialData => {
    const cloned: FinancialData = JSON.parse(JSON.stringify(dataToEnhance));
    if (!cloned.raw) return cloned;

    const allPossibleMonths = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    cloned.raw = cloned.raw.map(row => {
      const updatedRow = { ...row } as any;
      // Meses con datos reales
      const existingMonths = allPossibleMonths.filter(m => {
        const v = parseFloat((row as any)[m] as string) || 0;
        return v !== 0 && !isNaN(v);
      });
      const existingValues = existingMonths.map(m => parseFloat((row as any)[m] as string) || 0).filter(v => v !== 0);
      const lastExistingIndex = allPossibleMonths.findIndex(m => existingMonths.includes(m) && existingMonths.indexOf(m) === existingMonths.length - 1);
      const monthsToProjectDynamic = allPossibleMonths.slice(lastExistingIndex + 1);

      monthsToProjectDynamic.forEach((month, index) => {
        if (existingValues.length >= 2) {
          const n = existingValues.length;
          const x = Array.from({ length: n }, (_, i) => i + 1);
          const y = existingValues;
          const sumX = x.reduce((a, b) => a + b, 0);
          const sumY = y.reduce((a, b) => a + b, 0);
          const sumXY = x.reduce((s, xv, i) => s + xv * y[i], 0);
          const sumXX = x.reduce((s, xv) => s + xv * xv, 0);
          const slope = (n * sumXY - sumX * sumY) / Math.max(1e-9, (n * sumXX - sumX * sumX));
          const intercept = (sumY - slope * sumX) / n;
          const nextPeriod = n + 1 + index;
          let projected = slope * nextPeriod + intercept;
          // Estacionalidad suave basada en volatilidad
          const avg = sumY / n;
          const volatility = avg !== 0 ? Math.sqrt(y.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n) / Math.abs(avg) : 0;
          const seasonalFactor = 1 + (Math.sin((index + 6) * Math.PI / 6) * Math.min(volatility, 0.15));
          // Promedio móvil ponderado
          const weights = Array.from({ length: n }, (_, i) => (i + 1) / ((n * (n + 1)) / 2));
          const weightedAvg = y.reduce((s, v, i) => s + v * weights[i], 0);
          projected = (projected * 0.6) + (weightedAvg * 0.4);
          projected *= seasonalFactor;
          const lastVal = y[y.length - 1];
          const maxChange = Math.abs(lastVal) * 0.25;
          const change = projected - lastVal;
          if (Math.abs(change) > maxChange) projected = lastVal + (change > 0 ? maxChange : -maxChange);
          (updatedRow as any)[month] = Math.round(Math.max(0, projected));
        } else if (existingValues.length === 1) {
          const single = existingValues[0];
          const grow = 1 + (index * 0.02);
          (updatedRow as any)[month] = Math.round(single * grow);
        } else {
          (updatedRow as any)[month] = 0;
        }
      });
      return updatedRow;
    });

    // Asegurar llaves monthly para todos los meses
    cloned.monthly = cloned.monthly || {};
    const allLower = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    allLower.forEach(m => {
      if (!cloned.monthly![m]) {
        cloned.monthly![m] = { ingresos: 0, costoVentasTotal: 0, costoMateriaPrima: 0, costoProduccion: 0, utilidadBruta: 0, gastosOperativos: 0, ebitda: 0, depreciacion: 0, utilidadNeta: 0 };
      }
    });
    return cloned;
  }, []);

  const projectWithFlatMedian = useCallback((dataToEnhance: FinancialData): FinancialData => {
    const cloned: FinancialData = JSON.parse(JSON.stringify(dataToEnhance));
    if (!cloned.raw) return cloned;
    const allPossibleMonths = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const median = (arr: number[]) => {
      const a = arr.slice().sort((x, y) => x - y); const mid = Math.floor(a.length / 2);
      return a.length ? (a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2) : 0;
    };
    cloned.raw = cloned.raw.map(row => {
      const updatedRow = { ...row } as any;
      const existingValues = allPossibleMonths.map(m => parseFloat((row as any)[m] as string) || 0).filter(v => v !== 0);
      const base = existingValues.length ? median(existingValues.slice(-3)) : 0;
      // Llenar meses posteriores al último real con la mediana plana
      const lastExistingIndex = (allPossibleMonths as any).findLastIndex
        ? (allPossibleMonths as any).findLastIndex((m: string) => ((row as any)[m] && parseFloat((row as any)[m]) !== 0))
        : (() => {
            for (let i = allPossibleMonths.length - 1; i >= 0; i--) {
              const m = allPossibleMonths[i];
              const v = parseFloat((row as any)[m] as string) || 0;
              if (v !== 0) return i;
            }
            return -1;
          })();
      const monthsToProjectDynamic = allPossibleMonths.slice(Math.max(0, lastExistingIndex + 1));
      monthsToProjectDynamic.forEach(m => { (updatedRow as any)[m] = Math.max(0, Math.round(base)); });
      return updatedRow;
    });
    // Asegurar monthly
    cloned.monthly = cloned.monthly || {};
    ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'].forEach(m => {
      if (!cloned.monthly![m]) {
        cloned.monthly![m] = { ingresos: 0, costoVentasTotal: 0, costoMateriaPrima: 0, costoProduccion: 0, utilidadBruta: 0, gastosOperativos: 0, ebitda: 0, depreciacion: 0, utilidadNeta: 0 };
      }
    });
    return cloned;
  }, []);

  // ====== Resumen comparativo de algoritmos (jul–dic) ======
  type AlgoKey = 'advanced' | 'movingAvg' | 'flatMedian';
  const [algoSummary, setAlgoSummary] = useState<Record<AlgoKey, { ubAvg: number; unAvg: number; ebitdaAvg: number; ubTotal: number; unTotal: number; ebitdaTotal: number }>>({
    advanced: { ubAvg: 0, unAvg: 0, ebitdaAvg: 0, ubTotal: 0, unTotal: 0, ebitdaTotal: 0 },
    movingAvg: { ubAvg: 0, unAvg: 0, ebitdaAvg: 0, ubTotal: 0, unTotal: 0, ebitdaTotal: 0 },
    flatMedian: { ubAvg: 0, unAvg: 0, ebitdaAvg: 0, ubTotal: 0, unTotal: 0, ebitdaTotal: 0 },
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryVersion, setSummaryVersion] = useState(0);
  // Estado de guardado para mostrar en el footer
  const [lastSave, setLastSave] = useState<{ status: 'idle' | 'ok' | 'error'; at?: number }>({ status: 'idle' });

  const projectForMode = useCallback((base: FinancialData, mode: AlgoKey): FinancialData => {
    if (mode === 'advanced') {
      return ProjectionEngine.generateAdvancedProjections(JSON.parse(JSON.stringify(base)), 2025, { mixedCosts, customClassifications });
    }
    if (mode === 'movingAvg') {
      return projectWithMovingAverage(base);
    }
    return projectWithFlatMedian(base);
  }, [projectWithMovingAverage, projectWithFlatMedian, mixedCosts, customClassifications]);

  useEffect(() => {
    const runSummary = async () => {
      if (isRecalculating) return; // no bloquear UI durante recálculo
      // Usar datos con proyección si están disponibles para consistencia visual
      const base = enhancedData || financialData || workingData;
      if (!base) return;
      setIsSummaryLoading(true);
      try {
        const modes: AlgoKey[] = ['advanced', 'movingAvg', 'flatMedian'];
        const months: string[] = ['julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const nextSummary: any = {};
        for (const m of modes) {
          const projected = projectForMode(base, m);
          // Normalizar monthly (por si acaso)
          const normalizedMonthly: Record<string, any> = {};
          Object.entries(projected.monthly || {}).forEach(([k, v]) => { normalizedMonthly[k.toLowerCase()] = v as any; });
          projected.monthly = normalizedMonthly;

          let ubTotal = 0, unTotal = 0, ebitdaTotal = 0, count = 0;
          for (const mon of months) {
            try {
              const ub = await calculatePnl(projected, mon, 'contable', undefined, 1);
              const un = await calculatePnl(projected, mon, 'operativo', undefined, 1);
              const ebd = await calculatePnl(projected, mon, 'caja', undefined, 1);
              ubTotal += ub.summaryKpis?.utilidad || 0;
              unTotal += un.summaryKpis?.utilidad || 0;
              ebitdaTotal += ebd.summaryKpis?.utilidad || 0;
              count += 1;
            } catch {
              // ignorar meses no presentes
            }
          }
          nextSummary[m] = {
            ubTotal, unTotal, ebitdaTotal,
            ubAvg: count ? ubTotal / count : 0,
            unAvg: count ? unTotal / count : 0,
            ebitdaAvg: count ? ebitdaTotal / count : 0,
          };
        }
        setAlgoSummary(nextSummary);
      } finally {
        setIsSummaryLoading(false);
      }
    };
    runSummary();
  }, [summaryVersion, projectForMode, isRecalculating, financialData, enhancedData]);

  const queueEdit = useCallback((month: string, row: PygRow, newValue: number) => {
    setPendingEdits(prev => ({ ...prev, [`${row.code}|${month}`]: newValue }));
  }, []);

  

  const applyPendingEdits = useCallback(async () => {
    if (!workingData) return;
    try {
      // Feedback inicial
      addError(`Aplicando ${Object.keys(pendingEdits).length} cambio(s)…`, 'info');
      setIsRecalculating(true);
      const updatedData: FinancialData = JSON.parse(JSON.stringify(workingData));
      if (updatedData.raw) {
        console.groupCollapsed('BI Recalc ▶ Aplicando ediciones en RAW');
        Object.entries(pendingEdits).forEach(([key, val]) => {
          const [code, month] = key.split('|');
          const idx = updatedData.raw!.findIndex(r => r['COD.'] === code);
          if (idx >= 0) {
            const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
            const before = (updatedData.raw![idx] as any)[monthKey];
            updatedData.raw![idx] = { ...updatedData.raw![idx], [monthKey]: val };
            console.log(`• ${code} ${monthKey}: ${before} → ${val}`);
          } else {
            console.warn(`• Código no encontrado en RAW: ${code}`);
          }
        });
        console.groupEnd();
      }
      // Reproyectar meses faltantes según el algoritmo actual
      let reprojected: FinancialData | null = null;
      if (projectionMode === 'advanced') {
        console.log('♻️ Reproyectando (Avanzado) tras aplicar ediciones…');
        reprojected = ProjectionEngine.generateAdvancedProjections(updatedData, 2025, {
          mixedCosts,
          customClassifications,
        });
      } else if (projectionMode === 'movingAvg') {
        console.log('♻️ Reproyectando (Promedio móvil) tras aplicar ediciones…');
        reprojected = projectWithMovingAverage(updatedData);
      } else {
        console.log('♻️ Reproyectando (Mediana) tras aplicar ediciones…');
        reprojected = projectWithFlatMedian(updatedData);
      }

      // Normalizar monthly en minúsculas
      if (reprojected?.monthly) {
        const normalizedMonthlyInternal: Record<string, any> = {};
        Object.entries(reprojected.monthly).forEach(([k, v]) => {
          normalizedMonthlyInternal[k.toLowerCase()] = v as any;
        });
        reprojected.monthly = normalizedMonthlyInternal;
      }

      // Respetar ediciones del usuario: reescribir en raw los valores editados
      if (reprojected?.raw) {
        console.groupCollapsed('BI Recalc ▶ Reaplicando ediciones tras proyección');
        Object.entries(pendingEdits).forEach(([key, val]) => {
          const [code, month] = key.split('|');
          const idx = reprojected!.raw!.findIndex(r => r['COD.'] === code);
          if (idx >= 0) {
            const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
            const before = (reprojected!.raw![idx] as any)[monthKey];
            reprojected!.raw![idx] = { ...reprojected!.raw![idx], [monthKey]: val } as any;
            console.log(`• ${code} ${monthKey}: ${before} → ${val}`);
          } else {
            console.warn(`• Código no encontrado en RAW reproyectado: ${code}`);
          }
        });
        console.groupEnd();
      }

      // Actualizar datos en memoria y árbol principal inmediatamente
      const finalData = reprojected || updatedData;
      setEnhancedData(finalData);
      sendDebugSnapshot('after-reproject', finalData);
      try {
        const updatedPygData = await calculatePnl(finalData, 'junio', 'contable');
        setPygTreeData(updatedPygData.treeData);
      } catch (e) {
        console.warn('No se pudo recalcular PyG inmediato, se hará por efecto:', e);
      }
      // Persistir en base de datos (API RBAC)
      try {
        await saveFinancialData(finalData);
        console.log('💾 Cambios persistidos en base de datos');
        addError('Cambios aplicados y guardados en base de datos', 'info');
        setLastSave({ status: 'ok', at: Date.now() });
      } catch (persistErr) {
        console.warn('⚠️ No se pudo persistir en DB:', persistErr);
        addError('No se pudo guardar en base de datos', 'error');
        setLastSave({ status: 'error', at: Date.now() });
      }
      setPendingEdits({});
      // Calcular meses disponibles a partir de los datos finales (evita TDZ)
      const normalizedMonthly: Record<string, any> = {};
      Object.entries(finalData.monthly || {}).forEach(([k, v]) => {
        normalizedMonthly[k.toLowerCase()] = v as any;
      });
      const months = getSortedMonths(normalizedMonthly);
      setTimeout(() => {
        calculateUtilities(finalData, months);
      }, 50);
    } catch (e) {
      console.error('Error applying pending edits:', e);
      addError('Error aplicando cambios', 'error');
    } finally {
      setIsRecalculating(false);
    }
  }, [workingData, pendingEdits, projectionMode, projectWithMovingAverage, projectWithFlatMedian, mixedCosts, customClassifications, calculateUtilities]);

  // ====== Consola de depuración: funciones accesibles desde window ======
  useEffect(() => {
    const api = {
      showPending: () => ({ ...pendingEditsRef.current }),
      setPending: (code: string, month: string, value: number) => {
        const key = `${code}|${month.toLowerCase()}`;
        setPendingEdits(prev => ({ ...prev, [key]: value }));
        return key;
      },
      apply: async () => { await applyPendingEdits(); return 'applied'; },
      probe: async (code: string, month: string) => {
        const data = workingDataRef.current || enhancedDataRef.current;
        const cap = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const lower = month.toLowerCase();
        const rawVal = data?.raw?.find(r => r['COD.'] === code)?.[cap];
        let ub=0,un=0,ebd=0;
        try { ub = (await calculatePnl(data!, lower, 'contable', undefined, 1)).summaryKpis.utilidad; } catch {}
        try { un = (await calculatePnl(data!, lower, 'operativo', undefined, 1)).summaryKpis.utilidad; } catch {}
        try { ebd = (await calculatePnl(data!, lower, 'caja', undefined, 1)).summaryKpis.utilidad; } catch {}
        console.log('🔎 BI Probe', { code, month: lower, rawVal, ub, un, ebitda: ebd });
        return { rawVal, ub, un, ebitda: ebd };
      },
      sumParent: (parentCode: string, month: string) => {
        const data = workingDataRef.current || enhancedDataRef.current;
        const cap = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const rows = data?.raw || [];
        const codes = rows.map(r => (r['COD.'] || '').toString());
        const isLeaf = (c: string) => !codes.some(other => other !== c && other.startsWith(c + '.'));
        const sum = rows.reduce((acc, r) => {
          const rc = (r['COD.'] || '').toString();
          if (rc.startsWith(parentCode + '.') && isLeaf(rc)) {
            const v = parseNumericValue((r as any)[cap] || '0');
            return acc + (isNaN(v) ? 0 : v);
          }
          return acc;
        }, 0);
        console.log('∑ Parent', { parentCode, month: cap, sum });
        return sum;
      }
    } as any;
    if (!(window as any).BI) {
      (window as any).BI = api;
    } else {
      // No spamear el log si ya existe
      (window as any).BI = { ...(window as any).BI, ...api };
    }
    return () => { if ((window as any).BI === api) { delete (window as any).BI; } };
  }, [applyPendingEdits]);

  // Enviar snapshot de depuración al backend (si se requiere)
  const sendDebugSnapshot = useCallback(async (label: string, data: FinancialData) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const sample = {
        label,
        pendingEdits: pendingEditsRef.current,
        monthlyKeys: Object.keys(data.monthly || {}),
        sampleRaw0: data.raw?.[0] || null,
        editedCodes: Object.keys(pendingEditsRef.current).map(k => k.split('|')[0]),
      };
      await fetch('http://localhost:8001/api/financial/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(sample)
      });
    } catch {}
  }, []);

  const discardPendingEdits = useCallback(() => {
    const count = Object.keys(pendingEdits).length;
    if (count === 0) return;
    const ok = window.confirm(`Descartar ${count} cambio(s) pendiente(s)?`);
    if (ok) {
      setPendingEdits({});
      try { sessionStorage.removeItem('BI_pendingEdits'); } catch {}
      addError('Cambios descartados', 'warning');
    }
  }, [pendingEdits]);

  // Obtener meses disponibles de forma segura - SIEMPRE en minúsculas
  const availableMonths = useMemo(() => {
    if (!workingData?.monthly) return [] as string[];
    // Normalizar todas las claves a minúsculas
    const normalizedMonthly: Record<string, any> = {};
    Object.entries(workingData.monthly).forEach(([key, value]) => {
      normalizedMonthly[key.toLowerCase()] = value;
    });
    return getSortedMonths(normalizedMonthly);
  }, [workingData]);
  
  // DEBUG: Verificar qué datos estamos recibiendo
  useEffect(() => {
    console.log('🔵 CONTEXT DEBUG - Balance Interno data:', {
      isSimulationMode,
      usingScenarioData: isSimulationMode && !!scenarioData,
      hasData: !!financialData,
      hasMonthly: !!financialData?.monthly,
      hasRaw: !!financialData?.raw,
      rawLength: financialData?.raw?.length || 0,
      monthlyKeys: financialData?.monthly ? Object.keys(financialData.monthly) : [],
      firstRawData: financialData?.raw?.[0],
      sampleMonthlyData: financialData?.monthly ? Object.entries(financialData.monthly)[0] : null
    });
  }, [financialData, isSimulationMode, scenarioData]);

  
  // ProjectionEngine: completar año con proyecciones DESPUÉS de procesar datos base
  useEffect(() => {
    if (financialData && financialData.monthly && !enhancedData) {
      console.log('🧠 Ejecutando ProjectionEngine para completar año 2025...');
      
      // Clonar datos profundamente
      const dataToEnhance: FinancialData = JSON.parse(JSON.stringify(financialData));
      
      let enhancedWithProjections: FinancialData | null = null;

      // Seleccionar algoritmo según modo
      if (projectionMode === 'advanced') {
        console.log('🚀 Usando ProjectionEngine.generateAdvancedProjections...');
        enhancedWithProjections = ProjectionEngine.generateAdvancedProjections(dataToEnhance, 2025, {
          mixedCosts,
          customClassifications,
        });
      } else if (projectionMode === 'movingAvg') {
        console.log('🧮 Usando proyección Promedio Móvil');
        enhancedWithProjections = projectWithMovingAverage(dataToEnhance);
      } else {
        console.log('📏 Usando proyección Mediana Plana');
        enhancedWithProjections = projectWithFlatMedian(dataToEnhance);
      }
      
      // FALLBACK: Si falla, usar proyección simple como respaldo  
      if (!enhancedWithProjections || !enhancedWithProjections.raw) {
        console.log('⚠️ ProjectionEngine falló, usando proyección simple...');
        
        if (dataToEnhance.raw && dataToEnhance.raw.length > 0) {
          const monthsToProject = ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          
          dataToEnhance.raw = dataToEnhance.raw.map(row => {
            const updatedRow = { ...row };
            
            // DINÁMICO: Detectar TODOS los meses disponibles automáticamente
          const allPossibleMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          
          // Encontrar todos los meses que YA tienen datos
          const existingMonths = allPossibleMonths.filter(month => {
            const value = parseFloat(row[month] as string) || 0;
            return value !== 0 && !isNaN(value);
          });
          
          // Solo usar meses que realmente tienen datos (dinámico)
          const existingValues = existingMonths
            .map(m => parseFloat(row[m] as string) || 0)
            .filter(v => v !== 0);
          
          if (existingValues.length > 0) {
            // Usar promedio con variación estacional simple
            const average = existingValues.reduce((a, b) => a + b, 0) / existingValues.length;
            const lastValue = parseFloat(row['Junio'] as string) || average;
            
            // PROYECCIÓN INTELIGENTE DINÁMICA: Analizar TODOS los meses disponibles
            // Determinar qué meses faltan por proyectar
            const lastExistingMonthIndex = allPossibleMonths.findIndex(m => existingMonths.includes(m) && 
              existingMonths.indexOf(m) === existingMonths.length - 1);
            
            const monthsToProjectDynamic = allPossibleMonths.slice(lastExistingMonthIndex + 1);
            
            monthsToProjectDynamic.forEach((month, index) => {
              // Obtener TODOS los valores históricos disponibles (dinámico)
              const historicalValues = existingValues; // Ya filtrados dinámicamente
              
              if (historicalValues.length >= 2) {
                // ANÁLISIS INTELIGENTE POR CUENTA:
                
                // 1. Calcular tendencia real (regresión lineal)
                const n = historicalValues.length;
                const xValues = Array.from({length: n}, (_, i) => i + 1);
                const yValues = historicalValues;
                
                const sumX = xValues.reduce((a, b) => a + b, 0);
                const sumY = yValues.reduce((a, b) => a + b, 0);
                const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
                const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
                
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                
                // 2. Detectar estacionalidad específica de esta cuenta
                const avgValue = sumY / n;
                const volatility = Math.sqrt(yValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / n) / avgValue;
                
                // 3. Proyección inteligente basada en tendencia real
                const nextPeriod = n + 1 + index;
                let projectedValue = slope * nextPeriod + intercept;
                
                // 4. Aplicar factor estacional inteligente basado en volatilidad histórica
                const seasonalFactor = 1 + (Math.sin((index + 6) * Math.PI / 6) * Math.min(volatility, 0.15));
                
                // 5. Promedio móvil ponderado DINÁMICO (adaptable a cualquier cantidad de meses)
                const numMonths = historicalValues.length;
                const weights = Array.from({length: numMonths}, (_, i) => (i + 1) / ((numMonths * (numMonths + 1)) / 2));
                const weightedAvg = historicalValues.reduce((sum, val, i) => sum + val * weights[i], 0);
                
                // 6. Combinar tendencia + promedio ponderado
                projectedValue = (projectedValue * 0.6) + (weightedAvg * 0.4);
                
                // 7. Aplicar factor estacional
                projectedValue *= seasonalFactor;
                
                // 8. Limitar cambios extremos (máximo 25% vs último valor)
                const lastValue = historicalValues[historicalValues.length - 1];
                const maxChange = Math.abs(lastValue) * 0.25;
                const change = projectedValue - lastValue;
                
                if (Math.abs(change) > maxChange) {
                  projectedValue = lastValue + (change > 0 ? maxChange : -maxChange);
                }
                
                updatedRow[month] = Math.round(Math.max(0, projectedValue));
                
              } else if (historicalValues.length === 1) {
                // Solo un valor histórico: usar con crecimiento mínimo
                const singleValue = historicalValues[0];
                const minGrowth = 1 + (index * 0.02); // 2% mensual conservador
                updatedRow[month] = Math.round(singleValue * minGrowth);
                
              } else {
                // Sin datos históricos
                updatedRow[month] = 0;
              }
            });
          } else {
            // Si no hay datos, poner 0
            monthsToProject.forEach(month => {
              updatedRow[month] = 0;
            });
          }
          
          return updatedRow;
        });
        
        // También actualizar monthly para meses proyectados DINÁMICAMENTE
        const allMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        // Detectar automáticamente qué meses ya existen
        const existingMonthsInData = allMonths.filter(month => 
          dataToEnhance.monthly && dataToEnhance.monthly[month.toLowerCase()]
        );
        
        // Solo crear meses que no existen
        allMonths.forEach(month => {
          const monthLower = month.toLowerCase();
          if (!dataToEnhance.monthly[monthLower]) {
            dataToEnhance.monthly[monthLower] = {
              ingresos: 0,
              costoVentasTotal: 0,
              costoMateriaPrima: 0,
              costoProduccion: 0,
              utilidadBruta: 0,
              gastosOperativos: 0,
              ebitda: 0,
              depreciacion: 0,
              utilidadNeta: 0
            };
          }
        });
        }
      } else {
        // ProjectionEngine funcionó correctamente
        console.log('✅ ProjectionEngine avanzado ejecutado exitosamente');
      }
        
      // CRÍTICO: Usar datos del ProjectionEngine avanzado
      const finalData = enhancedWithProjections || dataToEnhance;
        
        // IMPORTANTE: Normalizar claves monthly a minúsculas
        const normalizedMonthly: Record<string, any> = {};
        Object.entries(finalData.monthly).forEach(([key, value]) => {
          normalizedMonthly[key.toLowerCase()] = value;
        });
        finalData.monthly = normalizedMonthly;
      
      // Debug: Verificar que se generaron proyecciones
      console.log('📊 ProjectionEngine completado:', {
        hasJulio: !!finalData.raw?.find(r => r['Julio'] !== undefined && r['Julio'] !== 0),
        hasAgosto: !!finalData.raw?.find(r => r['Agosto'] !== undefined && r['Agosto'] !== 0),
        monthlyKeys: finalData.monthly ? Object.keys(finalData.monthly) : [],
        sampleJulioIngresos: finalData.raw?.find(r => r['COD.'] === '4')?.['Julio'],
        sampleJulioCostos: finalData.raw?.find(r => r['COD.'] === '5')?.['Julio']
      });
      
      setEnhancedData(finalData);
      // Si hay patrones detectados y el usuario no ha decidido aún, activar resaltado por defecto en modo avanzado
      try {
        const patterns = (window as any).__projectionPatterns || {};
        if (projectionMode === 'advanced' && !userToggledPatterns && Object.keys(patterns).length > 0) {
          setShowPatternColors(true);
        }
      } catch {}
    }
  }, [financialData, enhancedData, projectionMode, projectWithMovingAverage, projectWithFlatMedian, mixedCosts, customClassifications, userToggledPatterns]);

  // Estructura jerárquica del PyG - GENERADA DINÁMICAMENTE DESDE RAW (mismo criterio que el módulo PyG)
  const [pygStructure, setPygStructure] = useState<PygRow[]>([]);

  const buildPygStructureFromRaw = useCallback((raw: any[]): PygRow[] => {
    type Node = { code: string; name: string; children: Set<string> };
    const nodes = new Map<string, Node>();

    const getParent = (code: string): string | null => {
      const i = code.lastIndexOf('.');
      return i > -1 ? code.substring(0, i) : null;
    };
    const sortCodes = (a: string, b: string) => {
      const ap = a.split('.').map(x => parseInt(x) || 0);
      const bp = b.split('.').map(x => parseInt(x) || 0);
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        const av = ap[i] ?? 0; const bv = bp[i] ?? 0;
        if (av !== bv) return av - bv;
      }
      return 0;
    };

    // Crear nodos por cada código presente en RAW
    raw.forEach(r => {
      const code = (r['COD.'] || '').toString();
      const name = r['CUENTA'] || code;
      if (!code) return;
      if (!nodes.has(code)) nodes.set(code, { code, name, children: new Set() });
      // Asegurar padre
      let p = getParent(code);
      if (p) {
        if (!nodes.has(p)) nodes.set(p, { code: p, name: p, children: new Set() });
        nodes.get(p)!.children.add(code);
      }
    });

    // Incluir raíces 4 y 5 si existen
    ['4', '5'].forEach(root => {
      if (!nodes.has(root)) {
        // Si no existe en RAW, intentamos crear si hay códigos hijos
        const hasChild = Array.from(nodes.keys()).some(c => c !== root && c.startsWith(root + '.'));
        if (hasChild) nodes.set(root, { code: root, name: root === '4' ? 'Ingresos' : 'Costos y Gastos', children: new Set() });
      }
    });

    // Rellenar relaciones padre→hijos para raíces implícitas
    Array.from(nodes.keys()).forEach(code => {
      const p = getParent(code);
      if (p && nodes.has(p)) nodes.get(p)!.children.add(code);
    });

    // Convertir a lista plana en pre-orden con nivel
    const result: PygRow[] = [];
    const visit = (code: string, level: number) => {
      const node = nodes.get(code);
      if (!node) return;
      const children = Array.from(node.children).sort(sortCodes);
      result.push({ code, name: node.name, level, isParent: children.length > 0, children });
      children.forEach(child => visit(child, level + 1));
    };

    // Empezar por 4 y 5 en orden
    ['4', '5'].forEach(root => {
      if (nodes.has(root)) visit(root, 0);
    });
    // Agregar órfanos (si los hay)
    Array.from(nodes.keys()).sort(sortCodes).forEach(code => {
      if (!result.find(r => r.code === code)) visit(code, 0);
    });

    return result;
  }, []);

  useEffect(() => {
    if (workingData?.raw && Array.isArray(workingData.raw)) {
      const structure = buildPygStructureFromRaw(workingData.raw);
      setPygStructure(structure);
      // Limpiar cache de celdas al cambiar RAW
      try { cellCacheRef.current.clear(); } catch {}
    }
  }, [workingData?.raw, buildPygStructureFromRaw]);

  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const shouldShowRow = (row: PygRow): boolean => {
    // Siempre mostrar filas de nivel 0 y calculadas
    if (row.level === 0 || row.isCalculated) return true;
    
    // Para otros niveles, verificar si el padre está expandido
    const parentCode = getParentCode(row.code);
    if (!parentCode) return true;
    
    return expandedNodes[parentCode] === true;
  };

  // Obtener patrón detectado para una cuenta (si existe)
  const getDetectedPattern = useCallback((code: string): string | null => {
    try {
      const patterns = (window as any).__projectionPatterns || {};
      const p = patterns[code];
      if (!p) return null;
      if (p.type === 'variable') return `variable · ratio≈${(p.ratio || 0).toFixed(3)}`;
      if (p.type === 'mixed') return `mixto · a≈${Math.round(p.a || 0)} · b≈${(p.b || 0).toFixed(3)} · R²≈${(p.r2 || 0).toFixed(2)}`;
      if (p.type === 'fixed') return `fijo · mediana base`;
      if (p.type === 'step') return `escalonado · mediana base`;
      return null;
    } catch { return null; }
  }, []);

  const getParentCode = (code: string): string | null => {
    const parts = code.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  };

  // Obtener hijos inmediatos (código y nombre) desde la estructura dinámica
  const getChildrenFor = useCallback((code: string): { code: string; name: string }[] => {
    try {
      const node = pygStructure.find(r => r.code === code);
      if (!node || !node.children || node.children.length === 0) return [];
      const items = node.children
        .map(c => {
          const child = pygStructure.find(r => r.code === c);
          return child ? { code: child.code, name: child.name } : { code: c, name: c };
        });
      return items;
    } catch {
      return [];
    }
  }, [pygStructure]);


  
  
  // (moved up) availableMonths defined earlier
  
  // CALCULAR PyG SOLO DESPUÉS de que ProjectionEngine complete los datos
  useEffect(() => {
    const calculatePygData = async () => {
      if (!workingData || !availableMonths.length) {
        console.log('🔍 DEBUG: Missing data', { hasWorkingData: !!workingData, monthsLength: availableMonths.length });
        return;
      }
      
      // ESPERAR a que ProjectionEngine termine (solo si hay enhancedData o no hay financialData.monthly)
      if (financialData?.monthly && !enhancedData) {
        console.log('⏳ Esperando ProjectionEngine...');
        return;
      }
      
      try {
        // USAR LA MISMA LÓGICA QUE PygContainer.tsx
        const availableKeys = Object.keys(workingData.monthly);
        
        // Debug: Ver qué meses están disponibles y con qué datos
        console.log('🔍 DEBUG: Available months in workingData:', availableKeys);
        if (workingData.raw && workingData.raw.length > 0) {
          const sampleRow = workingData.raw[0];
          console.log('🔍 DEBUG: Sample raw row columns:', Object.keys(sampleRow));
          console.log('🔍 DEBUG: Sample values for each month:', 
            availableKeys.map(month => ({
              month,
              sampleValue: sampleRow[month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()]
            }))
          );
        }
        
        // FUNCIÓN SIMPLIFICADA COMO PygContainer.tsx - SOLO maneja conversiones necesarias
        const convertPeriodForCalculation = (periodo: string): string => {
          if (!workingData?.monthly) return periodo;
          
          // Si ya existe el período tal como está, usarlo directamente
          if (workingData.monthly[periodo]) {
            return periodo;
          }
          
          // Mapa de conversión para capitalización
          const monthsMapReverse: Record<string, string> = {
            'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
            'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
            'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
          };
          
          // Si el período es minúscula, intentar capitalizar
          const periodLower = periodo.toLowerCase();
          if (monthsMapReverse[periodLower]) {
            const capitalized = monthsMapReverse[periodLower];
            if (workingData.monthly[capitalized]) {
              console.log('🔧 Balance Interno - Converting case:', { from: periodo, to: capitalized });
              return capitalized;
            }
          }
          
          // Si es capitalizado, intentar minúscula
          const periodCapitalized = periodo.charAt(0).toUpperCase() + periodo.slice(1).toLowerCase();
          const periodMinuscule = periodo.toLowerCase();
          
          if (workingData.monthly[periodMinuscule]) {
            console.log('🔧 Balance Interno - Converting to lowercase:', { from: periodo, to: periodMinuscule });
            return periodMinuscule;
          }
          
          // Devolver tal como está si no necesita conversión
          return periodo;
        };
        
        // USAR LA MISMA LÓGICA QUE PygContainer.tsx (YA FUNCIONA)
        // Buscar el mes con datos más recientes
        let rawPeriod = null;
        
        // Priorizar junio si tiene datos (según los logs anteriores)
        if (availableKeys.includes('junio') || availableKeys.includes('Junio')) {
          rawPeriod = availableKeys.find(k => k.toLowerCase() === 'junio') || 'junio';
          console.log('✅ Usando junio con datos confirmados:', rawPeriod);
        } else {
          // Si no está junio, buscar el último mes con datos reales
          const sortedKeys = [...availableKeys].sort();
          for (let i = sortedKeys.length - 1; i >= 0; i--) {
            const key = sortedKeys[i];
            const monthData = workingData.monthly[key];
            
            // Verificar si tiene datos en raw
            if (workingData.raw && workingData.raw.length > 0) {
              const hasData = workingData.raw.some(row => {
                const monthKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                return row[monthKey] && parseFloat(row[monthKey] as string) !== 0;
              });
              
              if (hasData) {
                rawPeriod = key;
                console.log('✅ Encontrado mes con datos:', key);
                break;
              }
            }
          }
        }
        
        // Si no hay meses con datos, usar junio por defecto
        if (!rawPeriod) {
          rawPeriod = 'junio';
          console.log('⚠️ Usando junio por defecto');
        }
        
        // Validar que encontramos un período válido  
        if (!rawPeriod) {
          console.error('❌ No se pudo encontrar ningún período válido para calcular PyG');
          return;
        }
        
        // CRÍTICO: calculatePnl SIEMPRE espera el mes en formato CAPITALIZADO para buscar en raw data
        // Necesitamos convertir a formato capitalizado independientemente del formato de monthly
        const monthsMapToCapitalized: Record<string, string> = {
          'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
          'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
          'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
        };
        
        const periodForCalculation = monthsMapToCapitalized[rawPeriod.toLowerCase()] || rawPeriod;
        
        // DEBUG CRÍTICO: Verificar qué formato va a usar calculatePnl
        console.log('🔍 CRÍTICO - Verificando formato para calculatePnl:', {
          rawPeriod,
          periodForCalculation,
          rawDataHasCapitalized: workingData.raw?.[0]?.[periodForCalculation],
          monthlyHasPeriod: !!workingData.monthly?.[rawPeriod] // monthly puede usar lowercase
        });
        
        console.log('✅ USANDO LÓGICA DE PygContainer:', { 
          raw: rawPeriod, 
          converted: periodForCalculation,
          exists: !!workingData.monthly[periodForCalculation]
        });
        
        // USAR EXACTAMENTE LA MISMA LLAMADA QUE PygContainer.tsx con período en lowercase
        const result = await calculatePnl(
          workingData,
          rawPeriod, // USAR LOWERCASE como PygContainer
          'contable',
          undefined, // mixedCosts como PygContainer  
          1 // company_id por defecto como PygContainer
        );
        
        console.log('🔍 DEBUG: PyG calculation result:', {
          period: periodForCalculation,
          treeDataLength: result.treeData.length,
          summaryKpis: result.summaryKpis,
          treeDataDetailed: result.treeData.map(node => ({
            code: node.code,
            name: node.name,
            value: node.value,
            childrenCount: node.children ? node.children.length : 0
          })),
          // Debug específico para los nodos principales
          node4Value: result.treeData.find(n => n.code === '4')?.value,
          node5Value: result.treeData.find(n => n.code === '5')?.value
        });
        
        console.log('✅ BALANCE INTERNO: Calling calculatePnl with:', periodForCalculation);
        
        // Asegurarnos de que tenemos datos antes de actualizar
        if (result.treeData && result.treeData.length > 0) {
          setPygTreeData(result.treeData);
          console.log('✅ PyG Tree Data actualizado con', result.treeData.length, 'nodos principales');
        } else {
          console.error('❌ No se obtuvieron datos del árbol PyG');
        }
      } catch (error) {
        console.error('⚠️ Error calculating PyG:', error);
      }
    };
    
    calculatePygData();
    
    // Calcular las 3 utilidades después de los datos principales
    if (workingData && availableMonths.length > 0) {
      calculateUtilities(workingData, availableMonths);
    }
  }, [workingData, availableMonths, enhancedData, calculateUtilities]);
  
  // Cache para búsquedas en el árbol (evitar logs excesivos)
  const nodeCache = useMemo(() => {
    const cache = new Map<string, any>();
    
    const cacheNodes = (nodes: any[]) => {
      nodes.forEach(node => {
        // Asegurarnos de que el código está correctamente formateado
        const code = node.code ? node.code.toString() : '';
        if (code) {
          cache.set(code, node);
          // También cachear variaciones del código (por si acaso)
          if (code.includes('.')) {
            cache.set(code.replace(/\./g, '_'), node); // 4.1 -> 4_1
          }
        }
        
        if (node.children && node.children.length > 0) {
          cacheNodes(node.children);
        }
      });
    };
    
    if (pygTreeData && pygTreeData.length > 0) {
      cacheNodes(pygTreeData);
      console.log(`📊 NodeCache populated with ${cache.size} nodes from PyG tree`);
      
      // Log algunos ejemplos para debug
      const sampleCodes = Array.from(cache.keys()).slice(0, 10);
      console.log('📊 Sample cached codes:', sampleCodes);
    }
    
    return cache;
  }, [pygTreeData]);
  
  // Obtener valor de cuenta: preferir jerarquía visible (estructura) para que los totales coincidan con lo mostrado
  const getAccountValueForRow = (code: string, _monthData: MonthlyData, month: string): number => {
    if (!workingData?.raw) return 0;
    const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const rows = workingData.raw;
    const codes = rows.map(r => (r['COD.'] || '').toString());
    const cacheKey = `${code}|${monthKey}`;
    if (cellCacheRef.current.has(cacheKey)) return cellCacheRef.current.get(cacheKey)!;
    const rowInStructure = pygStructure.find(r => r.code === code);

    // Helper recursivo con memo por código para esta llamada (evita recomputar hijos repetidos)
    const memo = new Map<string, number>();
    const computeByStructure = (c: string): number => {
      if (memo.has(c)) return memo.get(c)!;
      const struct = pygStructure.find(r => r.code === c);
      if (struct && struct.children && struct.children.length > 0) {
        const total = struct.children.reduce((acc, child) => acc + computeByStructure(child), 0);
        memo.set(c, total);
        return total;
      }
      // Si no hay hijos definidos en estructura, caer a dinámica por RAW
      const hasChildrenRaw = codes.some(x => x !== c && x.startsWith(c + '.'));
      if (!hasChildrenRaw) {
        const rawRow = rows.find(r => (r['COD.'] || '').toString() === c);
        const v = rawRow ? parseNumericValue((rawRow as any)[monthKey] || '0') : 0;
        memo.set(c, isNaN(v) ? 0 : v);
        return isNaN(v) ? 0 : v;
      }
      // Si tiene hijos en RAW pero no en estructura, sumar hojas RAW
      const isLeafRaw = (cx: string) => !codes.some(other => other !== cx && other.startsWith(cx + '.'));
      const sum = rows.reduce((acc, r) => {
        const rc = (r['COD.'] || '').toString();
        if (rc.startsWith(c + '.') && isLeafRaw(rc)) {
          const val = parseNumericValue((r as any)[monthKey] || '0');
          return acc + (isNaN(val) ? 0 : val);
        }
        return acc;
      }, 0);
      memo.set(c, sum);
      return sum;
    };

    const val = computeByStructure(code);
    cellCacheRef.current.set(cacheKey, val);
    return val;
  };

  // Tipo de patrón (para colores)
  const getPatternType = useCallback((code: string): string | null => {
    try {
      const patterns = (window as any).__projectionPatterns || {};
      return patterns[code]?.type || null;
    } catch { return null; }
  }, []);

  const getPatternClass = useCallback((code: string): string => {
    if (!showPatternColors) return '';
    const t = getPatternType(code);
    switch (t) {
      case 'variable':
        return 'bg-emerald-500/5';
      case 'mixed':
        return 'bg-amber-500/5';
      case 'fixed':
        return 'bg-sky-500/5';
      case 'step':
        return 'bg-violet-500/5';
      default:
        return '';
    }
  }, [getPatternType, showPatternColors]);

  const handleSave = async (month: string, row: PygRow, newValue: number) => {
    console.log(`💾 handleSave LLAMADO: ${row.code} ${month} = ${newValue} (isParent: ${row.isParent})`);
    
    if (!workingData) {
      console.log('⚠️ handleSave: No hay workingData');
      return;
    }
    
    if (row.isCalculated) {
      console.log('⚠️ handleSave: Cuenta calculada, no editable');
      return;
    }
    
    if (row.isParent) {
      console.log('⚠️ handleSave: Cuenta padre, no editable');
      return;
    }

    try {
      const updatedData: FinancialData = JSON.parse(JSON.stringify(workingData));
      
      // 1. Actualizar valor en raw data si existe
      if (updatedData.raw) {
        const rawRowIndex = updatedData.raw.findIndex(r => r['COD.'] === row.code);
        if (rawRowIndex >= 0) {
          // Capitalizar mes para raw data (que usa columnas capitalizadas)
          const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
          const oldValue = updatedData.raw[rawRowIndex][monthKey];
          updatedData.raw[rawRowIndex] = {
            ...updatedData.raw[rawRowIndex],
            [monthKey]: newValue
          };
          console.log(`💾 EDICIÓN: ${row.code} ${month} ${oldValue} → ${newValue}`);
        }
      }

      // 2. CRÍTICO: Reconstruir árbol PyG para recalcular jerarquía
      console.log('🔄 Reconstruyendo árbol PyG tras edición...');
      const updatedPygData = await calculatePnl(updatedData, month.toLowerCase(), 'contable');
      
      // 3. Actualizar datos en memoria
      setEnhancedData(updatedData);
      
      // 4. Forzar actualización del árbol PyG
      setPygTreeData(updatedPygData.treeData);
      
      // 5. IMPORTANTE: Recalcular utilidades después de actualizar datos  
      console.log('📊 Recalculando utilidades después de edición...');
      setTimeout(() => {
        calculateUtilities(updatedData, availableMonths);
      }, 100);
      
    } catch (error) {
      console.error('Error saving matrix cell:', error);
      throw error;
    }
  };

  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workingData || !workingData.monthly) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No hay datos de escenario
        </h3>
        <div className="text-xs text-text-muted mt-4">
          Debug: hasWorkingData: {!!workingData ? 'Sí' : 'No'}, 
          hasMonthly: {!!workingData?.monthly ? 'Sí' : 'No'},
          hasRaw: {!!workingData?.raw ? 'Sí' : 'No'}
        </div>
      </div>
    );
  }

  const months = availableMonths;

  return (
    <div className="space-y-6" aria-busy={isRecalculating}>
      {/* Header con tipo de análisis */}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-display text-primary flex items-center space-x-3">
              <Calculator className="w-8 h-8" />
              <span>Estado de Resultados - Matriz Editable</span>
            </h2>
            <p className="text-text-secondary mt-2">
              Balance Interno - Matriz con UB, UN y EBITDA
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Botones principales al inicio para mejor visibilidad */}
            <button
              onClick={applyPendingEdits}
              disabled={isRecalculating || Object.keys(pendingEdits).length === 0}
              className={`px-3 py-2 rounded-lg text-xs transition-all border flex items-center gap-2 ${Object.keys(pendingEdits).length === 0 || isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : 'bg-accent/20 text-accent border-accent/30 hover:bg-accent/30'}`}
              title="Aplica las ediciones y recalcula toda la matriz"
            >
              {isRecalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recalculando…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{`Recalcular (${Object.keys(pendingEdits).length})`}</span>
                </>
              )}
            </button>

            <button
              onClick={discardPendingEdits}
              disabled={isRecalculating || Object.keys(pendingEdits).length === 0}
              className={`px-3 py-2 rounded-lg text-xs transition-all border ${isRecalculating || Object.keys(pendingEdits).length === 0 ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20'}`}
              title="Descarta todas las ediciones pendientes"
            >
              Descartar
            </button>
            {/* Resumen comparativo de algoritmos (jul–dic) */}
            <div className="px-3 py-2 rounded-lg border bg-glass/50 border-border/40 text-xs mr-2 hidden xl:block">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-text-secondary">Resumen jul–dic</div>
              </div>
              {isSummaryLoading ? (
                <div className="text-text-muted">Calculando…</div>
              ) : (
                <>
                  {(() => {
                    const modes = ['advanced','movingAvg','flatMedian'] as const;
                    const best = modes.reduce((acc, m) => {
                      const val = algoSummary[m]?.ebitdaAvg || 0;
                      return val > (algoSummary[acc]?.ebitdaAvg || 0) ? m : acc;
                    }, 'advanced' as 'advanced'|'movingAvg'|'flatMedian');
                    const bestVal = Math.round(algoSummary[best]?.ebitdaAvg || 0);
                    const activeVal = Math.round(algoSummary[projectionMode]?.ebitdaAvg || 0);
                    const delta = bestVal - activeVal;
                    return (
                      <div className="grid grid-cols-3 gap-3 min-w-[420px] items-start">
                        {modes.map((mode) => {
                          const s = algoSummary[mode];
                          const isActive = projectionMode === mode;
                          const isBest = best === mode;
                          const label = mode === 'advanced' ? 'Avanzado' : mode === 'movingAvg' ? 'Prom. móvil' : 'Mediana';
                          return (
                            <div key={mode} className={`p-2 rounded border ${isActive ? 'border-accent/50 bg-accent/10' : 'border-border/30'}`}>
                              <div className="flex items-center justify-between">
                                <div className={`font-semibold ${isActive ? 'text-accent' : 'text-text-secondary'}`}>{label}</div>
                                {isBest && (() => {
                                  const eAdv = formatCurrency(Math.round(algoSummary['advanced']?.ebitdaAvg || 0));
                                  const eMov = formatCurrency(Math.round(algoSummary['movingAvg']?.ebitdaAvg || 0));
                                  const eMed = formatCurrency(Math.round(algoSummary['flatMedian']?.ebitdaAvg || 0));
                                  const tooltipText = `Seleccionado por mayor EBITDA promedio jul–dic.\nAvanzado: ${eAdv} · Prom. móvil: ${eMov} · Mediana: ${eMed}`;
                                  return (
                                    <span
                                      className="text-[10px] px-2 py-[2px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      title={tooltipText}
                                    >
                                      Mejor
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between"><span className="text-text-muted">UB avg:</span><span className="font-semibold">{formatCurrency(Math.round(s?.ubAvg || 0))}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">UN avg:</span><span className="font-semibold">{formatCurrency(Math.round(s?.unAvg || 0))}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">EBITDA avg:</span><span className="font-semibold">{formatCurrency(Math.round(s?.ebitdaAvg || 0))}</span></div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Delta vs activo */}
                        {delta !== 0 && (
                          <div className="col-span-3 text-right text-[11px] text-text-muted">
                            <span className="px-2 py-[2px] rounded bg-glass/40 border border-border/40" title="Diferencia del EBITDA promedio entre el mejor algoritmo y el activo">
                              {delta > 0 ? `+${formatCurrency(delta)} vs activo` : `${formatCurrency(delta)} vs activo`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-2 text-right text-[11px] text-text-muted">
                    {(() => {
                      const label = projectionMode === 'advanced' ? 'Avanzado' : projectionMode === 'movingAvg' ? 'Prom. móvil' : 'Mediana';
                      return `Fuente: proyecciones actuales (${label})`;
                    })()}
                  </div>
                </>
              )}
            </div>
            {/* Selector de algoritmo de proyección */}
            <div className="flex items-center gap-2 mr-2" title="Algoritmo de proyección para meses faltantes">
              <button
                onClick={() => { setProjectionMode('advanced'); setEnhancedData(null); }}
                disabled={isRecalculating}
                className={`px-2 py-1 rounded border text-xs ${isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : (projectionMode === 'advanced' ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-glass/50 border-border/40 text-text-secondary hover:bg-glass/70')}`}
              >Avanzado</button>
              <button
                onClick={() => { setProjectionMode('movingAvg'); setEnhancedData(null); }}
                disabled={isRecalculating}
                className={`px-2 py-1 rounded border text-xs ${isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : (projectionMode === 'movingAvg' ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-glass/50 border-border/40 text-text-secondary hover:bg-glass/70')}`}
              >Prom. móvil</button>
              <button
                onClick={() => { setProjectionMode('flatMedian'); setEnhancedData(null); }}
                disabled={isRecalculating}
                className={`px-2 py-1 rounded border text-xs ${isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : (projectionMode === 'flatMedian' ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-glass/50 border-border/40 text-text-secondary hover:bg-glass/70')}`}
              >Mediana</button>
            </div>
            {/* Botón Colapsar/Expandir Todo */}
            <button
              onClick={() => {
                const allCollapsed = Object.keys(expandedNodes).length === 0 || 
                  Object.values(expandedNodes).every(v => v === false);
                
                if (allCollapsed) {
                  // Expandir todos los nodos padre
                  const newExpanded: Record<string, boolean> = {};
                  pygStructure.forEach(row => {
                    if (row.isParent) {
                      newExpanded[row.code] = true;
                    }
                  });
                  setExpandedNodes(newExpanded);
                } else {
                  // Colapsar todo
                  setExpandedNodes({});
                }
              }}
              disabled={isRecalculating}
              className={`px-4 py-2 border rounded-lg text-sm transition-all flex items-center space-x-2 ${isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : 'bg-glass/50 hover:bg-glass/70 border-primary/30 text-primary'}`}
            >
              {Object.keys(expandedNodes).length === 0 || 
               Object.values(expandedNodes).every(v => v === false) ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Expandir Todo</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span>Colapsar Todo</span>
                </>
              )}
            </button>
            
            {/* Indicador de Proyecciones */}
            {enhancedData && (
              <div className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-xs text-accent">Proyecciones IA Activas</span>
                </div>
              </div>
            )}

            {/* Toggle para resaltar patrones */}
            <button
              onClick={() => { setShowPatternColors(v => !v); setUserToggledPatterns(true); }}
              disabled={isRecalculating}
              className={`px-3 py-2 rounded-lg border text-xs transition-all ${isRecalculating ? 'bg-glass/30 text-text-muted border-border/30 cursor-not-allowed' : (showPatternColors ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-glass/50 border-border/40 text-text-secondary hover:bg-glass/70')}`}
              title="Resaltar filas por patrón detectado (variable/mixto/fijo/escalonado)"
            >
              {showPatternColors ? 'Patrones: ON' : 'Patrones: OFF'}
            </button>

            {/* Botón forzar recálculo eliminado: recálculo estándar es suficiente */}
          </div>
        </div>
      </div>

      {/* Toasts locales */}
      <ToastContainer errors={errors} onClose={removeError} />

      {/* Descripción de la matriz */}
      <div className="glass-card p-4 bg-primary/10 border border-primary/30">
        <div className="text-sm text-primary">
          <strong>Matriz de Utilidades:</strong> Las últimas 3 filas muestran UB (Utilidad Bruta/Contable), 
          UN (Utilidad Neta/EBIT) y EBITDA con sus respectivos cálculos y exclusiones.
        </div>
      </div>

      {/* Matriz editable jerárquica */}
      <div className={`glass-card p-4 relative ${isRecalculating ? 'overflow-hidden' : 'overflow-x-auto'}`} role="region" aria-label="Matriz editable PyG">
        <table className="w-full text-sm table-fixed">
          <thead className="text-xs text-text-muted uppercase border-b border-border sticky top-0 bg-dark-bg/80 backdrop-blur z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-80">Cuenta</th>
              {months.map((month, idx) => {
                const isProjectedCol = idx > 5; // jul-dic
                return (
                  <th
                    key={month}
                    className={`px-4 py-3 text-right font-medium min-w-32 cursor-pointer ${hoveredCol === month ? 'bg-primary/10' : ''} ${isProjectedCol ? 'bg-accent/10' : ''}`}
                    onMouseEnter={() => setHoveredCol(month)}
                    onMouseLeave={() => setHoveredCol(null)}
                    title={`Columna: ${month}${isProjectedCol ? ' · Proyectado' : ''}`}
                  >
                    {month}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {pygStructure.filter(shouldShowRow).map(row => {
              const isExcluded = false; // Sin exclusiones en filas normales
              
              return (
                <tr 
                  key={row.code} 
                  onMouseEnter={() => setHoveredRow(row.code)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`transition-colors group ${
                    row.isCalculated ? 'bg-primary/5 font-semibold' : ''
                  } ${isExcluded ? 'opacity-50' : ''}`}
                >
              <td className={`px-4 py-3 border-r border-border/20 ${getPatternClass(row.code)} ${hoveredRow === row.code ? 'bg-primary/10' : ''}`}>
                <div 
                  className="flex items-center"
                  style={{ paddingLeft: `${row.level * 24}px` }}
                >
                  {row.isParent && (
                    <button
                      onClick={() => toggleNode(row.code)}
                      className="mr-2 text-text-muted hover:text-white"
                    >
                      {expandedNodes[row.code] === false ? 
                        <ChevronRight className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                  )}
                  <span className={`
                    ${row.level === 0 ? 'font-bold text-white' : ''}
                    ${row.isCalculated ? 'text-primary font-bold' : ''}
                    ${isExcluded ? 'line-through' : ''}
                  `}>
                    {row.code} - {row.name}
                  </span>
                  {row.isParent && (
                    <span className="relative ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenChildrenFor(prev => prev === row.code ? null : row.code); }}
                        className="text-[11px] px-2 py-[2px] rounded-full bg-glass/40 border border-border/40 text-text-muted hover:text-white"
                        title="Esta cuenta tiene subcuentas; edita las hojas"
                      >
                        🔒 No editable
                      </button>
                      {openChildrenFor === row.code && (
                        <div
                          className="absolute z-20 mt-2 w-80 p-3 rounded-lg bg-dark-bg border border-border/40 shadow-xl"
                          onMouseLeave={() => setOpenChildrenFor(null)}
                        >
                          <div className="text-[11px] text-text-muted mb-2">Subcuentas inmediatas</div>
                          <div className="max-h-48 overflow-auto space-y-1 pr-1">
                            {(() => {
                              const items = getChildrenFor(row.code);
                              const max = 12;
                              return (
                                <>
                                  {items.slice(0, max).map(child => (
                                    <div key={child.code} className="text-xs flex items-center justify-between">
                                      <span className="text-text-secondary truncate mr-2" title={`${child.code} - ${child.name}`}>{child.code} - {child.name}</span>
                                      <span className="text-text-muted">→ editar</span>
                                    </div>
                                  ))}
                                  {items.length > max && (
                                    <div className="text-[11px] text-text-muted">… y {items.length - max} más</div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="mt-3 text-right">
                            <button
                              onClick={() => setOpenChildrenFor(null)}
                              className="text-[11px] px-2 py-1 rounded border border-border/40 text-text-muted hover:text-white hover:bg-glass/40"
                            >
                              Cerrar
                            </button>
                          </div>
                        </div>
                      )}
                    </span>
                  )}
                  {!row.isParent && getDetectedPattern(row.code) && (
                    <span
                      className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-glass/40 border border-border/40 text-text-muted"
                      title={getDetectedPattern(row.code) || 'Sin patrón detectado'}
                    >
                      {getDetectedPattern(row.code)!}
                    </span>
                  )}
                </div>
              </td>
                  {months.map(month => {
                    const monthData = workingData.monthly[month];
                    const value = row.formula ? 
                      row.formula(monthData, month, (code) => getAccountValueForRow(code, monthData, month)) : 
                      getAccountValueForRow(row.code, monthData, month);
                    const isRowHover = hoveredRow === row.code;
                    const isColHover = hoveredCol === month;
                    const isIntersect = isRowHover && isColHover;
                    const isEdited = pendingEdits.hasOwnProperty(`${row.code}|${month}`);
                    
                    if (row.isCalculated || isExcluded) {
                      return (
                        <td key={`${month}-${row.code}`} className={`px-4 py-3 text-right border-r border-border/10 ${isColHover ? 'bg-primary/10' : ''}`}>
                          <span className={`
                            ${row.isCalculated ? 'text-primary font-semibold' : ''}
                            ${isExcluded ? 'line-through text-text-muted' : ''}
                          `}>
                            {formatCurrency(value)}
                          </span>
                        </td>
                      );
                    }
                    
                    // Detectar si es un mes proyectado (después de junio o con valor 0 en datos originales)
                    const monthIndex = months.indexOf(month);
                    const isProjected = monthIndex > 5 || (value === 0 && monthIndex >= 0);
                    
                    return (
                      <td
                        key={`${month}-${row.code}`}
                        className={`px-2 py-2 relative border-r border-border/10 ${isIntersect ? 'bg-accent/10 ring-1 ring-accent/30' : isColHover || isRowHover ? 'bg-primary/5' : ''} ${isEdited ? 'bg-yellow-500/15' : ''}`}
                        onMouseEnter={() => { setHoveredRow(row.code); setHoveredCol(month); }}
                      >
                        <EditableCell
                          initialValue={value}
                          onEdit={(newValue) => queueEdit(month, row, newValue)}
                          autoSave={false}
                          isReadOnly={row.isParent}
                          className={`group-hover:bg-glass/30 border border-border/20 rounded ${
                            row.isParent ? 'bg-primary/5' : ''
                          } ${isProjected ? 'bg-accent/5 border-accent/20' : ''}`}
                        />
                        {/* Indicador de proyección IA */}
                        {isProjected && value !== 0 && (
                          <div className="absolute top-0 right-0 mt-1 mr-1">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" 
                                 title="Valor proyectado por IA" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            
            {/* Separador */}
            <tr className="bg-border/20">
              <td colSpan={14} className="px-4 py-1">
                <div className="w-full h-px bg-primary/30"></div>
              </td>
            </tr>
            
            {/* 3 UTILIDADES FINALES - CORREGIR ALINEACIÓN */}
            {Object.keys(utilityCalculations).map((utilityType, index) => {
              const colors = [
                { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
                { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
                { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' }
              ];
              const color = colors[index];
              
              return (
                <tr key={utilityType} className={`${color.bg} font-bold border-t ${index === 0 ? 'border-t-2' : ''} ${color.border}`}>
                  <td className={`px-4 py-3 ${color.text}`} colSpan={1}>
                    {utilityType} {/* Usar una sola columna para el nombre completo */}
                  </td>
                  {months.map(month => (
                    <td key={`${utilityType}-${month}`} className={`px-2 py-3 text-right ${color.text} font-semibold`}>
                      {formatCurrency(utilityCalculations[utilityType][month] || 0)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isRecalculating && (
          <div className="absolute inset-0 bg-dark-bg/50 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-glass/60">
              <RefreshCw className="w-5 h-5 animate-spin text-accent" />
              <div className="flex flex-col">
                <span className="text-sm text-text-secondary">Recalculando matriz…</span>
                <span className="text-xs text-text-muted">Esto puede tardar algunos segundos</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer inteligente */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Estado de la matriz */}
          <div className="text-center border-r border-border/30 lg:border-r">
            <h4 className="font-semibold text-primary mb-1">Estado</h4>
            <p className="text-text-muted text-xs">
              {isRecalculating ? 'Recalculando…' : 'Listo'} · Meses: {months.length} · Pendientes: {Object.keys(pendingEdits).length}
            </p>
          </div>

          {/* Proyección resumida */}
          <div className="text-center border-r border-border/30 lg:border-r hidden md:block">
            <h4 className="font-semibold text-primary mb-1">Proyección (jul–dic)</h4>
            <p className="text-text-muted text-xs">
              {(() => {
                const label = projectionMode === 'advanced' ? 'Avanzado' : projectionMode === 'movingAvg' ? 'Prom. móvil' : 'Mediana';
                const modes = ['advanced','movingAvg','flatMedian'] as const;
                const best = modes.reduce((acc, m) => {
                  const val = algoSummary[m]?.ebitdaAvg || 0;
                  return val > (algoSummary[acc]?.ebitdaAvg || 0) ? m : acc;
                }, 'advanced' as 'advanced'|'movingAvg'|'flatMedian');
                const bestVal = Math.round(algoSummary[best]?.ebitdaAvg || 0);
                const activeVal = Math.round(algoSummary[projectionMode]?.ebitdaAvg || 0);
                const delta = bestVal - activeVal;
                return `Algoritmo: ${label}${delta ? ` · Δ vs mejor: ${delta > 0 ? '+' : ''}${formatCurrency(delta)}` : ''}`;
              })()}
            </p>
          </div>

          {/* Edición y patrones */}
          <div className="text-center border-r border-border/30 lg:border-r">
            <h4 className="font-semibold text-primary mb-1">Edición</h4>
            <p className="text-text-muted text-xs">
              Hojas editables; nodos padres <span title="Esta cuenta tiene subcuentas; edita las hojas">🔒</span>. Patrones: {showPatternColors ? 'visibles' : 'ocultos'}.
            </p>
          </div>

          {/* Guardado */}
          <div className="text-center">
            <h4 className="font-semibold text-primary mb-1">Guardado</h4>
            <p className="text-text-muted text-xs">
              {lastSave.status === 'ok' && lastSave.at ? (
                <>Último guardado: {new Date(lastSave.at).toLocaleTimeString()}</>
              ) : lastSave.status === 'error' && lastSave.at ? (
                <>Error al guardar: {new Date(lastSave.at).toLocaleTimeString()}</>
              ) : (
                <>Sin guardados recientes</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditablePygMatrixV2;
