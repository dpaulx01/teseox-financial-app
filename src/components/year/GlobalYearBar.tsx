import { useYear } from '../../contexts/YearContext';

export default function GlobalYearBar() {
  const { selectedYear, setSelectedYear, availableYears, isLoading, error } = useYear();

  if (error) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase text-text-muted">Año</span>
      <select
        disabled={isLoading || !availableYears?.length}
        className="px-2 py-1 rounded border border-border bg-glass text-sm"
        value={selectedYear ?? ''}
        onChange={(e) => setSelectedYear(Number(e.target.value) || null)}
      >
        <option value="" disabled>Seleccione…</option>
        {availableYears.map(y => (
          <option key={y.year} value={y.year}>
            {y.year}
          </option>
        ))}
      </select>
    </div>
  );
}