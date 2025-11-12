# Schema Management

Esta carpeta define la única fuente de verdad del esquema MySQL que usan los entornos local y Cloud SQL.

## Estructura

- `000_base_schema.sql`: volcado generado desde la base local (Docker) con `mysqldump --no-data`. Incluye todas las tablas, vistas, triggers y rutinas necesarias. Los `DEFINER` fueron normalizados a `CURRENT_USER` para evitar privilegios especiales en Cloud.
- `migrations/`: reservar para cambios incrementales (por ejemplo `001_add_stock_support.sql`). Cada archivo debe ser idempotente o estar protegido por checks (`IF NOT EXISTS`).

## Cómo regenerar el esquema base

1. Asegúrate de que la base local tenga el estado deseado.
2. Ejecuta:
   ```bash
   ./scripts/regenerate_base_schema.sh
   ```
   El script realiza backup automático y usa `mysqldump --no-data --set-gtid-purged=OFF`.
3. Si prefieres hacerlo manualmente (por ejemplo en CI), puedes usar:
   ```bash
   sudo env MYSQL_PWD='rootpassword123' mysqldump \
     --no-data --routines --triggers --set-gtid-purged=OFF \
     -h 127.0.0.1 -P 3307 -u root artyco_financial_rbac > schema/000_base_schema.sql
   python3 - <<'PY'
   import re, pathlib
   path = pathlib.Path('schema/000_base_schema.sql')
   text = path.read_text()
   path.write_text(re.sub(r'DEFINER=`[^`]+`@`[^`]+`', 'DEFINER=CURRENT_USER', text))
   PY
   ```
4. Revisa el diff y confirma que solo haya cambios relacionados con modificaciones reales de estructura.

## Bootstrap estándar

1. Ejecutar `./scripts/sync_cloud_from_local.sh` si se desea copiar datos reales.
2. Para una instalación “clean”, crear la base vacía y aplicar:
   ```bash
   MYSQL_PWD=$DB_PASS mysql -h $DB_HOST -u $DB_USER artyco_financial_rbac < schema/000_base_schema.sql
   ```
3. Correr las migraciones necesarias en orden (`schema/migrations/*.sql`).

## Buenas prácticas

- Cada cambio estructural nuevo debe ir en un archivo dentro de `schema/migrations/` y, cuando se estabilice, regenerar `000_base_schema.sql`.
- Mantén sincronizados los entornos ejecutando `scripts/validate_schema.sh` tanto en local como en Cloud.
- Usa `scripts/sync_cloud_from_local.sh` para clonar completamente la data local cuando sea necesario.
- El contenedor MySQL de Docker (`docker-compose.yml`) monta `./schema` y ejecuta `docker/mysql/00-apply-base-schema.sh`, por lo que no se necesitan otros scripts en `docker/mysql/`.
