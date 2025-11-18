# 🚀 Guía Maestra de Deployment GCP - Teseo X

**Proyecto:** teseo-x (480871471520)
**Fecha creación:** 2025-11-18
**Tipo:** Multi-tenant SaaS con RBAC
**Stack:** FastAPI + React + MySQL

### 🧭 Contexto Rápido (Teseo X)
- Proyecto GCP: `teseo-x` (us-central1)
- Cloud SQL: instancia `teseox-db`, DB `teseox_db`, usuario app `teseox_user` (password en Secret Manager `db-password`), root `TeseoX2025SecureRoot!`
- Artifact Registry: `us-central1-docker.pkg.dev/teseo-x/teseox-repo`
- Secrets: `db-password`, `jwt-secret`
- Despliegue: usa `deploy-cloud-run.sh` (API+Frontend) y `init-database.sh` (root, aplica `schema/000_base_schema.sql` + `003` + `004`)
- Rate limiting: in-memory (100 req/min) en `/api/superadmin/*` (no distribuido)
- TenantStorage: localStorage con namespace por `company_id`

---

## 📚 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Pre-requisitos](#pre-requisitos)
3. [Paso 1: Configurar Proyecto GCP](#paso-1-configurar-proyecto-gcp)
4. [Paso 2: Crear Cloud SQL](#paso-2-crear-cloud-sql)
5. [Paso 3: Configurar Secrets](#paso-3-configurar-secrets)
6. [Paso 4: Crear Artifact Registry](#paso-4-crear-artifact-registry)
7. [Paso 5: Preparar Dockerfiles](#paso-5-preparar-dockerfiles)
8. [Paso 6: Build con Cloud Build](#paso-6-build-con-cloud-build)
9. [Paso 7: Deploy a Cloud Run](#paso-7-deploy-a-cloud-run)
10. [Paso 8: Inicializar Base de Datos](#paso-8-inicializar-base-de-datos)
11. [Paso 9: Verificar y Probar](#paso-9-verificar-y-probar)
12. [Credenciales y Accesos](#credenciales-y-accesos)
13. [Troubleshooting](#troubleshooting)
14. [Costos](#costos)
15. [Mantenimiento](#mantenimiento)

---

## 📋 RESUMEN EJECUTIVO

Este documento contiene TODA la información necesaria para deployar un proyecto desde CERO en GCP. Está diseñado para ser reutilizable en otros proyectos.

### Arquitectura Desplegada

```
┌─────────────────┐
│   Cloud Run     │
│   (Frontend)    │──────┐
│   React + Vite  │      │
└─────────────────┘      │
                         ▼
                    Internet
                         ▲
┌─────────────────┐      │
│   Cloud Run     │──────┘
│   (API)         │
│   FastAPI       │
└────────┬────────┘
         │ Cloud SQL Proxy
         ▼
┌─────────────────┐
│   Cloud SQL     │
│   MySQL 8.0     │
└─────────────────┘
```

**Componentes:**
- 2 servicios Cloud Run (API + Frontend)
- 1 instancia Cloud SQL (MySQL)
- Artifact Registry (imágenes Docker)
- Secret Manager (credenciales)
- Cloud Build (CI/CD)

### ⚠️ Notas Importantes

**Estado de Base de Datos:**
- La base de datos en Cloud SQL estará **VACÍA** después de crearla
- Debe ejecutar `init-database.sh` para crear el schema completo
- El schema incluye: RBAC base + Multi-tenant + Tablas financieras (~30+ tablas)
- El usuario admin se crea automáticamente cuando el API arranca por primera vez

**Rate Limiting:**
- Implementado **in-memory** (no distribuido entre instancias)
- Límite: 100 requests/minuto por usuario en endpoints /api/superadmin/*
- Si escala a múltiples instancias, considerar Redis para rate limiting distribuido

**TenantStorage:**
- Implementado en frontend para aislamiento de datos entre tenants
- Auto-prefix de localStorage con `company_id`
- Previene data leakage al cambiar de empresa

**Archivos SQL de Migración:**
- `schema/000_base_schema.sql` - Schema completo base (RBAC + Financial + Multi-tenant)
- `schema/migrations/003_multitenant_phase1.sql` - Mejoras multi-tenant
- `schema/migrations/004_rbac_multitenant_phase5.sql` - RBAC avanzado (overrides, permisos temporales)

---

## 🔧 PRE-REQUISITOS

### Software Local

```bash
# Verificar instalaciones
gcloud --version    # Google Cloud SDK
docker --version    # Docker
git --version       # Git
```

### Instalar gcloud CLI (si no está)

```bash
# Linux/WSL
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Descargar: https://cloud.google.com/sdk/docs/install
```

### Autenticación

```bash
# Login a GCP
gcloud auth login

# Configurar proyecto por defecto
gcloud config set project [PROJECT_ID]

# Habilitar Application Default Credentials
gcloud auth application-default login
```

---

## 📝 PASO 1: CONFIGURAR PROYECTO GCP

### 1.1 Crear Proyecto (si es nuevo)

```bash
# Crear proyecto
gcloud projects create teseo-x --name="Teseo X"

# Configurar como proyecto activo
gcloud config set project teseo-x

# Obtener número de proyecto
gcloud projects describe teseo-x --format="value(projectNumber)"
# Output: 480871471520
```

### 1.2 Habilitar Facturación

```bash
# Listar cuentas de facturación
gcloud billing accounts list

# Vincular proyecto a cuenta de facturación
gcloud billing projects link teseo-x \
  --billing-account=[BILLING_ACCOUNT_ID]
```

### 1.3 Habilitar APIs Necesarias

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicenetworking.googleapis.com \
  compute.googleapis.com
```

⏱️ Tiempo: ~2-3 minutos

---

## 🗄️ PASO 2: CREAR CLOUD SQL

### 2.1 Crear Instancia

```bash
gcloud sql instances create teseox-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=TeseoX2025SecureRoot! \
  --storage-type=SSD \
  --storage-size=10GB \
  --availability-type=ZONAL
```

**Parámetros importantes:**
- `tier`: db-f1-micro (más barato, ~$9/mes)
- `region`: us-central1 (debe coincidir con Cloud Run)
- `availability-type`: ZONAL (más barato que REGIONAL)

⏱️ Tiempo: ~8-10 minutos

### 2.2 Verificar Creación

```bash
# Listar instancias
gcloud sql instances list

# Ver detalles
gcloud sql instances describe teseox-db

# Obtener IP pública
gcloud sql instances describe teseox-db \
  --format="value(ipAddresses[0].ipAddress)"
# Output: 136.111.57.179
```

### 2.3 Crear Base de Datos

```bash
gcloud sql databases create teseox_db \
  --instance=teseox-db
```

### 2.4 Crear Usuario de Aplicación

```bash
gcloud sql users create teseox_user \
  --instance=teseox-db \
  --password=TeseoX2025User!
```

**⚠️ IMPORTANTE:** Guardar estas credenciales:

```
Instance: teseox-db
IP: 136.111.57.179
Connection Name: teseo-x:us-central1:teseox-db
Database: teseox_db
Root Password: TeseoX2025SecureRoot!
App User: teseox_user
App Password: TeseoX2025User!
```

---

## 🔐 PASO 3: CONFIGURAR SECRETS

### 3.1 Crear Secrets en Secret Manager

```bash
# Secret para password de base de datos
echo -n "TeseoX2025User!" | gcloud secrets create db-password --data-file=-

# Secret para JWT (generar aleatorio)
python3 -c "import secrets; print(secrets.token_urlsafe(32))" | \
  gcloud secrets create jwt-secret --data-file=-
```

### 3.2 Verificar Secrets

```bash
# Listar secrets
gcloud secrets list

# Ver versiones
gcloud secrets versions list db-password
gcloud secrets versions list jwt-secret
```

### 3.3 Otorgar Permisos a Cloud Run

```bash
PROJECT_NUMBER=$(gcloud projects describe teseo-x --format="value(projectNumber)")

# Dar permisos al service account de Cloud Run
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 📦 PASO 4: CREAR ARTIFACT REGISTRY

### 4.1 Crear Repositorio

```bash
gcloud artifacts repositories create teseox-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Teseo X Docker images repository"
```

### 4.2 Configurar Docker para Artifact Registry

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 4.3 Verificar

```bash
gcloud artifacts repositories list

# URL del repositorio
# us-central1-docker.pkg.dev/teseo-x/teseox-repo
```

---

## 🐳 PASO 5: PREPARAR DOCKERFILES

### 5.1 Estructura de Archivos

```
proyecto/
├── Dockerfile.api              # Backend
├── Dockerfile.frontend.prod    # Frontend (multi-stage)
├── cloudbuild.yaml            # Configuración Cloud Build
├── nginx.conf                 # Config nginx para SPA
├── .gcloudignore             # Archivos a ignorar
├── deploy-cloud-run.sh       # Script de deployment
└── init-database.sh          # Script de init DB
```

### 5.2 Dockerfile.api (Backend)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements_minimal.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements_minimal.txt

# Instalar dependencias RBAC
RUN pip install --no-cache-dir \
    PyJWT==2.8.0 \
    passlib[bcrypt]==1.7.4 \
    python-multipart==0.0.6 \
    sqlalchemy==2.0.23 \
    pymysql==1.1.0 \
    alembic==1.13.1 \
    email-validator==2.1.0 \
    cryptography==41.0.7

RUN pip install --no-cache-dir pydantic[email]==2.5.0

# Copiar código
COPY . .

EXPOSE 8000

CMD ["python", "api_server_rbac.py"]
```

### 5.3 Dockerfile.frontend.prod (Frontend Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 5.4 nginx.conf (para SPA)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 5.5 .gcloudignore

```
.gcloudignore
.git
.gitignore
node_modules/
__pycache__/
*.pyc
.pytest_cache/
.env
.env.local
*.log
.DS_Store
.vscode/
database/backups/
scripts/
docs/
tests/
*.md
!README.md
SESSION_*.md
*.xls
*.html
!index.html
```

---

## 🏗️ PASO 6: BUILD CON CLOUD BUILD

### 6.1 Crear cloudbuild.yaml

```yaml
steps:
  # Build API image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-api'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:latest'
      - '-f'
      - 'Dockerfile.api'
      - '.'

  # Build Frontend image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-frontend'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:latest'
      - '-f'
      - 'Dockerfile.frontend.prod'
      - '.'

  # Push API image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-api'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:$SHORT_SHA'
    waitFor: ['build-api']

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:latest'
    waitFor: ['build-api']

  # Push Frontend image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-frontend'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:$SHORT_SHA'
    waitFor: ['build-frontend']

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:latest'
    waitFor: ['build-frontend']

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:latest'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:latest'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '1800s'  # 30 minutes
```

### 6.2 Ejecutar Build

```bash
# Desde el directorio del proyecto
gcloud builds submit --config=cloudbuild.yaml .
```

⏱️ Tiempo: ~10-15 minutos (primera vez)

### 6.3 Monitorear Build

```bash
# Ver builds recientes
gcloud builds list --limit 5

# Ver logs en tiempo real
BUILD_ID=$(gcloud builds list --limit 1 --format="value(id)")
gcloud builds log $BUILD_ID --stream

# Ver en consola web
# https://console.cloud.google.com/cloud-build/builds
```

### 6.4 Verificar Imágenes

```bash
# Listar imágenes en Artifact Registry
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/teseo-x/teseox-repo

# Deberías ver:
# teseox-api:latest
# teseox-api:[SHORT_SHA]
# teseox-frontend:latest
# teseox-frontend:[SHORT_SHA]
```

---

## ☁️ PASO 7: DEPLOY A CLOUD RUN

### 7.1 Script de Deployment (deploy-cloud-run.sh)

```bash
#!/bin/bash
set -e

PROJECT_ID="teseo-x"
REGION="us-central1"
DB_INSTANCE="teseox-db"
DB_NAME="teseox_db"
DB_USER="teseox_user"

echo "🚀 Deploying Teseo X to Cloud Run..."

# Get Cloud SQL connection name
SQL_CONNECTION=$(gcloud sql instances describe $DB_INSTANCE \
  --format="value(connectionName)")

# Get secrets
DB_PASSWORD_SECRET="projects/$PROJECT_ID/secrets/db-password/versions/latest"
JWT_SECRET="projects/$PROJECT_ID/secrets/jwt-secret/versions/latest"

# Deploy API service
echo "📦 Deploying API service..."
gcloud run deploy teseox-api \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars="DB_HOST=/cloudsql/$SQL_CONNECTION,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_PORT=3306" \
  --set-secrets="DB_PASSWORD=$DB_PASSWORD_SECRET,JWT_SECRET=$JWT_SECRET" \
  --add-cloudsql-instances $SQL_CONNECTION \
  --port 8000

# Get API URL
API_URL=$(gcloud run services describe teseox-api \
  --region $REGION --format="value(status.url)")
echo "✅ API deployed at: $API_URL"

# Deploy Frontend service
echo "🎨 Deploying Frontend service..."
gcloud run deploy teseox-frontend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --set-env-vars="VITE_API_BASE_URL=$API_URL" \
  --port 80

# Get Frontend URL
FRONTEND_URL=$(gcloud run services describe teseox-frontend \
  --region $REGION --format="value(status.url)")
echo "✅ Frontend deployed at: $FRONTEND_URL"

echo ""
echo "🎉 Deployment completed!"
echo "API:      $API_URL"
echo "Frontend: $FRONTEND_URL"
```

### 7.2 Ejecutar Deployment

```bash
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

⏱️ Tiempo: ~3-5 minutos

### 7.3 Verificar Servicios

```bash
# Listar servicios
gcloud run services list --region us-central1

# Ver detalles de API
gcloud run services describe teseox-api --region us-central1

# Ver detalles de Frontend
gcloud run services describe teseox-frontend --region us-central1
```

### 7.4 Obtener URLs

```bash
# API URL
API_URL=$(gcloud run services describe teseox-api \
  --region us-central1 --format="value(status.url)")
echo "API: $API_URL"

# Frontend URL
FRONTEND_URL=$(gcloud run services describe teseox-frontend \
  --region us-central1 --format="value(status.url)")
echo "Frontend: $FRONTEND_URL"

# Formato típico:
# API: https://teseox-api-[HASH]-uc.a.run.app
# Frontend: https://teseox-frontend-[HASH]-uc.a.run.app
```

---

## 💾 PASO 8: INICIALIZAR BASE DE DATOS

**⚠️ CRÍTICO:** Hasta este punto, Cloud SQL tiene la base de datos creada pero SIN TABLAS.

### 8.1 Script de Inicialización (init-database.sh)

```bash
#!/bin/bash
set -e

INSTANCE="teseox-db"
DB_NAME="teseox_db"
DB_USER="teseox_user"

echo "🗄️  Initializing Teseo X database..."

echo "1️⃣  Creating RBAC schema..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME \
  < schema/000_base_schema.sql 2>/dev/null || echo "   ⚠️  May already exist"

echo "2️⃣  Adding multi-tenant support..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME \
  < schema/migrations/003_multitenant_phase1.sql 2>/dev/null || echo "   ⚠️  May already exist"

echo "3️⃣  Adding advanced RBAC features..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME \
  < schema/migrations/004_rbac_multitenant_phase5.sql 2>/dev/null || echo "   ⚠️  May already exist"

echo "✅ Database initialization completed!"
echo ""
echo "🔐 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
```

### 8.2 Ejecutar Inicialización

```bash
chmod +x init-database.sh
./init-database.sh
```

Cuando pida password: `TeseoX2025User!`

⏱️ Tiempo: ~1-2 minutos

### 8.3 Verificar Tablas Creadas

```bash
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db
# Password: TeseoX2025User!
```

Dentro de MySQL:

```sql
-- Ver todas las tablas
SHOW TABLES;

-- Debería mostrar ~15-20 tablas:
-- users, roles, permissions, companies, audit_logs, etc.

-- Verificar usuario admin
SELECT id, username, email, is_superuser FROM users;

-- Verificar empresa default
SELECT id, name, slug FROM companies;

-- Verificar roles
SELECT id, name, is_system_role FROM roles;

exit;
```

**Tablas esperadas:**

Core RBAC:
- `users` - Usuarios
- `roles` - Roles (admin, editor, viewer, etc.)
- `permissions` - Permisos granulares
- `role_permissions` - Relación roles-permisos
- `user_roles` - Asignación usuarios-roles
- `audit_logs` - Registro de auditoría
- `user_sessions` - Sesiones activas

Multi-tenant:
- `companies` - Empresas/tenants

RBAC Avanzado:
- `role_permission_overrides`
- `user_role_overrides`

Datos Financieros:
- `financial_scenarios`
- `productos`
- `cotizaciones`
- `pagos`
- `plan_diario_produccion`
- Otras ~10 tablas

### 8.4 Importar Datos de Base de Datos Local (Opcional)

**Si tienes datos en tu base de datos local** y quieres migrarlos a Cloud SQL:

#### Opción A: Export/Import Completo

```bash
# 1. Exportar desde base de datos local (Docker)
docker exec artyco-mysql-rbac mysqldump \
  -u artyco_user \
  -partyco_password123 \
  artyco_financial_rbac \
  --single-transaction \
  --routines \
  --triggers \
  > backup_local.sql

# 2. Subir a Cloud Storage bucket (temporal)
gsutil mb gs://teseo-x-temp-import/
gsutil cp backup_local.sql gs://teseo-x-temp-import/

# 3. Importar a Cloud SQL
gcloud sql import sql teseox-db \
  gs://teseo-x-temp-import/backup_local.sql \
  --database=teseox_db

# 4. Limpiar bucket temporal
gsutil rm gs://teseo-x-temp-import/backup_local.sql
gsutil rb gs://teseo-x-temp-import/
```

#### Opción B: Import Solo Datos (sin schema)

```bash
# 1. Exportar SOLO datos (sin CREATE TABLE)
docker exec artyco-mysql-rbac mysqldump \
  -u artyco_user \
  -partyco_password123 \
  artyco_financial_rbac \
  --no-create-info \
  --skip-triggers \
  --single-transaction \
  > data_only.sql

# 2. Importar vía gcloud sql import (igual que arriba)
```

#### Opción C: Import Selectivo por Tabla

```bash
# Exportar tablas específicas
docker exec artyco-mysql-rbac mysqldump \
  -u artyco_user \
  -partyco_password123 \
  artyco_financial_rbac \
  productos cotizaciones pagos \
  --no-create-info \
  > productos_data.sql

# Importar a Cloud SQL
gcloud sql import sql teseox-db \
  gs://bucket/productos_data.sql \
  --database=teseox_db
```

### 8.5 Verificar Permisos del Usuario de Aplicación

**IMPORTANTE:** El usuario `teseox_user` debe tener permisos para operar en runtime:

```bash
# Conectar como root
gcloud sql connect teseox-db --user=root --database=teseox_db

# Dentro de MySQL, otorgar permisos
GRANT ALL PRIVILEGES ON teseox_db.* TO 'teseox_user'@'%';
FLUSH PRIVILEGES;

# Verificar permisos
SHOW GRANTS FOR 'teseox_user'@'%';

exit;
```

Deberías ver:
```
GRANT ALL PRIVILEGES ON `teseox_db`.* TO `teseox_user`@`%`
```

---

## ✅ PASO 9: VERIFICAR Y PROBAR

### 9.1 Health Checks

```bash
# Obtener URLs
API_URL=$(gcloud run services describe teseox-api \
  --region us-central1 --format="value(status.url)")
FRONTEND_URL=$(gcloud run services describe teseox-frontend \
  --region us-central1 --format="value(status.url)")

# Test API health
curl $API_URL/api/health
# Esperado: {"status":"healthy"}

# Test Frontend health
curl $FRONTEND_URL/health
# Esperado: healthy
```

### 9.2 Test de Login (API)

```bash
# Login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq

# Esperado:
# {
#   "access_token": "eyJ...",
#   "token_type": "bearer",
#   "user": {
#     "username": "admin",
#     "email": "admin@teseox.com",
#     ...
#   }
# }
```

### 9.3 Test de Endpoint Autenticado

```bash
# Guardar token
TOKEN=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.access_token')

# Test endpoint /me
curl -X GET $API_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq

# Esperado: datos del usuario admin
```

### 9.4 Test Frontend (Navegador)

```bash
# Obtener URL
echo $FRONTEND_URL

# O abrir directamente
gcloud run services describe teseox-frontend \
  --region us-central1 \
  --format="value(status.url)" | xargs -I {} echo "Abrir: {}"
```

**En el navegador:**

1. Abrir URL del frontend
2. Debería aparecer pantalla de login Teseo X
3. Ingresar:
   - Username: `admin`
   - Password: `admin123`
4. Verificar que cargue el dashboard
5. Probar navegación a diferentes módulos
6. Si eres superuser, probar Super Admin panel

### 9.5 Ver Logs

```bash
# Logs del API
gcloud run services logs read teseox-api \
  --region us-central1 \
  --limit 50

# Logs del Frontend
gcloud run services logs read teseox-frontend \
  --region us-central1 \
  --limit 50

# Logs en tiempo real
gcloud run services logs tail teseox-api \
  --region us-central1
```

---

## 🔑 CREDENCIALES Y ACCESOS

### Cloud SQL

```
Instance: teseox-db
Region: us-central1-a
IP Pública: 136.111.57.179
Connection Name: teseo-x:us-central1:teseox-db

Database: teseox_db
Root Password: TeseoX2025SecureRoot!

App User: teseox_user
App Password: TeseoX2025User!
```

**Conectar desde local:**

```bash
# Opción 1: gcloud (recomendado)
gcloud sql connect teseox-db --user=teseox_user --database=teseox_db

# Opción 2: MySQL client directo
mysql -h 136.111.57.179 -u teseox_user -p teseox_db
# Password: TeseoX2025User!
```

### Aplicación

```
Admin Username: admin
Admin Password: admin123
Admin Email: admin@teseox.com
Company: Teseo X (auto-created)
```

**⚠️ IMPORTANTE:** Cambiar password de admin después del primer login.

### Secret Manager

```bash
# Ver valor de db-password
gcloud secrets versions access latest --secret=db-password
# Output: TeseoX2025User!

# Ver valor de jwt-secret
gcloud secrets versions access latest --secret=jwt-secret
# Output: [random string]
```

### Artifact Registry

```
Repository: us-central1-docker.pkg.dev/teseo-x/teseox-repo
Images:
  - teseox-api:latest
  - teseox-frontend:latest
```

### Cloud Run Services

```bash
# URLs dinámicas - obtener con:
gcloud run services describe teseox-api \
  --region us-central1 --format="value(status.url)"

gcloud run services describe teseox-frontend \
  --region us-central1 --format="value(status.url)"
```

---

## 🔧 TROUBLESHOOTING

### Build Falla

**Error: "Docker build timeout"**

```bash
# Aumentar timeout en cloudbuild.yaml
timeout: '3600s'  # 60 minutos
```

**Error: "Permission denied"**

```bash
# Dar permisos al service account de Cloud Build
PROJECT_NUMBER=$(gcloud projects describe teseo-x \
  --format="value(projectNumber)")

gcloud projects add-iam-policy-binding teseo-x \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### Cloud Run No Puede Conectar a Cloud SQL

**Error: "Connection refused" o "Can't connect to MySQL server"**

```bash
# Verificar que Cloud SQL Proxy está configurado
gcloud run services describe teseox-api \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations)"

# Debe incluir:
# run.googleapis.com/cloudsql-instances: teseo-x:us-central1:teseox-db

# Si no está, re-deploy con:
gcloud run services update teseox-api \
  --add-cloudsql-instances teseo-x:us-central1:teseox-db \
  --region us-central1
```

### CORS Errors en Frontend

**Error: "blocked by CORS policy"**

Actualizar CORS en `api_server_rbac.py`:

```python
# Obtener URL del frontend
FRONTEND_URL=$(gcloud run services describe teseox-frontend \
  --region us-central1 --format="value(status.url)")

# Editar api_server_rbac.py
origins = [
    "https://teseox-frontend-[HASH]-uc.a.run.app",  # Tu URL real
    "http://localhost:3001",
]
```

Luego rebuild y redeploy:

```bash
gcloud builds submit --config=cloudbuild.yaml .
./deploy-cloud-run.sh
```

### Base de Datos No Inicializa

**Error al ejecutar migraciones**

```bash
# Conectar manualmente con usuario root (tiene permisos DDL)
gcloud sql connect teseox-db --user=root --database=teseox_db
# Password: TeseoX2025SecureRoot!

# Ejecutar migraciones una por una
source schema/000_base_schema.sql;
SHOW TABLES;  # Debería mostrar ~30+ tablas

source schema/migrations/003_multitenant_phase1.sql;
SHOW TABLES;  # Verificar cambios multi-tenant

source schema/migrations/004_rbac_multitenant_phase5.sql;
SHOW TABLES;  # Verificar role_permission_overrides, user_role_overrides
```

### Usuario Admin No Existe

El usuario admin se crea automáticamente cuando el API arranca por primera vez. Si no existe:

```bash
# Ver logs del API
gcloud run services logs read teseox-api \
  --region us-central1 \
  --limit 100 | grep -i "admin"

# Si no se creó, verificar que:
# 1. Las tablas existan
# 2. El API pueda conectar a la BD
# 3. Re-deploy del API para trigger la inicialización
```

### Service Account Permissions

```bash
# Dar todos los permisos necesarios
PROJECT_NUMBER=$(gcloud projects describe teseo-x \
  --format="value(projectNumber)")

gcloud projects add-iam-policy-binding teseo-x \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding teseo-x \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 💰 COSTOS ESTIMADOS

### Desglose Mensual

#### Cloud SQL (db-f1-micro)
- Instancia: $7.67/mes
- Storage 10 GB SSD: $1.70/mes
- **Subtotal: ~$9.37/mes**

#### Cloud Run
- API (512 MB, escala a 0): $0-5/mes
- Frontend (256 MB, escala a 0): $0-2/mes
- **Subtotal: ~$0-7/mes** (depende del tráfico)

#### Artifact Registry
- Storage (2 imágenes): $0.10/mes
- **Subtotal: ~$0.10/mes**

#### Secret Manager
- 2 secrets activos: $0.12/mes
- **Subtotal: ~$0.12/mes**

#### Cloud Build
- 120 minutos gratis/día
- **Subtotal: $0/mes** (builds ocasionales)

### TOTAL ESTIMADO: **$10-17/mes**

**Optimizaciones:**
- Si hay CERO tráfico, Cloud Run escala a 0 → $0
- Usar `--min-instances 0` (ya configurado)
- Detener Cloud SQL cuando no se use (NO recomendado para producción)

---

## 🔄 MANTENIMIENTO

### Updates de Código

```bash
# 1. Hacer cambios en código local
# 2. Commit a git
git add .
git commit -m "Update feature X"
git push

# 3. Rebuild
gcloud builds submit --config=cloudbuild.yaml .

# 4. Re-deploy (automático con :latest tag)
./deploy-cloud-run.sh
```

### Rollback a Versión Anterior

```bash
# Ver revisiones
gcloud run revisions list \
  --service teseox-api \
  --region us-central1

# Rollback
gcloud run services update-traffic teseox-api \
  --to-revisions [REVISION-NAME]=100 \
  --region us-central1
```

### Backups de Base de Datos

```bash
# Crear backup manual
gcloud sql backups create \
  --instance=teseox-db

# Listar backups
gcloud sql backups list --instance=teseox-db

# Habilitar backups automáticos
gcloud sql instances patch teseox-db \
  --backup-start-time=03:00
```

### Exportar Base de Datos

```bash
# Crear bucket para exports (una vez)
gsutil mb gs://teseo-x-backups

# Exportar
gcloud sql export sql teseox-db \
  gs://teseo-x-backups/backup-$(date +%Y%m%d).sql \
  --database=teseox_db
```

### Importar Base de Datos

```bash
# Importar desde bucket
gcloud sql import sql teseox-db \
  gs://teseo-x-backups/backup-20251118.sql \
  --database=teseox_db
```

### Monitoreo

```bash
# Ver métricas de Cloud Run
gcloud run services describe teseox-api \
  --region us-central1

# Ver logs en tiempo real
gcloud run services logs tail teseox-api \
  --region us-central1

# Alertas (configurar en consola)
# https://console.cloud.google.com/monitoring/alerting
```

### Escalar Recursos

```bash
# Aumentar memoria del API
gcloud run services update teseox-api \
  --memory 1Gi \
  --region us-central1

# Aumentar max instances
gcloud run services update teseox-api \
  --max-instances 20 \
  --region us-central1

# Upgrade de Cloud SQL
gcloud sql instances patch teseox-db \
  --tier=db-n1-standard-1
```

---

## 📚 COMANDOS ÚTILES DE REFERENCIA

### Gestión de Proyecto

```bash
# Ver configuración actual
gcloud config list

# Cambiar proyecto
gcloud config set project [PROJECT_ID]

# Ver recursos del proyecto
gcloud projects describe [PROJECT_ID]

# Listar todos los servicios
gcloud services list --enabled
```

### Cloud SQL

```bash
# Conectar
gcloud sql connect [INSTANCE] --user=[USER] --database=[DB]

# Ver instancias
gcloud sql instances list

# Detalles de instancia
gcloud sql instances describe [INSTANCE]

# Ver databases
gcloud sql databases list --instance=[INSTANCE]

# Ver usuarios
gcloud sql users list --instance=[INSTANCE]

# Detener instancia (ahorrar dinero)
gcloud sql instances patch [INSTANCE] --activation-policy=NEVER

# Iniciar instancia
gcloud sql instances patch [INSTANCE] --activation-policy=ALWAYS
```

### Cloud Run

```bash
# Listar servicios
gcloud run services list

# Ver detalles
gcloud run services describe [SERVICE] --region=[REGION]

# Ver revisiones
gcloud run revisions list --service=[SERVICE] --region=[REGION]

# Ver logs
gcloud run services logs read [SERVICE] --region=[REGION] --limit=50

# Logs en tiempo real
gcloud run services logs tail [SERVICE] --region=[REGION]

# Eliminar servicio
gcloud run services delete [SERVICE] --region=[REGION]
```

### Cloud Build

```bash
# Listar builds
gcloud builds list --limit=10

# Ver logs de build
gcloud builds log [BUILD_ID]

# Cancelar build
gcloud builds cancel [BUILD_ID]

# Trigger manual
gcloud builds submit --config=cloudbuild.yaml .
```

### Artifact Registry

```bash
# Listar repositorios
gcloud artifacts repositories list

# Listar imágenes
gcloud artifacts docker images list [REPO_URL]

# Ver tags de una imagen
gcloud artifacts docker tags list [IMAGE_URL]

# Eliminar imagen
gcloud artifacts docker images delete [IMAGE_URL]
```

### Secret Manager

```bash
# Listar secrets
gcloud secrets list

# Ver versiones
gcloud secrets versions list [SECRET]

# Ver valor
gcloud secrets versions access latest --secret=[SECRET]

# Crear nuevo secret
echo -n "value" | gcloud secrets create [SECRET] --data-file=-

# Actualizar secret
echo -n "new-value" | gcloud secrets versions add [SECRET] --data-file=-
```

---

## 🎓 GUÍA PARA OTRO PROYECTO

Para deployar **otro proyecto** usando esta guía:

### 1. Adaptar Nombres

Reemplazar en TODOS los comandos:
- `teseo-x` → tu-proyecto-id
- `teseox-db` → tu-db-instance
- `teseox-repo` → tu-repo-name
- `teseox-api` → tu-api-service
- `teseox-frontend` → tu-frontend-service
- `teseox_db` → tu_database_name
- `teseox_user` → tu_db_user

### 2. Checklist Pre-Deploy

- [ ] Proyecto GCP creado
- [ ] Facturación habilitada
- [ ] gcloud CLI instalado y autenticado
- [ ] Código en repositorio Git
- [ ] Dockerfiles preparados
- [ ] Requirements/dependencies listados
- [ ] Variables de entorno identificadas

### 3. Seguir Pasos en Orden

1. ✅ Configurar proyecto (Paso 1)
2. ✅ Crear Cloud SQL (Paso 2)
3. ✅ Configurar Secrets (Paso 3)
4. ✅ Crear Artifact Registry (Paso 4)
5. ✅ Preparar Dockerfiles (Paso 5)
6. ✅ Build con Cloud Build (Paso 6)
7. ✅ Deploy a Cloud Run (Paso 7)
8. ✅ Inicializar BD (Paso 8)
9. ✅ Verificar (Paso 9)

### 4. Particularidades por Tipo de Proyecto

**Backend API solo:**
- Skip Dockerfile.frontend.prod
- Skip nginx.conf
- Solo deploy API a Cloud Run

**Frontend solo (SPA):**
- Skip Dockerfile.api
- No necesita Cloud SQL
- Solo deploy Frontend a Cloud Run

**Full Stack (como este):**
- Seguir guía completa
- Asegurar CORS correcto
- Configurar env vars del API URL en frontend

**Con PostgreSQL en vez de MySQL:**
- Cambiar `--database-version` en Cloud SQL
- Ajustar driver en código (psycopg2)
- Adaptar SQL migrations

---

## 📞 SOPORTE Y RECURSOS

### Documentación GCP

- [Cloud Run](https://cloud.google.com/run/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs)
- [Cloud Build](https://cloud.google.com/build/docs)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)

### Consolas Web

- [GCP Console](https://console.cloud.google.com)
- [Cloud Run Services](https://console.cloud.google.com/run)
- [Cloud SQL Instances](https://console.cloud.google.com/sql)
- [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
- [Artifact Registry](https://console.cloud.google.com/artifacts)

### Precios

- [Calculadora de Costos](https://cloud.google.com/products/calculator)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)

---

## ✅ CHECKLIST FINAL

Antes de dar por completado el deployment, verificar:

### Infraestructura
- [ ] Cloud SQL instance running
- [ ] Base de datos creada
- [ ] Usuario de app creado
- [ ] Secrets en Secret Manager
- [ ] Artifact Registry con imágenes

### Deployment
- [ ] Build exitoso en Cloud Build
- [ ] API deployado en Cloud Run
- [ ] Frontend deployado en Cloud Run
- [ ] Variables de entorno configuradas
- [ ] Cloud SQL Proxy configurado

### Base de Datos
- [ ] Migraciones SQL ejecutadas
- [ ] Tablas creadas
- [ ] Usuario admin existe
- [ ] Empresa default creada
- [ ] Roles creados

### Testing
- [ ] API health check responde
- [ ] Frontend health check responde
- [ ] Login funciona
- [ ] Endpoints autenticados funcionan
- [ ] Frontend carga correctamente
- [ ] Navegación entre módulos funciona

### Seguridad
- [ ] Passwords de BD guardados en Secrets
- [ ] JWT secret generado aleatoriamente
- [ ] HTTPS habilitado (automático en Cloud Run)
- [ ] Admin password default documentado para cambio

### Documentación
- [ ] URLs de servicios documentadas
- [ ] Credenciales guardadas de forma segura
- [ ] Procedimiento de rollback documentado
- [ ] Plan de backups definido

---

**FIN DE LA GUÍA**

**Autor:** Teseo X Team
**Última actualización:** 2025-11-18
**Versión:** 1.0

Esta guía contiene TODO lo necesario para deployar el proyecto desde cero. Guardar para referencia futura.
