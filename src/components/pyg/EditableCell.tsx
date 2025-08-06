import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

interface EditableCellProps {
  initialValue: number;
  onSave: (newValue: number) => void;
  className?: string;
  isReadOnly?: boolean;
  formatCurrency?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  initialValue,
  onSave,
  className = '',
  isReadOnly = false,
  formatCurrency = true
}) => {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedValue = useDebounce(value, 500); // 500ms de debounce

  // Sincronizar con initialValue cuando cambie externamente
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Guardar cuando el valor debounced cambie
  useEffect(() => {
    // Solo guardar si el valor debounced es diferente del inicial y no estamos en la primera carga
    if (debouncedValue !== initialValue && debouncedValue !== value) {
      handleSave(debouncedValue);
    }
  }, [debouncedValue]);

  const handleSave = async (newValue: number) => {
    if (isReadOnly || newValue === initialValue) return;
    
    setIsSaving(true);
    try {
      await onSave(newValue);
    } catch (error) {
      console.error('Error saving cell value:', error);
      // Revertir al valor inicial en caso de error
      setValue(initialValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^0-9.-]/g, ''); // Solo números, punto y guión
    const numValue = parseFloat(inputValue);
    setValue(isNaN(numValue) ? 0 : numValue);
  };

  const handleFocus = () => {
    if (!isReadOnly) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setValue(initialValue);
      e.currentTarget.blur();
    }
  };

  const formatValue = (val: number): string => {
    if (!formatCurrency) return val.toString();
    
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const displayValue = isEditing ? value.toString() : formatValue(value);

  const cellClasses = `
    bg-transparent text-right w-full px-2 py-1 transition-all duration-200
    ${isReadOnly 
      ? 'cursor-default text-text-muted' 
      : 'cursor-text hover:bg-glass focus:bg-dark-surface focus:outline-none focus:ring-1 focus:ring-primary rounded-md'
    }
    ${isEditing ? 'bg-dark-surface ring-1 ring-primary' : ''}
    ${isSaving ? 'bg-yellow-500/20 animate-pulse' : ''}
    ${className}
  `.trim();

  if (isReadOnly) {
    return (
      <div className={cellClasses}>
        {formatValue(value)}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyPress}
        className={cellClasses}
        disabled={isSaving}
        title={`Valor: ${formatValue(value)}${isSaving ? ' (Guardando...)' : ''}`}
      />
      
      {/* Indicador visual de estado */}
      {isSaving && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
      )}
      
      {isEditing && !isReadOnly && (
        <div className="absolute -bottom-6 left-0 text-xs text-text-muted">
          Enter: Guardar | Esc: Cancelar
        </div>
      )}
    </div>
  );
};

export default EditableCell;