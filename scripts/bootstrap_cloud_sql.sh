#!/usr/bin/env bash
# Bootstrap the artyco_financial_rbac schema in any MySQL-compatible server.
# Usage:
#   DB_HOST=34.68.83.86 DB_USER=artycofinancial DB_PASS=secret ./scripts/bootstrap_cloud_sql.sh
# Optional env vars: DB_NAME (default artyco_financial_rbac), DB_PORT (default 3306)

set -euo pipefail

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME:-artyco_financial_rbac}

if ! command -v mysql >/dev/null 2>&1; then
  echo "❌ mysql client is required. Install it and re-run this script." >&2
  exit 1
fi

if [[ -n "${DB_PASS}" ]]; then
  export MYSQL_PWD="${DB_PASS}"
fi

mysql_base=(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}")

echo "➡️  Ensuring database \`${DB_NAME}\` exists on ${DB_HOST}:${DB_PORT}..."
"${mysql_base[@]}" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

mysql_cmd=("${mysql_base[@]}" "${DB_NAME}")

# Ordered list of SQL files that recreate the full schema expected by the app.
SQL_FILES=(
  "docker/mysql/03-rbac-schema.sql"
  "docker/mysql/01-create-financial-tables.sql"
  "docker/mysql/02-create-raw-table.sql"
  "docker/mysql/04-align-production-metrics.sql"
  "docker/mysql/05-add-production-rbac.sql"
  "docker/mysql/06-create-production-config.sql"
  "docker/mysql/07-create-sales-bi-module.sql"
  "database/clone_complete_original_structure.sql"
  "database/enhanced_schema.sql"
  "database/init/04-analysis-config.sql"
  "database/cloud_run_additions.sql"
  "database/migrations/20241005_add_plan_diario_produccion.sql"
  "init_db.sql"
)

for file in "${SQL_FILES[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "⚠️  Skipping missing file: ${file}" >&2
    continue
  fi

  echo "▶️  Applying ${file}..."
  "${mysql_cmd[@]}" < "${file}"
done

echo "✅ Database bootstrap completed. You can now run CSV uploads and the rest of the modules."
