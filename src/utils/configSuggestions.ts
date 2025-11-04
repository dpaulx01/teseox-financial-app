import { FinancialData, ProductionData, ProductionConfig } from '../types';

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

export const suggestConfigValues = (
  financialData: FinancialData,
  productionData: ProductionData[],
): Partial<ProductionConfig> => {
  const suggestions: Partial<ProductionConfig> = {};

  const metrosProducidos = productionData
    .map((prod) => safeNumber(prod.metrosProducidos))
    .filter((value) => value > 0);

  if (metrosProducidos.length) {
    const p90 = percentile(metrosProducidos, 90) ?? Math.max(...metrosProducidos);
    const average = metrosProducidos.reduce((sum, value) => sum + value, 0) / metrosProducidos.length;
    const capacityTarget = Math.max(p90 * 1.05, average * 1.1);
    suggestions.capacidadMaximaMensual = Math.ceil(capacityTarget);
  }

  if (productionData.length) {
    let totalIngresos = 0;
    let totalVendidos = 0;

    productionData.forEach((prod) => {
      const monthFinancial = financialData.monthly[prod.month];
      const metrosVendidos = safeNumber(prod.metrosVendidos);
      if (monthFinancial && metrosVendidos > 0) {
        totalIngresos += monthFinancial.ingresos;
        totalVendidos += metrosVendidos;
      }
    });

    if (totalVendidos > 0) {
      const precioPromedio = totalIngresos / totalVendidos;
      suggestions.metaPrecioPromedio = Math.round(precioPromedio * 1.05);
    }
  }

  const margins: number[] = [];
  productionData.forEach((prod) => {
    const monthFinancial = financialData.monthly[prod.month];
    const metrosVendidos = safeNumber(prod.metrosVendidos);
    const metrosProducidos = safeNumber(prod.metrosProducidos);
    if (monthFinancial && metrosVendidos > 0 && metrosProducidos > 0) {
      const ingresos = monthFinancial.ingresos;
      const costosVariables = safeNumber(monthFinancial.costosVariables);
      const gastosOperativos = safeNumber(monthFinancial.gastosOperativos);
      const gastosAdmin = safeNumber(monthFinancial.gastosAdminTotal ?? monthFinancial.gastosAdmin);
      const costoProduccion = costosVariables + gastosOperativos + gastosAdmin;
      if (ingresos > 0) {
        const margen = ((ingresos - costoProduccion) / ingresos) * 100;
        if (Number.isFinite(margen)) {
          margins.push(margen);
        }
      }
    }
  });

  if (margins.length) {
    const avgMargin = margins.reduce((sum, value) => sum + value, 0) / margins.length;
    suggestions.metaMargenMinimo = Math.round(Math.max(avgMargin, 20));
  }

  const monthlyEntries = Object.values(financialData.monthly || {});
  if (monthlyEntries.length) {
    const fixedCosts = monthlyEntries
      .map((month) => safeNumber(month.costosFijos ?? month.gastosOperativos))
      .filter((value) => value > 0);
    if (fixedCosts.length) {
      const averageFixedCost = fixedCosts.reduce((sum, value) => sum + value, 0) / fixedCosts.length;
      suggestions.costoFijoProduccion = Math.round(averageFixedCost);
    }
  }

  return suggestions;
};

export const validateSuggestions = (suggestions: Partial<ProductionConfig>): string[] => {
  const warnings: string[] = [];

  if (suggestions.capacidadMaximaMensual && suggestions.capacidadMaximaMensual < 200) {
    warnings.push('⚠️ Capacidad máxima sugerida parece muy baja frente al histórico');
  }

  if (suggestions.metaPrecioPromedio && suggestions.metaPrecioPromedio < 50) {
    warnings.push('⚠️ Meta de precio parece muy baja');
  }

  if (suggestions.metaMargenMinimo && suggestions.metaMargenMinimo > 55) {
    warnings.push('⚠️ Meta de margen parece muy alta');
  }

  return warnings;
};
