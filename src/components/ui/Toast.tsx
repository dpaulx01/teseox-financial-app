import React from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { ErrorState } from '../../hooks/useErrorHandler';

interface ToastProps {
  error: ErrorState;
  onClose: (timestamp: number) => void;
}

const Toast: React.FC<ToastProps> = ({ error, onClose }) => {
  const iconMap = {
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colorMap = {
    error: 'bg-dark-card border-accent-red text-accent-red',
    warning: 'bg-dark-card border-accent-blue text-accent-blue',
    info: 'bg-dark-card border-accent-green text-accent-green',
  };

  const IconComponent = iconMap[error.type];

  return (
    <div className={`${colorMap[error.type]} border rounded-lg p-4 shadow-lg animate-slide-up`}>
      <div className="flex items-start">
        <IconComponent className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{error.message}</p>
        </div>
        <button
          onClick={() => onClose(error.timestamp)}
          className="ml-3 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity text-text-light"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  errors: ErrorState[];
  onClose: (timestamp: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ errors, onClose }) => {
  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {errors.map(error => (
        <Toast key={error.timestamp} error={error} onClose={onClose} />
      ))}
    </div>
  );
};

export default Toast;