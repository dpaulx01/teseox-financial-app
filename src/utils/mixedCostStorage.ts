import { MixedCost, BreakEvenClassification } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const MIXED_COSTS_KEY = 'artyco-mixed-costs-global';
const CLASSIFICATIONS_KEY = 'artyco-custom-classifications-global';

// === MIXED COSTS STORAGE ===

export const saveMixedCosts = async (mixedCosts: MixedCost[]): Promise<void> => {
  try {
    // 1. Intentar guardar en MySQL via API
    try {
      const response = await fetch(`${API_BASE}/mixed_costs_v1.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ mixedCosts })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // También guardar en localStorage como cache
          localStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(mixedCosts));
          return;
        }
      }
    } catch (apiError) {
    }
    
    // 2. Fallback: Guardar en localStorage
    localStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(mixedCosts));
    
  } catch (error) {
    throw error;
  }
};

export const loadMixedCosts = async (): Promise<MixedCost[]> => {
  try {
    // 1. Intentar cargar desde MySQL via API
    try {
      const response = await fetch(`${API_BASE}/mixed_costs_v1.php`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.mixedCosts) {
          // También guardar en localStorage como cache
          localStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(data.mixedCosts));
          return data.mixedCosts;
        }
      }
    } catch (apiError) {
    }
    
    // 2. Fallback a localStorage
    const stored = localStorage.getItem(MIXED_COSTS_KEY);
    if (stored) {
      const mixedCosts = JSON.parse(stored);
      return mixedCosts;
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

export const clearMixedCosts = async (): Promise<void> => {
  try {
    // Limpiar localStorage
    localStorage.removeItem(MIXED_COSTS_KEY);
    
    // TODO: Implementar limpieza en MySQL si es necesario
    
  } catch (error) {
    throw error;
  }
};

// === CUSTOM CLASSIFICATIONS STORAGE ===

export const saveCustomClassifications = async (classifications: Record<string, BreakEvenClassification>): Promise<void> => {
  try {
    // Por ahora solo localStorage (implementar API después si es necesario)
    localStorage.setItem(CLASSIFICATIONS_KEY, JSON.stringify(classifications));
    
  } catch (error) {
    throw error;
  }
};

export const loadCustomClassifications = async (): Promise<Record<string, BreakEvenClassification>> => {
  try {
    const stored = localStorage.getItem(CLASSIFICATIONS_KEY);
    if (stored) {
      const classifications = JSON.parse(stored);
      return classifications;
    }
    
    return {};
  } catch (error) {
    return {};
  }
};

export const clearCustomClassifications = async (): Promise<void> => {
  try {
    localStorage.removeItem(CLASSIFICATIONS_KEY);
    
  } catch (error) {
    throw error;
  }
};