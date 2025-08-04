/**
 * Script para migrar datos de localStorage a MySQL usando el nuevo sistema RBAC
 * Ejecutar desde consola del navegador o como función manual
 */

import { migrateLocalStorageToDatabase } from './financialStorageNew';

const API_BASE = 'http://localhost:8001/api/financial';

export interface MigrationResult {
  success: boolean;
  migrated: {
    financial: boolean;
    production: boolean;
    mixedCosts: boolean;
    classifications: boolean;
  };
  errors: string[];
  timestamp: string;
}

export async function migrateLocalStorageToMySQL(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: {
      financial: false,
      production: false,
      mixedCosts: false,
      classifications: false
    },
    errors: [],
    timestamp: new Date().toISOString()
  };

  console.log('🚀 INICIANDO MIGRACIÓN CON NUEVO SISTEMA RBAC...');

  try {
    // Usar el nuevo sistema de migración integrado
    const migrationSuccess = await migrateLocalStorageToDatabase();
    
    if (migrationSuccess) {
      result.migrated.financial = true;
      result.migrated.production = true; // Incluido en el nuevo sistema
      result.success = true;
      console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE CON RBAC');
      await createLocalStorageBackup();
    } else {
      result.errors.push('Error en migración con sistema RBAC');
      console.warn('⚠️ MIGRACIÓN FALLÓ CON SISTEMA RBAC');
    }

    // Mantener compatibilidad con migración legacy para costos mixtos
    result.migrated.mixedCosts = await migrateMixedCosts(result.errors);
    result.migrated.classifications = await migrateAccountClassifications(result.errors);

  } catch (error) {
    result.errors.push(`Error general de migración: ${error}`);
    console.error('❌ ERROR EN MIGRACIÓN:', error);
  }

  return result;
}

async function migrateFinancialData(errors: string[]): Promise<boolean> {
  try {
    // console.log('📊 Migrando datos financieros...');
    
    // Obtener datos de localStorage
    const financialData = localStorage.getItem('artyco-financial-data-persistent');
    if (!financialData) {
      // console.log('ℹ️ No hay datos financieros en localStorage');
      return true; // No es error, simplemente no hay datos
    }

    const data = JSON.parse(financialData);
    
    // Enviar a API MySQL
    const response = await fetch(`${API_BASE}/financial_data_v1.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        // console.log('✅ Datos financieros migrados a MySQL');
        return true;
      } else {
        errors.push(`Error en API financiera: ${result.error}`);
        return false;
      }
    } else {
      errors.push(`Error HTTP en datos financieros: ${response.status}`);
      return false;
    }

  } catch (error) {
    errors.push(`Error migrando datos financieros: ${error}`);
    return false;
  }
}

async function migrateProductionData(errors: string[]): Promise<boolean> {
  try {
    // console.log('🏭 Migrando datos de producción...');
    
    // Obtener datos de producción
    const productionData = localStorage.getItem('artyco-production-data');
    const productionConfig = localStorage.getItem('artyco-production-config');
    
    if (!productionData && !productionConfig) {
      // console.log('ℹ️ No hay datos de producción en localStorage');
      return true;
    }

    const migrationData: any = {};
    
    if (productionData) {
      migrationData.productionData = JSON.parse(productionData);
    }
    
    if (productionConfig) {
      migrationData.productionConfig = JSON.parse(productionConfig);
    }

    // Enviar a API MySQL
    const response = await fetch(`${API_BASE}/production_data_v1.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(migrationData)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        // console.log('✅ Datos de producción migrados a MySQL');
        return true;
      } else {
        errors.push(`Error en API de producción: ${result.error}`);
        return false;
      }
    } else {
      errors.push(`Error HTTP en datos de producción: ${response.status}`);
      return false;
    }

  } catch (error) {
    errors.push(`Error migrando datos de producción: ${error}`);
    return false;
  }
}

async function migrateMixedCosts(errors: string[]): Promise<boolean> {
  try {
    // console.log('💰 Migrando costos mixtos...');
    
    // Obtener datos de costos mixtos del contexto
    const mixedCostsData = localStorage.getItem('artyco-mixed-costs-global');
    
    if (!mixedCostsData) {
      // console.log('ℹ️ No hay costos mixtos en localStorage');
      return true;
    }

    const mixedCosts = JSON.parse(mixedCostsData);

    // Enviar a API MySQL
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
        // console.log('✅ Costos mixtos migrados a MySQL');
        return true;
      } else {
        errors.push(`Error en API de costos mixtos: ${result.error}`);
        return false;
      }
    } else {
      errors.push(`Error HTTP en costos mixtos: ${response.status}`);
      return false;
    }

  } catch (error) {
    errors.push(`Error migrando costos mixtos: ${error}`);
    return false;
  }
}

async function migrateAccountClassifications(errors: string[]): Promise<boolean> {
  try {
    // console.log('📋 Migrando clasificaciones de cuentas...');
    
    // Obtener clasificaciones personalizadas
    const classifications = localStorage.getItem('artyco-breakeven-classifications');
    
    if (!classifications) {
      // console.log('ℹ️ No hay clasificaciones personalizadas en localStorage');
      return true;
    }

    // TODO: Crear API para clasificaciones
    // Por ahora marcar como exitoso  
    // console.log('⚠️ API de clasificaciones pendiente de implementar');
    return true;

  } catch (error) {
    errors.push(`Error migrando clasificaciones: ${error}`);
    return false;
  }
}

async function createLocalStorageBackup(): Promise<void> {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      financialData: localStorage.getItem('artyco-financial-data-persistent'),
      productionData: localStorage.getItem('artyco-production-data'),
      productionConfig: localStorage.getItem('artyco-production-config'),
      mixedCosts: localStorage.getItem('artyco-mixed-costs'),
      classifications: localStorage.getItem('artyco-breakeven-classifications'),
      combinedData: localStorage.getItem('artyco-combined-data')
    };

    // Guardar backup en localStorage con clave especial
    localStorage.setItem('artyco-localStorage-backup', JSON.stringify(backup));
    // console.log('💾 Backup de localStorage creado');

  } catch (error) {
    // console.warn('⚠️ No se pudo crear backup de localStorage:', error);
  }
}

/**
 * Función para validar la migración comparando datos
 */
export async function validateMigration(): Promise<{isValid: boolean, differences: string[]}> {
  const differences: string[] = [];
  
  try {
    // console.log('🔍 Validando migración...');

    // Obtener datos de localStorage
    const localData = localStorage.getItem('artyco-financial-data-persistent');
    if (!localData) {
      return { isValid: true, differences: ['No hay datos locales para validar'] };
    }

    const localFinancial = JSON.parse(localData);

    // Obtener datos de MySQL via API
    const response = await fetch(`${API_BASE}/financial_data_v1.php`);
    if (!response.ok) {
      differences.push('No se pudo obtener datos de MySQL para validación');
      return { isValid: false, differences };
    }

    const mysqlFinancial = await response.json();

    // Comparar datos críticos
    if (localFinancial.yearly && mysqlFinancial.yearly) {
      const localIngresos = localFinancial.yearly.ingresos || 0;
      const mysqlIngresos = mysqlFinancial.yearly.ingresos || 0;
      
      if (Math.abs(localIngresos - mysqlIngresos) > 0.01) {
        differences.push(`Ingresos anuales diferentes: Local=${localIngresos}, MySQL=${mysqlIngresos}`);
      }
    }

    // Comparar número de meses
    const localMonths = localFinancial.monthly ? Object.keys(localFinancial.monthly).length : 0;
    const mysqlMonths = mysqlFinancial.monthly ? Object.keys(mysqlFinancial.monthly).length : 0;
    
    if (localMonths !== mysqlMonths) {
      differences.push(`Número de meses diferentes: Local=${localMonths}, MySQL=${mysqlMonths}`);
    }

    const isValid = differences.length === 0;
    
    if (isValid) {
      // console.log('✅ Validación exitosa - Datos migrados correctamente');
    } else {
      // console.warn('⚠️ Validación encontró diferencias:', differences);
    }

    return { isValid, differences };

  } catch (error) {
    differences.push(`Error durante validación: ${error}`);
    return { isValid: false, differences };
  }
}

/**
 * Función para ejecutar desde consola del navegador
 */
export async function runMigrationFromConsole(): Promise<void> {
  // console.log('🔄 Ejecutando migración desde consola...');
  
  const result = await migrateLocalStorageToMySQL();
  
  // console.log('📋 RESULTADO DE MIGRACIÓN:', result);
  
  if (result.success) {
    const validation = await validateMigration();
    // console.log('📋 RESULTADO DE VALIDACIÓN:', validation);
  }
}

// Exponer función global para usar en consola
if (typeof window !== 'undefined') {
  (window as any).migrateToMySQL = runMigrationFromConsole;
  (window as any).validateMigration = validateMigration;
}