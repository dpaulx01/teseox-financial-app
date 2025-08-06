
import { FinancialData, MixedCost } from '../types';
import { parseNumericValue } from './formatters';
import { ACCOUNT_PATTERNS, BREAK_EVEN_CONFIGS } from '../constants/breakEvenConfig';
import { analysisConfigService } from '../services/analysisConfigService';
import { intelligentPatternMatcher } from './intelligentPatternMatcher';

/**
 * Valida la integridad de los datos financieros antes del cálculo de PyG
 */
function validatePnlData(data: FinancialData, month: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data) {
    errors.push('Datos financieros no disponibles');
    return { isValid: false, errors };
  }

  // Validar estructura de datos
  if (!data.yearly && !data.monthly) {
    errors.push('No se encontraron datos anuales ni mensuales');
  }

  // Validar mes seleccionado
  if (month !== 'Anual' && data.monthly && !data.monthly[month]) {
    errors.push(`No se encontraron datos para el mes: ${month}`);
  }

  // Validar que existan cuentas de ingresos (4) y costos (5) en los datos raw
  if (data.raw && Array.isArray(data.raw)) {
    const hasIngresos = data.raw.some(row => row['COD.'] && row['COD.'].toString().startsWith('4'));
    const hasCostos = data.raw.some(row => row['COD.'] && row['COD.'].toString().startsWith('5'));
    
    if (!hasIngresos) {
      // console.warn('No se encontraron cuentas de ingresos (código 4)');
    }
    if (!hasCostos) {
      // console.warn('No se encontraron cuentas de costos (código 5)');
    }
  } else if (data.raw) {
    // console.warn('Los datos raw no están en formato de array:', typeof data.raw);
  } else {
    // console.warn('No se encontraron datos raw para validación');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Define la estructura de un nodo en el árbol de cuentas del PyG.
 */
export interface AccountNode {
  code: string;
  name: string;
  value: number;
  children: AccountNode[];
  // Futuro: añadir análisis vertical/horizontal aquí
  verticalPercentage?: number;
  horizontalChange?: {
    absolute: number;
    percentage: number;
  };
  // Flag para indicar si el nodo está excluido en esta vista
  excluded?: boolean;
  // Valor original antes de exclusión (para mostrar tachado)
  originalValue?: number;
  // Nivel de profundidad en el árbol (0 = raíz)
  level?: number;
  // Porcentaje sobre el total de su categoría
  categoryPercentage?: number;
}

/**
 * Define la estructura del resultado de los cálculos del PyG.
 */
export interface PnlResult {
  waterfallData: Array<{ name: string; value: number; isTotal?: boolean }>;
  treeData: AccountNode[];
  summaryKpis: {
    ingresos: number;
    costos: number;
    utilidad: number;
  };
  analysisType: 'contable' | 'operativo' | 'caja' | 'ebitda';
}

/**
 * Tipos de vistas de análisis para el PyG.
 */
export type PnlViewType = 'contable' | 'operativo' | 'caja' | 'ebitda';

/**
 * Función principal para calcular el estado de resultados (PyG) desde múltiples perspectivas.
 *
 * @param financialData Los datos financieros completos de la aplicación.
 * @param month El mes (o 'Anual') para el cual se calculará el PyG.
 * @param viewType El tipo de análisis a realizar (contable, operativo, caja, ebitda).
 * @param mixedCostsConfig (Opcional) Configuración de costos mixtos para ajustar los cálculos.
 * @param companyId (Opcional) ID de la empresa para configuración específica.
 * @returns Un objeto PnlResult con los datos calculados para la vista especificada.
 */
export async function calculatePnl(
  financialData: FinancialData,
  month: string,
  viewType: PnlViewType,
  mixedCostsConfig?: MixedCost[],
  companyId?: number
): Promise<PnlResult> {
  // Validar datos antes de procesar
  const validation = validatePnlData(financialData, month);
  if (!validation.isValid) {
    // console.warn('P&L Data validation failed:', validation.errors);
  }

  const { raw, monthly, yearly } = financialData;

  // Determinar los datos del período a utilizar
  const periodData = month === 'Anual' ? yearly : monthly[month];
  if (!periodData) {
    throw new Error(`No financial data found for period: ${month}`);
  }

  // Construir árbol básico
  const treeData = buildAccountTree(raw, month, viewType, mixedCostsConfig);
  
  // Aplicar ajustes según el tipo de vista (usando configuración por defecto como fallback)
  const adjustedTreeData = applyViewAdjustments(treeData, viewType, companyId);

  // Lógica para generar los datos del gráfico de cascada
  const waterfallData = buildWaterfallData(adjustedTreeData, viewType);
  
  // Lógica para calcular los KPIs de resumen
  const summaryKpis = calculateSummaryKpis(adjustedTreeData, viewType);

  return {
    waterfallData,
    treeData: adjustedTreeData,
    summaryKpis,
    analysisType: viewType,
    // Agregar clave única para forzar re-render
    _calculatedAt: Date.now(),
    _viewKey: `${viewType}_${month}_${Date.now()}`
  };
}

export function calculateVerticalAnalysis(pnlResult: PnlResult): PnlResult {
  const totalIngresos = pnlResult.summaryKpis.ingresos;
  if (totalIngresos === 0) return pnlResult;

  function addVerticalPercentage(node: AccountNode): AccountNode {
    node.verticalPercentage = (node.value / totalIngresos) * 100;
    node.children = node.children.map(addVerticalPercentage);
    return node;
  }

  pnlResult.treeData = pnlResult.treeData.map(addVerticalPercentage);
  return pnlResult;
}

export function calculateHorizontalAnalysis(currentPnl: PnlResult, previousPnl: PnlResult): PnlResult {
  function addHorizontalChange(currentNode: AccountNode, previousNode?: AccountNode): AccountNode {
    if (previousNode) {
      const absolute = currentNode.value - previousNode.value;
      const percentage = previousNode.value !== 0 ? (absolute / previousNode.value) * 100 : 0;
      currentNode.horizontalChange = { absolute, percentage };
    }
    currentNode.children = currentNode.children.map(child => {
      const prevChild = previousNode?.children.find(p => p.code === child.code);
      return addHorizontalChange(child, prevChild);
    });
    return currentNode;
  }

  currentPnl.treeData = currentPnl.treeData.map(node => {
    const prevNode = previousPnl.treeData.find(p => p.code === node.code);
    return addHorizontalChange(node, prevNode);
  });

  return currentPnl;
}

/**
 * Función async para calcular PyG con configuración dinámica de base de datos
 */
export async function calculatePnlWithConfig(
  financialData: FinancialData,
  month: string,
  viewType: PnlViewType,
  mixedCostsConfig?: MixedCost[],
  companyId?: number
): Promise<PnlResult> {
  try {
    // Obtener configuración dinámica de la base de datos
    const config = await analysisConfigService.getConfigForFrontend(companyId);
    
    // Usar la función asíncrona con configuración dinámica
    return await calculatePnlWithDynamicConfig(financialData, month, viewType, mixedCostsConfig, config);
    
  } catch (error) {
    console.warn('Error al obtener configuración dinámica, usando configuración por defecto:', error);
    // Fallback a configuración estática
    return calculatePnl(financialData, month, viewType, mixedCostsConfig, companyId);
  }
}

/**
 * Función para calcular PyG con configuración específica (síncrona)
 */
export async function calculatePnlWithDynamicConfig(
  financialData: FinancialData,
  month: string,
  viewType: PnlViewType,
  mixedCostsConfig?: MixedCost[],
  config?: any
): Promise<PnlResult> {
  // Validar datos antes de procesar
  const validation = validatePnlData(financialData, month);
  if (!validation.isValid) {
    // console.warn('P&L Data validation failed:', validation.errors);
  }

  const { raw, monthly, yearly } = financialData;

  // Determinar los datos del período a utilizar
  const periodData = month === 'Anual' ? yearly : monthly[month];
  if (!periodData) {
    throw new Error(`No financial data found for period: ${month}`);
  }

  // Construir árbol básico
  const treeData = buildAccountTree(raw, month, viewType, mixedCostsConfig);
  
  // Aplicar ajustes con SISTEMA HÍBRIDO INTELIGENTE (prioridad)
  const adjustedTreeData = await applyViewAdjustmentsIntelligent(treeData, viewType);

  // Lógica para generar los datos del gráfico de cascada
  const waterfallData = buildWaterfallData(adjustedTreeData, viewType);
  
  // Lógica para calcular los KPIs de resumen
  const summaryKpis = calculateSummaryKpis(adjustedTreeData, viewType);

  return {
    waterfallData,
    treeData: adjustedTreeData,
    summaryKpis,
    analysisType: viewType,
    // Agregar clave única para forzar re-render
    _calculatedAt: Date.now(),
    _viewKey: `${viewType}_${month}_${Date.now()}`
  };
}

// Función para aplicar ajustes según el tipo de vista (configuración estática - fallback)
function applyViewAdjustments(treeData: AccountNode[], viewType: PnlViewType, companyId?: number): AccountNode[] {
  if (viewType === 'contable') {
    // Vista contable: mostrar todo sin exclusiones
    return treeData;
  }

  // Clonar el árbol PROFUNDAMENTE para forzar re-render en React
  const clonedTree = structuredClone ? structuredClone(treeData) : JSON.parse(JSON.stringify(treeData)) as AccountNode[];
  
  // Función para marcar nodos como excluidos usando configuración
  function markExcludedNodes(node: AccountNode) {
    const nameLower = node.name.toLowerCase();
    
    // Guardar valor original antes de cualquier exclusión
    node.originalValue = node.value;
    
    // Obtener configuración del tipo de análisis
    const config = BREAK_EVEN_CONFIGS[viewType as keyof typeof BREAK_EVEN_CONFIGS];
    if (!config) {
      // Procesar hijos recursivamente
      node.children.forEach(markExcludedNodes);
      return;
    }
    
    // Verificar si debe excluir depreciación/amortización
    if (!config.includeDepreciacion) {
      if (ACCOUNT_PATTERNS.depreciacion.some(pattern => nameLower.includes(pattern.toLowerCase()))) {
        node.excluded = true;
      }
    }
    
    // Verificar si debe excluir intereses
    if (!config.includeIntereses) {
      if (ACCOUNT_PATTERNS.intereses.some(pattern => nameLower.includes(pattern.toLowerCase()))) {
        node.excluded = true;
      }
    }
    
    // Procesar hijos recursivamente
    node.children.forEach(markExcludedNodes);
  }
  
  // Función para recalcular valores excluyendo nodos marcados
  function recalculateValues(node: AccountNode): number {
    if (node.excluded) {
      // Mantener el valor original para mostrar tachado, pero retornar 0 para el cálculo
      return 0;
    }
    
    if (node.children.length > 0) {
      const originalValue = node.value;
      // Recalcular sumando solo hijos no excluidos
      const newValue = node.children.reduce((sum, child) => {
        return sum + recalculateValues(child);
      }, 0);
      
      // IMPORTANTE: Forzar re-render cambiando propiedades del objeto
      node.value = newValue;
      node.originalValue = originalValue;
      (node as any)._updated = Date.now() + Math.random(); // Fuerza re-render único
      (node as any).key = `${node.code}_${viewType}_${Date.now()}`; // Key único para React
      
      return newValue;
    }
    
    return node.value;
  }
  
  // Aplicar exclusiones y recalcular
  clonedTree.forEach(node => {
    markExcludedNodes(node);
    recalculateValues(node);
  });
  
  return clonedTree;
}

// Función para aplicar ajustes con SISTEMA HÍBRIDO INTELIGENTE
async function applyViewAdjustmentsIntelligent(treeData: AccountNode[], viewType: PnlViewType): Promise<AccountNode[]> {
  if (viewType === 'contable') {
    // Vista contable: mostrar todo sin exclusiones
    return treeData;
  }

  // Crear copia profunda para no modificar los datos originales
  const clonedTree = JSON.parse(JSON.stringify(treeData));

  // Obtener configuración del análisis
  const analysisConfig = BREAK_EVEN_CONFIGS[viewType];
  
  // Función para marcar nodos como excluidos usando SISTEMA INTELIGENTE
  async function markExcludedNodesIntelligent(node: AccountNode) {
    // Guardar valor original antes de cualquier exclusión
    node.originalValue = node.value;
    
    // Verificar depreciación con sistema inteligente
    if (!analysisConfig.includeDepreciacion) {
      const shouldExclude = await intelligentPatternMatcher.shouldExclude(node.name, 'depreciacion');
      if (shouldExclude) {
        node.excluded = true;
        // Log para debug (opcional)
        console.log(`🧠 Excluido por depreciación (inteligente): ${node.name}`);
      }
    }
    
    // Verificar intereses con sistema inteligente
    if (!analysisConfig.includeIntereses) {
      const shouldExclude = await intelligentPatternMatcher.shouldExclude(node.name, 'intereses');
      if (shouldExclude) {
        node.excluded = true;
        // Log para debug (opcional)
        console.log(`🧠 Excluido por intereses (inteligente): ${node.name}`);
      }
    }
    
    // Procesar hijos recursivamente
    for (const child of node.children) {
      await markExcludedNodesIntelligent(child);
    }
  }
  
  // Función para recalcular valores excluyendo nodos marcados
  function recalculateValues(node: AccountNode): number {
    if (node.excluded) {
      // Mantener el valor original para mostrar tachado, pero retornar 0 para el cálculo
      return 0;
    }
    
    if (node.children.length > 0) {
      // Para nodos padre, recalcular sumando hijos no excluidos
      const originalValue = node.value;
      let newValue = 0;
      node.children.forEach(child => {
        newValue += recalculateValues(child);
      });
      
      // FORZAR UPDATE: Solo actualizar si el valor cambió
      if (node.value !== newValue) {
        node.value = newValue;
        // Forzar re-render con propiedades únicas
        (node as any)._recalculated = Date.now() + Math.random();
        (node as any)._parentUpdated = true;
        console.log(`🔄 Padre actualizado ${node.code}: ${originalValue} → ${newValue}`);
      }
      
      return newValue;
    }
    
    // Para nodos hoja, usar valor original
    return node.value;
  }
  
  // Marcar nodos excluidos usando sistema inteligente
  for (const rootNode of clonedTree) {
    await markExcludedNodesIntelligent(rootNode);
  }
  
  // Recalcular valores después de exclusiones
  clonedTree.forEach(rootNode => {
    recalculateValues(rootNode);
  });
  
  return clonedTree;
}

// Función para aplicar ajustes con configuración dinámica de base de datos (LEGACY - mantener como fallback)
function applyViewAdjustmentsWithConfig(treeData: AccountNode[], viewType: PnlViewType, config: any): AccountNode[] {
  if (viewType === 'contable') {
    // Vista contable: mostrar todo sin exclusiones
    return treeData;
  }

  // Clonar el árbol PROFUNDAMENTE para forzar re-render en React
  const clonedTree = structuredClone ? structuredClone(treeData) : JSON.parse(JSON.stringify(treeData)) as AccountNode[];
  
  // Obtener configuración de exclusión para este tipo de análisis
  const analysisConfig = config.breakEvenConfigs[viewType];
  const patterns = config.accountPatterns;
  
  if (!analysisConfig || !patterns) {
    console.warn('Configuración de análisis no encontrada, usando configuración por defecto');
    return applyViewAdjustments(treeData, viewType);
  }
  
  // Función para marcar nodos como excluidos usando configuración dinámica
  function markExcludedNodes(node: AccountNode) {
    const nameLower = node.name.toLowerCase();
    
    // Guardar valor original antes de cualquier exclusión
    node.originalValue = node.value;
    
    // Verificar si debe excluir depreciación/amortización
    if (!analysisConfig.includeDepreciacion && patterns.depreciacion) {
      if (patterns.depreciacion.some((pattern: string) => nameLower.includes(pattern.toLowerCase()))) {
        node.excluded = true;
      }
    }
    
    // Verificar si debe excluir intereses
    if (!analysisConfig.includeIntereses && patterns.intereses) {
      if (patterns.intereses.some((pattern: string) => nameLower.includes(pattern.toLowerCase()))) {
        node.excluded = true;
      }
    }
    
    // Verificar si debe excluir impuestos (para análisis futuros)
    if (patterns.impuestos && analysisConfig.includeImpuestos === false) {
      if (patterns.impuestos.some((pattern: string) => nameLower.includes(pattern.toLowerCase()))) {
        node.excluded = true;
      }
    }
    
    // Procesar hijos recursivamente
    node.children.forEach(markExcludedNodes);
  }
  
  // Función para recalcular valores excluyendo nodos marcados
  function recalculateValues(node: AccountNode): number {
    if (node.excluded) {
      // Mantener el valor original para mostrar tachado, pero retornar 0 para el cálculo
      return 0;
    }
    
    if (node.children.length > 0) {
      const originalValue = node.value;
      // Recalcular sumando solo hijos no excluidos
      const newValue = node.children.reduce((sum, child) => {
        return sum + recalculateValues(child);
      }, 0);
      
      // IMPORTANTE: Forzar re-render cambiando propiedades del objeto
      node.value = newValue;
      node.originalValue = originalValue;
      (node as any)._updated = Date.now() + Math.random(); // Fuerza re-render único
      (node as any).key = `${node.code}_${viewType}_${Date.now()}`; // Key único para React
      
      return newValue;
    }
    
    return node.value;
  }
  
  // Aplicar exclusiones y recalcular
  clonedTree.forEach(node => {
    markExcludedNodes(node);
    recalculateValues(node);
  });
  
  return clonedTree;
}

// --- Funciones Auxiliares ---

function buildAccountTree(
  raw: any[],
  month: string,
  viewType: PnlViewType,
  mixedCostsConfig?: MixedCost[]
): AccountNode[] {
  const nodes: { [code: string]: AccountNode } = {};
  const rootNodes: AccountNode[] = [];
  const mixedCostMap = new Map(mixedCostsConfig?.map(mc => [mc.accountCode, mc]));

  // 1. Crear todos los nodos
  raw.forEach(row => {
    const code = (row['COD.'] || '').toString().trim();
    const accountName = row['CUENTA'] || '';
    
    if (!code) return; // Ignorar filas sin código
    
    const node: AccountNode = {
      code,
      name: accountName,
      value: 0,
      children: [],
    };

    nodes[code] = node;
  });

  // 2. Construir la jerarquía basada en notación de puntos (4, 4.1, 4.1.1, 4.1.1.1)
  Object.keys(nodes).forEach(code => {
    const node = nodes[code];
    
    // Encontrar el código padre quitando el último segmento después del último punto
    const lastDotIndex = code.lastIndexOf('.');
    const parentCode = lastDotIndex > -1 ? code.substring(0, lastDotIndex) : '';
    
    if (parentCode && nodes[parentCode]) {
      // Es un hijo, agregarlo al padre
      nodes[parentCode].children.push(node);
    } else {
      // Es un nodo raíz (como "4", "5", "6")
      rootNodes.push(node);
    }
  });

  // 3. Ordenar los hijos por código para mantener orden lógico
  function sortChildren(node: AccountNode) {
    node.children.sort((a, b) => {
      // Comparar segmento por segmento para orden correcto
      const aParts = a.code.split('.').map(p => parseInt(p) || 0);
      const bParts = b.code.split('.').map(p => parseInt(p) || 0);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
    
    // Recursivamente ordenar hijos de hijos
    node.children.forEach(sortChildren);
  }
  
  rootNodes.forEach(sortChildren);

  // 4. Calcular valores - IMPORTANTE: de abajo hacia arriba
  function calculateNodeValues(node: AccountNode): number {
    const code = node.code;
    
    // Primero, calcular recursivamente los valores de todos los hijos
    const childrenSum = node.children.reduce((sum, child) => {
      return sum + calculateNodeValues(child);
    }, 0);
    
    // Si el nodo tiene hijos, su valor es la suma de los hijos
    if (node.children.length > 0) {
      node.value = childrenSum;
    } else {
      // Es una cuenta de detalle (hoja), calcular su valor desde los datos raw
      const rowData = raw.find(r => (r['COD.'] || '').toString().trim() === code);
      if (rowData) {
        let nodeValue = calculateNodeValue(rowData, month);
        
        // Aplicar configuración de costos mixtos si existe
        if (mixedCostMap.has(code)) {
          const mc = mixedCostMap.get(code)!;
          // Por ahora mantener el valor, pero aquí se puede aplicar lógica de costos mixtos
          nodeValue = nodeValue;
        }
        
        node.value = nodeValue;
      }
    }
    
    return node.value;
  }
  
  // Calcular valores para todos los árboles
  rootNodes.forEach(calculateNodeValues);
  
  // Ordenar nodos raíz por código
  rootNodes.sort((a, b) => {
    const aNum = parseInt(a.code) || 0;
    const bNum = parseInt(b.code) || 0;
    return aNum - bNum;
  });

  return rootNodes;
}

function calculateNodeValue(row: any, month: string): number {
  if (month === 'Anual') {
    return Object.keys(row).reduce((sum, key) => {
      if (key !== 'COD.' && key !== 'CUENTA') {
        return sum + parseNumericValue(row[key]);
      }
      return sum;
    }, 0);
  } else {
    const value = parseNumericValue(row[month] || '0');
    
    // DEBUG: Solo para las primeras filas
    if ((row['COD.'] === '4' || row['COD.'] === '5') && Math.random() < 0.1) {
      console.log(`🔍 calculateNodeValue DEBUG:`, {
        code: row['COD.'],
        cuenta: row['CUENTA'],
        monthSearched: month,
        rowKeys: Object.keys(row),
        rawValue: row[month],
        parsedValue: value,
        hasEnero: !!row['Enero'],
        hasEneroLower: !!row['enero'],
        hasMayo: !!row['Mayo'],
        hasMayoLower: !!row['mayo']
      });
    }
    
    return value;
  }
}


function buildWaterfallData(treeData: AccountNode[], viewType: PnlViewType): any[] {
  const ingresosNode = treeData.find(n => n.code === '4');
  const costosNode = treeData.find(n => n.code === '5');

  const ingresos = ingresosNode ? ingresosNode.value : 0;
  const costos = costosNode ? costosNode.value : 0;

  const utilidad = ingresos - costos;

  // Vista clásica simple de Estado de Resultados
  return [
    { name: 'Ingresos', value: ingresos },
    { name: 'Costos y Gastos', value: -costos },
    { name: 'Utilidad/Pérdida', value: utilidad, isTotal: true },
  ];
}

function calculateSummaryKpis(treeData: AccountNode[], viewType: PnlViewType): PnlResult['summaryKpis'] {
  const ingresosNode = treeData.find(n => n.code === '4');
  const costosNode = treeData.find(n => n.code === '5');

  const ingresos = ingresosNode ? ingresosNode.value : 0;
  const costos = costosNode ? Math.abs(costosNode.value) : 0;
  const utilidad = ingresos - costos;

  return { ingresos, costos, utilidad };
}

// Función auxiliar para calcular el total de cuentas que coinciden con un patrón
function calcularTotalPorPatron(treeData: AccountNode[], patterns: string[]): number {
  let total = 0;
  
  function buscarEnNodos(nodes: AccountNode[]) {
    nodes.forEach(node => {
      const nameLower = node.name.toLowerCase();
      const coincide = patterns.some(pattern => nameLower.includes(pattern.toLowerCase()));
      
      if (coincide) {
        total += node.value;
      }
      
      if (node.children.length > 0) {
        buscarEnNodos(node.children);
      }
    });
  }
  
  buscarEnNodos(treeData);
  return total;
}

