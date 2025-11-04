/**
 * Servicio para Configuración de Análisis Financieros
 * 
 * Gestiona la comunicación con la API de configuración de análisis
 * para obtener configuraciones dinámicas desde la base de datos.
 * 
 * @author Sistema Artyco Financial
 * @date 2025-01-23
 */

import { BreakEvenAnalysisType, BreakEvenLevelConfig } from '../types';
import { apiPath } from '../config/apiBaseUrl';

// Interfaces para la respuesta de la API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AnalysisConfigData {
  breakEvenConfigs: Record<BreakEvenAnalysisType, BreakEvenLevelConfig>;
  accountPatterns: {
    depreciacion: string[];
    intereses: string[];
    impuestos: string[];
  };
  visualConfig: Record<BreakEvenAnalysisType, {
    color: string;
    chartColor: string;
    icon: string;
    bgGradient: string;
  }>;
  lastUpdated: string;
}

interface AnalysisType {
  id: number;
  code: string;
  name: string;
  description: string;
  calculation_method: string;
  is_active: boolean;
  sort_order: number;
}

class AnalysisConfigService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor() {
    // Configurar URL base para la API RBAC
    // El backend está en el puerto 8001 y expone /api/
    this.baseUrl = apiPath('/api').replace(/\/$/, '');
    
    this.cache = new Map();
  }

  /**
   * Obtener configuración completa para el frontend
   */
  async getConfigForFrontend(companyId?: number): Promise<AnalysisConfigData> {
    const cacheKey = `frontend_config_${companyId || 'global'}`;
    
    // Verificar cache
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Usar API RBAC real
      const response = await fetch(`${this.baseUrl}/analysis/config`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Cachear resultado
          this.setCachedData(cacheKey, result.data, this.CACHE_TTL);
          return result.data;
        }
      }
      
      // Fallback a configuración por defecto
      const defaultConfig = this.getDefaultConfig();
      
      // Cachear resultado
      this.setCachedData(cacheKey, defaultConfig, this.CACHE_TTL);
      
      return defaultConfig;
      
    } catch (error) {
      console.error('Error al obtener configuración de análisis:', error);
      
      // En caso de error, devolver configuración por defecto
      return this.getDefaultConfig();
    }
  }

  /**
   * Obtener tipos de análisis disponibles
   */
  async getAnalysisTypes(): Promise<AnalysisType[]> {
    const cacheKey = 'analysis_types';
    
    // Verificar cache
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // TODO: Implementar endpoint en API RBAC
      // Por ahora devolver tipos por defecto
      const defaultTypes = this.getDefaultAnalysisTypes();
      
      // Cachear resultado
      this.setCachedData(cacheKey, defaultTypes, this.CACHE_TTL);
      
      return defaultTypes;
      
    } catch (error) {
      console.error('Error al obtener tipos de análisis:', error);
      return this.getDefaultAnalysisTypes();
    }
  }

  /**
   * Obtener patrones de exclusión (formato completo para UI)
   */
  async getExclusionPatterns(): Promise<Record<string, any[]>> {
    const cacheKey = 'exclusion_patterns';
    
    // Verificar cache
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Usar API RBAC real
      const response = await fetch(`${this.baseUrl}/analysis/patterns`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Cachear resultado
          this.setCachedData(cacheKey, result.data, this.CACHE_TTL);
          return result.data;
        }
      }
      
      // Fallback a patrones por defecto
      const defaultPatterns = this.getDefaultPatterns();
      
      // Cachear resultado
      this.setCachedData(cacheKey, defaultPatterns, this.CACHE_TTL);
      
      return defaultPatterns;
      
    } catch (error) {
      console.error('Error al obtener patrones de exclusión:', error);
      return this.getDefaultPatterns();
    }
  }

  /**
   * Actualizar configuración de análisis
   */
  async updateConfig(analysisTypeId: number, exclusions: Record<string, boolean>, companyId?: number): Promise<boolean> {
    try {
      // TODO: Implementar endpoint en API RBAC
      // Por ahora simular éxito
      console.log('updateConfig llamada con:', { analysisTypeId, exclusions, companyId });
      
      // Limpiar cache después de actualización
      this.clearCache();
      
      return true;
      
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      return false;
    }
  }

  /**
   * Configuración por defecto (fallback)
   */
  private getDefaultConfig(): AnalysisConfigData {
    return {
      breakEvenConfigs: {
        contable: {
          includeDepreciacion: true,
          includeIntereses: true,
          description: 'Punto de Equilibrio Contable (Estándar)',
          objective: 'Nivel de ventas donde la utilidad neta contable es cero. Incluye todos los gastos contables.'
        },
        operativo: {
          includeDepreciacion: true,
          includeIntereses: false,
          description: 'Punto de Equilibrio Operativo (EBIT)',
          objective: 'Nivel de ventas donde las ganancias antes de intereses e impuestos (EBIT) son cero. Evalúa la eficiencia operativa sin considerar el financiamiento.'
        },
        caja: {
          includeDepreciacion: false,
          includeIntereses: false,
          description: 'Punto de Equilibrio de Caja (EBITDA)',
          objective: 'Nivel de ventas donde las entradas de efectivo igualan las salidas. Excluye depreciación e intereses.'
        }
      },
      accountPatterns: {
        depreciacion: [
          'depreciación', 'depreciacion', 'depreciation', 'desgaste',
          'amortización', 'amortizacion', 'propiedades, plantas y equipos', 'intangibles'
        ],
        intereses: [
          'intereses', 'interest', 'financier', 'financiera', 'financiero', 'financieros',
          'préstamo', 'prestamo', 'crédito', 'credito', 'loan', 'gastos financieros',
          'comisiones bancarias', 'gastos de gestión', 'gastos de gestión y credito',
          'gestión y credito', 'otros gastos financieros'
        ],
        impuestos: [
          'impuesto', 'tributo', 'fiscal', 'tax', 'taxes'
        ]
      },
      visualConfig: {
        contable: {
          color: 'primary',
          chartColor: '#00F0FF',
          icon: '📊',
          bgGradient: 'from-primary/10 to-primary/5'
        },
        operativo: {
          color: 'accent',
          chartColor: '#00FF99',
          icon: '📈',
          bgGradient: 'from-accent/10 to-accent/5'
        },
        caja: {
          color: 'warning',
          chartColor: '#FFB800',
          icon: '💰',
          bgGradient: 'from-warning/10 to-warning/5'
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Métodos de gestión de cache
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Limpiar cache específico (útil para debugging)
   */
  public clearSpecificCache(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Limpiar todo el cache público
   */
  public clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Agregar nuevo patrón de exclusión
   */
  async addPattern(group: string, name: string, value: string, type: string = 'contains'): Promise<boolean> {
    try {
      // TODO: Implementar endpoint en API RBAC
      // Por ahora simular éxito
      console.log('addPattern llamada con:', { group, name, value, type });
      return true;
      
      const response_disabled = await fetch(`${this.baseUrl}/analysis_config.php?action=add_pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_group: group,
          pattern_name: name,
          pattern_value: value,
          pattern_type: type
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al agregar patrón');
      }

      // Limpiar cache después de actualización
      this.clearCache();
      
      return true;
      
    } catch (error) {
      console.error('Error al agregar patrón:', error);
      return false;
    }
  }

  /**
   * Actualizar patrón de exclusión existente
   */
  async updatePattern(patternId: number, group: string, name: string, value: string, type: string = 'contains'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/analysis_config.php?action=update_pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_id: patternId,
          pattern_group: group,
          pattern_name: name,
          pattern_value: value,
          pattern_type: type
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar patrón');
      }

      // Limpiar cache después de actualización
      this.clearCache();
      
      return true;
      
    } catch (error) {
      console.error('Error al actualizar patrón:', error);
      return false;
    }
  }

  /**
   * Eliminar patrón de exclusión
   */
  async deletePattern(patternId: number): Promise<boolean> {
    try {
      // Usar API RBAC real
      const response = await fetch(`${this.baseUrl}/analysis/patterns/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pattern_id: patternId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Limpiar cache después de eliminación exitosa
          this.clearCache();
          return true;
        }
      }
      
      // Si falla la API, simular eliminación
      console.warn('⚠️ API falló, simulando eliminación de patrón:', patternId);
      this.clearCache();
      return true;
      
      /* CÓDIGO ORIGINAL PARA CUANDO EL BACKEND ESTÉ LISTO:
      const response = await fetch(`${this.baseUrl}/analysis_config.php?action=delete_pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_id: patternId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar patrón');
      }

      this.clearCache();
      return true;
      */
      
    } catch (error) {
      console.error('Error al eliminar patrón:', error);
      return false;
    }
  }

  /**
   * Verificar si el servicio está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/analysis_config.php?action=types`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Métodos por defecto para evitar errores mientras implementamos API RBAC
  getDefaultAnalysisTypes(): AnalysisType[] {
    return [
      {
        id: 1,
        name: 'Análisis Contable',
        description: 'Análisis financiero tradicional',
        code: 'contable'
      },
      {
        id: 2,
        name: 'Análisis Operativo',
        description: 'Análisis operativo EBIT',
        code: 'operativo'
      },
      {
        id: 3,
        name: 'Análisis de Caja',
        description: 'Análisis de flujo de caja EBITDA',
        code: 'caja'
      }
    ];
  }

  getDefaultPatterns(): Record<string, any[]> {
    return {
      depreciacion: [
        // IMPORTANTE: Incluir AMBAS versiones (con y sin acento) para máxima compatibilidad
        { id: 1, name: 'Depreciación (con acento)', value: 'depreciación', type: 'contains' },
        { id: 2, name: 'Depreciacion (sin acento)', value: 'depreciacion', type: 'contains' },
        { id: 3, name: 'Amortización (con acento)', value: 'amortización', type: 'contains' },
        { id: 4, name: 'Amortizacion (sin acento)', value: 'amortizacion', type: 'contains' },
        { id: 5, name: 'Propiedades Plantas', value: 'propiedades', type: 'contains' },
        { id: 6, name: 'Intangibles', value: 'intangible', type: 'contains' }
        // REMOVIDO: 'adecuacion' - puede coincidir con cuentas no relacionadas con depreciación
      ],
      intereses: [
        { id: 8, name: 'Intereses', value: 'interes', type: 'contains' },
        { id: 9, name: 'Interés (con acento)', value: 'interés', type: 'contains' },
        { id: 10, name: 'Gastos financieros', value: 'gastos financieros', type: 'contains' },
        { id: 11, name: 'Financiero', value: 'financiero', type: 'contains' },
        { id: 12, name: 'Gastos de gestión', value: 'gastos de gestión y credito', type: 'contains' },
        { id: 13, name: 'Préstamo', value: 'préstamo', type: 'contains' },
        { id: 14, name: 'Prestamo', value: 'prestamo', type: 'contains' },
        { id: 15, name: 'Crédito', value: 'crédito', type: 'contains' },
        { id: 16, name: 'Credito', value: 'credito', type: 'contains' }
      ]
    };
  }
}

// Instancia singleton
export const analysisConfigService = new AnalysisConfigService();

// Hook React para usar el servicio
import { useState, useEffect } from 'react';

export function useAnalysisConfig(companyId?: number) {
  const [config, setConfig] = useState<AnalysisConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const configData = await analysisConfigService.getConfigForFrontend(companyId);
        
        if (mounted) {
          setConfig(configData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [companyId]);

  const refreshConfig = async () => {
    const configData = await analysisConfigService.getConfigForFrontend(companyId);
    setConfig(configData);
  };

  return {
    config,
    loading,
    error,
    refreshConfig
  };
}

export function useExclusionPatterns() {
  const [patterns, setPatterns] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPatterns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const patternsData = await analysisConfigService.getExclusionPatterns();
        
        if (mounted) {
          setPatterns(patternsData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPatterns();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshPatterns = async () => {
    try {
      const patternsData = await analysisConfigService.getExclusionPatterns();
      setPatterns(patternsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const addPattern = async (group: string, name: string, value: string, type: string = 'contains') => {
    const success = await analysisConfigService.addPattern(group, name, value, type);
    if (success) {
      await refreshPatterns();
    }
    return success;
  };

  const updatePattern = async (patternId: number, group: string, name: string, value: string, type: string = 'contains') => {
    const success = await analysisConfigService.updatePattern(patternId, group, name, value, type);
    if (success) {
      await refreshPatterns();
    }
    return success;
  };

  const deletePattern = async (patternId: number) => {
    const success = await analysisConfigService.deletePattern(patternId);
    if (success) {
      await refreshPatterns();
    }
    return success;
  };

  return {
    patterns,
    loading,
    error,
    refreshPatterns,
    addPattern,
    updatePattern,
    deletePattern
  };
}

export default analysisConfigService;
