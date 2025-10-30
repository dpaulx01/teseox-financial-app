# Guía de Deployment en Render.com

## Resumen de la Arquitectura

```
Frontend (SPA React)          Backend (FastAPI)
┌─────────────────────┐      ┌──────────────────────┐
│  SiteGround         │─────>│  Render.com          │
│  cfg.artycoec.com   │ API  │  Python + MySQL      │
│  (Archivos estáticos)│      │  (Free Tier)         │
└─────────────────────┘      └──────────────────────┘
```

---

## Parte 1: Preparar Base de Datos MySQL en Render

### Opción A: Usar Base de Datos de SiteGround (Recomendado)

**Ventajas**: Ya tienes la BD configurada y con datos

**Pasos**:
1. En Site Tools de SiteGround → MySQL → Databases
2. Crear un usuario con permisos de acceso remoto:
   - Username: `artyco_api_user`
   - Host: `%` (permite conexión desde cualquier IP)
   - Permisos: SELECT, INSERT, UPDATE, DELETE en `customer_artyco_rbac`
3. Anotar:
   - Host: `cfg.artycoec.com` o IP del servidor MySQL
   - Puerto: `3306`
   - Database: `customer_artyco_rbac`
   - Usuario: `artyco_api_user`
   - Password: (el que configures)

**Consideración de seguridad**: Limitar acceso solo a IPs de Render si es posible.

### Opción B: Crear Base de Datos en Render

**Desventajas**: Requiere plan de pago ($7/mes)

1. En Render Dashboard → New → PostgreSQL (MySQL no disponible en free tier)
2. O usar servicio externo gratuito:
   - **PlanetScale** (MySQL compatible, tier gratuito)
   - **Railway** (PostgreSQL gratuito con crédito inicial)

---

## Parte 2: Desplegar Backend en Render.com

### Paso 1: Crear Cuenta y Conectar Git

1. Ir a [render.com](https://render.com) y crear cuenta (usar GitHub/GitLab)
2. Hacer commit de los archivos creados:
   ```bash
   git add render.yaml requirements-render.txt config.py
   git commit -m "feat: add Render.com deployment configuration"
   git push origin master
   ```

### Paso 2: Crear Web Service

1. En Render Dashboard → **New → Web Service**
2. Conectar tu repositorio Git:
   - Autorizar acceso a tu cuenta GitHub/GitLab
   - Seleccionar repositorio: `artyco-financial-app-rbac`
3. Render detectará automáticamente `render.yaml`
4. Configuración automática:
   - **Name**: `artyco-financial-api`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements-render.txt`
   - **Start Command**: `uvicorn api_server_rbac:app --host 0.0.0.0 --port $PORT`

### Paso 3: Configurar Variables de Entorno

En el dashboard del servicio → **Environment**:

#### Variables Requeridas:

```env
# Environment
ENVIRONMENT=production

# Database (usar credenciales de SiteGround o BD externa)
DB_HOST=cfg.artycoec.com
DB_PORT=3306
DB_NAME=customer_artyco_rbac
DB_USER=artyco_api_user
DB_PASSWORD=tu_password_seguro_aqui

# JWT Secret (Render lo genera automáticamente, o crear uno propio)
JWT_SECRET_KEY=tu_jwt_secret_super_seguro_cambiar_esto
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS (tu dominio frontend)
CORS_ORIGINS=https://cfg.artycoec.com,http://localhost:3001

# Security
BCRYPT_ROUNDS=12
```

#### Variables Opcionales (AI Brain System):

```env
ANTHROPIC_API_KEY=tu_anthropic_api_key  # Solo si usas features de IA
```

### Paso 4: Deploy

1. Click en **Create Web Service**
2. Render comenzará el build automáticamente
3. Espera 3-5 minutos para el primer deploy
4. Tu API estará disponible en: `https://artyco-financial-api.onrender.com`

### Paso 5: Verificar Deployment

Probar endpoints de salud:

```bash
# Health check
curl https://artyco-financial-api.onrender.com/health

# Respuesta esperada:
{"status":"healthy","message":"RBAC API is running","database":"connected"}

# Root endpoint
curl https://artyco-financial-api.onrender.com/

# Status detallado
curl https://artyco-financial-api.onrender.com/api/status
```

---

## Parte 3: Configurar Frontend para Usar API de Render

### Opción A: Variable de Entorno (Recomendado)

1. Buscar archivo de configuración del frontend (`.env.production` o similar)
2. Actualizar URL del API:
   ```env
   VITE_API_URL=https://artyco-financial-api.onrender.com
   ```

3. Rebuild del frontend:
   ```bash
   npm run build
   ```

4. Subir nuevo `dist/` a SiteGround

### Opción B: Configuración en Código

Si el frontend usa config hardcodeado, buscar:
- `src/config.ts` o `src/config.js`
- `src/services/api.ts`
- Archivos con `axios.create()` o `fetch()` base URL

Ejemplo de cambio:
```typescript
// Antes
const API_BASE_URL = 'http://localhost:8000/api'

// Después
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artyco-financial-api.onrender.com/api'
```

---

## Parte 4: Limpiar Configuración de SiteGround

### Archivos a Eliminar (ya no necesarios):

```bash
# Conectar por SSH a SiteGround
ssh customer@cfg.artycoec.com

cd ~/www/cfg.artycoec.com/public_html

# Backup primero (opcional)
tar -czf backup_python_files.tar.gz *.py venv/ requirements*.txt .env

# Eliminar archivos Python
rm -rf venv/
rm -f api_server_rbac.py
rm -f passenger_wsgi.py
rm -f requirements*.txt
rm -f .env  # CUIDADO: asegúrate de tener backup
rm -rf database/
rm -rf routes/
rm -rf __pycache__/

# Mantener solo:
# - dist/ (frontend compilado)
# - .htaccess (simplificado, solo SPA)
```

### Actualizar `.htaccess` (solo para SPA):

```apache
Options -Indexes

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Servir archivos estáticos directamente
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # Fallback a index.html para SPA routing
    RewriteRule ^.*$ /dist/index.html [L]
</IfModule>

# Headers de seguridad
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compresión
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE application/json
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE text/html
</IfModule>
```

---

## Limitaciones del Plan Gratuito de Render

### Qué Esperar:

1. **Sleep Automático**:
   - Después de 15 minutos sin requests, el servicio entra en sleep
   - Primera request después del sleep tarda ~30 segundos en wake-up
   - Requests subsecuentes son instantáneos

2. **Recursos**:
   - 512 MB RAM
   - CPU compartida
   - 750 horas/mes de cómputo (suficiente para uso normal)

3. **Solución al Sleep**:
   - Configurar ping cada 10 minutos desde servicio externo:
     - **UptimeRobot** (gratuito, 50 monitores)
     - **Cron-job.org** (gratuito)
   - Endpoint a pingear: `https://artyco-financial-api.onrender.com/health`

### Upgrade a Plan de Pago ($7/mes):

Beneficios:
- Sin sleep automático
- Más RAM y CPU
- Mejor rendimiento general

---

## Troubleshooting

### Error: "Database connection failed"

**Causa**: No se puede conectar a MySQL de SiteGround

**Solución**:
1. Verificar que el usuario MySQL tenga permisos remotos
2. Revisar que el firewall de SiteGround permita conexiones externas
3. Considerar usar IP fija de Render (solo en plan de pago)

### Error: "CORS policy blocked"

**Causa**: Frontend no está en lista de orígenes permitidos

**Solución**:
1. Verificar variable `CORS_ORIGINS` en Render
2. Debe incluir `https://cfg.artycoec.com` (sin trailing slash)
3. Redeploy del servicio después de cambiar variables

### API responde lento en primera request

**Causa**: Servicio estaba en sleep

**Solución**: Normal en plan gratuito. Configurar UptimeRobot para mantener activo.

### Error 500 en endpoint específico

**Solución**:
1. Revisar logs en Render Dashboard → Logs
2. Buscar stack trace del error
3. Verificar que todas las dependencias estén en `requirements-render.txt`

---

## Monitoreo y Mantenimiento

### Logs en Tiempo Real:

En Render Dashboard → tu servicio → **Logs**

### Métricas:

Dashboard muestra:
- Requests/segundo
- Memoria usada
- CPU usage
- Errores recientes

### Auto-Deploy:

Configurado en `render.yaml`:
- Cada push a `master` despliega automáticamente
- Build tarda ~3-5 minutos
- Zero-downtime deployment

---

## Próximos Pasos (Opcional)

1. **Configurar Dominio Personalizado**:
   - Render permite custom domains (gratis)
   - Ej: `api.cfg.artycoec.com`
   - Requiere configurar CNAME en DNS de SiteGround

2. **Implementar CI/CD**:
   - GitHub Actions para tests antes de deploy
   - Validación automática de migraciones de BD

3. **Agregar Redis para Caching**:
   - Render ofrece Redis (plan de pago)
   - Alternativa gratuita: **Upstash Redis**

4. **Mejorar Logs**:
   - Integrar con Sentry para error tracking
   - Configurar alertas por Slack/Email

---

## Checklist Final

- [ ] Base de datos MySQL accesible remotamente
- [ ] Variables de entorno configuradas en Render
- [ ] Backend desplegado y respondiendo en `/health`
- [ ] Frontend actualizado con nueva API URL
- [ ] Frontend rebuildeado y subido a SiteGround
- [ ] SiteGround limpio (solo archivos estáticos)
- [ ] `.htaccess` actualizado (solo SPA routing)
- [ ] Login funcional desde `cfg.artycoec.com`
- [ ] (Opcional) UptimeRobot configurado para evitar sleep

---

## Contacto y Soporte

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Community**: https://community.render.com

**¡Deployment completado!** 🚀
