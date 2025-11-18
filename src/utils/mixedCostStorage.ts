import { MixedCost, BreakEvenClassification } from '../types';
import TenantStorage from './tenantStorage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const MIXED_COSTS_KEY = 'mixed-costs';  // Will be namespaced by TenantStorage
const CLASSIFICATIONS_KEY = 'custom-classifications';  // Will be namespaced by TenantStorage

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
          // También guardar en TenantStorage como cache (namespaced por company)
          TenantStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(mixedCosts));
          return;
        }
      }
    } catch (apiError) {
    }
    
    // 2. Fallback: Guardar en TenantStorage
    TenantStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(mixedCosts));
    
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
          // También guardar en TenantStorage como cache
          TenantStorage.setItem(MIXED_COSTS_KEY, JSON.stringify(data.mixedCosts));
          return data.mixedCosts;
        }
      }
    } catch (apiError) {
    }
    
    // 2. Fallback a TenantStorage
    const stored = TenantStorage.getItem(MIXED_COSTS_KEY);
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
    // Limpiar TenantStorage
    TenantStorage.removeItem(MIXED_COSTS_KEY);

    // TODO: Implementar limpieza en MySQL si es necesario

  } catch (error) {
    throw error;
  }
};

// === CUSTOM CLASSIFICATIONS STORAGE ===

export const saveCustomClassifications = async (classifications: Record<string, BreakEvenClassification>): Promise<void> => {
  try {
    // Por ahora solo TenantStorage (implementar API después si es necesario)
    TenantStorage.setItem(CLASSIFICATIONS_KEY, JSON.stringify(classifications));

  } catch (error) {
    throw error;
  }
};

export const loadCustomClassifications = async (): Promise<Record<string, BreakEvenClassification>> => {
  try {
    const stored = TenantStorage.getItem(CLASSIFICATIONS_KEY);
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
    TenantStorage.removeItem(CLASSIFICATIONS_KEY);

  } catch (error) {
    throw error;
  }
};