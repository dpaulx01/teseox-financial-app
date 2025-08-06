/**
 * Utilidades para manejo de fechas y ordenamiento de meses
 */

// Mapeo de nombres de meses a números para ordenamiento
const MONTH_ORDER: Record<string, number> = {
  'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'agosto': 8,
  'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'diciembre': 12,
  // Variantes en inglés por si acaso
  'january': 1,
  'february': 2,
  'march': 3,
  'april': 4,
  'may': 5,
  'june': 6,
  'july': 7,
  'august': 8,
  'september': 9,
  'october': 10,
  'november': 11,
  'december': 12,
  // Abreviaciones
  'ene': 1,
  'feb': 2,
  'mar': 3,
  'abr': 4,
  'jun': 6,
  'jul': 7,
  'ago': 8,
  'sep': 9,
  'oct': 10,
  'nov': 11,
  'dic': 12,
  'jan': 1,
  'apr': 4,
  'aug': 8,
  'dec': 12
};

/**
 * Ordena un array de nombres de meses cronológicamente
 * @param months Array de nombres de meses
 * @returns Array ordenado de meses
 */
export function sortMonths(months: string[]): string[] {
  return months.sort((a, b) => {
    const monthA = MONTH_ORDER[a.toLowerCase()] || 999;
    const monthB = MONTH_ORDER[b.toLowerCase()] || 999;
    return monthA - monthB;
  });
}

/**
 * Obtiene el número del mes (1-12) a partir del nombre
 * @param monthName Nombre del mes
 * @returns Número del mes (1-12) o 0 si no se encuentra
 */
export function getMonthNumber(monthName: string): number {
  return MONTH_ORDER[monthName.toLowerCase()] || 0;
}

/**
 * Formatea un nombre de mes para display consistente
 * @param monthName Nombre del mes
 * @returns Nombre formateado (Primera letra mayúscula)
 */
export function formatMonthName(monthName: string): string {
  return monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
}

/**
 * Obtiene los meses ordenados de un objeto de datos mensuales
 * @param monthlyData Objeto con datos mensuales
 * @returns Array de meses ordenados cronológicamente
 */
export function getSortedMonths(monthlyData: Record<string, any>): string[] {
  const months = Object.keys(monthlyData);
  // Eliminar duplicados manteniendo solo minúsculas
  const uniqueMonths = Array.from(new Set(months.map(m => m.toLowerCase())));
  return sortMonths(uniqueMonths);
}

/**
 * Convierte un objeto de datos mensuales desordenados a ordenados
 * @param monthlyData Objeto con datos mensuales
 * @returns Nuevo objeto con meses ordenados cronológicamente
 */
export function sortMonthlyData<T>(monthlyData: Record<string, T>): Record<string, T> {
  const sortedMonths = getSortedMonths(monthlyData);
  const sortedData: Record<string, T> = {};
  
  sortedMonths.forEach(month => {
    sortedData[month] = monthlyData[month];
  });
  
  return sortedData;
}

export default {
  sortMonths,
  getMonthNumber,
  formatMonthName,
  getSortedMonths,
  sortMonthlyData
};