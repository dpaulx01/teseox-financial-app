import { ProductBreakEven, MultiProductBreakEvenData, BreakEvenAnalysisType, ExtendedBreakEvenResult } from '../types';

/**
 * Calcula el análisis de punto de equilibrio para múltiples productos usando MCPP
 * (Margen de Contribución Promedio Ponderado)
 */
export function calculateMultiProductBreakEven(
  products: ProductBreakEven[],
  costosFijos: number,
  analysisType: BreakEvenAnalysisType,
  adjustedCostosFijos?: number
): MultiProductBreakEvenData {
  
  // Validaciones básicas
  if (!products || products.length === 0) {
    throw new Error('Debe proporcionar al menos un producto para el análisis');
  }

  const totalParticipacion = products.reduce((sum, p) => sum + p.participacionVentas, 0);
  if (Math.abs(totalParticipacion - 100) > 0.01) {
    throw new Error(`La participación total debe ser 100%. Actual: ${totalParticipacion.toFixed(2)}%`);
  }

  // Calcular MCPP (Margen de Contribución Promedio Ponderado)
  const mcppTotal = products.reduce((sum, product) => {
    const margenContribucion = product.margenContribucionUnitario;
    const peso = product.participacionVentas / 100;
    return sum + (margenContribucion * peso);
  }, 0);


  // Usar costos fijos ajustados si se proporcionan (para diferentes tipos de análisis)
  const costosFinalesAnalisis = adjustedCostosFijos || costosFijos;

  // Calcular punto de equilibrio total en unidades
  const breakEvenTotalUnidades = mcppTotal > 0 ? costosFinalesAnalisis / mcppTotal : 0;

  // Calcular punto de equilibrio por producto (unidades y valor)
  const breakEvenByProduct: Record<string, { unidades: number; valor: number }> = {};
  const salesMixActual: Record<string, number> = {};
  const rentabilidadByProduct: Record<string, number> = {};
  
  let breakEvenTotalValor = 0;

  products.forEach(product => {
    const unidadesParaEquilibrio = breakEvenTotalUnidades * (product.participacionVentas / 100);
    const valorParaEquilibrio = unidadesParaEquilibrio * product.precioVentaUnitario;
    
    breakEvenByProduct[product.productId] = {
      unidades: unidadesParaEquilibrio,
      valor: valorParaEquilibrio
    };
    
    salesMixActual[product.productId] = product.participacionVentas;
    
    // Calcular rentabilidad (margen de contribución como % del precio)
    rentabilidadByProduct[product.productId] = product.precioVentaUnitario > 0 
      ? (product.margenContribucionUnitario / product.precioVentaUnitario) * 100 
      : 0;
    
    breakEvenTotalValor += valorParaEquilibrio;
  });

  // Identificar el mix óptimo (productos con mayor rentabilidad primero)
  const salesMixOptimo: Record<string, number> = {};
  const productosOrdenadosPorRentabilidad = [...products]
    .sort((a, b) => {
      const rentA = a.precioVentaUnitario > 0 ? (a.margenContribucionUnitario / a.precioVentaUnitario) : 0;
      const rentB = b.precioVentaUnitario > 0 ? (b.margenContribucionUnitario / b.precioVentaUnitario) : 0;
      return rentB - rentA;
    });

  // Para el mix óptimo, dar más peso a productos más rentables
  // (Esta es una aproximación simple - en la práctica habría restricciones de mercado)
  let pesoRestante = 100;
  productosOrdenadosPorRentabilidad.forEach((product, index) => {
    if (index === productosOrdenadosPorRentabilidad.length - 1) {
      // Último producto toma el peso restante
      salesMixOptimo[product.productId] = Math.max(0, pesoRestante);
    } else {
      // Productos más rentables obtienen mayor participación
      const factorRentabilidad = rentabilidadByProduct[product.productId] / 100;
      const pesoSugerido = Math.min(
        pesoRestante * 0.4, // Máximo 40% para evitar concentración excesiva
        factorRentabilidad * 60 // Basado en rentabilidad
      );
      salesMixOptimo[product.productId] = Math.max(10, pesoSugerido); // Mínimo 10%
      pesoRestante -= salesMixOptimo[product.productId];
    }
  });

  return {
    products,
    mcppTotal,
    breakEvenTotalUnidades,
    breakEvenTotalValor,
    breakEvenByProduct,
    salesMixActual,
    salesMixOptimo,
    rentabilidadByProduct
  };
}

/**
 * Simula cambios en el mix de productos y calcula el nuevo punto de equilibrio
 */
export function simulateProductMixChange(
  products: ProductBreakEven[],
  newMix: Record<string, number>,
  costosFijos: number
): MultiProductBreakEvenData {
  
  // Crear nueva configuración de productos con el mix modificado
  const updatedProducts = products.map(product => ({
    ...product,
    participacionVentas: newMix[product.productId] || product.participacionVentas
  }));

  return calculateMultiProductBreakEven(updatedProducts, costosFijos, 'contable');
}

/**
 * Calcula el impacto de cambiar los precios de uno o más productos
 */
export function simulatePriceChange(
  products: ProductBreakEven[],
  priceChanges: Record<string, number>, // productId -> nuevo precio
  costosFijos: number
): MultiProductBreakEvenData {
  
  const updatedProducts = products.map(product => {
    const newPrice = priceChanges[product.productId];
    if (newPrice !== undefined) {
      return {
        ...product,
        precioVentaUnitario: newPrice,
        margenContribucionUnitario: newPrice - product.costoVariableUnitario
      };
    }
    return product;
  });

  return calculateMultiProductBreakEven(updatedProducts, costosFijos, 'contable');
}

/**
 * Optimiza el mix de productos para minimizar el punto de equilibrio
 * (Algoritmo simple - en la práctica se usaría programación lineal)
 */
export function optimizeProductMix(
  products: ProductBreakEven[],
  costosFijos: number,
  constraints?: {
    minParticipacion?: Record<string, number>; // Participación mínima por producto
    maxParticipacion?: Record<string, number>; // Participación máxima por producto
  }
): { optimalMix: Record<string, number>; improvement: number; analysis: MultiProductBreakEvenData } {
  
  // Ordenar productos por margen de contribución unitario (mayor a menor)
  const sortedProducts = [...products].sort((a, b) => b.margenContribucionUnitario - a.margenContribucionUnitario);
  
  const optimalMix: Record<string, number> = {};
  let remainingPercentage = 100;
  
  // Algoritmo greedy: asignar más peso a productos con mayor margen
  sortedProducts.forEach((product, index) => {
    const minConstraint = constraints?.minParticipacion?.[product.productId] || 5; // Mínimo 5%
    const maxConstraint = constraints?.maxParticipacion?.[product.productId] || 60; // Máximo 60%
    
    if (index === sortedProducts.length - 1) {
      // Último producto recibe el remanente
      optimalMix[product.productId] = Math.max(minConstraint, remainingPercentage);
    } else {
      // Calcular participación basada en rentabilidad relativa
      const totalMarginRemaining = sortedProducts.slice(index).reduce((sum, p) => sum + p.margenContribucionUnitario, 0);
      const relativeWeight = totalMarginRemaining > 0 ? product.margenContribucionUnitario / totalMarginRemaining : 0;
      
      let suggestedParticipation = remainingPercentage * relativeWeight * 0.7; // Factor de suavizado
      suggestedParticipation = Math.max(minConstraint, Math.min(maxConstraint, suggestedParticipation));
      
      optimalMix[product.productId] = suggestedParticipation;
      remainingPercentage -= suggestedParticipation;
    }
  });

  // Calcular el análisis con el mix optimizado
  const optimizedAnalysis = simulateProductMixChange(products, optimalMix, costosFijos);
  const currentAnalysis = calculateMultiProductBreakEven(products, costosFijos, 'contable');
  
  // Calcular mejora (reducción en punto de equilibrio)
  const improvement = currentAnalysis.breakEvenTotalUnidades > 0 
    ? ((currentAnalysis.breakEvenTotalUnidades - optimizedAnalysis.breakEvenTotalUnidades) / currentAnalysis.breakEvenTotalUnidades) * 100
    : 0;

  return {
    optimalMix,
    improvement,
    analysis: optimizedAnalysis
  };
}

/**
 * Calcula el análisis de sensibilidad para múltiples productos
 */
export function multiProductSensitivityAnalysis(
  products: ProductBreakEven[],
  costosFijos: number,
  scenarios: {
    name: string;
    priceChanges?: Record<string, number>; // % de cambio
    costChanges?: Record<string, number>; // % de cambio en costos variables
    mixChanges?: Record<string, number>; // nueva participación
  }[]
): Array<{
  scenario: string;
  analysis: MultiProductBreakEvenData;
  impactVsBase: {
    breakEvenUnits: number; // % cambio
    breakEvenValue: number; // % cambio
    mcpp: number; // % cambio
  };
}> {
  
  const baseAnalysis = calculateMultiProductBreakEven(products, costosFijos, 'contable');
  
  return scenarios.map(scenario => {
    let modifiedProducts = [...products];
    
    // Aplicar cambios de precios
    if (scenario.priceChanges) {
      modifiedProducts = modifiedProducts.map(product => {
        const priceChange = scenario.priceChanges![product.productId];
        if (priceChange !== undefined) {
          const newPrice = product.precioVentaUnitario * (1 + priceChange / 100);
          return {
            ...product,
            precioVentaUnitario: newPrice,
            margenContribucionUnitario: newPrice - product.costoVariableUnitario
          };
        }
        return product;
      });
    }
    
    // Aplicar cambios de costos
    if (scenario.costChanges) {
      modifiedProducts = modifiedProducts.map(product => {
        const costChange = scenario.costChanges![product.productId];
        if (costChange !== undefined) {
          const newCost = product.costoVariableUnitario * (1 + costChange / 100);
          return {
            ...product,
            costoVariableUnitario: newCost,
            margenContribucionUnitario: product.precioVentaUnitario - newCost
          };
        }
        return product;
      });
    }
    
    // Aplicar cambios de mix
    if (scenario.mixChanges) {
      modifiedProducts = modifiedProducts.map(product => ({
        ...product,
        participacionVentas: scenario.mixChanges![product.productId] || product.participacionVentas
      }));
    }
    
    const scenarioAnalysis = calculateMultiProductBreakEven(modifiedProducts, costosFijos, 'contable');
    
    // Calcular impacto vs base
    const impactVsBase = {
      breakEvenUnits: baseAnalysis.breakEvenTotalUnidades > 0 
        ? ((scenarioAnalysis.breakEvenTotalUnidades - baseAnalysis.breakEvenTotalUnidades) / baseAnalysis.breakEvenTotalUnidades) * 100 
        : 0,
      breakEvenValue: baseAnalysis.breakEvenTotalValor > 0 
        ? ((scenarioAnalysis.breakEvenTotalValor - baseAnalysis.breakEvenTotalValor) / baseAnalysis.breakEvenTotalValor) * 100 
        : 0,
      mcpp: baseAnalysis.mcppTotal > 0 
        ? ((scenarioAnalysis.mcppTotal - baseAnalysis.mcppTotal) / baseAnalysis.mcppTotal) * 100 
        : 0
    };
    
    return {
      scenario: scenario.name,
      analysis: scenarioAnalysis,
      impactVsBase
    };
  });
}