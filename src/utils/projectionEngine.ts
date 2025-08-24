import { FinancialData, MonthlyData, MixedCost, BreakEvenClassification } from '../types';
import { getSortedMonths } from './dateUtils';
import { TrendAnalysis } from './projectionEngine/TrendAnalysis';
import { SeasonalityDetector } from './projectionEngine/SeasonalityDetector';
import { CorrelationEngine } from './projectionEngine/CorrelationEngine';

interface ProjectionMetadata {
  isProjected: boolean;
  confidence: number; // 0-100
  method: string;
  basedOn: string[];
}

interface EnhancedMonthlyData extends MonthlyData {
  _metadata?: {
    [key in keyof MonthlyData]?: ProjectionMetadata;
  };
}

interface ProjectionAnalysis {
  trend: 'growing' | 'declining' | 'stable';
  seasonality: number[]; // 12 valores para cada mes
  volatility: number;
  avgGrowthRate: number;
  confidence: number;
}

export class ProjectionEngine {
  // ====== Estadística y clasificación de patrones por cuenta ======
  private static median(values: number[]): number {
    if (!values.length) return 0;
    const arr = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  private static mad(values: number[]): number {
    if (!values.length) return 0;
    const med = this.median(values);
    const deviations = values.map(v => Math.abs(v - med));
    return this.median(deviations);
  }

  private static removeOutliers(values: number[], factor: number = 3): number[] {
    if (values.length < 4) return values;
    const med = this.median(values);
    const mad = this.mad(values) || 1e-9;
    return values.filter(v => Math.abs(v - med) / mad <= factor);
  }

  private static corr(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const xs = x.slice(0, n);
    const ys = y.slice(0, n);
    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den > 0 ? num / den : 0;
  }

  private static olsNonNegative(x: number[], y: number[]): { a: number; b: number; r2: number } {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { a: Math.max(0, y[0] || 0), b: 0, r2: 0 };
    const xs = x.slice(0, n);
    const ys = y.slice(0, n);
    const sumX = xs.reduce((s, v) => s + v, 0);
    const sumY = ys.reduce((s, v) => s + v, 0);
    const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
    const sumXX = xs.reduce((s, v) => s + v * v, 0);
    let b = (n * sumXY - sumX * sumY) / Math.max(1e-9, (n * sumXX - sumX * sumX));
    let a = (sumY - b * sumX) / n;
    // Forzar a,b >= 0
    b = Math.max(0, b);
    a = Math.max(0, a);
    // R²
    const meanY = sumY / n;
    const ssTot = ys.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
    const ssRes = ys.reduce((acc, yi, i) => acc + Math.pow(yi - (a + b * xs[i]), 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    return { a, b, r2 };
  }

  private static cv(values: number[]): number {
    const arr = values.filter(v => v > 0);
    if (arr.length < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
    return mean > 0 ? Math.sqrt(variance) / mean : 0;
  }

  private static classifyCostPattern(values: number[], revenue: number[], accountCode?: string, accountName?: string): {
    type: 'fixed' | 'variable' | 'mixed' | 'step';
    ratio?: number; // para variable
    a?: number; b?: number; r2?: number; // para mixto
    baseline?: number; // para fijo/step
  } {
    const y = values.slice(0, 6).map(v => v || 0);
    const x = revenue.slice(0, 6).map(v => v || 0);
    const yPos = y.filter((_, i) => x[i] > 0);
    const xPos = x.filter(v => v > 0);
    const zeros = y.filter(v => v === 0).length / Math.max(1, y.length);
    // Detección simple de escalonado: muchos ceros y/o saltos grandes
    const jumps = y.slice(1).filter((v, i) => {
      const prev = y[i];
      return prev > 0 && Math.abs(v - prev) / Math.max(1, prev) > 0.8;
    }).length;
    if (zeros > 0.3 && jumps >= 1) {
      return { type: 'step', baseline: this.median(this.removeOutliers(y)) };
    }
    // Patrones semánticos de pagos/partidas extraordinarias
    if (accountName) {
      const name = accountName.toLowerCase();
      const keywords = [
        'décimo', 'decimo', 'bonific', 'honorario', 'amortiz', 'contribucion', 'contribución',
        'arriendo', 'vacaciones', 'aguinaldo', 'pago unico', 'pago \'unico\''
      ];
      if (keywords.some(k => name.includes(k))) {
        return { type: 'step', baseline: this.median(this.removeOutliers(y)) };
      }
    }
    // Correlación y razones
    const corr = this.corr(xPos, yPos);
    const ratios = yPos.map((v, i) => (xPos[i] > 0 ? v / xPos[i] : 0)).filter(r => isFinite(r) && r >= 0);
    const ratioMed = this.median(this.removeOutliers(ratios));
    const ratioCv = this.cv(ratios);
    const yCv = this.cv(y);
    // Heurísticas de clasificación
    const isLikelyVariable = corr >= 0.6 && ratioMed > 0 && ratioCv <= 0.35;
    const isLikelyFixed = corr <= 0.2 && yCv <= 0.2;
    // Regresión mixta
    const { a, b, r2 } = this.olsNonNegative(xPos, yPos);
    const isLikelyMixed = !isLikelyVariable && !isLikelyFixed && (b > 0 || a > 0);
    // Reglas por prefijo (prior conocimiento): 5.2 suele ser más fijo
    if (accountCode?.startsWith('5.2.') && isLikelyVariable && corr < 0.8) {
      // Elevar umbral para considerar variable en 5.2
      if (isLikelyMixed) return { type: 'mixed', a, b, r2 };
      return { type: 'fixed', baseline: this.median(this.removeOutliers(y.slice(3, 6).filter(v => v > 0)).concat(this.removeOutliers(y))) };
    }
    if (isLikelyVariable) return { type: 'variable', ratio: ratioMed };
    if (isLikelyFixed) return { type: 'fixed', baseline: this.median(this.removeOutliers(y.slice(3, 6).filter(v => v > 0)).concat(this.removeOutliers(y))) };
    if (isLikelyMixed) return { type: 'mixed', a, b, r2 };
    // Fallback
    return { type: 'fixed', baseline: this.median(this.removeOutliers(y)) };
  }
  // Parser robusto para números en formatos locales (1.234,56 | 1,234.56 | 1234)
  private static parseLocaleNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const raw = value.trim();
    if (!raw) return 0;

    // Patrón europeo: 1.234 o 1.234,56
    const euroPattern = /^\d{1,3}(\.\d{3})+(,\d+)?$/;
    // Patrón EEUU: 1,234 o 1,234.56
    const usPattern = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
    // Simple con decimal punto o coma: 1234.56 o 1234,56
    const simplePattern = /^\d+(?:[\.,]\d+)?$/;

    if (euroPattern.test(raw)) {
      // Quitar separadores de miles '.' y cambiar coma decimal a punto
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
    if (usPattern.test(raw)) {
      // Quitar separadores de miles ','
      const normalized = raw.replace(/,/g, '');
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
    if (simplePattern.test(raw)) {
      // Si contiene una coma y no un punto, tratar coma como decimal
      const normalized = raw.includes(',') && !raw.includes('.')
        ? raw.replace(',', '.')
        : raw;
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }

    // Fallback seguro
    const n = parseFloat(raw.replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  /**
   * Nueva función de proyección avanzada usando algoritmos de IA
   */
  static generateAdvancedProjections(
    financialData: FinancialData,
    targetYear: number,
    options?: {
      specificAccounts?: string[];
      mixedCosts?: MixedCost[];
      customClassifications?: Record<string, BreakEvenClassification>;
    }
  ): FinancialData {
    const enhanced: FinancialData = JSON.parse(JSON.stringify(financialData));
    
    if (!enhanced.monthly) {
      enhanced.monthly = {};
    }

    // Convertir datos mensuales a formato para análisis
    const monthlyDataByAccount: Record<string, number[]> = {};
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Extraer datos históricos para cada cuenta - SOLO MESES REALES (enero-junio)
    enhanced.raw?.forEach(row => {
      const accountKey = `${row['COD.']} - ${row['CUENTA']}`;
      if (!monthlyDataByAccount[accountKey]) {
        monthlyDataByAccount[accountKey] = new Array(12).fill(0);
      }

      // CRÍTICO: Solo extraer datos reales hasta junio (índices 0-5)
      const realMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio'];
      realMonths.forEach((month, idx) => {
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        const value = ProjectionEngine.parseLocaleNumber(row[capitalizedMonth]);
        if (!isNaN(value) && value !== 0) {
          monthlyDataByAccount[accountKey][idx] = value;
          console.log(`📊 ProjectionEngine: Datos reales ${month} para ${accountKey}: ${value}`);
        }
      });
    });

    // Aplicar algoritmos avanzados de proyección
    const accountsToProject = (options?.specificAccounts) || Object.keys(monthlyDataByAccount);

    const mixedCostMap = new Map<string, MixedCost>();
    (options?.mixedCosts || []).forEach(mc => mixedCostMap.set(mc.accountCode, mc));
    const customClasses = options?.customClassifications || {};

    // (Se recalcula más abajo usando SOLO hojas para evitar doble conteo)
    let revenueTotalsReal = new Array(12).fill(0);

    // CRÍTICO: Solo proyectar cuentas hoja (detalle), no cuentas padre
    const leafAccounts = accountsToProject.filter(account => {
      const accountCode = account.split(' - ')[0];
      // Es cuenta hoja si no hay otras cuentas que empiecen con su código + "."
      const isParent = accountsToProject.some(otherAccount => {
        const otherCode = otherAccount.split(' - ')[0];
        return otherCode !== accountCode && otherCode.startsWith(accountCode + '.');
      });
      return !isParent;
    });

    console.log(`🌿 ProjectionEngine: Proyectando solo cuentas hoja: ${leafAccounts.length} de ${accountsToProject.length} cuentas`);

    // Recalcular total de ingresos reales (ene-jun) usando SOLO hojas 4.* (evitar doble conteo)
    revenueTotalsReal = new Array(12).fill(0);
    const revenueLeafAccounts = leafAccounts.filter(a => a.split(' - ')[0].startsWith('4'));
    revenueLeafAccounts.forEach(account => {
      const vals = monthlyDataByAccount[account] || [];
      for (let i = 0; i < 6; i++) {
        const v = vals[i] || 0;
        if (v) revenueTotalsReal[i] += v;
      }
    });

    const monthsToProject = ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const projectedRevenueByMonth: Record<string, number> = Object.fromEntries(monthsToProject.map(m => [m, 0]));

    // 1.a Preparar mix histórico de ingresos por subcuenta (promedio de Abr-Jun)
    const revenueMixWeights: Record<string, number> = {};
    let weightSum = 0;
    for (const account of revenueLeafAccounts) {
      const vals = monthlyDataByAccount[account] || [];
      const shares: number[] = [];
      for (let i = 3; i < 6; i++) { // Abr-Jun
        const monthRevenueTotal = revenueTotalsReal[i] || 0;
        const v = vals[i] || 0;
        if (monthRevenueTotal > 0 && v > 0) {
          shares.push(v / monthRevenueTotal);
        }
      }
      const w = shares.length ? this.median(this.removeOutliers(shares)) : 0;
      revenueMixWeights[account] = w;
      weightSum += w;
    }
    if (weightSum > 0) {
      Object.keys(revenueMixWeights).forEach(k => revenueMixWeights[k] = revenueMixWeights[k] / weightSum);
    }

    // 1.b Proyectar ingreso total (agregado) como driver objetivo
    const totalRevenueReal = revenueTotalsReal.slice(0, 6).filter(v => v > 0);
    const totalRevProjections = totalRevenueReal.length
      ? TrendAnalysis.projectFuture(totalRevenueReal, { monthsAhead: monthsToProject.length })
      : new Array(monthsToProject.length).fill(0);
    const totalLast = totalRevenueReal.length ? totalRevenueReal[totalRevenueReal.length - 1] : 0;
    const totalTargetByMonth: Record<string, number> = {};
    totalRevProjections.forEach((v, i) => {
      const lower = totalLast * 0.85;
      const upper = totalLast * 1.15;
      const val = Number.isFinite(v) ? v : totalLast;
      totalTargetByMonth[monthsToProject[i]] = Math.max(0, Math.min(upper, Math.max(lower, val)));
    });

    // 1.c Proyectar ingresos por subcuenta (tendencia) y recolectar sin escribir aún
    const revProjectionsByAccount: Record<string, number[]> = {};
    for (const account of revenueLeafAccounts) {
      const accountData = monthlyDataByAccount[account];
      if (!accountData || accountData.every(v => v === 0)) continue;

      const seasonalityResult = SeasonalityDetector.analyzeSeasonality({ [targetYear - 1]: accountData });
      const realValues = accountData.filter((v, i) => i < 6 && v !== 0);
      if (realValues.length === 0) continue;
      const projections = TrendAnalysis.projectFuture(realValues, { monthsAhead: monthsToProject.length });
      const lastReal = realValues[realValues.length - 1];
      const maxChange = 0.25;
      const adjusted = projections.map((value, idx) => {
        let v = value;
        if (seasonalityResult.hasSeasonality) {
          v = SeasonalityDetector.applySeasonalAdjustment(v, idx + 1, seasonalityResult.patterns);
        }
        const b1 = lastReal * (1 - maxChange);
        const b2 = lastReal * (1 + maxChange);
        const lower = Math.min(b1, b2);
        const upper = Math.max(b1, b2);
        return Math.min(upper, Math.max(lower, v));
      });
      revProjectionsByAccount[account] = adjusted;
    }

    // 1.d Ajustar por mix: combinar tendencia por subcuenta con objetivo total mensual
    monthsToProject.forEach((month, idx) => {
      const alpha = 0.6; // peso a tendencia propia por subcuenta
      const targetTotal = totalTargetByMonth[month] || 0;
      let sumTrend = 0;
      revenueLeafAccounts.forEach(acc => { sumTrend += (revProjectionsByAccount[acc]?.[idx] || 0); });

      // Si no hay pesos válidos, usar shares de tendencia de ese mes
      let weights = revenueMixWeights;
      let sumW = Object.values(weights).reduce((s, v) => s + (isFinite(v) ? v : 0), 0);
      if (!(sumW > 0)) {
        // Construir pesos desde tendencia proyectada de ese mes
        const wTemp: Record<string, number> = {};
        let denom = 0;
        revenueLeafAccounts.forEach(acc => { const v = revProjectionsByAccount[acc]?.[idx] || 0; wTemp[acc] = v; denom += v; });
        if (denom > 0) {
          Object.keys(wTemp).forEach(k => wTemp[k] = wTemp[k] / denom);
          weights = wTemp;
          sumW = 1;
        }
      }

      // Calcular valores preliminares
      const prelim: Record<string, number> = {};
      let prelimSum = 0;
      revenueLeafAccounts.forEach(acc => {
        const trendVal = revProjectionsByAccount[acc]?.[idx] || 0;
        const w = (weights[acc] || 0);
        const mixVal = targetTotal * w;
        const v = alpha * trendVal + (1 - alpha) * mixVal;
        prelim[acc] = v;
        prelimSum += v;
      });

      // Escalar para que la suma final iguale el objetivo mensual
      const scale = prelimSum > 0 ? (targetTotal / prelimSum) : 1;

      // Crear contenedor y resetear ingresos para el mes
      if (!enhanced.monthly![month]) {
        enhanced.monthly![month] = {
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
      enhanced.monthly![month].ingresos = 0;

      // Escribir a raw/monthly con el valor ajustado y escalado
      revenueLeafAccounts.forEach(acc => {
        const finalVal = prelim[acc] * scale;
        if (enhanced.raw) {
          const accountCode = acc.split(' - ')[0];
          const rawRowIndex = enhanced.raw.findIndex(r => r['COD.'] === accountCode);
          if (rawRowIndex >= 0) {
            const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
            enhanced.raw[rawRowIndex] = {
              ...enhanced.raw[rawRowIndex],
              [capitalizedMonth]: finalVal
            };
          }
        }
        enhanced.monthly![month].ingresos += finalVal;
      });

      projectedRevenueByMonth[month] = enhanced.monthly![month].ingresos;
    });

    // PASO 2: Proyectar COSTOS/GASTOS (5.*) con clasificación automática por cuenta
    // Registrar patrones detectados para UI/depuración
    const detectedPatterns: Record<string, any> = {};

    leafAccounts.filter(a => a.split(' - ')[0].startsWith('5')).forEach(account => {
      const accountData = monthlyDataByAccount[account];
      if (!accountData) return;

      // Construir dataset X=Ingresos reales, Y=Cuenta real para meses con datos (ene-jun)
      const x: number[] = [];
      const y: number[] = [];
      for (let i = 0; i < 6; i++) {
        const yi = accountData[i] || 0;
        const xi = revenueTotalsReal[i] || 0;
        if (yi > 0 && xi > 0) {
          x.push(xi);
          y.push(yi);
        }
      }

      // Si no hay suficientes puntos, fallback a tendencia propia
      const hasEnough = x.length >= 2;

      // Stats para fallback/clamp
      const lastRealY = (accountData.findLast ? accountData.findLast((v, idx) => idx < 6 && v > 0) : accountData.slice(0,6).reverse().find(v => v>0)) || 0;
      // Límites por categoría: 5.1 más variable, 5.2 más fijo
      const isGasto = account.split(' - ')[0].startsWith('5.2.');
      const maxChange = isGasto ? 0.10 : 0.30;

      let a = 0, b = 0, r2 = 0;
      if (hasEnough) {
        const fit = this.olsNonNegative(x, y);
        a = fit.a; b = fit.b; r2 = fit.r2;
      }

      // Tendencia propia para fallback
      const ownRealValues = accountData.filter((v, i) => i < 6 && v !== 0);
      const ownProjections = TrendAnalysis.projectFuture(ownRealValues.length ? ownRealValues : [lastRealY], { monthsAhead: monthsToProject.length });

      // Clasificar patrón de esta subcuenta contra ingresos reales (ene-jun)
      const accountCode = account.split(' - ')[0];
      const accountName = account.split(' - ')[1] || '';
      const pattern = this.classifyCostPattern(accountData, revenueTotalsReal, accountCode, accountName);
      detectedPatterns[accountCode] = pattern;

      monthsToProject.forEach((month, idx) => {
        let projected = 0;

        // 2.1 Si es cuenta MIX (costos mixtos), usar lógica de punto de equilibrio
        if (mixedCostMap.has(accountCode)) {
          const mc = mixedCostMap.get(accountCode)!;
          const ingresosMes = projectedRevenueByMonth[month] || 0;
          // Componente variable
          let componenteVariable = 0;
          if (mc.inputMode === 'manual') {
            componenteVariable = Math.max(0, mc.variableAmount || 0);
          } else {
            // Igual que multiLevelBreakEven: si base 'revenue', tratar variableRate como %
            componenteVariable = mc.baseMeasure === 'revenue'
              ? ingresosMes * (mc.variableRate / 100)
              : ingresosMes * mc.variableRate;
          }
          // Componente fijo
          const componenteFijo = Math.max(0, mc.fixedComponent || 0);
          projected = componenteFijo + componenteVariable;
        }
        else {
          // Aplicar según patrón detectado
          const rev = projectedRevenueByMonth[month] || 0;
          switch (pattern.type) {
            case 'variable': {
              const ratio = Math.max(0, pattern.ratio || 0);
              projected = ratio * rev;
              break;
            }
            case 'fixed': {
              projected = Math.max(0, pattern.baseline || lastRealY);
              break;
            }
            case 'mixed': {
              const pa = Math.max(0, pattern.a || a);
              const pb = Math.max(0, pattern.b || b);
              projected = pa + pb * rev;
              break;
            }
            case 'step': {
              projected = Math.max(0, pattern.baseline || lastRealY);
              break;
            }
          }
          // Elasticidad coherente para 5.1 predominantemente variables
          if (accountCode.startsWith('5.1')) {
            const revJun = revenueTotalsReal[5] || 0;
            if (revJun > 0 && rev < revJun && projected > lastRealY) {
              projected = Math.min(projected, lastRealY * 1.15);
            }
          }
        }
        // Clamp y no-negativo
        if (lastRealY > 0) {
          const minV = lastRealY * (1 - maxChange);
          const maxV = lastRealY * (1 + maxChange);
          projected = Math.min(maxV, Math.max(minV, projected));
        }
        projected = Math.max(0, projected);

        // Escribir en monthly y raw
        if (!enhanced.monthly![month]) {
          enhanced.monthly![month] = {
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

        if (enhanced.raw) {
          const rawRowIndex = enhanced.raw.findIndex(r => r['COD.'] === accountCode);
          if (rawRowIndex >= 0) {
            const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
            enhanced.raw[rawRowIndex] = {
              ...enhanced.raw[rawRowIndex],
              [capitalizedMonth]: projected
            };
          }
        }

        const code = accountCode;
        if (code.startsWith('5.1')) {
          enhanced.monthly![month].costoProduccion += projected;
        } else if (code.startsWith('5.2') || code.startsWith('5.3') || code.startsWith('5')) {
          enhanced.monthly![month].gastosOperativos += projected;
        }
      });
    });

    // Ajuste padre→hijos: normalizar hojas para que coincidan los objetivos por padre (5.1 y 5.2)
    try {
      // Series reales agregadas por padre (ene–jun) usando SOLO hojas
      const seriesByParent: Record<'5.1'|'5.2', number[]> = { '5.1': new Array(6).fill(0), '5.2': new Array(6).fill(0) };
      leafAccounts.filter(a => a.split(' - ')[0].startsWith('5.1')).forEach(account => {
        const vals = monthlyDataByAccount[account] || [];
        for (let i = 0; i < 6; i++) seriesByParent['5.1'][i] += vals[i] || 0;
      });
      leafAccounts.filter(a => a.split(' - ')[0].startsWith('5.2')).forEach(account => {
        const vals = monthlyDataByAccount[account] || [];
        for (let i = 0; i < 6; i++) seriesByParent['5.2'][i] += vals[i] || 0;
      });

      const parentTargets: Record<'5.1'|'5.2', Record<string, number>> = { '5.1': {}, '5.2': {} };
      (['5.1','5.2'] as const).forEach(parent => {
        const y = seriesByParent[parent];
        const pattern = this.classifyCostPattern(y, revenueTotalsReal, parent, `parent ${parent}`);
        const lastReal = y.slice().reverse().find(v => v > 0) || (y.reduce((s,v)=>s+v,0)/Math.max(1,y.length));
        const maxChange = parent === '5.1' ? 0.30 : 0.10;
        monthsToProject.forEach(month => {
          const rev = projectedRevenueByMonth[month] || 0;
          let target = 0;
          switch (pattern.type) {
            case 'variable': target = (pattern.ratio || 0) * rev; break;
            case 'mixed': target = Math.max(0, (pattern.a || 0) + (pattern.b || 0) * rev); break;
            case 'fixed': target = Math.max(0, pattern.baseline || lastReal); break;
            case 'step': default: target = Math.max(0, pattern.baseline || lastReal); break;
          }
          const lower = lastReal * (1 - maxChange);
          const upper = lastReal * (1 + maxChange);
          parentTargets[parent][month] = Math.min(upper, Math.max(lower, target));
        });
      });

      // Normalizar hojas en raw por mes/padre, respetando MIX (no escalar MIX si hay no-MIX)
      const rows = enhanced.raw || [];
      monthsToProject.forEach(month => {
        const cap = month.charAt(0).toUpperCase() + month.slice(1);
        (['5.1','5.2'] as const).forEach(parent => {
          // Reunir hojas del padre
          const leafRows = rows.filter(r => {
            const code = r['COD.']?.toString() || '';
            // hoja si no tiene hijos
            const isLeaf = !rows.some(rr => (rr['COD.']?.toString() || '').startsWith(code + '.'));
            return code.startsWith(parent + '.') && isLeaf;
          });
          if (leafRows.length === 0) return;
          const target = parentTargets[parent][month] || 0;
          let sumMix = 0, sumNonMix = 0;
          const nonMixRows: any[] = [];
          leafRows.forEach(r => {
            const code = r['COD.']?.toString() || '';
            const val = ProjectionEngine.parseLocaleNumber(r[cap]) || 0;
            if (mixedCostMap.has(code)) sumMix += val; else { sumNonMix += val; nonMixRows.push(r); }
          });
          const remainder = target - sumMix;
          if (sumNonMix > 0) {
            const scale = remainder / sumNonMix;
            nonMixRows.forEach(r => {
              const val = ProjectionEngine.parseLocaleNumber(r[cap]) || 0;
              const newVal = Math.max(0, val * scale);
              r[cap] = newVal;
            });
          } else if (leafRows.length > 0) {
            // Si todo es MIX, distribuir uniformemente el ajuste
            const avg = remainder / leafRows.length;
            leafRows.forEach(r => {
              const val = ProjectionEngine.parseLocaleNumber(r[cap]) || 0;
              r[cap] = Math.max(0, val + avg);
            });
          }
          // Actualizar monthly con la suma final por padre
          const finalSum = leafRows.reduce((s, r) => s + (ProjectionEngine.parseLocaleNumber(r[cap]) || 0), 0);
          if (!enhanced.monthly![month]) {
            enhanced.monthly![month] = {
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
          if (parent === '5.1') {
            enhanced.monthly![month].costoProduccion = finalSum;
          } else {
            enhanced.monthly![month].gastosOperativos = finalSum;
          }
        });
      });
    } catch (e) {
      console.warn('Normalization error:', e);
    }

    // CRÍTICO: Recalcular cuentas padre sumando sus hijos proyectados (tras normalización)
    if (enhanced.raw) {
      const monthsToRecalculate = ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      
      monthsToRecalculate.forEach(month => {
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        
        // Función para recalcular jerárquicamente de abajo hacia arriba
        function recalculateAccountHierarchy() {
          let changed = true;
          while (changed) {
            changed = false;
            
            enhanced.raw!.forEach(row => {
              const accountCode = row['COD.']?.toString();
              if (!accountCode) return;
              
              // Buscar todos los hijos directos de esta cuenta
              const children = enhanced.raw!.filter(childRow => {
                const childCode = childRow['COD.']?.toString();
                if (!childCode || childCode === accountCode) return false;
                
                // Es hijo directo si empieza con parentCode + "." y no tiene más puntos después
                if (!childCode.startsWith(accountCode + '.')) return false;
                
                const suffix = childCode.substring(accountCode.length + 1);
                return !suffix.includes('.'); // No debe tener más puntos (sería nieto)
              });
              
              if (children.length > 0) {
                // Sumar valores de hijos directos
                const childrenSum = children.reduce((sum, child) => {
                  const childValue = parseFloat(child[capitalizedMonth] || '0') || 0;
                  return sum + childValue;
                }, 0);
                
                const currentValue = parseFloat(row[capitalizedMonth] || '0') || 0;
                if (Math.abs(currentValue - childrenSum) > 0.01) { // Solo si hay diferencia significativa
                  row[capitalizedMonth] = childrenSum;
                  console.log(`🔄 Recalculado ${month} para ${accountCode}: ${childrenSum} (era ${currentValue})`);
                  changed = true;
                }
              }
            });
          }
        }
        
        recalculateAccountHierarchy();
      });
    }

    // Recalcular métricas derivadas
    Object.keys(enhanced.monthly!).forEach(month => {
      const data = enhanced.monthly![month];
      data.costoVentasTotal = data.costoMateriaPrima + data.costoProduccion;
      data.utilidadBruta = data.ingresos - data.costoVentasTotal;
      data.ebitda = data.utilidadBruta - data.gastosOperativos;
      data.utilidadNeta = data.ebitda - (data.depreciacion || 0);
    });

    // Exponer patrones detectados para UI/tooltips
    try {
      (globalThis as any).__projectionPatterns = detectedPatterns;
    } catch {}

    // DEBUG: Generar desglose por mes para análisis (padre/hijo y top cuentas)
    try {
      const debugMonths = ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const breakdown: Record<string, any> = {};
      debugMonths.forEach(month => {
        const cap = month.charAt(0).toUpperCase() + month.slice(1);
        const ingresosTotal = enhanced.raw?.filter(r => r['COD.']?.toString() === '4')
          .reduce((s, r) => s + (ProjectionEngine.parseLocaleNumber(r[cap]) || 0), 0) || 0;
        const rows = enhanced.raw || [];
        const isLeaf = (code: string) => !rows.some(rr => rr['COD.']?.toString().startsWith(code + '.'));
        const sumLeafByPrefix = (prefix: string) => rows
          .filter(r => {
            const code = r['COD.']?.toString() || '';
            return code.startsWith(prefix + '.') && isLeaf(code);
          })
          .reduce((s, r) => s + (ProjectionEngine.parseLocaleNumber(r[cap]) || 0), 0);
        const costos51 = sumLeafByPrefix('5.1');
        const costos52 = sumLeafByPrefix('5.2');
        const costos5 = costos51 + costos52; // evitar doble conteo
        // Top 10 subcuentas 5.* por monto
        const topCosts = (enhanced.raw || [])
          .filter(r => r['COD.']?.toString().startsWith('5.') && r['COD.']?.toString().includes('.'))
          .map(r => ({ code: r['COD.'], name: r['CUENTA'], value: ProjectionEngine.parseLocaleNumber(r[cap]) || 0 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        breakdown[month] = {
          ingresosTotal,
          costos5,
          costos51,
          costos52,
          utilidadBruta: ingresosTotal - costos5,
          topCosts,
        };
      });
      (globalThis as any).__projectionDebug = breakdown;
      // Log breve para julio
      const b = breakdown['julio'];
      if (b) {
        console.log('🧪 Projection Debug julio:', {
          ingresos: b.ingresosTotal,
          costos5: b.costos5,
          costos51: b.costos51,
          costos52: b.costos52,
          UB: b.utilidadBruta,
          topCosts: b.topCosts,
        });
      }
    } catch (e) {
      // Ignorar errores de debug
    }

    return enhanced;
  }
  /**
   * Completa automáticamente un año con todos los 12 meses
   */
  static completeYear(financialData: FinancialData, targetYear: number = 2025): FinancialData {
    const enhanced: FinancialData = JSON.parse(JSON.stringify(financialData));
    
    // Asegurar que monthly existe
    if (!enhanced.monthly) {
      enhanced.monthly = {};
    }

    // LIMPIAR DUPLICADOS: Consolidar meses con diferentes casos
    const cleanedMonthly: Record<string, MonthlyData> = {};
    
    Object.entries(enhanced.monthly).forEach(([month, data]) => {
      const monthLower = month.toLowerCase();
      
      // Si ya existe este mes (en minúsculas), combinar los datos
      if (cleanedMonthly[monthLower]) {
        console.log(`⚠️ Duplicado encontrado: ${month} (ya existe ${monthLower})`);
        // Mantener los datos del primero encontrado
      } else {
        cleanedMonthly[monthLower] = data;
      }
    });
    
    // Reemplazar con datos limpios
    enhanced.monthly = cleanedMonthly;
    console.log(`🧹 Limpieza: ${Object.keys(financialData.monthly).length} meses → ${Object.keys(cleanedMonthly).length} meses únicos`);

    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const existingMonths = getSortedMonths(enhanced.monthly);
    const existingData = existingMonths.map(month => enhanced.monthly[month]);

    // Analizar datos existentes para proyecciones inteligentes
    const analysis = this.analyzeHistoricalData(existingData);

    // Obtener meses que realmente existen (normalizados a minúsculas)
    const existingMonthsNormalized = Object.keys(enhanced.monthly)
      .map(month => month.toLowerCase())
      .filter((month, index, arr) => arr.indexOf(month) === index); // eliminar duplicados

    console.log(`📊 Meses existentes (normalizados): ${existingMonthsNormalized.join(', ')}`);

    monthNames.forEach((month, index) => {
      const monthLower = month.toLowerCase();
      
      if (!existingMonthsNormalized.includes(monthLower)) {
        // Solo generar proyección si NO existe este mes
        console.log(`🧠 Generando proyección IA para: ${month} (FALTABA)`);
        const projectedData = this.generateSmartProjection(
          existingData,
          analysis,
          index,
          month
        );
        
        enhanced.monthly[month] = projectedData;
      } else {
        // Mes ya existe - mantener datos reales SIN metadata
        console.log(`📊 Manteniendo datos reales para: ${month} (YA EXISTÍA)`);
        // No tocar los datos existentes
      }
    });

    return enhanced;
  }

  /**
   * Analiza datos históricos para encontrar patrones
   */
  private static analyzeHistoricalData(historicalData: MonthlyData[]): ProjectionAnalysis {
    if (historicalData.length === 0) {
      return {
        trend: 'stable',
        seasonality: Array(12).fill(1),
        volatility: 0.1,
        avgGrowthRate: 0.05,
        confidence: 30
      };
    }

    // Calcular tendencia de ingresos
    const ingresos = historicalData.map(data => data.ingresos || 0).filter(val => val > 0);
    const trend = this.calculateTrend(ingresos);

    // Calcular estacionalidad (simplificado)
    const seasonality = this.calculateSeasonality(historicalData);

    // Calcular volatilidad
    const volatility = this.calculateVolatility(ingresos);

    // Calcular tasa de crecimiento promedio
    const avgGrowthRate = this.calculateAverageGrowthRate(ingresos);

    // Calcular confianza basada en cantidad de datos
    const confidence = Math.min(95, Math.max(30, historicalData.length * 15));

    return {
      trend,
      seasonality,
      volatility,
      avgGrowthRate,
      confidence
    };
  }

  /**
   * Genera proyección inteligente para un mes específico
   */
  private static generateSmartProjection(
    historicalData: MonthlyData[], 
    analysis: ProjectionAnalysis, 
    monthIndex: number,
    monthName: string
  ): EnhancedMonthlyData {
    
    // Si no hay datos históricos, usar valores base
    if (historicalData.length === 0) {
      return this.generateBaseProjection(monthName);
    }

    // Obtener datos de referencia (último mes o promedio)
    const referenceData = this.getReferenceData(historicalData);
    const seasonalMultiplier = analysis.seasonality[monthIndex] || 1;
    const trendMultiplier = 1 + analysis.avgGrowthRate;

    // Calcular cada cuenta con lógica específica
    const projected: EnhancedMonthlyData = {
      // Ingresos: Tendencia + Estacionalidad + Pequeña variación
      ingresos: this.projectValue(
        referenceData.ingresos || 0, 
        trendMultiplier * seasonalMultiplier,
        0.05, // 5% variación máxima
        'Proyección basada en tendencia histórica y estacionalidad'
      ),

      // Costos como % de ingresos (inteligente)
      costoMateriaPrima: 0,
      costoProduccion: 0,
      costoVentasTotal: 0,
      
      // Gastos más estables
      gastosOperativos: this.projectValue(
        referenceData.gastosOperativos || 0,
        trendMultiplier * 0.8, // Crecen menos que ingresos
        0.03,
        'Gastos operativos con crecimiento moderado'
      ),

      gastosAdminTotal: this.projectValue(
        referenceData.gastosAdminTotal || 0,
        trendMultiplier * 0.6,
        0.02,
        'Gastos administrativos estables'
      ),

      gastosVentasTotal: this.projectValue(
        referenceData.gastosVentasTotal || 0,
        trendMultiplier * 0.9,
        0.04,
        'Gastos ventas correlacionados con ingresos'
      ),

      // Métricas calculadas se definirán después
      utilidadBruta: 0,
      ebitda: 0,
      depreciacion: referenceData.depreciacion || 0,
      utilidadNeta: 0,

      _metadata: {}
    };

    // Calcular costos inteligentemente basado en ratios históricos
    const avgCostRatio = this.calculateAverageCostRatio(historicalData);
    projected.costoMateriaPrima = projected.ingresos * avgCostRatio.materiaPrima;
    projected.costoProduccion = projected.ingresos * avgCostRatio.produccion;
    projected.costoVentasTotal = projected.costoMateriaPrima + projected.costoProduccion;

    // Recalcular métricas derivadas
    projected.utilidadBruta = projected.ingresos - projected.costoVentasTotal;
    projected.ebitda = projected.utilidadBruta - projected.gastosOperativos;
    projected.utilidadNeta = projected.ebitda - (projected.depreciacion || 0);

    // Agregar metadata de proyección a todas las cuentas proyectadas
    projected._metadata = {
      ingresos: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Tendencia + Estacionalidad',
        basedOn: ['datos_historicos', 'patron_estacional']
      },
      costoMateriaPrima: { 
        isProjected: true, 
        confidence: analysis.confidence - 10, 
        method: 'Ratio histórico',
        basedOn: ['ratio_promedio_historico']
      },
      costoProduccion: { 
        isProjected: true, 
        confidence: analysis.confidence - 10, 
        method: 'Ratio histórico',
        basedOn: ['ratio_promedio_historico']
      },
      gastosOperativos: { 
        isProjected: true, 
        confidence: analysis.confidence - 5, 
        method: 'Tendencia moderada',
        basedOn: ['tendencia_historica']
      },
      utilidadBruta: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['ingresos_proyectados', 'costos_proyectados']
      },
      ebitda: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['utilidad_bruta', 'gastos_operativos']
      },
      utilidadNeta: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['ebitda', 'depreciacion']
      }
    };

    return projected;
  }

  /**
   * Proyecta un valor individual con variación controlada
   */
  private static projectValue(
    baseValue: number, 
    multiplier: number, 
    maxVariation: number,
    description: string
  ): number {
    if (baseValue === 0) return 0;
    
    // PROYECCIÓN REALISTA 2025: Basada en datos reales de junio
    // Usar multiplicador moderado para evitar valores absurdos
    const limitedMultiplier = Math.min(1.15, Math.max(0.90, multiplier)); // Max 15% cambio
    
    // Variación muy controlada para realismo empresarial
    const variation = 1 + (Math.random() - 0.5) * 2 * Math.min(maxVariation, 0.05); // Max 5% variación
    
    const projectedValue = baseValue * limitedMultiplier * variation;
    
    // VALIDACIÓN: Evitar cambios drásticos irreales
    const maxChange = Math.abs(baseValue) * 0.20; // Máximo 20% de cambio
    const change = projectedValue - baseValue;
    
    if (Math.abs(change) > maxChange) {
      const limitedChange = change > 0 ? maxChange : -maxChange;
      return Math.round(baseValue + limitedChange);
    }
    
    return Math.round(projectedValue);
  }

  /**
   * Calcula ratios promedio de costos vs ingresos
   */
  private static calculateAverageCostRatio(historicalData: MonthlyData[]): {
    materiaPrima: number;
    produccion: number;
    operativos: number;
  } {
    let totalIngresos = 0;
    let totalMateriaPrima = 0;
    let totalProduccion = 0;
    let totalOperativos = 0;
    let validMonths = 0;

    historicalData.forEach(data => {
      if (data.ingresos && data.ingresos > 0) {
        totalIngresos += data.ingresos;
        totalMateriaPrima += data.costoMateriaPrima || 0;
        totalProduccion += data.costoProduccion || 0;
        totalOperativos += data.gastosOperativos || 0;
        validMonths++;
      }
    });

    if (validMonths === 0 || totalIngresos === 0) {
      return {
        materiaPrima: 0.35, // 35% default
        produccion: 0.25,   // 25% default
        operativos: 0.20    // 20% default
      };
    }

    return {
      materiaPrima: totalMateriaPrima / totalIngresos,
      produccion: totalProduccion / totalIngresos,
      operativos: totalOperativos / totalIngresos
    };
  }

  /**
   * Obtiene datos de referencia para proyección
   */
  private static getReferenceData(historicalData: MonthlyData[]): MonthlyData {
    if (historicalData.length === 0) {
      return {} as MonthlyData;
    }

    // Usar último mes como referencia principal
    const lastMonth = historicalData[historicalData.length - 1];
    
    // Si el último mes tiene datos vacíos, hacer promedio de últimos 3 meses
    if (!lastMonth.ingresos || lastMonth.ingresos === 0) {
      return this.calculateAverageData(historicalData.slice(-3));
    }

    return lastMonth;
  }

  /**
   * Calcula promedio de datos mensuales
   */
  private static calculateAverageData(data: MonthlyData[]): MonthlyData {
    if (data.length === 0) return {} as MonthlyData;

    const result: MonthlyData = {} as MonthlyData;
    const validData = data.filter(d => d.ingresos && d.ingresos > 0);
    
    if (validData.length === 0) return data[0];

    // Promediar cada campo
    const fields: (keyof MonthlyData)[] = [
      'ingresos', 'costoMateriaPrima', 'costoProduccion', 'costoVentasTotal',
      'gastosOperativos', 'gastosAdminTotal', 'gastosVentasTotal',
      'utilidadBruta', 'ebitda', 'depreciacion', 'utilidadNeta'
    ];

    fields.forEach(field => {
      const values = validData.map(d => d[field] || 0);
      result[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return result;
  }

  /**
   * Genera proyección base cuando no hay datos históricos
   */
  private static generateBaseProjection(monthName: string): EnhancedMonthlyData {
    // Valores base realistas para una empresa típica
    const baseIngresos = 1000000; // 1M base
    const seasonalMultiplier = this.getSeasonalMultiplier(monthName);

    const ingresos = baseIngresos * seasonalMultiplier;
    const costoMateriaPrima = ingresos * 0.35;
    const costoProduccion = ingresos * 0.25;
    const gastosOperativos = ingresos * 0.20;

    return {
      ingresos,
      costoMateriaPrima,
      costoProduccion,
      costoVentasTotal: costoMateriaPrima + costoProduccion,
      gastosOperativos,
      gastosAdminTotal: ingresos * 0.08,
      gastosVentasTotal: ingresos * 0.05,
      utilidadBruta: ingresos - (costoMateriaPrima + costoProduccion),
      ebitda: ingresos * 0.12,
      depreciacion: 50000,
      utilidadNeta: ingresos * 0.08,
      _metadata: {
        ingresos: { 
          isProjected: true, 
          confidence: 50, 
          method: 'Estimación base',
          basedOn: ['valores_industriales_tipicos']
        }
      }
    };
  }

  /**
   * Obtiene multiplicador estacional para un mes
   */
  private static getSeasonalMultiplier(monthName: string): number {
    const seasonalPatterns: Record<string, number> = {
      'enero': 0.9,    // Post navidad, bajo
      'febrero': 0.95, // Recuperación
      'marzo': 1.05,   // Primer trimestre fuerte
      'abril': 1.0,    // Estable
      'mayo': 1.02,    // Primavera
      'junio': 1.08,   // Medio año fuerte
      'julio': 0.98,   // Vacaciones
      'agosto': 0.96,  // Vacaciones
      'septiembre': 1.05, // Vuelta al trabajo
      'octubre': 1.03,    // Otoño
      'noviembre': 1.15,  // Pre-navidad
      'diciembre': 1.20   // Navidad fuerte
    };

    return seasonalPatterns[monthName.toLowerCase()] || 1.0;
  }

  // Métodos auxiliares de análisis
  private static calculateTrend(values: number[]): 'growing' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const avgFirst = first.reduce((sum, val) => sum + val, 0) / first.length;
    const avgSecond = second.reduce((sum, val) => sum + val, 0) / second.length;
    
    const change = (avgSecond - avgFirst) / avgFirst;
    
    if (change > 0.05) return 'growing';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  private static calculateSeasonality(data: MonthlyData[]): number[] {
    // Simplificado: retorna patrón estacional estándar
    return [0.9, 0.95, 1.05, 1.0, 1.02, 1.08, 0.98, 0.96, 1.05, 1.03, 1.15, 1.20];
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0.1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private static calculateAverageGrowthRate(values: number[]): number {
    if (values.length < 2) return 0.05;
    
    const growthRates = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] > 0) {
        growthRates.push((values[i] - values[i-1]) / values[i-1]);
      }
    }
    
    if (growthRates.length === 0) return 0.05;
    
    return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
  }

  /**
   * Recalcula automáticamente métricas derivadas cuando cambia un valor
   */
  static recalculateMetrics(monthData: MonthlyData): MonthlyData {
    const updated = { ...monthData };
    
    // Recalcular costo total de ventas
    updated.costoVentasTotal = (updated.costoMateriaPrima || 0) + (updated.costoProduccion || 0);
    
    // Recalcular utilidad bruta
    updated.utilidadBruta = (updated.ingresos || 0) - (updated.costoVentasTotal || 0);
    
    // Recalcular EBITDA
    updated.ebitda = (updated.utilidadBruta || 0) - (updated.gastosOperativos || 0);
    
    // Recalcular utilidad neta
    updated.utilidadNeta = (updated.ebitda || 0) - (updated.depreciacion || 0);
    
    return updated;
  }
}

export default ProjectionEngine;
