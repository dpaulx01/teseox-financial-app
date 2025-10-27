/**
 * Componente SearchableSelect con búsqueda asíncrona
 * Diseño moderno y futurista para filtros dinámicos
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Text } from '@tremor/react';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  icon?: string;
  emptyMessage?: string;
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  disabled = false,
  icon = '🔍',
  emptyMessage = 'No se encontraron resultados',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar opciones según búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Encontrar el texto del valor seleccionado
  const selectedText = useMemo(() => {
    return value || '';
  }, [value]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar teclas
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Reset highlighted index cuando cambian las opciones filtradas
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;

    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      <Text className="mb-2 flex items-center gap-2 text-sm font-medium text-text-secondary">
        <SparklesIcon className="h-4 w-4 text-primary" />
        {label}
      </Text>

      {/* Botón principal */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative w-full rounded-xl border border-border/60 bg-dark-card/80 px-4 py-3
          text-left text-sm font-medium text-text-primary
          transition-all duration-200 backdrop-blur-xl
          hover:border-primary/60 hover:bg-dark-card/90
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
          disabled:cursor-not-allowed disabled:opacity-50
          ${isOpen ? 'border-primary ring-2 ring-primary/30' : ''}
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{icon}</span>

          <span className={`flex-1 truncate ${!selectedText ? 'text-text-muted' : ''}`}>
            {selectedText || placeholder}
          </span>

          <div className="flex items-center gap-2">
            {selectedText && !disabled && (
              <div
                onClick={handleClear}
                className="rounded-lg p-1 hover:bg-danger/20 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-text-muted hover:text-danger" />
              </div>
            )}

            <ChevronDownIcon
              className={`h-4 w-4 text-text-muted transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-[100] mt-2"
          >
            <div className="glass-panel rounded-xl border border-border/60 bg-dark-card/95 shadow-2xl backdrop-blur-2xl">
              {/* Barra de búsqueda */}
              <div className="border-b border-border/40 p-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar ${label.toLowerCase()}...`}
                    className="w-full rounded-lg border border-border/40 bg-dark-card/60 py-2 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Lista de opciones */}
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                {/* Opción "Todos" */}
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm
                    transition-all duration-150
                    ${!value
                      ? 'bg-primary/20 text-primary font-semibold shadow-glow-sm'
                      : 'text-text-secondary hover:bg-primary/10 hover:text-text-primary'
                    }
                  `}
                >
                  <span className="text-base">✨</span>
                  <span className="flex-1">Todos los {label.toLowerCase()}s</span>
                  {!value && <CheckIcon className="h-4 w-4 text-primary" />}
                </button>

                {/* Opciones filtradas */}
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                    const isSelected = option === value;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`
                          flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm
                          transition-all duration-150
                          ${isSelected
                            ? 'bg-primary/20 text-primary font-semibold shadow-glow-sm'
                            : isHighlighted
                            ? 'bg-primary/10 text-text-primary'
                            : 'text-text-secondary hover:bg-primary/5 hover:text-text-primary'
                          }
                        `}
                      >
                        <span className="text-base">{icon}</span>
                        <span className="flex-1 truncate">{option}</span>
                        {isSelected && <CheckIcon className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center">
                    <div className="mb-2 text-3xl">🔍</div>
                    <p className="text-sm text-text-muted">{emptyMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
