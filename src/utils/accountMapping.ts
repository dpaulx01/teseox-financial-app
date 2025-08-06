/**
 * Mapeo de cuentas contables a campos del sistema
 * Basado en la estructura real del PyG
 */

import { MonthlyData } from '../types';

export interface AccountMapping {
  code: string;
  field: keyof MonthlyData | 'calculated' | 'raw';
  calculation?: (data: MonthlyData, rawData?: any) => number;
}

// Mapeo basado en el PyG real mostrado
export const ACCOUNT_MAPPINGS: Record<string, AccountMapping> = {
  // INGRESOS
  '4': {
    code: '4',
    field: 'ingresos'
  },
  '4.1': {
    code: '4.1',
    field: 'ingresos' // Ingresos operacionales = total ingresos
  },
  '4.1.1': {
    code: '4.1.1',
    field: 'ingresos' // Ventas = ingresos
  },
  '4.2': {
    code: '4.2',
    field: 'raw' // Otros ingresos - buscar en raw data
  },

  // COSTOS
  '5': {
    code: '5',
    field: 'calculated',
    calculation: (data) => {
      // Total costos y gastos
      return (data.costoVentasTotal || 0) + 
             (data.gastosVentasTotal || 0) + 
             (data.gastosAdminTotal || 0);
    }
  },
  '5.1': {
    code: '5.1',
    field: 'costoVentasTotal'
  },
  '5.1.1': {
    code: '5.1.1',
    field: 'costoMateriaPrima'
  },
  '5.1.1.6': {
    code: '5.1.1.6',
    field: 'costoMateriaPrima' // Productos Terminados C
  },
  '5.1.2': {
    code: '5.1.2',
    field: 'costoProduccion'
  },

  // GASTOS DE VENTAS
  '5.2': {
    code: '5.2',
    field: 'gastosVentasTotal'
  },
  '5.2.1': {
    code: '5.2.1',
    field: 'raw' // Gastos de Personal - buscar en raw
  },
  '5.2.2': {
    code: '5.2.2',
    field: 'raw' // Gastos de Marketing - buscar en raw
  },

  // GASTOS ADMINISTRATIVOS
  '5.3': {
    code: '5.3',
    field: 'gastosAdminTotal'
  },
  '5.3.1': {
    code: '5.3.1',
    field: 'raw' // Sueldos Administrativos
  },
  '5.3.2': {
    code: '5.3.2',
    field: 'depreciacion'
  },
  '5.3.3': {
    code: '5.3.3',
    field: 'raw' // Otros Gastos Admin
  },

  // MÉTRICAS CALCULADAS
  'UB': {
    code: 'UB',
    field: 'calculated',
    calculation: (data) => (data.ingresos || 0) - (data.costoVentasTotal || 0)
  },
  'UO': {
    code: 'UO',
    field: 'calculated',
    calculation: (data) => {
      const utilidadBruta = (data.ingresos || 0) - (data.costoVentasTotal || 0);
      return utilidadBruta - (data.gastosVentasTotal || 0) - (data.gastosAdminTotal || 0);
    }
  },
  'EBITDA': {
    code: 'EBITDA',
    field: 'calculated',
    calculation: (data) => {
      const utilidadOperativa = (data.ingresos || 0) - 
                                (data.costoVentasTotal || 0) - 
                                (data.gastosVentasTotal || 0) - 
                                (data.gastosAdminTotal || 0);
      return utilidadOperativa + (data.depreciacion || 0);
    }
  },
  'UN': {
    code: 'UN',
    field: 'utilidadNeta'
  }
};

/**
 * Obtiene el valor de una cuenta desde los datos mensuales
 */
export function getAccountValue(
  code: string, 
  monthData: MonthlyData,
  rawData?: any[]
): number {
  const mapping = ACCOUNT_MAPPINGS[code];
  
  if (!mapping) {
    console.warn(`No mapping found for account ${code}`);
    return 0;
  }

  // Si es calculado, ejecutar la función
  if (mapping.field === 'calculated' && mapping.calculation) {
    return mapping.calculation(monthData, rawData);
  }

  // Si necesita datos raw
  if (mapping.field === 'raw' && rawData) {
    // Buscar en datos raw por código
    const rawRow = rawData.find(row => row['COD.'] === code);
    if (rawRow) {
      // Obtener valor del mes correspondiente
      // Esto requiere saber qué mes estamos procesando
      return 0; // TODO: Implementar búsqueda en raw
    }
    return 0;
  }

  // Obtener directamente del campo mapeado
  return monthData[mapping.field as keyof MonthlyData] || 0;
}

/**
 * Actualiza el valor de una cuenta en los datos mensuales
 */
export function setAccountValue(
  code: string,
  monthData: MonthlyData,
  newValue: number
): MonthlyData {
  const mapping = ACCOUNT_MAPPINGS[code];
  
  if (!mapping || mapping.field === 'calculated' || mapping.field === 'raw') {
    console.warn(`Cannot update account ${code} - it's either calculated or raw`);
    return monthData;
  }

  const updatedData = { ...monthData };
  (updatedData as any)[mapping.field] = newValue;
  
  return updatedData;
}