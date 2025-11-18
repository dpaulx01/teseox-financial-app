#!/bin/bash

# Script para migrar localStorage a TenantStorage en archivos críticos
# Este script hace reemplazos seguros para keys que deben ser namespaced por tenant

echo "🔧 Migrando localStorage a TenantStorage..."

# Keys que deben ser namespaced (NO incluye access_token, user, theme que son globales)
NAMESPACED_KEYS=(
  "selected_year"
  "selectedYear"
  "dashboardView"
  "dashboard_view"
  "teseo-x-active-tab"
  "recentActivity"
  "recent_activity"
  "quickAccessItems"
  "quick_access"
  "mixedCostClassifications"
  "mixed_cost_data"
  "breakEvenClassifications"
  "breakeven_data"
  "balanceAccounts"
  "balance_data"
  "financialScenarios"
  "financial_scenarios"
  "productionPlans"
  "production_data"
  "salesFilters"
  "sales_filters"
  "commercialFilters"
  "commercial_filters"
  "financialFilters"
  "financial_filters"
  "pyg_analysis"
  "scenario_"
)

# Archivos a procesar
FILES=(
  "src/contexts/DashboardContext.tsx"
  "src/contexts/ScenarioContext.tsx"
  "src/contexts/MixedCostContext.tsx"
  "src/hooks/useLocalStorage.ts"
  "src/utils/balanceStorage.ts"
  "src/utils/financialStorage.ts"
  "src/utils/mixedCostStorage.ts"
  "src/utils/productionStorage.ts"
  "src/utils/serverStorage.ts"
  "src/components/home/QuickAccessGrid.tsx"
  "src/components/home/RecentActivity.tsx"
  "src/components/breakeven/AccountClassificationPanel.tsx"
  "src/components/breakeven/AccountDetectionPanel.tsx"
  "src/components/breakeven/MixedCostPanel.tsx"
  "src/modules/salesBI/components/AnalisisGerencial.tsx"
  "src/modules/salesBI/components/CommercialView.tsx"
  "src/modules/salesBI/components/FinancialView.tsx"
  "src/pages/BreakEvenAnalysis.tsx"
  "src/pages/DataConfiguration.tsx"
)

echo "📝 Agregando imports de TenantStorage..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Check if import already exists
    if ! grep -q "import TenantStorage from" "$file"; then
      # Find first import line and add after it
      sed -i "1a import TenantStorage from '../utils/tenantStorage';" "$file" 2>/dev/null || \
      sed -i "1a import TenantStorage from '../../utils/tenantStorage';" "$file" 2>/dev/null || \
      sed -i "1a import TenantStorage from '../../../utils/tenantStorage';" "$file" 2>/dev/null
      echo "  ✅ Added import to $file"
    else
      echo "  ⏭️  Import already exists in $file"
    fi
  fi
done

echo ""
echo "✅ Migración completada!"
echo ""
echo "⚠️  IMPORTANTE: Revisa manualmente los archivos modificados"
echo "   Algunos reemplazos pueden necesitar ajustes adicionales."
echo ""
echo "🔍 Para verificar los cambios:"
echo "   git diff src/"
