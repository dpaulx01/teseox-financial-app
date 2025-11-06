export interface DateFilterState {
  year?: number;
  years?: number[];
  month?: number;
  months?: number[];
}

interface TemporalFilterOptions {
  includeMonth?: boolean;
}

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const appendTemporalFilters = (
  params: URLSearchParams,
  filters: DateFilterState | undefined,
  options: TemporalFilterOptions = {}
) => {
  if (!filters) {
    return;
  }

  const { includeMonth = true } = options;

  const years = Array.isArray(filters.years) ? filters.years.filter(isValidNumber) : [];
  if (years.length > 0) {
    years.forEach((year) => params.append('years', year.toString()));
    if (years.length === 1) {
      params.append('year', years[0].toString());
    }
  } else if (isValidNumber(filters.year)) {
    params.append('year', filters.year.toString());
  }

  if (!includeMonth) {
    return;
  }

  const months = Array.isArray(filters.months) ? filters.months.filter(isValidNumber) : [];
  if (months.length > 0) {
    months.forEach((month) => params.append('months', month.toString()));
    if (months.length === 1) {
      params.append('month', months[0].toString());
    }
  } else if (isValidNumber(filters.month)) {
    params.append('month', filters.month.toString());
  }
};

export const resolveSelectedYears = (filters: DateFilterState | undefined): number[] => {
  if (!filters) return [];
  if (Array.isArray(filters.years) && filters.years.length > 0) {
    return filters.years.filter(isValidNumber).sort();
  }
  if (isValidNumber(filters.year)) {
    return [filters.year];
  }
  return [];
};

export const resolveSelectedMonths = (filters: DateFilterState | undefined): number[] => {
  if (!filters) return [];
  if (Array.isArray(filters.months) && filters.months.length > 0) {
    return filters.months.filter(isValidNumber).sort((a, b) => a - b);
  }
  if (isValidNumber(filters.month)) {
    return [filters.month];
  }
  return [];
};
