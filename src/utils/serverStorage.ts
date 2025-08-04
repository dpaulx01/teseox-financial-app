// Sistema híbrido de almacenamiento: localStorage + Servidor
// Compatible con SiteGround hosting compartido

interface ServerResponse<T> {
  success: boolean;
  data?: T;
  metadata?: {
    last_modified: string;
    file_size: number;
    type: string;
  };
  error?: string;
}

interface SyncResponse {
  success: boolean;
  results: Record<string, any>;
  synced_at: string;
  errors?: string[];
}

class HybridStorage {
  private baseUrl: string;
  private fallbackToLocal: boolean = true;
  
  constructor() {
    // URL de tu servidor SiteGround con estructura /kpi/
    // Usar variable de entorno si está disponible, sino detectar automáticamente
    let apiUrl: string;
    
    if (import.meta.env?.VITE_API_BASE_URL) {
      apiUrl = import.meta.env.VITE_API_BASE_URL;
    } else if (typeof window !== 'undefined') {
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isProduction) {
        apiUrl = `${window.location.origin}/api`;
      } else {
        // En desarrollo, deshabilitar servidor por defecto
        apiUrl = '';
        this.fallbackToLocal = true;
        // console.log('🔧 Modo desarrollo: usando solo localStorage');
      }
    } else {
      apiUrl = '';
      this.fallbackToLocal = true;
    }
    
    this.baseUrl = apiUrl;
    if (apiUrl) {
      // console.log('🔧 API Base URL configurada:', this.baseUrl);
    }
  }

  // === MÉTODOS PÚBLICOS ===

  async saveToServer<T>(type: string, data: T): Promise<boolean> {
    // Verificar que estamos en el navegador
    if (typeof window === 'undefined') {
      // console.log('⚠️ No se puede guardar en servidor: entorno no es navegador');
      return false;
    }
    
    // Si no hay baseUrl configurada, usar solo localStorage
    if (!this.baseUrl) {
      // console.log(`💾 Servidor no configurado, usando localStorage para ${type}`);
      this.saveToLocal(type, data);
      return true;
    }
    
    try {
      // console.log(`🔄 Guardando ${type} en servidor...`);
      
      const response = await fetch(`${this.baseUrl}/data.php?type=${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // console.log(`✅ ${type} guardado en servidor`);
        return true;
      } else {
        throw new Error(result.error || 'Unknown server error');
      }
      
    } catch (error) {
      // console.error(`❌ Error guardando ${type} en servidor:`, error);
      
      if (this.fallbackToLocal) {
        // console.log(`🔄 Fallback: guardando ${type} solo en localStorage`);
        this.saveToLocal(type, data);
      }
      
      return false;
    }
  }

  async loadFromServer<T>(type: string): Promise<T | null> {
    // Verificar que estamos en el navegador
    if (typeof window === 'undefined') {
      // console.log('⚠️ No se puede cargar desde servidor: entorno no es navegador');
      return null;
    }
    
    // Si no hay baseUrl configurada, usar solo localStorage
    if (!this.baseUrl) {
      // console.log(`📁 Servidor no configurado, cargando ${type} desde localStorage`);
      return this.loadFromLocal<T>(type);
    }
    
    try {
      // console.log(`🔄 Cargando ${type} desde servidor...`);
      
      const response = await fetch(`${this.baseUrl}/data.php?type=${type}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ServerResponse<T> = await response.json();
      
      if (result.success && result.data) {
        // console.log(`✅ ${type} cargado desde servidor`);
        
        // Guardar en localStorage como cache
        this.saveToLocal(type, result.data);
        
        return result.data;
      } else {
        // console.log(`ℹ️ ${type} no encontrado en servidor`);
        return null;
      }
      
    } catch (error) {
      // console.error(`❌ Error cargando ${type} desde servidor:`, error);
      
      if (this.fallbackToLocal) {
        // console.log(`🔄 Fallback: cargando ${type} desde localStorage`);
        return this.loadFromLocal<T>(type);
      }
      
      return null;
    }
  }

  async syncAll(): Promise<SyncResponse | null> {
    try {
      // console.log('🔄 Iniciando sincronización completa...');
      
      // Recopilar todos los datos del localStorage
      const allData = {
        financial: this.loadFromLocal('artyco-financial-data-persistent'),
        production: this.loadFromLocal('artyco-production-data'),
        config: this.loadFromLocal('artyco-production-config'),
        combined: this.loadFromLocal('artyco-combined-data')
      };

      // Filtrar datos nulos
      const dataToSync = Object.fromEntries(
        Object.entries(allData).filter(([_, value]) => value !== null)
      );

      if (Object.keys(dataToSync).length === 0) {
        // console.log('ℹ️ No hay datos para sincronizar');
        return null;
      }

      const response = await fetch(`${this.baseUrl}/sync.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSync)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SyncResponse = await response.json();
      
      if (result.success) {
        // console.log('✅ Sincronización completa exitosa');
      } else {
        // console.warn('⚠️ Sincronización parcial:', result.errors);
      }
      
      return result;
      
    } catch (error) {
      // console.error('❌ Error en sincronización completa:', error);
      return null;
    }
  }

  async getServerStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/sync.php`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // console.error('❌ Error obteniendo estado del servidor:', error);
      return null;
    }
  }

  // === MÉTODOS HÍBRIDOS ===

  async save<T>(type: string, data: T): Promise<void> {
    // Guardar inmediatamente en localStorage (rápido)
    this.saveToLocal(type, data);
    
    // Si no hay servidor configurado, solo usar localStorage
    if (!this.baseUrl) {
      return;
    }
    
    // Intentar guardar en servidor (background)
    try {
      await this.saveToServer(type, data);
    } catch (error) {
      // console.warn(`⚠️ Guardado en servidor falló para ${type}, datos disponibles en localStorage`);
      // No lanzar error, continuar con localStorage como fallback
    }
  }

  async load<T>(type: string): Promise<T | null> {
    // Si no hay servidor configurado, usar directamente localStorage
    if (!this.baseUrl) {
      return this.loadFromLocal<T>(type);
    }
    
    // Intentar cargar desde servidor primero
    const serverData = await this.loadFromServer<T>(type);
    
    if (serverData) {
      return serverData;
    }
    
    // Fallback a localStorage
    return this.loadFromLocal<T>(type);
  }

  // === MÉTODOS PRIVADOS (localStorage) ===

  private saveToLocal<T>(type: string, data: T): void {
    try {
      const key = this.getLocalStorageKey(type);
      localStorage.setItem(key, JSON.stringify(data));
      // console.log(`💾 ${type} guardado en localStorage`);
    } catch (error) {
      // console.error(`❌ Error guardando ${type} en localStorage:`, error);
    }
  }

  private loadFromLocal<T>(type: string): T | null {
    try {
      const key = this.getLocalStorageKey(type);
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        // console.log(`📁 ${type} cargado desde localStorage`);
        return data;
      }
      
      return null;
    } catch (error) {
      // console.error(`❌ Error cargando ${type} desde localStorage:`, error);
      return null;
    }
  }

  private getLocalStorageKey(type: string): string {
    const keyMap: Record<string, string> = {
      'financial': 'artyco-financial-data-persistent',
      'production': 'artyco-production-data',
      'config': 'artyco-production-config',
      'combined': 'artyco-combined-data'
    };
    
    return keyMap[type] || `artyco-${type}`;
  }

  // === UTILIDADES ===

  clearLocal(): void {
    const keys = [
      'artyco-financial-data-persistent',
      'artyco-production-data',
      'artyco-production-config',
      'artyco-combined-data'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
    // console.log('🗑️ localStorage limpiado');
  }

  async deleteFromServer(type: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/data.php?type=${type}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      // console.error(`❌ Error eliminando ${type} del servidor:`, error);
      return false;
    }
  }
}

// Instancia singleton
export const hybridStorage = new HybridStorage();

// Funciones de utilidad
export const syncAllData = () => hybridStorage.syncAll();
export const getServerStatus = () => hybridStorage.getServerStatus();
export const clearAllData = () => {
  hybridStorage.clearLocal();
  // También intentar limpiar servidor si es necesario
};