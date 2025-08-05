import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const SimpleThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [cssVars, setCssVars] = useState<{bg: string, primary: string, bodyBg: string}>({
    bg: '', primary: '', bodyBg: ''
  });
  
  // Test if CSS variables are working
  const testCSSVariables = () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const bodyStyle = getComputedStyle(document.body);
    
    const bgColor = computedStyle.getPropertyValue('--color-bg').trim();
    const primaryColor = computedStyle.getPropertyValue('--color-primary').trim();
    const bodyBg = bodyStyle.backgroundColor;
    
    setCssVars({ bg: bgColor, primary: primaryColor, bodyBg });
    
    console.log('🎨 CSS Variables test:');
    console.log('  --color-bg:', bgColor);
    console.log('  --color-primary:', primaryColor);
    console.log('  Body background:', bodyBg);
    console.log('  HTML classes:', document.documentElement.className);
  };
  
  // Auto-test when theme changes
  useEffect(() => {
    const timer = setTimeout(() => {
      testCSSVariables();
      // Verificar si el CSS está cargando correctamente
      const styles = getComputedStyle(document.documentElement);
      console.log('🎨 CSS Check:');
      console.log('  HTML classes:', document.documentElement.className);
      console.log('  Body classes:', document.body.className);
      console.log('  CSS loaded?:', styles.getPropertyValue('--color-bg') !== '');
    }, 200);
    return () => clearTimeout(timer);
  }, [theme]);
  
  return (
    <div className="fixed top-4 left-4 z-[9999] bg-red-500 p-2 rounded text-white text-xs max-w-xs">
      <div className="mb-1">Current Theme: <strong>{theme}</strong></div>
      <button 
        onClick={toggleTheme}
        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs mr-1 mb-1"
      >
        Toggle to {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      <button 
        onClick={testCSSVariables}
        className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs mb-1"
      >
        Test CSS
      </button>
      <div className="mt-1 text-xs">
        <div>HTML Classes: {document.documentElement.className || 'none'}</div>
        <div>--color-bg: {cssVars.bg || 'not loaded'}</div>
        <div>--color-primary: {cssVars.primary || 'not loaded'}</div>
        <div>Body BG: {cssVars.bodyBg || 'not loaded'}</div>
      </div>
      <div className="mt-1">
        CSS Test: <span style={{backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)', padding: '2px 4px', borderRadius: '2px'}}>Sample</span>
      </div>
    </div>
  );
};

export default SimpleThemeToggle;