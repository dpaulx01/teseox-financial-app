import { FinancialData, MultiLevelBreakEvenData, BreakEvenResult, BreakEvenAnalysisType, MixedCost } from '../types';
import { BREAK_EVEN_CONFIGS, SPECIAL_ACCOUNTS, ACCOUNT_PATTERNS } from '../constants/breakEvenConfig';
import { parseNumericValue } from './formatters';

// Cache global para evitar re-procesamiento de cuentas mixtas
const processedMixedAccountsCache = new Map<string, Set<string>>();

// Función para limpiar el caché cuando sea necesario
export function clearBreakEvenCache() {
  processedMixedAccountsCache.clear();
}

type BreakEvenClassification = 'CFT' | 'CVU' | 'PVU' | 'MIX';

interface CalculationData {
  ingresos: number;
  costosVariables: number;
  costosFijos: number;
  depreciacion: number;
  intereses: number;
}

export function calculateMultiLevelBreakEven(
  data: FinancialData,
  currentMonth: string,
  customClassifications: Record<string, BreakEvenClassification> = {},
  mixedCosts: MixedCost[] = []
): MultiLevelBreakEvenData {
  
  // MANTENER LÓGICA COMPLETA - Solo optimizar cuando NO hay clasificaciones personalizadas ni costos mixtos
  // Las vistas SQL solo proveen datos base, la lógica de 3 tipos de análisis debe mantenerse
  
  
  // Crear clave única para esta ejecución
  const cacheKey = `${currentMonth}-${Object.keys(customClassifications).length}-${mixedCosts.length}`;
  
  // LIMPIAR CACHE si hay cambios en mixed costs para evitar inconsistencias
  if (mixedCosts.length > 0) {
    processedMixedAccountsCache.clear();
  }
  
  // Obtener datos base
  const baseData = calculateBaseData(data, currentMonth, customClassifications, mixedCosts, cacheKey);
  
  // Debug logs removidos - código en producción
  
  
  // Calcular cada tipo de punto de equilibrio
  const contable = calculateBreakEvenLevel('contable', baseData);
  const operativo = calculateBreakEvenLevel('operativo', baseData);
  const caja = calculateBreakEvenLevel('caja', baseData);


  return { contable, operativo, caja };
}

function calculateBaseData(
  data: FinancialData,
  currentMonth: string,
  customClassifications: Record<string, BreakEvenClassification>,
  mixedCosts: MixedCost[] = [],
  cacheKey: string
): CalculationData {
  
  // CORRECCIÓN FUNDAMENTAL: Para Promedio, calcular igual que Anual y LUEGO dividir
  if (currentMonth === 'Promedio') {
    // PASO 1: Calcular datos anuales usando las mismas clasificaciones
    const annualData = calculateBaseData(data, 'Anual', customClassifications, mixedCosts, cacheKey);
    
    // PASO 2: Contar meses con datos válidos y dividir
    const mesesConDatos = Object.keys(data.monthly).length;
    
    return {
      ingresos: annualData.ingresos / mesesConDatos,
      costosVariables: annualData.costosVariables / mesesConDatos,
      costosFijos: annualData.costosFijos / mesesConDatos,
      depreciacion: annualData.depreciacion / mesesConDatos,
      intereses: annualData.intereses / mesesConDatos
    };
  }
  
  let ingresos = 0;
  let costosVariables = 0;
  let costosFijos = 0;
  let depreciacion = 0;
  let intereses = 0;

  // Crear mapa de costos mixtos para búsqueda rápida
  const mixedCostMap = new Map<string, MixedCost>();
  mixedCosts.forEach(mc => {
    mixedCostMap.set(mc.accountCode, mc);
  });

  // Limpiar caché si ha crecido demasiado (evitar memory leaks)
  if (processedMixedAccountsCache.size > 50) {
    processedMixedAccountsCache.clear();
  }
  
  // Obtener o crear el Set de cuentas procesadas para esta clave
  if (!processedMixedAccountsCache.has(cacheKey)) {
    processedMixedAccountsCache.set(cacheKey, new Set<string>());
  }
  const processedMixedAccounts = processedMixedAccountsCache.get(cacheKey)!;

  // Función para verificar si una cuenta tiene subcuentas
  const hasChildren = (parentCode: string): boolean => {
    if (!data?.raw) return false;
    const parentDots = (parentCode.match(/\./g) || []).length;
    return data.raw.some(row => {
      const childCode = row['COD.'] || '';
      const childDots = (childCode.match(/\./g) || []).length;
      return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
    });
  };

  // Función para obtener clasificación de una cuenta
  const getAccountClassification = (codigo: string): BreakEvenClassification => {
    // Si la cuenta tiene análisis mixto, marcarla como MIX
    if (mixedCostMap.has(codigo)) {
      return 'MIX';
    }
    
    // Si ya tiene una clasificación personalizada válida, usarla
    if (customClassifications[codigo] && 
        customClassifications[codigo].trim() !== '' &&
        ['CFT', 'CVU', 'PVU', 'MIX'].includes(customClassifications[codigo])) {
      return customClassifications[codigo] as BreakEvenClassification;
    }
    
    // CLASIFICACIÓN GRANULAR Y JERÁRQUICA - CORREGIDA
    if (codigo === '4' || codigo.startsWith('4.')) {
      return 'PVU'; // TODOS los ingresos
    } 
    
    // REGLA ESPECÍFICA: Solo procesar cuentas de detalle para evitar duplicación
    // Las cuentas padre (5, 5.1, 5.2) NO deben procesarse si tienen subcuentas
    if (codigo === '5' || codigo === '5.1' || codigo === '5.2') {
      // Estas son cuentas padre - NO procesarlas individualmente
      // Sus valores se calcularán automáticamente desde las subcuentas
      return 'CVU'; // Valor temporal que no se usará
    }
    
    // Costos de producción detallados (5.1.x) - Variables por defecto
    if (codigo.startsWith('5.1.')) {
      return 'CVU';
    } 
    // Gastos detallados (5.2.x) - Fijos por defecto  
    if (codigo.startsWith('5.2.')) {
      return 'CFT';
    }
    
    return 'CVU'; // Por defecto todo participa como variable
  };

  // Función para identificar si una cuenta es depreciación (SOLO POR NOMBRE)
  const isDepreciationAccount = (codigo: string, cuenta: string): boolean => {
    // Solo verificar por nombre (más universal entre empresas)
    const cuentaLower = cuenta.toLowerCase();
    return ACCOUNT_PATTERNS.depreciacion.some(pattern => 
      cuentaLower.includes(pattern.toLowerCase())
    );
  };

  // Función para identificar si una cuenta es intereses (SOLO POR NOMBRE)
  const isInterestAccount = (codigo: string, cuenta: string): boolean => {
    // Solo verificar por nombre (más universal entre empresas)
    const cuentaLower = cuenta.toLowerCase();
    return ACCOUNT_PATTERNS.intereses.some(pattern => 
      cuentaLower.includes(pattern.toLowerCase())
    );
  };

  // Procesar todas las cuentas de detalle (sin subcuentas) para evitar duplicación
  const processedAccounts = [];
  let skippedParentAccounts = 0;
  
  (data.raw || []).forEach(row => {
    const codigo = row['COD.'] || '';
    const cuenta = row['CUENTA'] || '';
    
    // LÓGICA JERÁRQUICA UNIVERSAL: Solo cuentas de detalle (sin subcuentas)
    if (hasChildren(codigo)) {
      skippedParentAccounts++;
      return;
    }
    
    const clasificacion = getAccountClassification(codigo);

    // Obtener el valor para el período actual
    let valor = 0;
    if (currentMonth === 'Anual') {
      // Sumar todos los meses
      Object.keys(data.monthly).forEach(month => {
        const monthValue = row[month];
        if (monthValue) {
          valor += typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
        }
      });
    } else if (currentMonth === 'Promedio') {
      // CORRECCIÓN: El promedio debe ser Total Anual ÷ Número de meses, NO promedio aritmético de valores
      // Sumar todos los meses primero para obtener el total anual
      let totalAnual = 0;
      let mesesConDatos = 0;
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      monthNames.forEach(month => {
        const monthValue = row[month];
        if (monthValue && monthValue !== 0) {
          const numValue = typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
          if (numValue !== 0) {
            totalAnual += numValue;
            mesesConDatos++;
          }
        }
      });
      
      // El promedio mensual es el total anual dividido entre meses con datos
      valor = mesesConDatos > 0 ? totalAnual / mesesConDatos : 0;
      
    } else {
      const monthValue = row[currentMonth];
      if (monthValue) {
        valor = typeof monthValue === 'number' ? monthValue : parseNumericValue(monthValue);
      }
    }

    // Identificar tipo específico de cuenta
    const isDepreciation = isDepreciationAccount(codigo, cuenta);
    const isInterest = isInterestAccount(codigo, cuenta);
    

    // Acumular en categorías específicas
    if (isDepreciation) {
      depreciacion += Math.abs(valor);
    }
    
    if (isInterest) {
      intereses += Math.abs(valor);
    }

    // Registrar la cuenta procesada para logs
    processedAccounts.push({
      codigo,
      cuenta,
      valor,
      clasificacion,
      isDepreciation,
      isInterest,
      isMixed: clasificacion === 'MIX' && mixedCostMap.has(codigo)
    });

    // Verificar si es cuenta mixta y procesarla especialmente
    if (clasificacion === 'MIX') {
      if (mixedCostMap.has(codigo)) {
        const mixedCost = mixedCostMap.get(codigo)!;
        
        
        // PREVENIR PROCESAMIENTO MÚLTIPLE: Verificar si ya fue procesada
        const accountKey = `${codigo}-${currentMonth}-${cacheKey}`;
        if (!processedMixedAccounts.has(accountKey)) {
          processedMixedAccounts.add(accountKey);
        
          // Calcular componente variable basado en ingresos del período
          let totalIngresos = 0;
          if (currentMonth === 'Anual') {
            totalIngresos = data.yearly.ingresos;
          } else if (currentMonth === 'Promedio') {
            totalIngresos = data.yearly.ingresos / Object.keys(data.monthly).length;
          } else {
            totalIngresos = data.monthly[currentMonth]?.ingresos || 0;
          }
          
          let componenteVariable = 0;
          
          if (mixedCost.inputMode === 'manual') {
            // Modo manual: usar valor monetario directo, ajustado para el período
            let baseVariableAmount = mixedCost.variableAmount || 0;
            
            // CORRECCIÓN CRÍTICA: Para modo Promedio, ajustar valor manual también
            if (currentMonth === 'Promedio') {
              const mesesConDatos = Object.keys(data.monthly).length;
              componenteVariable = baseVariableAmount / mesesConDatos;
            } else {
              componenteVariable = baseVariableAmount;
            }
          } else {
            // Modo automático: calcular basado en tasa
            componenteVariable = mixedCost.baseMeasure === 'revenue' 
              ? totalIngresos * (mixedCost.variableRate / 100)
              : totalIngresos * mixedCost.variableRate; // Si baseMeasure es 'units'
              
          }
        
        
          // Distribuir entre fijo y variable
          const prevCostosVariables = costosVariables;
          const prevCostosFijos = costosFijos;
          
          // CORRECCIÓN CRÍTICA: Para modo Promedio, ajustar también el componente fijo
          let componenteFijo = mixedCost.fixedComponent;
          if (currentMonth === 'Promedio') {
            const mesesConDatos = Object.keys(data.monthly).length;
            componenteFijo = mixedCost.fixedComponent / mesesConDatos;
          }
          
          
          costosVariables += Math.abs(componenteVariable);
          costosFijos += Math.abs(componenteFijo);
          
        } else {
        }
        
        // IMPORTANTE: No procesar la cuenta mixta en el switch normal
        return; // Salir del bucle para esta cuenta
        
      } else {
        // Cuenta MIX sin análisis de costos mixtos configurado
        // Tratarla como costo fijo por defecto (comportamiento conservador)
        
        costosFijos += Math.abs(valor);
        
        // IMPORTANTE: También registrar en el análisis para depuración
        processedAccounts[processedAccounts.length - 1].mixWithoutAnalysis = true;
        
        return; // No procesar en el switch
      }
    }
    
    // Clasificar según configuración del usuario (solo para cuentas no MIX)
    if (clasificacion !== 'MIX') {
      switch (clasificacion) {
        case 'PVU':
          ingresos += valor; // Mantener negativos (descuentos, rebajas)
          break;
        case 'CVU':
          costosVariables += Math.abs(valor); // Costos siempre positivos
          break;
        case 'CFT':
          costosFijos += Math.abs(valor); // Costos siempre positivos
          break;
      }
    }
  });



  return {
    ingresos,
    costosVariables,
    costosFijos,
    depreciacion,
    intereses
  };
}

function calculateBreakEvenLevel(
  type: BreakEvenAnalysisType,
  baseData: CalculationData
): BreakEvenResult {
  
  const config = BREAK_EVEN_CONFIGS[type];
  
  
  // Ajustar costos fijos según el tipo de análisis
  let adjustedCostosFijos = baseData.costosFijos;
  
  
  // Manejar depreciación según tipo de análisis
  if (!config.includeDepreciacion) {
    // Excluir depreciación (análisis de caja)
    adjustedCostosFijos -= baseData.depreciacion;
  }
  
  // Manejar intereses según tipo de análisis
  if (!config.includeIntereses) {
    // Excluir intereses (análisis operativo)
    adjustedCostosFijos -= baseData.intereses;
  }

  // Asegurar que no sea negativo
  adjustedCostosFijos = Math.max(0, adjustedCostosFijos);
  

  // Cálculos de punto de equilibrio
  const margenContribucion = baseData.ingresos - baseData.costosVariables;
  const margenContribucionPorc = baseData.ingresos > 0 ? margenContribucion / baseData.ingresos : 0;
  const puntoEquilibrio = margenContribucionPorc > 0 ? adjustedCostosFijos / margenContribucionPorc : 0;
  const utilidadNeta = baseData.ingresos - baseData.costosVariables - adjustedCostosFijos;


  // Cálculos específicos para métricas avanzadas
  const ebitda = baseData.ingresos - baseData.costosVariables - (adjustedCostosFijos - baseData.depreciacion);
  const ebit = ebitda - baseData.depreciacion;

  const result = {
    puntoEquilibrio,
    costosFijos: adjustedCostosFijos,
    costosVariables: baseData.costosVariables,
    ingresos: baseData.ingresos,
    margenContribucion,
    margenContribucionPorc,
    utilidadNeta,
    depreciacion: baseData.depreciacion,
    intereses: baseData.intereses,
    ebitda,
    ebit
  };

  return result;
}

// Función helper para simular escenarios en cualquier tipo de análisis
/**
 * Genera un número aleatorio a partir de una distribución normal (Box-Muller transform).
 * @param mean La media de la distribución.
 * @param stdDev La desviación estándar de la distribución.
 * @returns Un número aleatorio normalmente distribuido.
 */
function generateRandomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

/**
 * Genera un número aleatorio con distribución uniforme.
 * @param min Valor mínimo
 * @param max Valor máximo
 * @returns Número aleatorio entre min y max
 */
function generateRandomUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Genera un número aleatorio con distribución triangular.
 * @param min Valor mínimo
 * @param max Valor máximo
 * @param mode Valor más probable (moda)
 * @returns Número aleatorio con distribución triangular
 */
function generateRandomTriangular(min: number, max: number, mode: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);

  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

/**
 * Calcula estadísticas de un array de números.
 * @param values Array de números.
 * @returns Objeto con media, mediana, desviación estándar, min, max y percentiles.
 */
function calculateSimulationStatistics(values: number[]) {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, p10: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return { mean, median, stdDev, min, max, p10, p90 };
}

// Definición de tipos para los parámetros de simulación
type SimpleSimulationParams = {
  priceChange: number;
  fixedCostChange: number;
  variableCostRateChange: number;
};

type MonteCarloDistribution = {
  distribution: 'normal' | 'triangular' | 'uniform';
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  mode: number; // Solo para triangular
};

type MonteCarloSimulationParams = {
  numIterations: number;
  priceChange: MonteCarloDistribution;
  fixedCostChange: MonteCarloDistribution;
  variableCostRateChange: MonteCarloDistribution; // Monte Carlo aún opera sobre la tasa para simplicidad
};

// Sobrecargas de la función
export function simulateBreakEvenLevel(
  type: BreakEvenAnalysisType,
  baseResult: BreakEvenResult,
  params: SimpleSimulationParams
): BreakEvenResult;

export function simulateBreakEvenLevel(
  type: BreakEvenAnalysisType,
  baseResult: BreakEvenResult,
  params: MonteCarloSimulationParams
): {
  puntoEquilibrio: ReturnType<typeof calculateSimulationStatistics>;
  margenContribucionPorc: ReturnType<typeof calculateSimulationStatistics>;
  utilidadNeta: ReturnType<typeof calculateSimulationStatistics>;
  ebitda: ReturnType<typeof calculateSimulationStatistics>;
};

// Implementación de la función
export function simulateBreakEvenLevel(
  type: BreakEvenAnalysisType,
  baseResult: BreakEvenResult,
  params: SimpleSimulationParams | MonteCarloSimulationParams
): any {
  // Comprobar si es simulación Monte Carlo
  if ('numIterations' in params) {
    const simulationParams = params as MonteCarloSimulationParams;
    const peResults: number[] = [];
    const mcPercResults: number[] = [];
    const netProfitResults: number[] = [];
    const ebitdaResults: number[] = [];

    const getRandomValue = (p: MonteCarloDistribution) => {
      switch (p.distribution) {
        case 'triangular':
          return generateRandomTriangular(p.min, p.max, p.mode);
        case 'uniform':
          return generateRandomUniform(p.min, p.max);
        case 'normal':
        default:
          return generateRandomNormal(p.mean, p.stdDev);
      }
    };

    for (let i = 0; i < simulationParams.numIterations; i++) {
      const currentPriceChange = getRandomValue(simulationParams.priceChange);
      const currentFixedCostChange = getRandomValue(simulationParams.fixedCostChange);
      const currentVariableCostRateChange = getRandomValue(simulationParams.variableCostRateChange);

      const simulatedIngresos = baseResult.ingresos * (1 + currentPriceChange / 100);
      const simulatedCostosFijos = baseResult.costosFijos + currentFixedCostChange;
      
      const originalVariableCostRate = baseResult.ingresos > 0 ? baseResult.costosVariables / baseResult.ingresos : 0;
      const newVariableCostRate = originalVariableCostRate * (1 + currentVariableCostRateChange / 100);
      const simulatedCostosVariablesActuales = simulatedIngresos * newVariableCostRate;

      const margenContribucion = simulatedIngresos - simulatedCostosVariablesActuales;
      const margenContribucionPorc = simulatedIngresos > 0 ? margenContribucion / simulatedIngresos : 0;
      const puntoEquilibrio = margenContribucionPorc > 0 ? simulatedCostosFijos / margenContribucionPorc : 0;
      const utilidadNeta = simulatedIngresos - simulatedCostosVariablesActuales - simulatedCostosFijos;
      const ebitda = simulatedIngresos - simulatedCostosVariablesActuales - (simulatedCostosFijos - baseResult.depreciacion);

      peResults.push(puntoEquilibrio);
      mcPercResults.push(margenContribucionPorc);
      netProfitResults.push(utilidadNeta);
      ebitdaResults.push(ebitda);
    }

    return {
      puntoEquilibrio: calculateSimulationStatistics(peResults),
      margenContribucionPorc: calculateSimulationStatistics(mcPercResults),
      utilidadNeta: calculateSimulationStatistics(netProfitResults),
      ebitda: calculateSimulationStatistics(ebitdaResults),
    };
  }

  // Simulación Simple
  const simpleParams = params as SimpleSimulationParams;
  const ingresos = baseResult.ingresos * (1 + simpleParams.priceChange / 100);
  const costosFijos = baseResult.costosFijos + simpleParams.fixedCostChange;

  const originalVariableCostRate = baseResult.ingresos > 0 ? baseResult.costosVariables / baseResult.ingresos : 0;
  const newVariableCostRate = originalVariableCostRate * (1 + simpleParams.variableCostRateChange / 100);
  const costosVariables = ingresos * newVariableCostRate;

  const margenContribucion = ingresos - costosVariables;
  const margenContribucionPorc = ingresos > 0 ? margenContribucion / ingresos : 0;
  const puntoEquilibrio = margenContribucionPorc > 0 ? costosFijos / margenContribucionPorc : 0;
  const utilidadNeta = ingresos - costosVariables - costosFijos;
  const ebitda = ingresos - costosVariables - (costosFijos - baseResult.depreciacion);

  return {
    ...baseResult,
    ingresos,
    costosFijos,
    costosVariables,
    margenContribucion,
    margenContribucionPorc,
    puntoEquilibrio,
    utilidadNeta,
    ebitda,
  };
}
