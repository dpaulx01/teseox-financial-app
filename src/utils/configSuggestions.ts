import { FinancialData, ProductionData, ProductionConfig } from '../types';

// === FUNCIÓN PARA SUGERIR VALORES BASADOS EN DATOS REALES ===

export const suggestConfigValues = (
  financialData: FinancialData, 
  productionData: ProductionData[]
): Partial<ProductionConfig> => {
  
  const suggestions: Partial<ProductionConfig> = {};
  
  // 1. CAPACIDAD MÁXIMA MENSUAL
  // Basada en el máximo de metros producidos + 20% buffer
  if (productionData.length > 0) {
    const maxProduccion = Math.max(...productionData.map(p => p.metrosProducidos));
    suggestions.capacidadMaximaMensual = Math.ceil(maxProduccion * 1.2);
  }
  
  // 2. META PRECIO PROMEDIO
  // Basada en el precio promedio actual de todos los meses
  if (productionData.length > 0 && financialData) {
    let totalIngresos = 0;
    let totalVendidos = 0;
    
    productionData.forEach(prod => {
      const monthFinancial = financialData.monthly[prod.month];
      if (monthFinancial && prod.metrosVendidos > 0) {
        totalIngresos += monthFinancial.ingresos;
        totalVendidos += prod.metrosVendidos;
      }
    });
    
    if (totalVendidos > 0) {
      const precioPromedioActual = totalIngresos / totalVendidos;
      // Sugerir 5% más que el promedio actual como meta
      suggestions.metaPrecioPromedio = Math.ceil(precioPromedioActual * 1.05);
    }
  }
  
  // 3. META MARGEN MÍNIMO
  // Basada en el margen promedio actual
  if (productionData.length > 0 && financialData) {
    let totalMargen = 0;
    let conteoMeses = 0;
    
    productionData.forEach(prod => {
      const monthFinancial = financialData.monthly[prod.month];
      if (monthFinancial && prod.metrosVendidos > 0 && prod.metrosProducidos > 0) {
        // Calcular costos totales correctamente
        const costosTotal = monthFinancial.costoVentasTotal + 
                           monthFinancial.gastosOperativos;
        
        const costoProduccionPorMetro = costosTotal / prod.metrosProducidos;
        const precioVentaPorMetro = monthFinancial.ingresos / prod.metrosVendidos;
        
        if (precioVentaPorMetro > 0) {
          const margenPorcentual = ((precioVentaPorMetro - costoProduccionPorMetro) / precioVentaPorMetro) * 100;
          totalMargen += margenPorcentual;
          conteoMeses++;
        }
      }
    });
    
    if (conteoMeses > 0) {
      const margenPromedio = totalMargen / conteoMeses;
      // Si el margen promedio es bueno (>15%), mantenerlo como meta
      // Si es bajo, sugerir 20% como meta realista
      suggestions.metaMargenMinimo = margenPromedio > 15 ? 
        Math.round(margenPromedio) : 20;
    }
  }
  
  // 4. COSTO FIJO DE PRODUCCIÓN
  // Basado en el promedio de gastos operativos
  if (financialData) {
    const mesesConDatos = Object.keys(financialData.monthly);
    if (mesesConDatos.length > 0) {
      let totalGastosOperativos = 0;
      
      mesesConDatos.forEach(mes => {
        totalGastosOperativos += financialData.monthly[mes].gastosOperativos;
      });
      
      const promedioGastosOperativos = totalGastosOperativos / mesesConDatos.length;
      suggestions.costoFijoProduccion = Math.ceil(promedioGastosOperativos);
    }
  }
  
  // console.log('💡 Sugerencias calculadas:', suggestions);
  return suggestions;
};

// === FUNCIÓN PARA VALIDAR SUGERENCIAS ===

export const validateSuggestions = (suggestions: Partial<ProductionConfig>): string[] => {
  const warnings: string[] = [];
  
  if (suggestions.capacidadMaximaMensual && suggestions.capacidadMaximaMensual < 100) {
    warnings.push('⚠️ Capacidad máxima parece muy baja');
  }
  
  if (suggestions.metaPrecioPromedio && suggestions.metaPrecioPromedio < 50) {
    warnings.push('⚠️ Meta de precio parece muy baja');
  }
  
  if (suggestions.metaMargenMinimo && suggestions.metaMargenMinimo > 50) {
    warnings.push('⚠️ Meta de margen parece muy alta');
  }
  
  return warnings;
};