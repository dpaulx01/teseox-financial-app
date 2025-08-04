import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const SimpleThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="fixed top-4 left-4 z-[9999] bg-red-500 p-2 rounded text-white">
      <div className="text-xs mb-1">Debug: {theme}</div>
      <button 
        onClick={toggleTheme}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
      >
        Toggle to {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      <div className="text-xs mt-1">
        HTML class: {document.documentElement.className || 'none'}
      </div>
    </div>
  );
};

export default SimpleThemeToggle;