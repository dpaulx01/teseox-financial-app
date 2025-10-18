/**
 * Utilidades compartidas para cálculo de fechas y días hábiles
 * Extraído de DailyProductionModal.tsx para uso en barras de progreso
 */

const DAY_IN_MS = 86_400_000;

export const parseISODate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  
  // Forzar parsing en zona horaria local para evitar desfase UTC
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  
  // Fallback al parsing estándar para fechas con hora
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const toISODate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = 1 + ((h + l - 7 * m + 114) % 31);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, amount: number): Date => {
  const next = new Date(value.getTime() + amount * DAY_IN_MS);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getObservedHoliday = (base: Date): Date => {
  const weekday = base.getDay();
  if (weekday === 0) {
    return addDays(base, 1);
  }
  if (weekday === 6) {
    return addDays(base, -1);
  }
  if (weekday === 2) {
    return addDays(base, -1);
  }
  if (weekday === 3) {
    return addDays(base, 2);
  }
  if (weekday === 4) {
    return addDays(base, 1);
  }
  return base;
};

const buildEcuadorHolidaySet = (year: number): Set<string> => {
  const easter = calculateEasterSunday(year);
  const carnivalMonday = addDays(easter, -48);
  const carnivalTuesday = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);

  const rawHolidays = [
    new Date(year, 0, 1),
    carnivalMonday,
    carnivalTuesday,
    goodFriday,
    new Date(year, 4, 1),
    new Date(year, 4, 24),
    new Date(year, 7, 10),
    new Date(year, 9, 9),
    new Date(year, 10, 2),
    new Date(year, 10, 3),
    new Date(year, 11, 25),
  ];

  const observed = rawHolidays.flatMap((date) => {
    const canonical = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    canonical.setHours(0, 0, 0, 0);
    const observation = getObservedHoliday(canonical);
    return [canonical, observation];
  });

  return new Set(observed.map((date) => toISODate(date)));
};

const holidayCache = new Map<number, Set<string>>();

export const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  const year = date.getFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, buildEcuadorHolidaySet(year));
  }
  const key = toISODate(date);
  return !holidayCache.get(year)!.has(key);
};

export const nextWorkingDay = (date: Date): Date => {
  let candidate = new Date(date.getTime());
  candidate.setHours(0, 0, 0, 0);
  while (!isWorkingDay(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
};

export const previousWorkingDay = (date: Date, includeCurrent = false): Date => {
  let candidate = includeCurrent ? new Date(date.getTime()) : addDays(date, -1);
  candidate.setHours(0, 0, 0, 0);
  while (!isWorkingDay(candidate)) {
    candidate = addDays(candidate, -1);
  }
  return candidate;
};

/**
 * Genera un array de días hábiles entre dos fechas (inclusivo en inicio, exclusivo en final para producción)
 * Compatible con el algoritmo usado en DailyProductionModal
 */
export const getWorkingDaysBetween = (startDate: Date, endDate: Date): Date[] => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return [];
  }
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const start = new Date(startDate.getTime());
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getTime());
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    return [];
  }

  // Usar previousWorkingDay para ser consistente con DailyProductionModal
  const productionEnd = previousWorkingDay(end);
  if (productionEnd < start) {
    return [start];
  }

  const result: Date[] = [];
  let cursor = new Date(start.getTime());
  
  // Generar todos los días hábiles entre startDate y productionEnd (inclusivo)
  while (cursor <= productionEnd) {
    if (isWorkingDay(cursor)) {
      result.push(new Date(cursor.getTime()));
    }
    cursor = addDays(cursor, 1);
  }
  
  return result;
};