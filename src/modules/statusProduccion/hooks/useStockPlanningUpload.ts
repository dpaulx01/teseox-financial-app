import { useCallback, useMemo, useState } from 'react';
import financialAPI from '../../../services/api';
import {
  StockPlanningConfirmPayload,
  StockPlanningConfirmResponse,
  StockPlanningParseResponse,
  StockPlanningParsedData,
} from '../../../types/production';

type UploadPhase = 'idle' | 'uploading' | 'preview' | 'confirming' | 'success';

function normalizeParsedData(parsed: StockPlanningParsedData): StockPlanningParsedData {
  return {
    ...parsed,
    productos: parsed.productos.map((producto) => ({
      ...producto,
      programacion_diaria: [...producto.programacion_diaria]
        .map((entry) => ({
          fecha: typeof entry.fecha === 'string' ? entry.fecha : new Date(entry.fecha).toISOString().split('T')[0],
          cantidad: typeof entry.cantidad === 'number' ? entry.cantidad : Number(entry.cantidad),
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    })),
  };
}

export interface StockPlanningUploadState {
  phase: UploadPhase;
  message: string | null;
  error: string | null;
  parsedData: StockPlanningParsedData | null;
  confirmResult: StockPlanningConfirmResponse | null;
}

export function useStockPlanningUpload() {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<StockPlanningParsedData | null>(null);
  const [confirmResult, setConfirmResult] = useState<StockPlanningConfirmResponse | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setMessage(null);
    setError(null);
    setParsedData(null);
    setConfirmResult(null);
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setPhase('uploading');
    setError(null);
    setMessage(null);
    setConfirmResult(null);

    try {
      const response: StockPlanningParseResponse = await financialAPI.parseStockPlanning(file);
      const normalized = normalizeParsedData(response.parsed_data);
      setParsedData(normalized);
      setMessage(response.message);
      setPhase('preview');
    } catch (err: any) {
      console.error('[StockPlanningUpload] parse error', err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'No se pudo procesar el Excel. Verifica el formato e intenta nuevamente.';
      setError(detail);
      setPhase('idle');
    }
  }, []);

  const confirmPlan = useCallback(
    async (payload: Omit<StockPlanningConfirmPayload, 'parsed_data'>) => {
      if (!parsedData) {
        throw new Error('No hay datos parseados para confirmar.');
      }

      setPhase('confirming');
      setError(null);

      try {
        const response = await financialAPI.confirmStockPlanning({
          parsed_data: parsedData,
          bodega: payload.bodega,
          notas: payload.notas,
        });
        setConfirmResult(response);
        setMessage(response.message);
        setPhase('success');
        return response;
      } catch (err: any) {
        console.error('[StockPlanningUpload] confirm error', err);
        const detail =
          err?.response?.data?.detail ||
          err?.message ||
          'No se pudo guardar la programación de stock.';
        setError(detail);
        setPhase('preview');
        throw err;
      }
    },
    [parsedData],
  );

  return useMemo(
    () => ({
      phase,
      message,
      error,
      parsedData,
      confirmResult,
      parseFile,
      confirmPlan,
      reset,
    }),
    [phase, message, error, parsedData, confirmResult, parseFile, confirmPlan, reset],
  );
}
