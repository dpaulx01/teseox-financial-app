import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Plus } from 'lucide-react';
import { getAvailableYears } from '../../utils/productionStorage';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  className?: string;
}

const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onYearChange,
  className = ''
}) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [newYear, setNewYear] = useState('');

  useEffect(() => {
    const loadYears = async () => {
      try {
        const years = await getAvailableYears();
        setAvailableYears(years);
      } catch (error) {
        console.error('Error loading available years:', error);
        setAvailableYears([new Date().getFullYear()]);
      }
    };

    loadYears();
  }, []);

  const handleYearSelect = (year: number) => {
    onYearChange(year);
    setIsOpen(false);
  };

  const handleCreateYear = () => {
    const year = parseInt(newYear);
    if (year && year >= 2020 && year <= 2030 && !availableYears.includes(year)) {
      setAvailableYears(prev => [...prev, year].sort((a, b) => b - a));
      onYearChange(year);
      setNewYear('');
      setIsCreatingYear(false);
      setIsOpen(false);
    }
  };

  const getYearsToShow = () => {
    const allYears = [...availableYears];
    if (!allYears.includes(selectedYear)) {
      allYears.push(selectedYear);
    }
    return allYears.sort((a, b) => b - a);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 bg-dark-card border border-accent/20 rounded-lg cursor-pointer hover:border-accent/40 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-accent" />
          <div>
            <div className="text-sm text-text-muted">Año seleccionado</div>
            <div className="text-lg font-semibold text-text-primary">{selectedYear}</div>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-accent/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          {/* Años disponibles */}
          <div className="p-2">
            {getYearsToShow().map((year) => (
              <motion.div
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between ${
                  year === selectedYear
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'hover:bg-accent/10 text-text-primary'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-medium">{year}</span>
                {year === selectedYear && (
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Separador */}
          <div className="border-t border-accent/20 mx-2"></div>

          {/* Crear nuevo año */}
          <div className="p-2">
            {!isCreatingYear ? (
              <motion.div
                onClick={() => setIsCreatingYear(true)}
                className="px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/10 text-text-muted flex items-center gap-2 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                <span>Agregar nuevo año</span>
              </motion.div>
            ) : (
              <div className="px-3 py-2 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="2024"
                    min="2020"
                    max="2030"
                    className="flex-1 px-3 py-2 bg-dark-bg border border-accent/20 rounded-lg text-text-primary focus:border-accent focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateYear}
                    disabled={!newYear || parseInt(newYear) < 2020 || parseInt(newYear) > 2030}
                    className="flex-1 px-3 py-2 bg-accent text-dark-bg rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingYear(false);
                      setNewYear('');
                    }}
                    className="flex-1 px-3 py-2 bg-dark-bg border border-accent/20 text-text-muted rounded-lg hover:bg-accent/10 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Overlay para cerrar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setIsCreatingYear(false);
            setNewYear('');
          }}
        />
      )}
    </div>
  );
};

export default YearSelector;