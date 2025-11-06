/**
 * DateRangeFilter - Filtro avanzado de rangos de fechas
 * Soporta multi-mes, multi-año y presets (trimestres, semestres)
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Title, Text, Flex, Badge } from '@tremor/react';
import {
  CalendarIcon,
  XMarkIcon,
  SparklesIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRangeFilterProps {
  availableYears: number[];
  availableMonths: number[];
  selectedYears?: number[];
  selectedMonths?: number[];
  onYearsChange: (years: number[]) => void;
  onMonthsChange: (months: number[]) => void;
  onPresetSelect?: (preset: PeriodPreset) => void;
  additionalBadges?: ActiveFilterBadge[];
}

export interface PeriodPreset {
  id: string;
  label: string;
  months: number[];
  description: string;
  icon?: string;
}

export interface ActiveFilterBadge {
  id: string;
  label: string;
  value: string;
  color?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'q1',
    label: 'Q1',
    months: [1, 2, 3],
    description: 'Primer Trimestre (Ene-Mar)',
    icon: '📊'
  },
  {
    id: 'q2',
    label: 'Q2',
    months: [4, 5, 6],
    description: 'Segundo Trimestre (Abr-Jun)',
    icon: '📈'
  },
  {
    id: 'q3',
    label: 'Q3',
    months: [7, 8, 9],
    description: 'Tercer Trimestre (Jul-Sep)',
    icon: '📉'
  },
  {
    id: 'q4',
    label: 'Q4',
    months: [10, 11, 12],
    description: 'Cuarto Trimestre (Oct-Dic)',
    icon: '📊'
  },
  {
    id: 's1',
    label: 'S1',
    months: [1, 2, 3, 4, 5, 6],
    description: 'Primer Semestre (Ene-Jun)',
    icon: '🌅'
  },
  {
    id: 's2',
    label: 'S2',
    months: [7, 8, 9, 10, 11, 12],
    description: 'Segundo Semestre (Jul-Dic)',
    icon: '🌆'
  },
  {
    id: 'year',
    label: 'Año completo',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: 'Todo el año (Ene-Dic)',
    icon: '📅'
  }
];

export default function DateRangeFilter({
  availableYears,
  availableMonths,
  selectedYears = [],
  selectedMonths = [],
  onYearsChange,
  onMonthsChange,
  onPresetSelect,
  additionalBadges = []
}: DateRangeFilterProps) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const yearsLoading = availableYears.length === 0;
  const monthsLoading = availableMonths.length === 0;
  const allMonthsSelected =
    availableMonths.length > 0 &&
    selectedMonths.length >= availableMonths.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowYearPicker(false);
        setShowMonthPicker(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowYearPicker(false);
        setShowMonthPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      onYearsChange(selectedYears.filter(y => y !== year));
    } else {
      onYearsChange([...selectedYears, year].sort());
    }
  };

  const toggleMonth = (month: number) => {
    if (selectedMonths.includes(month)) {
      onMonthsChange(selectedMonths.filter(m => m !== month));
    } else {
      onMonthsChange([...selectedMonths, month].sort((a, b) => a - b));
    }
  };

  const handlePresetClick = (preset: PeriodPreset) => {
    onMonthsChange(preset.months);
    if (onPresetSelect) {
      onPresetSelect(preset);
    }
    setShowMonthPicker(false);
  };

  const clearMonths = () => {
    onMonthsChange([]);
  };

  const clearYears = () => {
    onYearsChange([]);
  };

  const selectAllYears = () => {
    onYearsChange([...availableYears]);
  };

  const selectAllMonths = () => {
    onMonthsChange([...availableMonths]);
  };

  const selectedMonthsLabel = useMemo(() => {
    if (selectedMonths.length === 0) return 'Todos los meses';
    if (selectedMonths.length === 12) return 'Año completo';
    if (selectedMonths.length <= 3) {
      return selectedMonths.map(m => MONTH_NAMES_SHORT[m - 1]).join(', ');
    }

    // Check if it matches a preset
    const matchedPreset = PERIOD_PRESETS.find(preset =>
      preset.months.length === selectedMonths.length &&
      preset.months.every(m => selectedMonths.includes(m))
    );

    if (matchedPreset) {
      return matchedPreset.label + ' - ' + matchedPreset.description.split(' (')[1].replace(')', '');
    }

    return `${selectedMonths.length} meses seleccionados`;
  }, [selectedMonths]);

  const selectedYearsLabel = useMemo(() => {
    if (selectedYears.length === 0) return 'Todos los años';
    if (selectedYears.length === 1) return selectedYears[0].toString();
    return selectedYears.join(', ');
  }, [selectedYears]);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Presets Row */}
      <div className="flex flex-wrap gap-2">
        <Text className="text-xs uppercase tracking-wide text-text-muted w-full mb-1">
          Períodos rápidos
        </Text>
        {PERIOD_PRESETS.map(preset => {
          const isActive =
            preset.months.length === selectedMonths.length &&
            preset.months.every(m => selectedMonths.includes(m));

          return (
            <motion.button
              key={preset.id}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetClick(preset)}
              aria-pressed={isActive}
              aria-label={`Aplicar preset ${preset.label}`}
              className={`
                inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold
                transition-all duration-200 border
                ${isActive
                  ? 'bg-primary/20 border-primary/60 text-primary shadow-glow-sm'
                  : 'bg-dark-card/60 border-border/40 text-text-secondary hover:border-primary/40 hover:text-text-primary'
                }
              `}
              title={preset.description}
            >
              {preset.icon && <span>{preset.icon}</span>}
              <span>{preset.label}</span>
              {isActive && <CheckIcon className="h-3 w-3" />}
            </motion.button>
          );
        })}
      </div>

      {/* Years and Months Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Years Selector */}
        <div className="relative">
          <label className="text-xs uppercase tracking-wide text-text-muted mb-2 block">
            Años
          </label>
          <button
            type="button"
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
            }}
            aria-expanded={showYearPicker}
            aria-haspopup="listbox"
            aria-label="Seleccionar años"
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-dark-card/80 px-4 py-3 text-sm text-text-primary transition-all duration-200 hover:border-primary/60 focus:outline-none focus:border-primary/60"
          >
            <Flex alignItems="center" className="gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>{selectedYearsLabel}</span>
            </Flex>
            {selectedYears.length > 0 && (
              <Badge color="cyan" className="text-xs">
                {selectedYears.length}
              </Badge>
            )}
          </button>

          <AnimatePresence>
            {showYearPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute z-50 mt-2 w-full rounded-xl border border-border/60 bg-dark-card/95 backdrop-blur-sm shadow-hologram p-4"
              >
                <Flex justifyContent="between" className="mb-3">
                  <Text className="text-xs font-semibold text-text-secondary uppercase">
                    Seleccionar años
                  </Text>
                  <Flex className="gap-2">
                    <button
                      type="button"
                      onClick={selectAllYears}
                      className="text-xs text-primary hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      type="button"
                      onClick={clearYears}
                      className="text-xs text-text-muted hover:text-danger hover:underline"
                    >
                      Limpiar
                    </button>
                  </Flex>
                </Flex>

                <div className="grid grid-cols-3 gap-2">
                  {yearsLoading && (
                    <div className="col-span-3 space-y-2">
                      <div className="h-10 rounded-lg bg-dark-card/40 animate-pulse" />
                      <div className="h-10 rounded-lg bg-dark-card/40 animate-pulse" />
                      <div className="h-10 rounded-lg bg-dark-card/40 animate-pulse" />
                    </div>
                  )}
                  {!yearsLoading && availableYears.map(year => {
                    const isSelected = selectedYears.includes(year);
                    return (
                      <motion.button
                        key={year}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleYear(year)}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`Filtrar por año ${year}${isSelected ? ' (seleccionado)' : ''}`}
                        className={`
                          relative rounded-lg px-3 py-2 text-sm font-semibold
                          transition-all duration-200 border
                          ${isSelected
                            ? 'bg-primary/20 border-primary/60 text-primary shadow-glow-sm'
                            : 'bg-dark-card/40 border-border/40 text-text-secondary hover:border-primary/40 hover:text-text-primary'
                          }
                        `}
                      >
                        {year}
                        {isSelected && (
                          <CheckIcon className="h-3 w-3 absolute top-1 right-1 text-primary" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Months Selector */}
        <div className="relative">
          <label className="text-xs uppercase tracking-wide text-text-muted mb-2 block">
            Meses
          </label>
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs text-text-secondary">
              {allMonthsSelected ? 'Todos los meses seleccionados' : 'Selecciona múltiples meses o aplica un preset'}
            </Text>
            <button
              type="button"
              onClick={selectAllMonths}
              disabled={monthsLoading || allMonthsSelected}
              className={`text-xs font-semibold transition-colors ${
                monthsLoading || allMonthsSelected
                  ? 'text-text-muted cursor-not-allowed'
                  : 'text-primary hover:text-primary/80'
              }`}
            >
              Seleccionar todos los meses
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMonthPicker(!showMonthPicker);
              setShowYearPicker(false);
            }}
            aria-expanded={showMonthPicker}
            aria-haspopup="listbox"
            aria-label="Seleccionar meses"
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-dark-card/80 px-4 py-3 text-sm text-text-primary transition-all duration-200 hover:border-primary/60 focus:outline-none focus:border-primary/60"
          >
            <Flex alignItems="center" className="gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="truncate">{selectedMonthsLabel}</span>
            </Flex>
            {selectedMonths.length > 0 && selectedMonths.length < 12 && (
              <Badge color="cyan" className="text-xs flex-shrink-0">
                {selectedMonths.length}
              </Badge>
            )}
          </button>

          <AnimatePresence>
            {showMonthPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute z-50 mt-2 w-full rounded-xl border border-border/60 bg-dark-card/95 backdrop-blur-sm shadow-hologram p-4"
              >
                <Flex justifyContent="between" className="mb-3">
                  <Text className="text-xs font-semibold text-text-secondary uppercase">
                    Seleccionar meses
                  </Text>
                  <Flex className="gap-2">
                    <button
                      type="button"
                      onClick={selectAllMonths}
                      className="text-xs text-primary hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      type="button"
                      onClick={clearMonths}
                      className="text-xs text-text-muted hover:text-danger hover:underline"
                    >
                      Limpiar
                    </button>
                  </Flex>
                </Flex>

                <div className="grid grid-cols-3 gap-2">
                  {monthsLoading && (
                    <div className="col-span-3 space-y-2">
                      <div className="h-9 rounded-lg bg-dark-card/40 animate-pulse" />
                      <div className="h-9 rounded-lg bg-dark-card/40 animate-pulse" />
                      <div className="h-9 rounded-lg bg-dark-card/40 animate-pulse" />
                    </div>
                  )}
                  {!monthsLoading && MONTH_NAMES.map((monthName, index) => {
                    const monthNumber = index + 1;
                    const isAvailable = availableMonths.includes(monthNumber);
                    const isSelected = selectedMonths.includes(monthNumber);

                    return (
                      <motion.button
                        key={monthNumber}
                        type="button"
                        disabled={!isAvailable}
                        whileHover={isAvailable ? { scale: 1.05 } : {}}
                        whileTap={isAvailable ? { scale: 0.95 } : {}}
                        onClick={() => isAvailable && toggleMonth(monthNumber)}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-disabled={!isAvailable}
                        aria-label={`Filtrar por ${MONTH_NAMES[index]}${isSelected ? ' (seleccionado)' : ''}`}
                        className={`
                          relative rounded-lg px-2 py-2 text-xs font-semibold
                          transition-all duration-200 border
                          ${!isAvailable
                            ? 'bg-dark-card/20 border-border/20 text-text-muted/40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-primary/20 border-primary/60 text-primary shadow-glow-sm'
                              : 'bg-dark-card/40 border-border/40 text-text-secondary hover:border-primary/40 hover:text-text-primary'
                          }
                        `}
                      >
                        {MONTH_NAMES_SHORT[index]}
                        {isSelected && isAvailable && (
                          <CheckIcon className="h-3 w-3 absolute top-0.5 right-0.5 text-primary" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active filters summary */}
      {(selectedYears.length > 0 || selectedMonths.length > 0 || additionalBadges.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card rounded-xl border border-primary/30 bg-primary/5 p-3"
        >
          <Flex alignItems="center" justifyContent="between" className="gap-3">
            <Flex alignItems="center" className="gap-2 flex-wrap">
              <SparklesIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <Text className="text-sm text-text-secondary">
                Filtro activo:
              </Text>
              {selectedYears.length > 0 && (
                <Badge color="cyan" className="text-xs">
                  {selectedYearsLabel}
                </Badge>
              )}
              {selectedMonths.length > 0 && selectedMonths.length < 12 && (
                <Badge color="purple" className="text-xs">
                  {selectedMonthsLabel}
                </Badge>
              )}
              {additionalBadges.map(badge => (
                <Badge
                  key={badge.id}
                  color={badge.color as any}
                  className={`text-xs ${badge.className ?? 'bg-dark-card/70 border border-border/60 text-text-secondary'}`}
                >
                  <span className="font-semibold">{badge.label}:</span> {badge.value}
                </Badge>
              ))}
            </Flex>
            <button
              type="button"
              onClick={() => {
                clearYears();
                clearMonths();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:text-danger transition-colors"
              title="Limpiar filtros de período"
            >
              <XMarkIcon className="h-3 w-3" />
              Limpiar
            </button>
          </Flex>
        </motion.div>
      )}
    </div>
  );
}
