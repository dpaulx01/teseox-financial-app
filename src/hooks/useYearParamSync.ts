import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYear } from '../contexts/YearContext';

export function useYearParamSync() {
  const { selectedYear, setSelectedYear } = useYear();
  const [params, setParams] = useSearchParams();

  // Lee ?year al montar
  useEffect(() => {
    const y = Number(params.get('year'));
    if (y && y !== selectedYear) setSelectedYear(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escribe ?year cuando cambie
  useEffect(() => {
    const current = params.get('year');
    if (selectedYear && String(selectedYear) !== current) {
      params.set('year', String(selectedYear));
      setParams(params, { replace: true });
    }
  }, [selectedYear, params, setParams]);
}