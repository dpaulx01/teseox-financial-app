/**
 * TenantStorage - localStorage wrapper with automatic company_id namespacing
 *
 * Prevents data leakage between tenants by prefixing all keys with company_id.
 * This is critical for multi-tenant SaaS applications.
 *
 * Usage:
 *   Instead of: localStorage.setItem('key', value)
 *   Use: TenantStorage.setItem('key', value)
 */

interface UserData {
  company_id?: number;
  username?: string;
}

export class TenantStorage {
  // Keys that should NOT be namespaced (global to browser)
  private static readonly GLOBAL_KEYS = [
    'artyco-user',           // User auth data (contains company_id)
    'user',                  // Legacy user key
    'artyco-token',          // JWT token
    'access_token',          // JWT token (legacy)
    'artyco-refresh-token',  // Refresh token
    'refresh_token',         // Refresh token (legacy)
    'theme',                 // Theme preference (can be global)
  ];

  /**
   * Get the current company_id from stored user data
   */
  private static getCurrentCompanyId(): number | null {
    try {
      const userStr = localStorage.getItem('artyco-user');
      if (!userStr) return null;

      const user: UserData = JSON.parse(userStr);
      return user.company_id || null;
    } catch (error) {
      console.error('Error getting company_id from user data:', error);
      return null;
    }
  }

  /**
   * Generate prefixed key with company_id namespace
   */
  private static getPrefixedKey(key: string): string {
    // Don't prefix global keys
    if (this.GLOBAL_KEYS.includes(key)) {
      return key;
    }

    const companyId = this.getCurrentCompanyId();
    if (companyId === null) {
      // Fallback: use 'default' namespace if no company_id (pre-login state)
      console.warn(`TenantStorage: No company_id found, using default namespace for key: ${key}`);
      return `artyco-c_default-${key}`;
    }

    return `artyco-c${companyId}-${key}`;
  }

  /**
   * Store item with tenant namespace
   */
  static setItem(key: string, value: string): void {
    const prefixedKey = this.getPrefixedKey(key);
    localStorage.setItem(prefixedKey, value);
  }

  /**
   * Get item with tenant namespace
   */
  static getItem(key: string): string | null {
    const prefixedKey = this.getPrefixedKey(key);
    return localStorage.getItem(prefixedKey);
  }

  /**
   * Remove item with tenant namespace
   */
  static removeItem(key: string): void {
    const prefixedKey = this.getPrefixedKey(key);
    localStorage.removeItem(prefixedKey);
  }

  /**
   * Clear all items for current tenant only
   */
  static clearTenant(): void {
    const companyId = this.getCurrentCompanyId();
    if (companyId === null) {
      console.warn('TenantStorage: Cannot clear tenant, no company_id found');
      return;
    }

    const prefix = `artyco-c${companyId}-`;
    const keysToRemove: string[] = [];

    // Collect all keys for this tenant
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`TenantStorage: Cleared ${keysToRemove.length} items for company ${companyId}`);
  }

  /**
   * Clear ALL tenant data (all companies) - use with caution!
   * Preserves global keys like auth tokens.
   */
  static clearAllTenants(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('artyco-c') && !this.GLOBAL_KEYS.includes(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`TenantStorage: Cleared ${keysToRemove.length} items across all tenants`);
  }

  /**
   * Switch to a different tenant (clears current tenant data)
   * Call this when user switches companies or logs in as different company
   */
  static switchTenant(newCompanyId: number): void {
    const currentCompanyId = this.getCurrentCompanyId();

    if (currentCompanyId !== null && currentCompanyId !== newCompanyId) {
      // Clear old tenant data
      this.clearTenant();
      console.log(`TenantStorage: Switched from company ${currentCompanyId} to ${newCompanyId}`);
    }
  }

  /**
   * Get all keys for current tenant (for debugging)
   */
  static getTenantKeys(): string[] {
    const companyId = this.getCurrentCompanyId();
    if (companyId === null) return [];

    const prefix = `artyco-c${companyId}-`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // Return unprefixed key for readability
        keys.push(key.replace(prefix, ''));
      }
    }

    return keys;
  }

  /**
   * Migrate existing non-namespaced keys to tenant namespace
   * Run this once during initial deployment to migrate existing data
   */
  static migrateExistingData(): void {
    const companyId = this.getCurrentCompanyId();
    if (companyId === null) {
      console.warn('TenantStorage: Cannot migrate, no company_id found');
      return;
    }

    const migrated: string[] = [];
    const prefix = `artyco-c${companyId}-`;

    // Keys that might exist from old implementation
    const keysToMigrate = [
      'selectedYear',
      'dashboardView',
      'dashboardSettings',
      'recentActivity',
      'quickAccessItems',
      'mixedCostClassifications',
      'breakEvenClassifications',
      'balanceAccounts',
      'financialScenarios',
      'productionPlans',
      'salesFilters',
      'commercialFilters',
      'financialFilters',
    ];

    keysToMigrate.forEach(key => {
      // Check if old key exists and new key doesn't
      const oldValue = localStorage.getItem(key);
      const newKey = prefix + key;
      const newValue = localStorage.getItem(newKey);

      if (oldValue && !newValue) {
        // Migrate: copy to new key and remove old
        localStorage.setItem(newKey, oldValue);
        localStorage.removeItem(key);
        migrated.push(key);
      }
    });

    if (migrated.length > 0) {
      console.log(`TenantStorage: Migrated ${migrated.length} keys:`, migrated);
    }
  }

  /**
   * Check if key exists for current tenant
   */
  static hasKey(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get storage size for current tenant (in bytes)
   */
  static getTenantStorageSize(): number {
    const keys = this.getTenantKeys();
    let size = 0;

    keys.forEach(key => {
      const value = this.getItem(key);
      if (value) {
        size += key.length + value.length;
      }
    });

    return size;
  }
}

// Export a hook-friendly version for React components
export const useTenantStorage = () => ({
  setItem: TenantStorage.setItem.bind(TenantStorage),
  getItem: TenantStorage.getItem.bind(TenantStorage),
  removeItem: TenantStorage.removeItem.bind(TenantStorage),
  clearTenant: TenantStorage.clearTenant.bind(TenantStorage),
  switchTenant: TenantStorage.switchTenant.bind(TenantStorage),
  hasKey: TenantStorage.hasKey.bind(TenantStorage),
});

export default TenantStorage;
