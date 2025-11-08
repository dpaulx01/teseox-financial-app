#!/usr/bin/env bash
# sync_cloud_from_local.sh
# Replica completa del estado local (Docker) hacia Cloud SQL.
# Requiere acceso al contenedor local (127.0.0.1:3307) y a Cloud SQL (34.68.83.86).
#
# Uso:
#   ./scripts/sync_cloud_from_local.sh
# Variables opcionales:
#   DB_HOST, DB_USER, DB_PASS    -> credenciales Cloud SQL
#   LOCAL_HOST, LOCAL_PORT, LOCAL_USER, LOCAL_PASS -> credenciales MySQL local

set -euo pipefail

DB_HOST="${DB_HOST:-34.68.83.86}"
DB_USER="${DB_USER:-artycofinancial}"
DB_PASS="${DB_PASS:-Artyco.2025}"
DB_NAME="${DB_NAME:-artyco_financial_rbac}"

LOCAL_HOST="${LOCAL_HOST:-127.0.0.1}"
LOCAL_PORT="${LOCAL_PORT:-3307}"
LOCAL_USER="${LOCAL_USER:-root}"
LOCAL_PASS="${LOCAL_PASS:-rootpassword123}"

BACKUP_DIR="database/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
CLOUD_BACKUP="${BACKUP_DIR}/cloud_before_sync_${TIMESTAMP}.sql"
LOCAL_DUMP="${BACKUP_DIR}/local_snapshot_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "========================================"
echo "  SINCRONIZACIÓN LOCAL -> CLOUD SQL"
echo "========================================"
echo "Cloud host : ${DB_HOST}"
echo "Cloud user : ${DB_USER}"
echo "Local host : ${LOCAL_HOST}:${LOCAL_PORT}"
echo "Local user : ${LOCAL_USER}"
echo ""

echo "[1/5] Probando conexión a Cloud..."
if MYSQL_PWD="${DB_PASS}" mysql -h "${DB_HOST}" -u "${DB_USER}" -e "SELECT 1" >/dev/null 2>&1; then
  echo "      ✅ Conexión Cloud OK"
else
  echo "      ❌ No se pudo conectar a Cloud SQL"
  exit 1
fi

echo "[2/5] Probando conexión a la base local..."
if sudo env MYSQL_PWD="${LOCAL_PASS}" mysql -h "${LOCAL_HOST}" -P "${LOCAL_PORT}" -u "${LOCAL_USER}" -e "SELECT 1" >/dev/null 2>&1; then
  echo "      ✅ Conexión local OK"
else
  echo "      ❌ No se pudo conectar a la base local (Docker)"
  exit 1
fi

echo "[3/5] Respaldo previo de Cloud -> ${CLOUD_BACKUP}"
MYSQL_PWD="${DB_PASS}" mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  -h "${DB_HOST}" -u "${DB_USER}" "${DB_NAME}" > "${CLOUD_BACKUP}"
echo "      ✅ Backup Cloud guardado"

echo "[4/5] Exportando base local -> ${LOCAL_DUMP}"
if ! sudo env MYSQL_PWD="${LOCAL_PASS}" mysqldump \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    --no-tablespaces \
    --databases "${DB_NAME}" \
    -h "${LOCAL_HOST}" -P "${LOCAL_PORT}" -u "${LOCAL_USER}" > "${LOCAL_DUMP}" 2>"/tmp/local_dump_err.log"; then
  if grep -q "insufficient privileges" /tmp/local_dump_err.log; then
    echo "      ⚠️ Privilegios insuficientes para rutinas; reintentando sin --routines"
    sudo env MYSQL_PWD="${LOCAL_PASS}" mysqldump \
      --single-transaction \
      --triggers \
      --set-gtid-purged=OFF \
      --no-tablespaces \
      --databases "${DB_NAME}" \
      -h "${LOCAL_HOST}" -P "${LOCAL_PORT}" -u "${LOCAL_USER}" > "${LOCAL_DUMP}"
  else
    cat /tmp/local_dump_err.log >&2
    exit 1
  fi
fi
rm -f /tmp/local_dump_err.log
echo "      ✅ Snapshot local generado"

echo "      ⏳ Normalizando DEFINER a CURRENT_USER..."
python3 - "$LOCAL_DUMP" <<'PY'
import re, sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_text()
text = re.sub(r'DEFINER=`[^`]+`@`[^`]+`', 'DEFINER=CURRENT_USER', text)
path.write_text(text)
PY
echo "      ✅ DEFINER actualizado"

echo "[5/5] Restaurando snapshot local en Cloud..."
MYSQL_PWD="${DB_PASS}" mysql -h "${DB_HOST}" -u "${DB_USER}" < "${LOCAL_DUMP}"
echo "      ✅ Cloud SQL ahora replica el esquema y datos locales"

echo ""
echo "Validando resultado..."
DB_HOST="${DB_HOST}" DB_USER="${DB_USER}" DB_PASS="${DB_PASS}" ./scripts/validate_schema.sh || true

echo ""
echo "✅ Sincronización completada. Archivos:"
echo "  - Cloud backup : ${CLOUD_BACKUP}"
echo "  - Local dump   : ${LOCAL_DUMP}"
