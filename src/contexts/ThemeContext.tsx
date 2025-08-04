import React, { createContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Recuperar tema guardado o usar 'light' por defecto
    const savedTheme = localStorage.getItem('artyco-theme') as Theme;
    console.log('🔄 ThemeProvider init - Saved theme:', savedTheme);
    const initialTheme = savedTheme || 'light';
    console.log('🔄 ThemeProvider init - Initial theme will be:', initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    console.log('🎨 Theme changed to:', theme);
    // Guardar tema en localStorage
    localStorage.setItem('artyco-theme', theme);
    
    // Aplicar clase al documento
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('🌙 Dark mode activated - added .dark class to html');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('☀️ Light mode activated - removed .dark class from html');
    }
    
    // Debug: mostrar clases actuales del documento
    console.log('📝 Current document classes:', document.documentElement.className);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;