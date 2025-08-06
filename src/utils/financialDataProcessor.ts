import { FinancialData, RawDataRow, MonthlyData } from '../types';
import { COST_CLASSIFICATION, PNL_ACCOUNT_CODES } from '../constants';
import { parseNumericValue } from './formatters';

export const processFinancialData = (data: RawDataRow[]): FinancialData => {
  // NUEVA LÓGICA: Estructura fija del CSV
  // Columna 1: Código de cuenta
  // Columna 2: Descripción de cuenta  
  // Columna 3+: Meses (Enero, Febrero, Marzo, etc.)
  
  const normalizedData = data.map(row => {
    const normalizedRow: RawDataRow = {};
    
    // Estructura fija: 0=Código, 1=Descripción, 2+=Meses
    if (row['0'] && row['1']) {
      normalizedRow['COD.'] = row['0']; // Primera columna = Código
      normalizedRow['CUENTA'] = row['1']; // Segunda columna = Descripción
      
      // Meses estándar en orden
      const mesesEstandar = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      // Asignar resto de columnas como meses (empezando desde índice 2)
      for (let i = 0; i < mesesEstandar.length; i++) {
        const columnIndex = (i + 2).toString(); // 2, 3, 4, 5, etc.
        if (row[columnIndex] !== undefined && row[columnIndex] !== null) {
          normalizedRow[mesesEstandar[i]] = row[columnIndex];
        }
      }
    }
    
    return normalizedRow;
  });

  const filteredData = normalizedData.filter(row => row['COD.'] && row['COD.'].toString().trim() !== '');
  
  // Detectar meses disponibles automáticamente
  const mesesDisponibles = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const months = mesesDisponibles.filter(mes => {
    // Verificar si hay datos válidos para este mes
    return filteredData.some(row => {
      const valor = row[mes];
      return valor !== undefined && valor !== null && valor.toString().trim() !== '';
    });
  });
  
  const processed: FinancialData = {
    monthly: {},
    yearly: {
      ingresos: 0,
      costosVariables: 0,
      costosFijos: 0,
      utilidadBruta: 0,
      gastosOperativos: 0,
      ebitda: 0,
      utilidadNeta: 0,
      depreciacion: 0,
      costoVentasTotal: 0,
      gastosAdminTotal: 0,
      gastosVentasTotal: 0,
      costoMateriaPrima: 0,
      costoProduccion: 0,
      costoOperativo: 0,
    },
    kpis: [],
    breakEven: { yearly: 0 },
    raw: filteredData,
  };

  // Process monthly data - VERSIÓN ORIGINAL QUE FUNCIONABA
  months.forEach(month => {
    const monthData: MonthlyData = {
      ingresos: 0,
      costosVariables: 0,
      costosFijos: 0,
      costoVentasTotal: 0,
      gastosAdminTotal: 0,
      gastosVentasTotal: 0,
      depreciacion: 0,
      utilidadBruta: 0,
      gastosOperativos: 0,
      ebitda: 0,
      utilidadNeta: 0,
      puntoEquilibrio: 0,
      puntoEquilibrioAcumulado: 0,
      costoMateriaPrima: 0,
      costoProduccion: 0,
      costoOperativo: 0,
    };

    // LÓGICA ORIGINAL - procesamiento directo sin logs excesivos
    processed.raw.forEach(row => {
      const code = row['COD.'] || '';
      const cuenta = row['CUENTA'] || '';
      const rawValue = row[month];
      const value = parseNumericValue(rawValue || 0);

      // SOLUCIÓN: Solo procesar CUENTAS PRINCIPALES (sin subcuentas) para evitar doble conteo
      
      // Ingresos - solo cuenta principal "4" (no incluir 4.1, 4.1.1, etc.)
      if (code === '4') {
        monthData.ingresos += value;
      }
      
      // Costos de ventas - solo cuenta principal "5.1" (no incluir 5.1.1, 5.1.2, etc.)
      if (code === '5.1') {
        monthData.costoVentasTotal += value;
      }
      
      // Gastos de ventas - solo cuenta principal "5.2" (no incluir 5.2.1, 5.2.2, etc.)
      if (code === '5.2') {
        monthData.gastosVentasTotal += value;
      }
      
      // Gastos administrativos - solo cuenta principal "5.3" (no incluir 5.3.1, 5.3.2, etc.)
      if (code === '5.3') {
        monthData.gastosAdminTotal += value;
      }

      // Clasificación de costos variables y fijos
      const classification = COST_CLASSIFICATION[cuenta];
      if (classification === 'Variable') {
        monthData.costosVariables += value;
      } else if (classification === 'Fijo') {
        monthData.costosFijos += value;
      }

      // Segmentación detallada de costos basada en códigos de cuenta
      // IMPORTANTE: Solo procesar CUENTAS HOJA para evitar doble conteo
      const cuentaLower = cuenta.toLowerCase();
      
      // Verificar si esta cuenta tiene subcuentas para evitar doble conteo
      const tieneSubcuentas = filteredData.some(otherRow => {
        const otherCode = otherRow['COD.'] || '';
        return otherCode !== code && otherCode.startsWith(code + '.');
      });
      
      // Solo procesar si es cuenta hoja (no tiene subcuentas)
      if (!tieneSubcuentas) {
        // Costo de Materia Prima - cuenta específica 5.1.1.6 y productos terminados
        if (code === '5.1.1.6' || 
            cuentaLower.includes('productos terminados') || 
            cuentaLower.includes('materia prima') ||
            cuentaLower.includes('materiales directos')) {
          monthData.costoMateriaPrima += value;
        }
        
        // Costo de Producción - cuentas 5.1.x (excluyendo materia prima ya contabilizada)
        else if (code.startsWith('5.1') && code !== '5.1.1.6') {
          monthData.costoProduccion += value;
        }
        
        // Costo Operativo - cuentas 5.2.x y 5.3.x (gastos de ventas y administrativos)
        else if (code.startsWith('5.2') || code.startsWith('5.3')) {
          monthData.costoOperativo += value;
        }
      }

      // Detección de cuentas EBITDA (depreciación, amortización, intereses)
      // IMPORTANTE: Solo procesar cuentas hoja para evitar doble conteo
      const cuentaLowerCase = cuenta.toLowerCase();
      const isEbitdaCandidate = code.startsWith('5') && (
        cuentaLowerCase.includes('depreciaci') ||
        cuentaLowerCase.includes('amortizaci') ||
        cuentaLowerCase.includes('interes') ||
        cuentaLowerCase.includes('financier') ||
        code.startsWith('5.2.1.3') // Gastos Financieros específicos
      );
      
      if (isEbitdaCandidate) {
        // Verificar si esta cuenta tiene subcuentas EBITDA para evitar doble conteo
        const tieneSubcuentasEbitda = filteredData.some(otherRow => {
          const otherCode = otherRow['COD.'] || '';
          const otherCuenta = otherRow['CUENTA'] || '';
          const otherCuentaLowerCase = otherCuenta.toLowerCase();
          const isOtherEbitda = otherCode.startsWith('5') && (
            otherCuentaLowerCase.includes('depreciaci') ||
            otherCuentaLowerCase.includes('amortizaci') ||
            otherCuentaLowerCase.includes('interes') ||
            otherCuentaLowerCase.includes('financier') ||
            otherCode.startsWith('5.2.1.3')
          );
          return isOtherEbitda && otherCode !== code && otherCode.startsWith(code + '.');
        });
        
        if (!tieneSubcuentasEbitda) {
          monthData.depreciacion += value;
        }
      }
    });

    // Cálculos derivados - LÓGICA ORIGINAL
    monthData.utilidadBruta = monthData.ingresos - monthData.costoVentasTotal;
    monthData.gastosOperativos = monthData.gastosAdminTotal + monthData.gastosVentasTotal;
    monthData.utilidadNeta = monthData.utilidadBruta - monthData.gastosOperativos;
    monthData.ebitda = monthData.utilidadNeta + monthData.depreciacion;

    // Punto de equilibrio
    const margenContribucionPorc = monthData.ingresos > 0 
      ? (monthData.ingresos - monthData.costosVariables) / monthData.ingresos 
      : 0;
    monthData.puntoEquilibrio = margenContribucionPorc > 0 
      ? monthData.costosFijos / margenContribucionPorc 
      : 0;

    // Guardar siempre con mes en minúsculas para consistencia
    processed.monthly[month.toLowerCase()] = monthData;

    // Acumular totales anuales
    processed.yearly.ingresos += monthData.ingresos;
    processed.yearly.costoVentasTotal += monthData.costoVentasTotal;
    processed.yearly.gastosAdminTotal += monthData.gastosAdminTotal;
    processed.yearly.gastosVentasTotal += monthData.gastosVentasTotal;
    processed.yearly.utilidadBruta += monthData.utilidadBruta;
    processed.yearly.gastosOperativos += monthData.gastosOperativos;
    processed.yearly.utilidadNeta += monthData.utilidadNeta;
    processed.yearly.ebitda += monthData.ebitda;
    processed.yearly.depreciacion += monthData.depreciacion;
    processed.yearly.costosVariables += monthData.costosVariables;
    processed.yearly.costosFijos += monthData.costosFijos;
    processed.yearly.costoMateriaPrima += monthData.costoMateriaPrima;
    processed.yearly.costoProduccion += monthData.costoProduccion;
    processed.yearly.costoOperativo += monthData.costoOperativo;
  });

  // Calcular punto de equilibrio acumulado
  let cumulativeIngresos = 0;
  let cumulativeCostosFijos = 0;
  let cumulativeCostosVariables = 0;

  months.forEach(month => {
    const monthData = processed.monthly[month.toLowerCase()];
    cumulativeIngresos += monthData.ingresos;
    cumulativeCostosFijos += monthData.costosFijos;
    cumulativeCostosVariables += monthData.costosVariables;
    
    const cumulativeMargenContribucionPorc = cumulativeIngresos > 0 
      ? (cumulativeIngresos - cumulativeCostosVariables) / cumulativeIngresos 
      : 0;
    
    processed.monthly[month.toLowerCase()].puntoEquilibrioAcumulado = cumulativeMargenContribucionPorc > 0 
      ? cumulativeCostosFijos / cumulativeMargenContribucionPorc 
      : 0;
  });

  // Punto de equilibrio anual
  const yearlyMargenContribucionPorc = processed.yearly.ingresos > 0 
    ? (processed.yearly.ingresos - processed.yearly.costosVariables) / processed.yearly.ingresos 
    : 0;
  processed.breakEven.yearly = yearlyMargenContribucionPorc > 0 
    ? processed.yearly.costosFijos / yearlyMargenContribucionPorc 
    : 0;


  // KPIs
  const y = processed.yearly;
  processed.kpis = [
    { 
      name: 'Margen Bruto', 
      value: y.ingresos > 0 ? (y.utilidadBruta / y.ingresos) * 100 : 0, 
      unit: '%' 
    },
    { 
      name: 'Margen Operativo', 
      value: y.ingresos > 0 ? (y.utilidadNeta / y.ingresos) * 100 : 0, 
      unit: '%' 
    },
    { 
      name: 'Margen EBITDA', 
      value: y.ingresos > 0 ? (y.ebitda / y.ingresos) * 100 : 0, 
      unit: '%' 
    },
    { 
      name: 'Margen Neto', 
      value: y.ingresos > 0 ? (y.utilidadNeta / y.ingresos) * 100 : 0, 
      unit: '%' 
    },
  ];

  return processed;
};