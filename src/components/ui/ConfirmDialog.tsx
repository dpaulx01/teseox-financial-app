import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'border-red-500/50 bg-red-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10',
    info: 'border-primary/50 bg-primary/10'
  };

  const buttonStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    info: 'bg-primary hover:bg-primary/80 text-black'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className={`relative glass-card border ${variantStyles[variant]} rounded-lg shadow-glow-lg max-w-md w-full p-6 animate-materialize`}>
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-text-muted hover:text-primary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className={`h-6 w-6 ${
            variant === 'danger' ? 'text-red-500' :
            variant === 'warning' ? 'text-yellow-500' :
            'text-primary'
          }`} />
          <h3 className="text-xl font-display text-primary">
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-text-secondary mb-6 font-mono text-sm">
          {message}
        </p>

        {/* Actions */}
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 glass-card border border-border rounded-lg text-text-secondary hover:text-primary hover:shadow-glow-sm transition-all duration-300 font-mono"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 rounded-lg ${buttonStyles[variant]} transition-all duration-300 font-mono shadow-glow-sm hover:shadow-glow-md`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
