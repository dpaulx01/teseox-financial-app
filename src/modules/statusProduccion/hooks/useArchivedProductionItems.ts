import { useCallback, useEffect, useMemo, useState } from 'react';
import financialAPI from '../../../services/api';
import {
  ProductionItem,
  ProductionStatusResponse,
  ProductionUpdatePayload,
  ProductionUploadResponse,
} from '../../../types/production';

export type UploadStatus =
  | { status: 'idle'; message: '' }
  | { status: 'loading'; message: 'Procesando cotizaciones...' }
  | { status: 'success'; message: string; detail: ProductionUploadResponse['resultados'] }
  | { status: 'error'; message: string };

const idleStatus: UploadStatus = { status: 'idle', message: '' };

function normalizeFiles(input: File[] | FileList): File[] {
  if (Array.isArray(input)) {
    return input;
  }
  return Array.from(input);
}

export function useArchivedProductionItems() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(idleStatus);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response: ProductionStatusResponse = await financialAPI.getArchivedProductionItems();
      setItems(response.items);
      setStatusOptions(response.statusOptions ?? []);
      setError(null);
    } catch (err: any) {
      console.error('[StatusProduccion] fetchItems error', err);
      setError(err?.response?.data?.detail || err?.message || 'No se pudieron cargar los ítems.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const uploadQuotes = useCallback(
    async (files: File[] | FileList) => {
      const normalized = normalizeFiles(files);
      if (normalized.length === 0) return;

      try {
        setUploadStatus({ status: 'loading', message: 'Procesando cotizaciones...' });
        const response = await financialAPI.uploadProductionQuotes(normalized);
        setUploadStatus({
          status: 'success',
          message: response.message,
          detail: response.resultados,
        });
        await fetchItems();
      } catch (err: any) {
        console.error('[StatusProduccion] uploadQuotes error', err);
        setUploadStatus({
          status: 'error',
          message: err?.response?.data?.detail || err?.message || 'No se pudo procesar el archivo.',
        });
      }
    },
    [fetchItems],
  );

  const updateItem = useCallback(
    async (id: number, payload: ProductionUpdatePayload) => {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      try {
        const updated = await financialAPI.updateProductionItem(id, payload);
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        return updated;
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  const isSaving = useCallback(
    (id: number) => savingIds.has(id),
    [savingIds],
  );

  const resetUploadStatus = useCallback(() => {
    setUploadStatus(idleStatus);
  }, []);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aDate = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
        const bDate = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
        return bDate - aDate || b.id - a.id;
      }),
    [items],
  );

  const deleteQuote = useCallback(async (quoteId: number) => {
    try {
      await financialAPI.deleteProductionQuote(quoteId);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }
      // Si ya no existe en backend, lo tratamos como eliminado
    }
    setItems((prev) => prev.filter((item) => item.cotizacionId !== quoteId));
  }, []);

  return {
    items: sortedItems,
    statusOptions,
    loading,
    error,
    uploadStatus,
    uploadQuotes,
    updateItem,
    isSaving,
    resetUploadStatus,
    deleteQuote,
    refetch: fetchItems,
  };
}
