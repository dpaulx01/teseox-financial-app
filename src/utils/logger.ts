// Sistema de logging optimizado para rendimiento
// Solo logea en desarrollo y cuando está habilitado

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG_ENABLED === 'true' || localStorage.getItem('artyco-debug') === 'true';

// Niveles de log
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Configuración por módulo - Reducir logs en producción
const moduleLogLevels: Record<string, LogLevel> = {
  'MixedCostPanel': LogLevel.ERROR,         // Solo errores críticos
  'PygContainer': LogLevel.ERROR,           // Solo errores críticos
  'IntelligentClassifier': LogLevel.ERROR,  // Solo errores críticos
  'ProductionStorage': LogLevel.WARN,       // Warnings importantes
  'FinancialStorage': LogLevel.ERROR,       // Solo errores críticos
  'Default': LogLevel.WARN                  // Solo warnings por defecto
};

class Logger {
  private shouldLog(level: LogLevel, module: string = 'Default'): boolean {
    if (!isDevelopment) return false;
    if (!isDebugEnabled && level === LogLevel.DEBUG) return false;
    
    const moduleLevel = moduleLogLevels[module] || moduleLogLevels.Default;
    return level <= moduleLevel;
  }

  error(module: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR, module)) {
      console.error(`❌ [${module}] ${message}`, ...args);
    }
  }

  warn(module: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN, module)) {
      console.warn(`⚠️ [${module}] ${message}`, ...args);
    }
  }

  info(module: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO, module)) {
      console.log(`ℹ️ [${module}] ${message}`, ...args);
    }
  }

  debug(module: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG, module)) {
      console.log(`🔍 [${module}] ${message}`, ...args);
    }
  }

  // Método especial para logs críticos que siempre se muestran
  critical(module: string, message: string, ...args: any[]) {
    console.error(`🚨 [${module}] CRITICAL: ${message}`, ...args);
  }
}

export const logger = new Logger();

// Funciones de conveniencia
export const log = {
  error: (module: string, message: string, ...args: any[]) => logger.error(module, message, ...args),
  warn: (module: string, message: string, ...args: any[]) => logger.warn(module, message, ...args),
  info: (module: string, message: string, ...args: any[]) => logger.info(module, message, ...args),
  debug: (module: string, message: string, ...args: any[]) => logger.debug(module, message, ...args),
  critical: (module: string, message: string, ...args: any[]) => logger.critical(module, message, ...args),
};

// Para habilitar debug completo en consola del navegador:
// localStorage.setItem('artyco-debug', 'true')
// Para deshabilitar:
// localStorage.removeItem('artyco-debug')

export default logger;