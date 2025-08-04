import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface AnimatedBackgroundProps {
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  
  if (theme === 'light') {
    // Tema claro: fondo limpio sin elementos
    return (
      <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
        <div className="absolute inset-0" />
      </div>
    );
  }
  
  // Tema oscuro: efectos JARVIS cyberpunk
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Grid de fondo animado */}
      <div className="absolute inset-0 bg-cyber-grid bg-grid opacity-30 animate-pulse-glow" />
      
      {/* Partículas flotantes */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full opacity-60 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Círculos de resplandor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl animate-pulse-primary" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent opacity-8 rounded-full blur-3xl animate-pulse-accent" />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-danger opacity-4 rounded-full blur-3xl animate-float" />
      
      {/* Líneas de conexión animadas */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <line
              x1={`${10 + i * 12}%`}
              y1="0%"
              x2={`${20 + i * 10}%`}
              y2="100%"
              stroke="url(#lineGradient)"
              strokeWidth="1"
              className="animate-pulse-glow"
              style={{
                animationDelay: `${i * 0.5}s`,
              }}
            />
          </g>
        ))}
      </svg>
      
      {/* Efecto de escaneo holográfico */}
      <div className="absolute inset-0 bg-hologram-lines opacity-10 animate-scan-line" />
    </div>
  );
};

export default AnimatedBackground;