import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative w-14 h-8 rounded-full p-1 transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-primary/20 border border-primary shadow-glow-sm' 
          : 'bg-gray-200 border border-gray-300'
      } ${className}`}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Track del switch */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Estrellas para el modo oscuro */}
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
          <div className="absolute top-1.5 right-2 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.9s' }} />
        </div>
      </div>

      {/* Botón deslizante */}
      <motion.div
        className={`relative w-6 h-6 rounded-full transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-dark-card border border-primary shadow-glow-sm' 
            : 'bg-white shadow-md'
        }`}
        animate={{
          x: theme === 'dark' ? 22 : 0,
          rotate: theme === 'dark' ? 360 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Iconos Sol/Luna */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun
            className={`absolute w-4 h-4 transition-all duration-300 ${
              theme === 'light' 
                ? 'text-yellow-500 opacity-100 scale-100 rotate-0' 
                : 'text-yellow-500 opacity-0 scale-50 rotate-180'
            }`}
          />
          <Moon
            className={`absolute w-4 h-4 transition-all duration-300 ${
              theme === 'dark' 
                ? 'text-primary opacity-100 scale-100 rotate-0' 
                : 'text-gray-400 opacity-0 scale-50 -rotate-180'
            }`}
          />
        </div>
      </motion.div>

      {/* Efecto de resplandor para modo oscuro */}
      {theme === 'dark' && (
        <motion.div
          className="absolute -inset-1 rounded-full bg-primary/20 blur-md -z-10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
};

export default ThemeToggle;