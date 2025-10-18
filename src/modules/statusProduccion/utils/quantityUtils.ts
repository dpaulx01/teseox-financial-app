/**
 * Utilidades para extraer y normalizar información de cantidad
 * Extraído de DailyProductionModal.tsx para uso en barras de progreso
 */

const METER_KEYWORDS = [
  'M',
  'MT',
  'MTS',
  'METRO',
  'METROS',
  'MTR',
  'MTRS',
  'ML',
  'M2',
  'M3',
  'MTS2',
  'MT2',
  'MTS3',
  'MT3',
];

const UNIT_KEYWORDS = [
  'UN',
  'UNIDAD',
  'UNIDADES',
  'UND',
  'UNDS',
  'U',
  'UNID',
  'UNIDS',
  'PIEZA',
  'PIEZAS',
  'PZA',
  'PZAS',
  'PZ',
  'PZS',
];

const normalizeQuantityUnit = (input: string | null | undefined): 'metros' | 'unidades' => {
  if (!input) {
    return 'unidades';
  }
  const normalized = input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();
  for (const keyword of METER_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return 'metros';
    }
  }
  for (const keyword of UNIT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return 'unidades';
    }
  }
  return 'unidades';
};

export const extractQuantityInfo = (
  value: string | null | undefined,
): { amount: number | null; unit: 'metros' | 'unidades' } => {
  if (!value) {
    return { amount: null, unit: 'unidades' };
  }
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return { amount: null, unit: normalizeQuantityUnit(value) };
  }
  const normalized = match[0].replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    return { amount: null, unit: normalizeQuantityUnit(value) };
  }
  return { amount, unit: normalizeQuantityUnit(value) };
};

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);