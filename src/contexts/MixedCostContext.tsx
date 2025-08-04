import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MixedCost, BreakEvenClassification } from '../types';

interface MixedCostContextType {
  mixedCosts: MixedCost[];
  customClassifications: Record<string, BreakEvenClassification>;
  updateMixedCosts: (costs: MixedCost[]) => void;
  updateCustomClassifications: (classifications: Record<string, BreakEvenClassification>) => void;
  clearMixedCosts: () => void;
  lastUpdated: Date | null;
}

const MixedCostContext = createContext<MixedCostContextType | undefined>(undefined);

export const MixedCostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mixedCosts, setMixedCosts] = useState<MixedCost[]>([]);
  const [customClassifications, setCustomClassifications] = useState<Record<string, BreakEvenClassification>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cargar datos guardados al iniciar
  useEffect(() => {
    try {
      const savedMixedCosts = localStorage.getItem('artyco-mixed-costs-global');
      const savedClassifications = localStorage.getItem('artyco-custom-classifications-global');
      
      if (savedMixedCosts) {
        const parsed = JSON.parse(savedMixedCosts);
        setMixedCosts(parsed);
        setLastUpdated(new Date());
      }
      
      if (savedClassifications) {
        const parsed = JSON.parse(savedClassifications);
        setCustomClassifications(parsed);
      }
    } catch (error) {
      // Error loading mixed cost context data
    }
  }, []);

  const updateMixedCosts = useCallback((costs: MixedCost[]) => {
    let hasChanges = false;
    
    setMixedCosts(prevCosts => {
      // Solo actualizar si realmente hay cambios
      const currentString = JSON.stringify(prevCosts);
      const newString = JSON.stringify(costs);
      
      if (currentString === newString) {
        return prevCosts;
      }
      
      hasChanges = true;
      
      // NO guardar en localStorage - migrado a MySQL
      
      return costs;
    });
    
    // Solo actualizar timestamp si realmente hubo cambios
    if (hasChanges) {
      setLastUpdated(new Date());
    }
  }, []);

  const updateCustomClassifications = useCallback((classifications: Record<string, BreakEvenClassification>) => {
    // Updating custom classifications
    setCustomClassifications(classifications);
    
    // Guardar en localStorage
    try {
      localStorage.setItem('artyco-custom-classifications-global', JSON.stringify(classifications));
    } catch (error) {
      // Error saving custom classifications
    }
  }, []);

  const clearMixedCosts = useCallback(() => {
    // Clearing all mixed costs and classifications
    setMixedCosts([]);
    setCustomClassifications({});
    setLastUpdated(null);
    
    try {
      localStorage.removeItem('artyco-mixed-costs-global');
      localStorage.removeItem('artyco-custom-classifications-global');
    } catch (error) {
      // Error clearing mixed cost data
    }
  }, []);

  const value: MixedCostContextType = {
    mixedCosts,
    customClassifications,
    updateMixedCosts,
    updateCustomClassifications,
    clearMixedCosts,
    lastUpdated
  };

  return (
    <MixedCostContext.Provider value={value}>
      {children}
    </MixedCostContext.Provider>
  );
};

export const useMixedCosts = () => {
  const context = useContext(MixedCostContext);
  if (context === undefined) {
    throw new Error('useMixedCosts must be used within a MixedCostProvider');
  }
  return context;
};