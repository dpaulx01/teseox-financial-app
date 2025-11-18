import { ProductionData, OperationalMetrics, ProductionConfig, CombinedData } from '../types';
import { log } from './logger';
import { apiPath } from '../config/apiBaseUrl';
import TenantStorage from './tenantStorage';

const productionPath = (suffix: string) => apiPath(`/api/production${suffix}`);

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getMonthNumber = (monthName: string): number => {
  const index = MONTHS.indexOf(monthName);
  return index >= 0 ? index + 1 : 1;
};

const getMonthName = (monthNumber: number): string => MONTHS[monthNumber - 1] || 'Enero';

const authHeaders = () => {
  const token = TenantStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const saveProductionData = async (data: ProductionData[], year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(productionPath('/data'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      year: selectedYear,
      replaceExisting: true,
      records: data.map(record => ({
        month: record.month,
        metrosProducidos: record.metrosProducidos,
        metrosVendidos: record.metrosVendidos,
        unidadesProducidas: record.unidadesProducidas ?? 0,
        unidadesVendidas: record.unidadesVendidas ?? 0,
        capacidadInstalada: record.capacidadInstalada ?? 0
      }))
    })
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar datos de producción: ${response.statusText}`);
  }

  log.debug('ProductionStorage', 'Production data saved to API:', data.length, 'records');
};

export const loadProductionData = async (year?: number): Promise<ProductionData[]> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/data')}?year=${selectedYear}`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar datos de producción: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    return [];
  }

  const productionData: ProductionData[] = (result.data || []).map((item: any) => ({
    month: item.month || getMonthName(item.monthNumber || 1),
    metrosProducidos: item.metrosProducidos || 0,
    metrosVendidos: item.metrosVendidos || 0,
    unidadesProducidas: item.unidadesProducidas || 0,
    unidadesVendidas: item.unidadesVendidas || 0,
    capacidadInstalada: item.capacidadInstalada || 0,
    fechaRegistro: new Date().toISOString()
  }));

  log.debug('ProductionStorage', 'Production data loaded from API:', productionData.length, 'records');
  return productionData;
};

export const deleteProductionData = async (year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/data')}?year=${selectedYear}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(`No se pudo eliminar datos de producción: ${response.statusText}`);
  }
};

export const saveProductionConfig = async (config: ProductionConfig, year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(productionPath('/config'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      year: selectedYear,
      capacidadMaximaMensual: config.capacidadMaximaMensual,
      costoFijoProduccion: config.costoFijoProduccion,
      metaPrecioPromedio: config.metaPrecioPromedio,
      metaMargenMinimo: config.metaMargenMinimo
    })
  });
  if (!response.ok) {
    throw new Error(`No se pudo guardar la configuración: ${response.statusText}`);
  }
};

export const loadProductionConfig = async (year?: number): Promise<ProductionConfig | null> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/config')}?year=${selectedYear}`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar la configuración: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    return null;
  }

  return {
    capacidadMaximaMensual: result.data.capacidadMaximaMensual || 0,
    costoFijoProduccion: result.data.costoFijoProduccion || 0,
    metaPrecioPromedio: result.data.metaPrecioPromedio || 0,
    metaMargenMinimo: result.data.metaMargenMinimo || 0
  };
};

export const deleteProductionConfig = async (year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/config')}?year=${selectedYear}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(`No se pudo eliminar la configuración: ${response.statusText}`);
  }
};

export const saveCombinedData = async (data: CombinedData, year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const payload = {
    year: selectedYear,
    data: {
      ...data,
      lastUpdated: new Date().toISOString()
    }
  };

  const response = await fetch(productionPath('/combined'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar datos combinados: ${response.statusText}`);
  }
};

export const loadCombinedData = async (year?: number): Promise<CombinedData | null> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/combined')}?year=${selectedYear}`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar datos combinados: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    return null;
  }

  return {
    ...result.data,
    lastUpdated: result.lastUpdated || new Date().toISOString()
  } as CombinedData;
};

export const deleteCombinedData = async (year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/combined')}?year=${selectedYear}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(`No se pudo eliminar datos combinados: ${response.statusText}`);
  }
};

export const getStorageSummary = async (year?: number): Promise<{
  hasProductionData: boolean;
  hasConfig: boolean;
  hasCombinedData: boolean;
  lastUpdated: string | null;
  totalRecords: number;
}> => {
  const selectedYear = year || new Date().getFullYear();
  const response = await fetch(`${productionPath('/summary')}?year=${selectedYear}`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener el resumen de producción: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    return {
      hasProductionData: false,
      hasConfig: false,
      hasCombinedData: false,
      lastUpdated: null,
      totalRecords: 0
    };
  }

  return {
    hasProductionData: !!result.data.hasProductionData,
    hasConfig: !!result.data.hasConfig,
    hasCombinedData: !!result.data.hasCombinedData,
    lastUpdated: result.data.lastUpdated || null,
    totalRecords: result.data.records || 0
  };
};

// === FUNCIONES DE CÁLCULO ===

export const calculateOperationalMetrics = (
  production: ProductionData[],
  financial: any,
  config: ProductionConfig
): OperationalMetrics[] => {
  return production.map(prod => {
    const monthFinancial = financial.monthly[prod.month];

    if (!monthFinancial) {
      return {
        month: prod.month,
        costoProduccionPorMetro: 0,
        precioVentaPorMetro: 0,
        margenPorMetro: 0,
        margenPorcentual: 0,
        productividad: 0,
        eficienciaVentas: 0
      };
    }

    const costoProduccionPorMetro = prod.metrosProducidos > 0
      ? (monthFinancial.costoVentasTotal + monthFinancial.gastosAdminTotal + monthFinancial.gastosVentasTotal) / prod.metrosProducidos
      : 0;

    const costoVariablePorMetro = prod.metrosVendidos > 0
      ? monthFinancial.costosVariables / prod.metrosVendidos
      : 0;

    const precioVentaPorMetro = prod.metrosVendidos > 0
      ? monthFinancial.ingresos / prod.metrosVendidos
      : 0;

    const margenPorMetro = precioVentaPorMetro - costoVariablePorMetro;
    const margenPorcentual = precioVentaPorMetro > 0 ? (margenPorMetro / precioVentaPorMetro) * 100 : 0;

    const productividad = config.capacidadMaximaMensual > 0 ? 
      (prod.metrosProducidos / config.capacidadMaximaMensual) * 100 : 0;
    
    const eficienciaVentas = prod.metrosProducidos > 0 ? 
      (prod.metrosVendidos / prod.metrosProducidos) * 100 : 0;

    return {
      month: prod.month,
      costoProduccionPorMetro,
      costoVariablePorMetro,
      precioVentaPorMetro,
      margenPorMetro,
      margenPorcentual,
      productividad,
      eficienciaVentas
    };
  });
};

// === FUNCIONES DE VALIDACIÓN ===

export const validateProductionData = (data: ProductionData[]): string[] => {
  const errors: string[] = [];
  
  data.forEach((item, index) => {
    if (!item.month || item.month.trim() === '') {
      errors.push(`Registro ${index + 1}: Mes es requerido`);
    }
    
    if (item.metrosProducidos < 0) {
      errors.push(`Registro ${index + 1}: Metros producidos no puede ser negativo`);
    }
    
    if (item.metrosVendidos < 0) {
      errors.push(`Registro ${index + 1}: Metros vendidos no puede ser negativo`);
    }
    
    if (item.metrosVendidos > item.metrosProducidos) {
      errors.push(`Registro ${index + 1}: No se puede vender más de lo producido`);
    }
  });
  
  return errors;
};

export const validateProductionConfig = (config: ProductionConfig): string[] => {
  const errors: string[] = [];
  
  if (config.capacidadMaximaMensual <= 0) {
    errors.push('Capacidad máxima mensual debe ser mayor a 0');
  }
  
  if (config.costoFijoProduccion < 0) {
    errors.push('Costo fijo de producción no puede ser negativo');
  }
  
  if (config.metaPrecioPromedio <= 0) {
    errors.push('Meta de precio promedio debe ser mayor a 0');
  }
  
  if (config.metaMargenMinimo < 0 || config.metaMargenMinimo > 100) {
    errors.push('Meta de margen mínimo debe estar entre 0% y 100%');
  }
  
  return errors;
};

// === FUNCIONES DE EXPORTACIÓN ===

export const exportProductionData = (data: CombinedData): string => {
  const exportData = {
    financial: {
      totalIngresos: data.financial.yearly.ingresos,
      totalEbitda: data.financial.yearly.ebitda,
      kpis: data.financial.kpis
    },
    production: data.production,
    operational: data.operational,
    config: data.config,
    summary: {
      totalMetrosProducidos: data.production.reduce((sum, p) => sum + p.metrosProducidos, 0),
      totalMetrosVendidos: data.production.reduce((sum, p) => sum + p.metrosVendidos, 0),
      promedioMargenPorMetro: data.operational.reduce((sum, o) => sum + o.margenPorMetro, 0) / data.operational.length,
      promedioPrecioVenta: data.operational.reduce((sum, o) => sum + o.precioVentaPorMetro, 0) / data.operational.length
    },
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
};

// === FUNCIONES DE LIMPIEZA ===

export const clearAllProductionData = async (year?: number): Promise<void> => {
  const selectedYear = year || new Date().getFullYear();
  await deleteCombinedData(selectedYear);
  await deleteProductionConfig(selectedYear);
  await deleteProductionData(selectedYear);
};

export const getAvailableYears = async (): Promise<number[]> => {
  const response = await fetch(productionPath('/years'), {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    log.warn('ProductionStorage', 'Error getting available years:', response.statusText);
    return [new Date().getFullYear()];
  }

  const result = await response.json();
  if (!result.success || !result.years || result.years.length === 0) {
    return [new Date().getFullYear()];
  }

  return result.years;
};
