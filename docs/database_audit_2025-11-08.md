# Auditoría de Bases de Datos – 2025-11-08

## Resumen ejecutivo
- Objetivo: validar que el esquema y los datos críticos sean idénticos entre el entorno local (Docker MySQL `127.0.0.1:3307`) y Cloud SQL (`34.68.83.86`), y documentar los scripts disponibles para recrear el esquema completo.
- Evidencia generada: `cloud_schema.sql`, `local_schema.sql`, `cloud_status_produccion.sql`, `cloud_status_produccion_data.sql`, `local_status_backup.sql`.
- Resultado general: la base local contiene 36 objetos (tablas + vistas) mientras que Cloud SQL tiene 25. Existen módulos completos definidos en los scripts (`analysis_*`, `financial_data_enhanced`, `mixed_costs`, utilitarios) que nunca se cargaron en Cloud y, en algunos casos, tampoco en local.

## Paridad de tablas

| Módulo | Tabla | Local Docker | Cloud SQL | Observaciones |
| --- | --- | --- | --- | --- |
| RBAC | users, roles, permissions, user_roles, role_permissions, user_sessions, audit_logs | ✅ | ✅ | Columnas/índices alineados. |
| Core finanzas | companies, financial_data, raw_account_data | ✅ | ✅ | La tabla `companies` difiere en tipos de timestamp (local usa `TIMESTAMP`, Cloud `DATETIME`). |
| Core finanzas (avanzado) | financial_data_enhanced, time_series_metrics, financial_ratios, financial_forecasts, variance_analysis, statistical_models, correlation_matrix, segment_analysis, data_quality_checks (ver `database/enhanced_schema.sql`) | ❌ | ❌ | Nunca se aplicaron los scripts avanzados. |
| Análisis PyG | analysis_config, analysis_types, analysis_type_config, analysis_visual_config, account_exclusion_patterns (`database/cloud_run_additions.sql` y `database/init/04-analysis-config.sql`) | ❌ | ❌ | Sin tablas; el módulo trabaja “hard-coded”. |
| Producción histórica | production_data, production_config, production_combined_data | ✅ | ✅ | Columnas coherentes; métricas agregadas ok. |
| Producción avanzada | operational_metrics, mixed_costs, breakeven_data | `operational_metrics` ❌, `mixed_costs` ❌, `breakeven_data` ✅ | Todos ❌ | Scripts existen (`database/clone_complete_original_structure.sql`, `database/cloud_run_additions.sql`, `docker/mysql/01-create-financial-tables.sql`) pero no se han corrido en Cloud y parcialmente en local. |
| Status Producción | cotizaciones, productos, plan_diario_produccion, pagos | ✅ | ✅ | Datos sincronizados al 2025-11-07 (25/83/0/28 registros). |
| Balance general | balance_data, raw_balance_data, balance_config | ✅ | ✅ | Índices presentes en ambos. |
| Sales BI | sales_transactions, sales_kpis_cache, sales_alerts, sales_saved_filters | ✅ | ✅ | Migración `20251026_create_sales_bi_module.sql` aplicada en ambos. |
| Utilidades | file_uploads, dashboard_configs, data_audit_log, user_configurations, account_transactions, chart_of_accounts | ✅ | ❌ | Tablas creadas sólo en local por `docker/mysql/01-create-financial-tables.sql`. Sin ellas, cargas CSV en Cloud fallarán. |
| Vistas auxiliares | v_financial_summary, v_production_summary, v_sales_summary, user_permissions_view | ✅ | ❌ | No existen en Cloud; dependen de tablas utilitarias faltantes. |

**Tablas sólo en local:** `account_transactions`, `breakeven_data`, `chart_of_accounts`, `dashboard_configs`, `data_audit_log`, `file_uploads`, `user_configurations`, `user_permissions_view`, `v_financial_summary`, `v_production_summary`, `v_sales_summary`.

**Tablas esperadas y ausentes en ambos entornos:** `financial_data_enhanced`, `time_series_metrics`, `financial_ratios`, `financial_forecasts`, `variance_analysis`, `statistical_models`, `correlation_matrix`, `segment_analysis`, `data_quality_checks`, `analysis_config`, `analysis_types`, `analysis_type_config`, `analysis_visual_config`, `account_exclusion_patterns`, `mixed_costs`, `operational_metrics`.

## Scripts y migraciones disponibles

1. `docker/mysql/01-create-financial-tables.sql` – crea compañías, datos financieros, PyG, utilitarios y vistas (`lines 8-247`).
2. `docker/mysql/02-create-raw-table.sql` – replica `raw_account_data`.
3. `docker/mysql/03-rbac-schema.sql` – base RBAC completa.
4. `docker/mysql/04-align-production-metrics.sql` y `05-add-production-rbac.sql` – ajustes de producción/planificación.
5. `docker/mysql/06-create-production-config.sql` – tablas `production_config` y `production_combined_data`.
6. `docker/mysql/07-create-sales-bi-module.sql` – módulo de ventas BI.
7. `database/cloud_run_additions.sql` – tablas de Status Producción, balance, análisis y costos mixtos; nunca ejecutado en Cloud.
8. `database/enhanced_schema.sql` – esquema avanzado de analítica (no aplicado).
9. `database/init/04-analysis-config.sql` – tablas `analysis_*` y patrones de exclusión.
10. `database/clone_complete_original_structure.sql` – tablas de métricas operativas, CSV, logs y vistas del proyecto original.
11. `database/migrations/*.sql` – migraciones incrementales (plan diario, indicadores ventas, soporte stock, etc.).
12. `scripts/bootstrap_cloud_sql.sh` – pipeline que intenta aplicar todo lo anterior, pero mezcla archivos redundantes (`init_db.sql` y `03-rbac-schema.sql` repiten tablas) y no valida resultados.

## Riesgos detectados

- **Falta de paridad Cloud vs local:** 11 tablas/vistas sólo existen en local; los módulos que dependen de ellas fallarán en Cloud (p.ej. carga de archivos, dashboards configurables).
- **Módulos incompletos:** las tablas `analysis_*`, `financial_data_enhanced`, `mixed_costs` y `operational_metrics` que aparecen en el código y documentación no existen en ninguna base, por lo que nuevas funciones producirán errores en tiempo de ejecución.
- **Inconsistencias de esquema:** `cotizaciones.tipo_produccion` está definido con enum en mayúsculas en las migraciones (`database/migrations/20251021_add_stock_support.sql`) pero `database/cloud_run_additions.sql` usa minúsculas, lo que puede romper futuros despliegues si se recrea la tabla desde cero.
- **Scripts desordenados:** hay más de 15 archivos que crean las mismas tablas con ligeras variaciones; actualmente no existe un orden único de ejecución ni verificación automática, lo que dificulta desplegar en un nuevo proyecto Cloud Run.

## Recomendaciones

1. **Normalizar el bootstrap**
   - Crear un `schema/000_base.sql` que consolide sólo la estructura mínima (RBAC + core financiero + módulos activos).
   - Mover el resto a migraciones ordenadas `schema/migrations/NNN_description.sql` y controlar su ejecución (por ejemplo con `alembic` o un script shell que persista un registro en `schema_migrations`).
   - Actualizar `scripts/bootstrap_cloud_sql.sh` para:
     ```bash
     SQL_FILES=(
       "schema/000_base.sql"
       "schema/migrations/001_sales_bi.sql"
       "schema/migrations/002_status_produccion.sql"
       ...
     )
     ```
     y registrar cada archivo aplicado.

2. **Aplicar paridad Cloud**
   - Ejecutar los archivos faltantes en Cloud SQL (iniciando por `docker/mysql/01-create-financial-tables.sql` y `database/cloud_run_additions.sql`) usando el usuario `artycofinancial`.
   - Repetir `mysqldump --no-data` y comparar (`diff local_schema.sql cloud_schema.sql`) hasta que no haya discrepancias.

3. **Activar los módulos pendientes**
   - Si los análisis avanzados son requeridos, aplicar `database/enhanced_schema.sql` y `database/init/04-analysis-config.sql`.
   - Agregar fixtures mínimos para `analysis_types` y `analysis_config` para evitar errores cuando el backend los lea.

4. **Checklist para nuevos despliegues**
   - Autorizar IP y ejecutar `scripts/bootstrap_cloud_sql.sh` con las credenciales adecuadas.
   - Cargar datos base (`docker/mysql` + `database/migrations`).
   - Verificar tablas con `mysql -e "SHOW TABLES"` y, si falta alguna de la lista en SESSION_CONTEXT.md, re-aplicar el archivo correspondiente.
   - Importar datos productivos con `mysqldump` o scripts ETL antes de publicar el frontend.

5. **Automatizar validaciones**
   - Añadir un script (`scripts/verify_schema.py`) que compare la lista esperada (la tabla de arriba) contra lo que devuelve `information_schema.tables` y falle el pipeline si algo falta.

## Próximos pasos sugeridos
1. Ejecutar `scripts/bootstrap_cloud_sql.sh` apuntando a Cloud SQL y verificar si crea las tablas utilitarias; si no, aplicar manualmente `docker/mysql/01*.sql` y `database/cloud_run_additions.sql`.
2. Decidir si los módulos “enhanced” y `analysis_*` deben formar parte del despliegue inicial; de ser así, incluirlos en el bootstrap.
3. Una vez la paridad esté confirmada, tomar un backup completo (`mysqldump --single-transaction --set-gtid-purged=OFF --routines --triggers`) para usarlo en el nuevo dominio de Google Cloud.
