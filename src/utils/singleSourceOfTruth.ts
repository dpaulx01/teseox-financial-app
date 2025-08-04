// 🛠️ SINGLE SOURCE OF TRUTH (SSOT) - Principio Arquitectónico
// Garantiza que todos los P.E. se calculen desde datos primarios, nunca almacenados como fijos

export interface PrimaryData {
  costosFijos: number;
  costosVariables: number;
  ingresos: number;
  depreciacion: number;
  intereses: number;
}

export interface BreakEvenCalculation {
  puntoEquilibrio: number;
  margenContribucion: number;
  margenContribucionPorc: number;
  utilidadNeta: number;
  ebitda: number;
  ebit: number;
}

/**
 * FUNCIÓN MAESTRA: Calcula P.E. SIEMPRE desde datos primarios
 * Esta función implementa el principio SSOT y nunca debe usar valores pre-calculados
 */
export function calculateBreakEvenFromPrimary(
  data: PrimaryData,
  type: 'contable' | 'operativo' | 'caja'
): BreakEvenCalculation {
  
  // PASO 1: Determinar costos fijos según el tipo de análisis
  let adjustedFixedCosts = data.costosFijos;
  
  switch (type) {
    case 'contable':
      // Incluye depreciación e intereses
      adjustedFixedCosts = data.costosFijos + data.depreciacion + data.intereses;
      break;
    case 'operativo':
      // Incluye depreciación, excluye intereses financieros (EBIT)
      adjustedFixedCosts = data.costosFijos + data.depreciacion;
      break;
    case 'caja':
      // Excluye gastos no-cash (depreciación e intereses)
      adjustedFixedCosts = data.costosFijos;
      break;
  }

  // PASO 2: Calcular margen de contribución
  const margenContribucion = data.ingresos - data.costosVariables;
  const margenContribucionPorc = data.ingresos > 0 ? margenContribucion / data.ingresos : 0;

  // PASO 3: Calcular P.E. usando fórmula fundamental
  const puntoEquilibrio = margenContribucionPorc > 0 ? 
    adjustedFixedCosts / margenContribucionPorc : 0;

  // PASO 4: Calcular métricas derivadas
  const utilidadNeta = data.ingresos - data.costosVariables - adjustedFixedCosts;
  const ebitda = margenContribucion - data.costosFijos;
  const ebit = ebitda - data.depreciacion;

  return {
    puntoEquilibrio,
    margenContribucion,
    margenContribucionPorc,
    utilidadNeta,
    ebitda,
    ebit
  };
}

/**
 * VALIDADOR SSOT: Verifica que no hay valores "mágicos" en los cálculos
 */
export function validateSSOT(
  calculatedResult: BreakEvenCalculation,
  primaryData: PrimaryData,
  type: 'contable' | 'operativo' | 'caja'
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Re-calcular para comparar
  const reference = calculateBreakEvenFromPrimary(primaryData, type);
  const tolerance = 0.01; // 1 centavo de tolerancia

  if (Math.abs(calculatedResult.puntoEquilibrio - reference.puntoEquilibrio) > tolerance) {
    issues.push(`P.E. no coincide con cálculo SSOT: esperado ${reference.puntoEquilibrio.toFixed(2)}, recibido ${calculatedResult.puntoEquilibrio.toFixed(2)}`);
  }

  if (Math.abs(calculatedResult.margenContribucion - reference.margenContribucion) > tolerance) {
    issues.push(`Margen de contribución no coincide con cálculo SSOT`);
  }

  if (Math.abs(calculatedResult.margenContribucionPorc - reference.margenContribucionPorc) > 0.0001) {
    issues.push(`Porcentaje de margen no coincide con cálculo SSOT`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * FUNCIÓN DE DIAGNÓSTICO: Identifica fuentes de inconsistencias
 */
export function diagnosePrimaryDataIssues(data: PrimaryData): string[] {
  const issues: string[] = [];

  if (data.ingresos <= 0) {
    issues.push("⚠️ Ingresos son cero o negativos");
  }

  if (data.costosVariables < 0) {
    issues.push("⚠️ Costos variables negativos");
  }

  if (data.costosFijos < 0) {
    issues.push("⚠️ Costos fijos negativos");
  }

  if (data.costosVariables >= data.ingresos) {
    issues.push("🚨 Costos variables iguales o mayores que ingresos (margen negativo)");
  }

  const margenContribucion = data.ingresos - data.costosVariables;
  if (margenContribucion <= 0) {
    issues.push("🚨 Margen de contribución negativo o cero - imposible alcanzar P.E.");
  }

  return issues;
}

/**
 * FUNCIÓN DE CONVERSIÓN A UNIDADES: Implementa lógica correcta
 */
export function convertToUnits(
  monetaryBreakEven: number,
  unitData: {
    pricePerUnit: number;
    variableCostPerUnit: number;
    totalUnits: number;
  }
): {
  breakEvenUnits: number;
  contributionMarginPerUnit: number;
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (unitData.pricePerUnit <= 0) {
    issues.push("Precio por unidad debe ser positivo");
  }
  
  if (unitData.variableCostPerUnit < 0) {
    issues.push("Costo variable por unidad no puede ser negativo");
  }
  
  if (unitData.pricePerUnit <= unitData.variableCostPerUnit) {
    issues.push("Precio por unidad debe ser mayor que costo variable unitario");
  }

  const contributionMarginPerUnit = unitData.pricePerUnit - unitData.variableCostPerUnit;
  
  // Verificar coherencia: P.E. en dólares debe coincidir con P.E. en unidades * precio
  const impliedPriceCheck = unitData.totalUnits > 0 ? 
    monetaryBreakEven / unitData.totalUnits : 0;
  
  if (Math.abs(impliedPriceCheck - unitData.pricePerUnit) > (unitData.pricePerUnit * 0.1)) {
    issues.push(`Inconsistencia detectada: precio implícito ${impliedPriceCheck.toFixed(2)} vs precio declarado ${unitData.pricePerUnit.toFixed(2)}`);
  }

  const breakEvenUnits = contributionMarginPerUnit > 0 ? 
    (monetaryBreakEven / unitData.pricePerUnit) * (unitData.pricePerUnit / contributionMarginPerUnit) :
    0;

  return {
    breakEvenUnits,
    contributionMarginPerUnit,
    isValid: issues.length === 0,
    issues
  };
}