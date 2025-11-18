# ⚠️ ARCHIVO DEPRECADO - VER GCP_DEPLOYMENT_MASTER_GUIDE.md

> **IMPORTANTE:** Este archivo ha sido reemplazado por `GCP_DEPLOYMENT_MASTER_GUIDE.md`
>
> El master guide contiene:
> - Todas las correcciones de rutas de schema SQL
> - Notas sobre rate limiting in-memory
> - Información completa sobre estado de base de datos
> - Comandos actualizados y verificados
> - Documentación consolidada en un solo lugar
>
> **➡️ Por favor, usar `GCP_DEPLOYMENT_MASTER_GUIDE.md` para todos los deployments**

---

# Teseo X - Guía de Deployment en GCP (DEPRECADO)

**Proyecto:** teseo-x (480871471520)
**Fecha:** 2025-11-18
**Región:** us-central1

---

## 📋 Resumen de Infraestructura

### Cloud SQL
- **Instance:** `teseox-db`
- **Versión:** MySQL 8.0
- **Tier:** db-f1-micro (compartido, 0.6 GB RAM)
- **Storage:** 10 GB SSD
- **IP Pública:** 136.111.57.179
- **Database:** `teseox_db`
- **Usuario:** `teseox_user`
- **Password:** Almacenado en Secret Manager (`db-password`)

### Artifact Registry
- **Repositorio:** `teseox-repo`
- **Formato:** Docker
- **Ubicación:** us-central1
- **URL:** `us-central1-docker.pkg.dev/teseo-x/teseox-repo`

### Imágenes Docker
- `teseox-api:latest` - Backend FastAPI con RBAC
- `teseox-frontend:latest` - Frontend React + Vite

### Secret Manager
- `db-password` - Password de base de datos
- `jwt-secret` - Secret para firma de JWT tokens

---

## 🚀 Proceso de Deployment

### 1. Build de Imágenes

```bash
# Build automático con Cloud Build
gcloud builds submit --config=cloudbuild.yaml .
```

**Qué hace:**
- Construye imagen de API (`Dockerfile.api`)
- Construye imagen de Frontend (`Dockerfile.frontend.prod`)
- Publica en Artifact Registry con tags `:latest` y `:$SHORT_SHA`

### 2. Deploy a Cloud Run

```bash
# Deploy ambos servicios
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

**Servicios desplegados:**

#### API Service (`teseox-api`)
- **Memoria:** 512 MB
- **CPU:** 1 vCPU
- **Min instances:** 0 (escala a 0)
- **Max instances:** 10
- **Port:** 8000
- **Timeout:** 300s
- **Variables de entorno:**
  - `DB_HOST`: /cloudsql/[CONNECTION]
  - `DB_NAME`: teseox_db
  - `DB_USER`: teseox_user
  - `DB_PORT`: 3306
- **Secrets:**
  - `DB_PASSWORD`: desde Secret Manager
  - `JWT_SECRET`: desde Secret Manager
- **Cloud SQL:** Conectado vía Unix socket

#### Frontend Service (`teseox-frontend`)
- **Memoria:** 256 MB
- **CPU:** 1 vCPU
- **Min instances:** 0
- **Max instances:** 5
- **Port:** 80
- **Timeout:** 60s
- **Variables de entorno:**
  - `VITE_API_BASE_URL`: URL del servicio API

### 3. Inicializar Base de Datos

```bash
# Ejecutar migraciones SQL
chmod +x init-database.sh
./init-database.sh
```

**Qué hace:**
- Crea tablas RBAC básicas (users, roles, permissions)
- Agrega soporte multi-tenant (companies, tenant isolation)
- Crea features avanzadas (role overrides, temporal permissions)
- Crea usuario admin por defecto

---

## 🔐 Credenciales por Defecto

### Base de Datos
- **Root Password:** `TeseoX2025SecureRoot!`
- **App User:** `teseox_user`
- **App Password:** `TeseoX2025User!` (en Secret Manager)

### Aplicación
- **Admin Username:** `admin`
- **Admin Password:** `admin123`
- **⚠️ IMPORTANTE:** Cambiar password después del primer login

---

## 🌐 URLs de Servicios

Después del deployment, los servicios estarán disponibles en:

```
API:      https://teseox-api-[HASH]-uc.a.run.app
Frontend: https://teseox-frontend-[HASH]-uc.a.run.app
```

Para obtener las URLs exactas:

```bash
# API URL
gcloud run services describe teseox-api --region us-central1 --format="value(status.url)"

# Frontend URL
gcloud run services describe teseox-frontend --region us-central1 --format="value(status.url)"
```

---

## 🔧 Configuración Post-Deployment

### 1. Actualizar CORS en API

Si el frontend tiene una URL diferente, actualizar CORS en `api_server_rbac.py`:

```python
origins = [
    "https://teseox-frontend-[HASH]-uc.a.run.app",  # Frontend URL
    "http://localhost:3001",  # Local development
]
```

### 2. Configurar Custom Domain (Opcional)

```bash
# Mapear dominio personalizado
gcloud run domain-mappings create \
  --service teseox-frontend \
  --domain app.teseox.com \
  --region us-central1
```

### 3. Configurar SSL/TLS

Cloud Run proporciona certificados SSL automáticos para:
- URLs `*.run.app` (automático)
- Dominios personalizados (vía Cloud Load Balancer)

---

## 📊 Monitoreo y Logs

### Ver Logs de API

```bash
gcloud run services logs read teseox-api --region us-central1 --limit 50
```

### Ver Logs de Frontend

```bash
gcloud run services logs read teseox-frontend --region us-central1 --limit 50
```

### Monitorear Cloud SQL

```bash
# Conexiones activas
gcloud sql operations list --instance teseox-db

# Métricas
gcloud sql instances describe teseox-db
```

---

## 🔄 Updates y Redeploys

### Actualizar Código

```bash
# 1. Build nueva versión
gcloud builds submit --config=cloudbuild.yaml .

# 2. Re-deploy servicios (automático con :latest tag)
./deploy-cloud-run.sh
```

### Rollback a Versión Anterior

```bash
# Ver revisiones
gcloud run revisions list --service teseox-api --region us-central1

# Rollback a revisión específica
gcloud run services update-traffic teseox-api \
  --to-revisions REVISION-NAME=100 \
  --region us-central1
```

---

## 💰 Costos Estimados

### Cloud Run (escala a 0)
- **API:** ~$0-5/mes (tráfico bajo)
- **Frontend:** ~$0-2/mes
- **Total:** ~$0-7/mes

### Cloud SQL (db-f1-micro)
- **Instancia:** ~$7.67/mes
- **Storage (10 GB):** ~$1.70/mes
- **Total:** ~$9.37/mes

### Artifact Registry
- **Storage:** ~$0.10/mes (2 imágenes)

### Secret Manager
- **Secrets (2):** ~$0.12/mes

**TOTAL ESTIMADO:** ~$10-17/mes

---

## 🧪 Testing

### Health Checks

```bash
# API health
curl https://teseox-api-[HASH]-uc.a.run.app/api/health

# Frontend health
curl https://teseox-frontend-[HASH]-uc.a.run.app/health
```

### Login Test

```bash
# Get token
curl -X POST https://teseox-api-[HASH]-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test authenticated endpoint
curl -X GET https://teseox-api-[HASH]-uc.a.run.app/api/auth/me \
  -H "Authorization: Bearer [TOKEN]"
```

---

## 🛠️ Troubleshooting

### Error: "Connection refused" al acceder a BD

**Solución:** Verificar que Cloud SQL Proxy esté configurado correctamente en el servicio:

```bash
gcloud run services describe teseox-api --region us-central1 --format="value(spec.template.metadata.annotations)"
```

Debe incluir: `run.googleapis.com/cloudsql-instances`

### Error: "CORS policy" en frontend

**Solución:** Actualizar CORS origins en `api_server_rbac.py` con la URL del frontend.

### Error: "Secret not found"

**Solución:** Verificar que los secrets existen:

```bash
gcloud secrets list
```

### Servicio no responde (timeout)

**Solución:**
1. Verificar logs: `gcloud run services logs read teseox-api --limit 100`
2. Aumentar timeout si es necesario
3. Verificar startup time en Cloud Run console

---

## 🔒 Seguridad Best Practices

### ✅ Implementado
- [x] Secrets en Secret Manager (no en env vars)
- [x] Cloud SQL con IP privada via Unix socket
- [x] HTTPS obligatorio (Cloud Run default)
- [x] Rate limiting en endpoints superadmin (100 req/min)
- [x] Validación de inputs server-side
- [x] JWT con expiración
- [x] TenantStorage para aislamiento de datos

### ⚠️ Recomendado para Producción
- [ ] Cambiar passwords por defecto
- [ ] Configurar 2FA para super admins
- [ ] Implementar Cloud Armor para DDoS protection
- [ ] Configurar VPC Service Controls
- [ ] Habilitar audit logs de Cloud SQL
- [ ] Configurar backups automáticos de Cloud SQL
- [ ] Implementar monitoring con Cloud Monitoring

---

## 📚 Recursos Adicionales

- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud SQL for MySQL](https://cloud.google.com/sql/docs/mysql)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)

---

**Mantenedor:** Teseo X Team
**Última actualización:** 2025-11-18
