# Legacy SQL Scripts

Esta carpeta conserva los scripts históricos que solían inicializar la base de datos (`docker/mysql/*.sql`, `database/cloud_run_additions.sql`, etc.). Después de la estandarización con `schema/000_base_schema.sql` y las migraciones en `schema/migrations/`, **no se deben usar** estos archivos para despliegues nuevos.

- Manténlos solo como referencia documental.
- El flujo oficial es:
  1. `schema/000_base_schema.sql` (fuente de verdad).
  2. `schema/migrations/*.sql` para cambios incrementales.
  3. `scripts/bootstrap_cloud_sql_complete.sh` o `scripts/sync_cloud_from_local.sh` para aplicar el esquema.

Si necesitas algún fragmento específico, copia el SQL desde aquí hacia una nueva migración documentada. No montes esta carpeta en el contenedor de MySQL ni la utilices en Cloud SQL.
