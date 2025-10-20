/**
 * Normaliza un texto eliminando diacríticos y convirtiendo a minúsculas
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Verifica si un texto (haystack) incluye otro texto (needle) de forma normalizada
 */
export function includesNormalized(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return normalizeText(haystack).includes(needle);
}

/**
 * Keywords que identifican descripciones de metadata (no son productos reales)
 */
const metadataKeywords = [
  'TIEMPO DE PRODUCCION',
  'TIEMPO ESTIMADO',
  'DIAS CALENDARIO',
  'DIAS HABILES',
  'ENTREGA ESTIMADA',
  'CONDICIONES DE PAGO',
  'CONDICIONES GENERALES',
  'OBSERVACIONES',
  'PROGRAMACION',
  'DESPACHO',
  'REFERENCIA TRANSPORTE',
];

/**
 * Determina si una descripción es metadata (información adicional)
 * y no un producto real
 */
export function isMetadataDescription(descripcion: string | null | undefined): boolean {
  const normalized = normalizeText(descripcion);
  if (!normalized) {
    return false;
  }
  // Si contiene || es metadata de programación
  if (normalized.includes('||')) {
    return true;
  }
  // Si empieza con ODC es metadata
  if (/^(odc|orden\s+de\s+compra)\b/.test(normalized)) {
    return true;
  }
  // Si contiene keywords de metadata
  return metadataKeywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}
