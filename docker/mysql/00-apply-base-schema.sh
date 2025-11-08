#!/usr/bin/env bash
set -euo pipefail

echo ">>> Applying schema/000_base_schema.sql inside container..."

if [[ ! -f /schema/000_base_schema.sql ]]; then
  echo "❌ /schema/000_base_schema.sql not found. Mount ./schema in docker-compose." >&2
  exit 1
fi

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < /schema/000_base_schema.sql

echo ">>> Base schema applied."
