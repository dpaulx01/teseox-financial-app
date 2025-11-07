# Iteracion Rapida - Guia de Conexiones y Entorno

> Ultima actualizacion: 2025-11-07
> Usa este documento para retomar la sesion sin volver a pedir credenciales ni procedimientos.

## 1. Entorno local (WSL + Docker)
- Ruta del repo: `/mnt/c/Users/dpaul/OneDrive/Escritorio/artyco-financial-app-rbac`
- WSL: abre tu distro y ejecuta `cd /mnt/c/...` antes de correr comandos.
- Docker/Compose: `docker compose up -d` (o `docker compose --profile api up`).
- Frontend local: `npm install` y `npm run dev -- --host 0.0.0.0`.
- Python: usa 3.11 del sistema o crea `python3 -m venv .venv && source .venv/bin/activate`.

## 2. Google Cloud Run
- Servicio: `artyco-financial-app` (region `us-central1`).
- Deploy tipico:
  ```bash
  gcloud config set project artyco-financial-app
  gcloud run deploy artyco-financial-app       --image gcr.io/artyco-financial-app/artyco-financial-app:latest       --region us-central1 --platform managed       --allow-unauthenticated --port 8080       --add-cloudsql-instances artyco-financial-app:us-central1:artyco-db-instance       --set-env-vars "ENVIRONMENT=production"
  ```
- Logs: `gcloud run services logs read artyco-financial-app --region us-central1 --limit 100`.
- Health check: `curl https://artyco-financial-app-981333627435.us-central1.run.app/health`.

## 3. Cloud SQL (MySQL)
- Instancia: `artyco-financial-app:us-central1:artyco-db-instance`.
- IP publica: `34.68.83.86` (autoriza la IP actual; ultima usada por Codex: `200.105.247.19`).
- Credenciales: usuario `artycofinancial`, password `Artyco.2025`, base `artyco_financial_rbac`.
- Conexion directa:
  ```bash
  MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac
  ```
- Via Cloud SQL Proxy:
  ```bash
  cloud_sql_proxy -instances=artyco-financial-app:us-central1:artyco-db-instance=tcp:127.0.0.1:3307                   -credential_file=/ruta/service-account.json
  MYSQL_PWD='Artyco.2025' mysql -h 127.0.0.1 -P 3307 -u artycofinancial artyco_financial_rbac
  ```
- Bootstrap completo: `DB_HOST=34.68.83.86 DB_USER=artycofinancial DB_PASS='Artyco.2025' ./scripts/bootstrap_cloud_sql.sh`.

## 4. Referencias rapidas
- Backend principal: `api_server_rbac.py`.
- Rutas clave: `routes/financial_data.py`, `routes/production_status.py`, `routes/users.py`.
- SQL base: `docker/mysql/*.sql`, `database/**/*.sql`, `database/cloud_run_additions.sql`.
- Frontend build listo: carpeta `dist/`.

## 5. Esquema SQL esperado
- Tablas minimas por modulo:
  - RBAC: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `user_sessions`, `audit_logs`.
  - PyG/finanzas: `financial_data`, `financial_data_enhanced`, `raw_account_data`, `analysis_config`, `analysis_types`, `analysis_type_config`, `analysis_visual_config`, `account_exclusion_patterns`.
  - Produccion: `production_data`, `production_config`, `production_combined_data`, `operational_metrics`, `mixed_costs`, `breakeven_data`.
  - Status produccion/cotizaciones: `cotizaciones`, `productos`, `plan_diario_produccion`, `pagos`.
  - Balance General: `balance_data`, `raw_balance_data`, `balance_config`.
  - BI ventas: `sales_transactions`, `sales_kpis_cache`, `sales_alerts`, `sales_saved_filters`.
  - Utilidades: `file_uploads`, `dashboard_configs`, `data_audit_log`.
- Checklist tras clonar/deploy: `SHOW TABLES;` y compara con la lista. Si falta algo, ejecuta `scripts/bootstrap_cloud_sql.sh`.
- Auditoria rapida: `SELECT table_name FROM information_schema.tables WHERE table_schema='artyco_financial_rbac';` y cruza con `rg "CREATE TABLE" docker/mysql database`.

Mantener este archivo actualizado evita repetir pasos de conexion y despliegue en futuras sesiones.
