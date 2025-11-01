# 🚀 Guía de Deployment Simplificada - SiteGround

Esta guía te llevará paso a paso para desplegar **Artyco Financial App RBAC** en tu servidor SiteGround (cfg.artycoec.com).

---

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener:

- [ ] Acceso SSH a tu servidor SiteGround
- [ ] Base de datos MySQL creada en SiteGround (credenciales en `Datos Para Siteground.txt`)
- [ ] Node.js instalado localmente (para hacer el build del frontend)
- [ ] Python 3.9 o superior disponible en SiteGround
- [ ] Cliente SFTP (FileZilla, WinSCP, o similar)

---

## 🏗️ PARTE 1: Preparación Local (En tu PC)

### Paso 1: Hacer el build del frontend

```powershell
# Abrir PowerShell en la carpeta del proyecto
cd C:\Users\dpaul\OneDrive\Escritorio\artyco-financial-app-rbac

# Limpiar build anterior (opcional)
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Hacer el build
npm run build
```

**Resultado esperado:** Se crea la carpeta `dist/` con los archivos del frontend.

---

### Paso 2: Empaquetar para deployment

```powershell
# Ejecutar el script de empaquetado automatizado
cd deploy\siteground
.\prepare-deployment.ps1
```

**Resultado esperado:** Se crea el archivo `artyco-siteground.zip` (~10-15 MB).

---

### Paso 3: Subir el ZIP a SiteGround

**Opción A: Via SFTP (Recomendado)**

1. Abre FileZilla o tu cliente SFTP favorito
2. Conecta a tu servidor SiteGround
   - Host: `cfg.artycoec.com` (o IP del servidor)
   - Usuario: (tu usuario SSH)
   - Puerto: 22
3. Navega a `/home/customer/www/cfg.artycoec.com/public_html/`
4. Sube el archivo `artyco-siteground.zip`

**Opción B: Via SSH**

```bash
# Desde tu PC local con SCP
scp deploy/siteground/artyco-siteground.zip user@cfg.artycoec.com:~/public_html/
```

---

## 🔧 PARTE 2: Configuración en el Servidor (SSH)

### Paso 4: Conectar via SSH

```bash
ssh user@cfg.artycoec.com
```

### Paso 5: Descomprimir el paquete

```bash
cd ~/public_html
unzip artyco-siteground.zip
rm artyco-siteground.zip  # Eliminar el ZIP ya descomprimido

# Verificar que los archivos están en su lugar
ls -la
# Deberías ver: api_server_rbac.py, passenger_wsgi.py, .htaccess, dist/, routes/, etc.
```

---

### Paso 6: Crear el entorno virtual Python

```bash
# Crear entorno virtual
python3.9 -m venv venv

# Activar el entorno virtual
source venv/bin/activate

# Actualizar pip
pip install --upgrade pip

# Instalar dependencias
pip install -r requirements.txt
```

**⚠️ IMPORTANTE:** Si la instalación de pandas falla:
```bash
# Comentar pandas en requirements.txt y reinstalar
sed -i 's/^pandas/#pandas/' requirements.txt
pip install -r requirements.txt
```

---

### Paso 7: Configurar variables de entorno

```bash
# Copiar el ejemplo y editarlo
cp .env.example .env
nano .env  # o vim .env
```

**Edita el archivo `.env` con estos valores:**

```bash
ENVIRONMENT=production
SITEGROUND=true

# Base de Datos (desde Datos Para Siteground.txt)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dbhvwc3icpvb0z
DB_USER=u6ugyggyggw7u
DB_PASSWORD=WBfwbn-yPeYp7d5

# GENERA UN SECRET ALEATORIO:
# Ejecuta en la terminal: openssl rand -hex 32
JWT_SECRET_KEY=<PEGA_AQUI_EL_RESULTADO_DEL_COMANDO_ANTERIOR>

JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

CORS_ORIGINS=https://cfg.artycoec.com

DEBUG=false
RELOAD=false
```

**Guardar y salir:** `Ctrl+X` → `Y` → `Enter`

```bash
# Proteger el archivo .env
chmod 600 .env
```

---

### Paso 8: Inicializar la base de datos

```bash
# Conectar a MySQL y ejecutar los scripts SQL
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/01-create-financial-tables.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/02-create-raw-table.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/03-rbac-schema.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/04-align-production-metrics.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/05-add-production-rbac.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/06-create-production-config.sql
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < sql/07-create-sales-bi-module.sql

# Verificar que las tablas se crearon
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z -e "SHOW TABLES;"
```

---

### Paso 9: Configurar permisos

```bash
# Permisos correctos para Passenger
chmod 755 ~/public_html
chmod 755 uploads logs dist
chmod 644 .htaccess passenger_wsgi.py
```

---

### Paso 10: Reiniciar Passenger

```bash
# Crear directorio tmp si no existe
mkdir -p tmp

# Forzar reinicio de Passenger
touch tmp/restart.txt
```

---

## ✅ PARTE 3: Verificación

### Paso 11: Probar la aplicación

Abre tu navegador y visita:

1. **Frontend:** https://cfg.artycoec.com
   - Debería cargar la página de login

2. **API Health Check:** https://cfg.artycoec.com/api/health
   - Debería devolver: `{"status": "ok"}`

3. **API Docs:** https://cfg.artycoec.com/api/docs
   - Debería mostrar la documentación interactiva de FastAPI

4. **Login:**
   - Usuario: `admin`
   - Contraseña: `admin`
   - **⚠️ CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE**

---

## 🔍 Troubleshooting

### Error 500: Internal Server Error

```bash
# Ver logs de Passenger
tail -50 logs/error.log
tail -50 ~/logs/passenger.log

# Verificar que el entorno virtual está activo y las dependencias instaladas
source venv/bin/activate
pip list
```

### Error 403: Forbidden

```bash
# Verificar permisos
ls -la ~/public_html
chmod -R 755 ~/public_html
```

### API no responde

```bash
# Reiniciar Passenger
touch tmp/restart.txt

# Esperar 10 segundos y volver a probar
```

### Frontend en blanco

```bash
# Verificar que dist/ existe y tiene contenido
ls -la dist/

# Verificar .htaccess
cat .htaccess
```

### Error de base de datos

```bash
# Verificar conexión MySQL
mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z -e "SELECT 1;"

# Verificar .env
cat .env
```

---

## 🔐 Seguridad Post-Deployment

1. **Cambiar contraseña del admin:**
   - Login → Profile → Change Password

2. **Generar nuevo JWT Secret:**
   ```bash
   openssl rand -hex 32
   # Actualizar en .env
   ```

3. **Revisar permisos RBAC:**
   - Crear usuarios adicionales
   - Asignar roles apropiados

4. **Configurar HTTPS:**
   - SiteGround → SSL Manager
   - Activar SSL/TLS para cfg.artycoec.com

5. **Configurar backups:**
   - Base de datos: weekly backup
   - Carpeta uploads/: daily backup

---

## 📝 Mantenimiento

### Actualizar la aplicación

```bash
# 1. Hacer backup de la BD
mysqldump -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z > backup_$(date +%Y%m%d).sql

# 2. Subir nuevo ZIP y descomprimir (sin sobreescribir .env ni uploads/)
# 3. Reinstalar dependencias si cambiaron
source venv/bin/activate
pip install -r requirements.txt --upgrade

# 4. Reiniciar
touch tmp/restart.txt
```

### Ver logs en tiempo real

```bash
tail -f logs/error.log
tail -f ~/logs/passenger.log
```

---

## 🎉 ¡Listo!

Tu aplicación Artyco Financial App debería estar funcionando en https://cfg.artycoec.com

Si tienes problemas, revisa:
- `logs/error.log`
- `~/logs/passenger.log`
- Contacta soporte de SiteGround si hay problemas de servidor

---

**Versión:** 1.0
**Fecha:** Octubre 2025
**Dominio:** cfg.artycoec.com
