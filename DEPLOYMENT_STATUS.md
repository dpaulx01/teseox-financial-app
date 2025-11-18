# ⚠️ ARCHIVO DEPRECADO - VER GCP_DEPLOYMENT_MASTER_GUIDE.md

> **IMPORTANTE:** Este archivo ha sido reemplazado por `GCP_DEPLOYMENT_MASTER_GUIDE.md`
>
> El master guide contiene:
> - Estado actualizado del deployment
> - Todas las correcciones de rutas de schema SQL (000_base_schema.sql, no 001_rbac_base.sql)
> - Información sobre permisos DDL (usar root, no teseox_user)
> - Comandos corregidos y verificados
>
> **➡️ Por favor, usar `GCP_DEPLOYMENT_MASTER_GUIDE.md` para referencia**

---

# Teseo X - Estado Actual del Deployment (DEPRECADO)

**Fecha:** 2025-11-18
**Proyecto GCP:** teseo-x (480871471520)

---

## ✅ QUÉ ESTÁ COMPLETADO

### 1. Infraestructura GCP

#### Cloud SQL MySQL
- ✅ **Instancia creada:** `teseox-db`
- ✅ **IP Pública:** 136.111.57.179
- ✅ **Región:** us-central1-a
- ✅ **Tier:** db-f1-micro (0.6 GB RAM, compartido)
- ✅ **Storage:** 10 GB SSD
- ✅ **Versión:** MySQL 8.0
- ✅ **Base de datos creada:** `teseox_db`
- ✅ **Usuario creado:** `teseox_user`
- ⚠️ **IMPORTANTE: LA BASE DE DATOS ESTÁ VACÍA - SIN TABLAS**

```bash
# Credenciales
Root Password: TeseoX2025SecureRoot!
App User: teseox_user
App Password: TeseoX2025User!
```

#### Artifact Registry
- ✅ **Repositorio:** `teseox-repo`
- ✅ **Ubicación:** us-central1
- ✅ **Formato:** Docker
- ✅ **URL:** us-central1-docker.pkg.dev/teseo-x/teseox-repo

#### Secret Manager
- ✅ **Secret 1:** `db-password` (contiene: TeseoX2025User!)
- ✅ **Secret 2:** `jwt-secret` (generado aleatoriamente)

#### APIs Habilitadas
- ✅ Cloud Build
- ✅ Cloud Run
- ✅ Cloud SQL Admin
- ✅ Secret Manager
- ✅ Artifact Registry
- ✅ Compute Engine

### 2. Código y Configuración

#### Archivos de Deployment Creados
- ✅ `cloudbuild.yaml` - Build automático de imágenes Docker
- ✅ `Dockerfile.api` - Backend FastAPI (ya existía)
- ✅ `Dockerfile.frontend.prod` - Frontend React multi-stage (NUEVO)
- ✅ `nginx.conf` - Configuración nginx para SPA (NUEVO)
- ✅ `deploy-cloud-run.sh` - Script de deployment a Cloud Run (NUEVO)
- ✅ `init-database.sh` - Script para inicializar schema (NUEVO)
- ✅ `.gcloudignore` - Ignorar archivos innecesarios en build (NUEVO)

#### Documentación Creada
- ✅ `DEPLOYMENT_GUIDE.md` - Guía completa de deployment
- ✅ `DEPLOYMENT_STATUS.md` - Este archivo (estado actual)
- ✅ `docs/FASE2_COMPLETION_REPORT.md` - Completado Fase 2 Super Admin

### 3. Build en Progreso

- 🔄 **Cloud Build en ejecución** - Construyendo imágenes Docker
  - Imagen API: `teseox-api:latest`
  - Imagen Frontend: `teseox-frontend:latest`

---

## ❌ QUÉ FALTA POR HACER

### 1. Finalizar Build
- ⏳ Esperar que termine Cloud Build (~10-15 min)
- ⏳ Verificar que imágenes estén en Artifact Registry

### 2. Deploy a Cloud Run
- ❌ **NO desplegado** - Ejecutar `./deploy-cloud-run.sh`
- ❌ Servicio `teseox-api` - NO existe
- ❌ Servicio `teseox-frontend` - NO existe

### 3. Inicializar Base de Datos
- ❌ **CRÍTICO: Las tablas NO están creadas en Cloud SQL**
- ❌ Ejecutar `./init-database.sh` para crear schema
- ❌ O ejecutar manualmente las migraciones SQL:
  - `schema/migrations/001_rbac_base.sql`
  - `schema/migrations/003_multitenant_phase1.sql`
  - `schema/migrations/004_rbac_multitenant_phase5.sql`

### 4. Verificación
- ❌ Probar login en frontend
- ❌ Verificar endpoints de API
- ❌ Probar funcionalidad Super Admin

---

## 📋 SCHEMA DE BASE DE DATOS (Local vs Cloud)

### Estado Actual

| Ubicación | Estado | Tablas |
|-----------|--------|--------|
| **Local (Docker)** | ✅ Completo | ~20 tablas con datos de prueba |
| **Cloud SQL** | ❌ VACÍO | 0 tablas |

### Tablas que necesitan crearse en Cloud SQL

**Core RBAC (001_rbac_base.sql):**
- `users` - Usuarios del sistema
- `roles` - Roles (admin, editor, viewer, etc.)
- `permissions` - Permisos granulares
- `role_permissions` - Relación roles-permisos
- `user_roles` - Asignación de roles a usuarios
- `audit_logs` - Registro de auditoría
- `user_sessions` - Sesiones activas

**Multi-Tenant (003_multitenant_phase1.sql):**
- `companies` - Empresas/tenants
- Modificaciones a `users` (agrega `company_id`)
- Modificaciones a tablas de datos (agrega `company_id`)

**RBAC Avanzado (004_rbac_multitenant_phase5.sql):**
- `role_permission_overrides` - Overrides de permisos por rol
- `user_role_overrides` - Overrides de permisos por usuario
- Soporte para permisos temporales (`valid_from`, `valid_until`)

**Tablas de Datos Financieros:**
- `financial_scenarios`
- `productos`
- `cotizaciones`
- `pagos`
- `plan_diario_produccion`
- `balance_general`
- Y otras (~15 tablas más)

---

## 🔑 INFORMACIÓN IMPORTANTE PARA CONTEXTO FUTURO

### Credenciales y Conexión

```bash
# Cloud SQL
Instance: teseox-db
IP: 136.111.57.179
Connection Name: teseo-x:us-central1:teseox-db
Database: teseox_db
User: teseox_user
Password: TeseoX2025User! (en Secret Manager: db-password)

# Conectar desde local (requiere Cloud SQL Proxy)
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db

# O usar MySQL client directo
mysql -h 136.111.57.179 -u teseox_user -p teseox_db
# Password: TeseoX2025User!
```

### Usuario Admin Default (después de init)

```
Username: admin
Password: admin123
Email: admin@teseox.com
Company: Teseo X (creado automáticamente)
```

⚠️ **CAMBIAR este password después del primer login!**

### URLs (después del deployment)

```bash
# Obtener URLs reales
API_URL=$(gcloud run services describe teseox-api --region us-central1 --format="value(status.url)")
FRONTEND_URL=$(gcloud run services describe teseox-frontend --region us-central1 --format="value(status.url)")

echo "API: $API_URL"
echo "Frontend: $FRONTEND_URL"
```

Las URLs tendrán el formato:
- API: `https://teseox-api-[RANDOM]-uc.a.run.app`
- Frontend: `https://teseox-frontend-[RANDOM]-uc.a.run.app`

### Archivos SQL de Migración

Ubicación local:
```
schema/migrations/001_rbac_base.sql              # Base RBAC
schema/migrations/003_multitenant_phase1.sql     # Multi-tenant
schema/migrations/004_rbac_multitenant_phase5.sql # RBAC avanzado
```

Estos archivos son **idempotentes** (se pueden ejecutar múltiples veces sin error).

---

## 📝 PRÓXIMOS PASOS (en orden)

### 1. Esperar Cloud Build (5-10 min)

```bash
# Verificar estado del build
gcloud builds list --limit 1

# Ver logs en tiempo real
gcloud builds log [BUILD_ID] --stream
```

### 2. Deploy a Cloud Run

```bash
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

Esto desplegará:
- Servicio API con conexión a Cloud SQL
- Servicio Frontend apuntando al API

### 3. Inicializar Base de Datos

**Opción A: Script automático**
```bash
chmod +x init-database.sh
./init-database.sh
```

**Opción B: Manual**
```bash
# Conectar a Cloud SQL
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db

# En el prompt MySQL, ejecutar:
source schema/migrations/001_rbac_base.sql;
source schema/migrations/003_multitenant_phase1.sql;
source schema/migrations/004_rbac_multitenant_phase5.sql;
exit;
```

### 4. Verificar Tablas

```bash
# Listar tablas creadas
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db

# En MySQL:
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM roles;
exit;
```

Deberías ver:
- 1 usuario admin
- 1 empresa default
- 5-6 roles (admin, editor, viewer, produccion, ventas, finanzas)

### 5. Probar la Aplicación

```bash
# Obtener URL del frontend
FRONTEND_URL=$(gcloud run services describe teseox-frontend --region us-central1 --format="value(status.url)")

echo "Abrir en navegador: $FRONTEND_URL"
```

Login con:
- Username: `admin`
- Password: `admin123`

---

## 🔍 TROUBLESHOOTING

### Si el build falla

```bash
# Ver últimos builds
gcloud builds list --limit 5

# Ver logs de un build específico
gcloud builds log [BUILD_ID]

# Reintentar build
gcloud builds submit --config=cloudbuild.yaml .
```

### Si Cloud Run no puede conectar a Cloud SQL

Verificar que el servicio tiene permisos:

```bash
# El deployment automático debería configurar esto, pero si falla:
gcloud run services update teseox-api \
  --add-cloudsql-instances teseo-x:us-central1:teseox-db \
  --region us-central1
```

### Si falla la inicialización de BD

```bash
# Verificar que puedes conectar
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db

# Si pide password: TeseoX2025User!

# Ejecutar migraciones una por una
source schema/migrations/001_rbac_base.sql;
SHOW TABLES;  # Verificar

source schema/migrations/003_multitenant_phase1.sql;
SHOW TABLES;  # Verificar

source schema/migrations/004_rbac_multitenant_phase5.sql;
SHOW TABLES;  # Verificar
```

---

## 💾 BACKUP Y DATOS

### No hay datos en Cloud SQL

Actualmente Cloud SQL tiene:
- ❌ 0 usuarios
- ❌ 0 empresas
- ❌ 0 datos financieros
- ❌ 0 productos
- ❌ 0 ventas

Todo se creará al ejecutar las migraciones SQL + el script de inicialización del backend (que crea el usuario admin al arrancar).

### Para migrar datos de local a Cloud (FUTURO)

```bash
# 1. Exportar desde local
docker exec artyco-mysql-rbac mysqldump -u artyco_user -partyco_password123 artyco_financial_rbac > backup.sql

# 2. Importar a Cloud SQL
gcloud sql import sql teseox-db gs://[BUCKET]/backup.sql --database=teseox_db
```

---

## 📊 COSTOS ESTIMADOS

- Cloud SQL (db-f1-micro): ~$9/mes
- Cloud Run (API + Frontend): ~$5/mes (tráfico bajo)
- Artifact Registry: ~$0.10/mes
- Secret Manager: ~$0.12/mes
- **TOTAL: ~$15/mes**

Con escala a 0 en Cloud Run, el costo puede ser menor si no hay tráfico.

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `DEPLOYMENT_GUIDE.md` - Guía completa de deployment
- `docs/FASE2_COMPLETION_REPORT.md` - Fase 2 Super Admin completada
- `docs/MULTITENANT_IMPLEMENTATION_PLAN.md` - Plan de multi-tenant
- `SESSION_CONTEXT.md` - Contexto de desarrollo
- `README.md` - Documentación general del proyecto

---

**RESUMEN EJECUTIVO:**

🟢 **Infraestructura GCP:** Lista (Cloud SQL, Artifact Registry, Secrets)
🟡 **Build:** En progreso
🔴 **Base de Datos:** VACÍA - necesita migraciones SQL
🔴 **Cloud Run:** NO desplegado
🔴 **Testing:** Pendiente

**Siguiente acción:** Esperar build → Deploy → Init DB → Verificar

---

**Última actualización:** 2025-11-18 04:47 UTC
