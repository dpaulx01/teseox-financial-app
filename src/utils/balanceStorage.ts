import * as XLSX from 'xlsx';

import {
  BalanceDataResponse,
  BalanceRatios,
  BalanceSummary,
  BalanceTrendPoint,
  BalanceUploadRow,
} from '../types';
import { apiPath } from '../config/apiBaseUrl';

const balancePath = (suffix: string) => apiPath(`/api/balance${suffix}`);

const authHeaders = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export async function parseBalanceFile(file: File): Promise<BalanceUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

  const parsed: BalanceUploadRow[] = [];

  rows.forEach((row) => {
    if (!Array.isArray(row) || row.length < 2) return;

    const code = String(row[0] ?? '').trim();
    const name = String(row[1] ?? '').trim();
    const valueRaw = row[2];

    if (!code || !/^\d/.test(code)) return;
    if (!name) return;

    const value = Number(valueRaw ?? 0);
    if (Number.isNaN(value)) return;

    parsed.push({
      code,
      name,
      value,
    });
  });

  if (!parsed.length) {
    throw new Error('No se encontraron filas válidas en el archivo de balance.');
  }

  return parsed;
}

export async function uploadBalanceData(
  rows: BalanceUploadRow[],
  year: number,
  month?: number | null,
): Promise<void> {
  const response = await fetch(balancePath('/upload'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      year,
      month,
      rows,
      replace_existing: true,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo cargar el balance.');
  }
}

export async function loadBalanceData(year: number, month?: number | null): Promise<BalanceDataResponse | null> {
  const params = new URLSearchParams({ year: year.toString() });
  if (month) params.append('month', month.toString());

  const response = await fetch(`${balancePath('/data')}?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo cargar el balance.');
  }

  const result = await response.json();
  if (!result?.success || !result.data) {
    throw new Error('Respuesta inválida del servidor.');
  }

  return result.data as BalanceDataResponse;
}

export async function loadBalanceRatios(year: number, month?: number | null): Promise<BalanceRatios | null> {
  const params = new URLSearchParams({ year: year.toString() });
  if (month) params.append('month', month.toString());

  const response = await fetch(`${balancePath('/ratios')}?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudieron calcular los indicadores financieros.');
  }

  const result = await response.json();
  if (!result?.success || !result.data) {
    throw new Error('Respuesta inválida del servidor.');
  }

  return result.data as BalanceRatios;
}

export async function loadBalanceTrends(
  startYear: number,
  endYear: number,
  granularity: 'annual' | 'monthly' = 'annual',
): Promise<BalanceTrendPoint[]> {
  const params = new URLSearchParams({
    start_year: startYear.toString(),
    end_year: endYear.toString(),
    granularity,
  });

  const response = await fetch(`${balancePath('/trends')}?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo obtener la serie histórica del balance.');
  }

  const result = await response.json();
  if (!result?.success || !result.data) {
    throw new Error('Respuesta inválida del servidor.');
  }

  return result.data as BalanceTrendPoint[];
}

export async function loadBalanceSummary(year: number): Promise<BalanceSummary> {
  const response = await fetch(`${balancePath('/summary')}?year=${year}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo obtener el resumen de balance.');
  }

  const result = await response.json();
  return result?.data as BalanceSummary;
}

export async function getBalanceYears(): Promise<number[]> {
  const response = await fetch(balancePath('/years'), {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudieron obtener los años disponibles.');
  }

  const result = await response.json();
  return result?.years ?? [];
}

export async function deleteBalanceData(year: number, month?: number | null): Promise<void> {
  const params = new URLSearchParams({ year: year.toString() });
  if (month) params.append('month', month.toString());

  const response = await fetch(`${balancePath('/data')}?${params.toString()}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo eliminar el balance.');
  }
}

export async function saveBalanceConfig(
  year: number,
  payload: { workingCapitalTarget?: number | null; liquidityTarget?: number | null; leverageTarget?: number | null; notes?: string | null },
): Promise<void> {
  const params = new URLSearchParams({ year: year.toString() });
  if (payload.workingCapitalTarget != null) params.append('working_capital_target', payload.workingCapitalTarget.toString());
  if (payload.liquidityTarget != null) params.append('liquidity_target', payload.liquidityTarget.toString());
  if (payload.leverageTarget != null) params.append('leverage_target', payload.leverageTarget.toString());
  if (payload.notes) params.append('notes', payload.notes);

  const response = await fetch(`${API_BASE}/config?${params.toString()}`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo guardar la configuración del balance.');
  }
}
