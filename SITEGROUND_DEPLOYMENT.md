# Guía de Despliegue en SiteGround - Artyco Financial RBAC

## 📋 Requisitos Previos

### En SiteGround cPanel:
1. **Python App**: Python 3.9+ habilitado
2. **MySQL Database**: Una base de datos MySQL creada
3. **SSL Certificate**: SSL habilitado para HTTPS

## 🚀 Proceso de Instalación

### Paso 1: Subir Archivos
1. Comprime todo el contenido de `artyco-financial-app-rbac/`
2. Sube y extrae en el directorio de tu dominio
3. O usa Git si tienes acceso SSH

### Paso 2: Configurar Python App en cPanel
1. Ve a **Python App** en cPanel
2. Crea nueva aplicación:
   - **Python Version**: 3.9+
   - **App Directory**: `/artyco-financial-app-rbac`
   - **App URL**: tu dominio o subdominio
   - **Startup File**: `api_server.py`

### Paso 3: Configurar Base de Datos
1. En **MySQL Databases** de cPanel:
   - Crea base de datos: `customer_artyco_rbac`
   - Crea usuario: `customer_artyco`
   - Asigna permisos completos

### Paso 4: Configurar Variables de Entorno
Crea/edita el archivo `.env`:

```bash
# Configuración de Producción SiteGround
ENVIRONMENT=production
SITEGROUND=true

# Base de Datos (actualizar con tus datos)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tu_usuario_artyco_rbac
DB_USER=tu_usuario_artyco
DB_PASSWORD=tu_password_mysql

# JWT (¡CAMBIAR ESTO!)
JWT_SECRET_KEY=tu-clave-secreta-super-segura-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS (actualizar con tu dominio)
CORS_ORIGINS=https://tudominio.com

# API
API_HOST=127.0.0.1
API_PORT=8000

# Seguridad
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_MINUTES=60

# Brain System (opcional)
ANTHROPIC_API_KEY=tu_api_key_anthropic

# Producción
DEBUG=false
RELOAD=false
```

### Paso 5: Instalar Dependencias
En la terminal SSH o Python App console:

```bash
# Navegar al directorio
cd ~/public_html/artyco-financial-app-rbac

# Activar entorno virtual de SiteGround
source ~/virtualenv/artyco-financial-app-rbac/3.9/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Paso 6: Configurar Base de Datos
```bash
# Ejecutar script de configuración de BD
python setup_database.py
```

### Paso 7: Configurar Archivos de Aplicación

#### api_server.py (modificar para SiteGround)
```python
#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Configurar paths para SiteGround
if os.path.exists('/home/customer/www'):
    # Estamos en SiteGround
    base_dir = Path('/home/customer/www/artyco-financial-app-rbac')
    sys.path.insert(0, str(base_dir))

# Importar configuración
from config import Config
from fastapi import FastAPI
# ... resto del código ...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=Config.RELOAD
    )
```

## 🔒 Configuración de Seguridad

### 1. Archivo .htaccess
Ya incluido, protege archivos sensibles:
- Bloquea acceso a `.env`, `.py`, `.pyc`
- Previene navegación de directorios
- Headers de seguridad

### 2. Permisos de Archivos
```bash
chmod 755 ~/public_html/artyco-financial-app-rbac
chmod 644 ~/public_html/artyco-financial-app-rbac/.htaccess
chmod 600 ~/public_html/artyco-financial-app-rbac/.env
```

### 3. SSL/HTTPS
- Habilita SSL en cPanel
- Fuerza redirección HTTPS
- Actualiza CORS_ORIGINS con https://

## 🧪 Pruebas

### Verificar API
1. **Health Check**: `https://tudominio.com/api/health`
2. **Login**: `https://tudominio.com/api/auth/login`
3. **Docs**: `https://tudominio.com/docs`

### Usuario Administrador Predeterminado
- **Email**: admin@artyco.com
- **Username**: admin
- **Password**: admin123 (¡CAMBIAR INMEDIATAMENTE!)

## 🔧 Configuración Específica de SiteGround

### 1. Python App Configuration
```
Application root: /home/customer/www/artyco-financial-app-rbac
Application URL: https://tudominio.com/api
Application startup file: api_server.py
Application Entry point: app
```

### 2. Passenger Configuration (passenger_wsgi.py)
```python
#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Add project to path
project_path = Path(__file__).parent
sys.path.insert(0, str(project_path))

# Set environment
os.environ['ENVIRONMENT'] = 'production'
os.environ['SITEGROUND'] = 'true'

from api_server import app
application = app
```

### 3. Cron Jobs (opcional)
Para tareas de mantenimiento:
```bash
# Limpiar sesiones expiradas (diario)
0 2 * * * cd ~/public_html/artyco-financial-app-rbac && python -c "from maintenance import clean_expired_sessions; clean_expired_sessions()"
```

## 🐛 Solución de Problemas

### Error 500 - Internal Server Error
1. Revisar logs: `~/logs/artyco-financial-app-rbac.error.log`
2. Verificar permisos de archivos
3. Comprobar configuración Python App

### Error de Conexión a Base de Datos
1. Verificar credenciales en `.env`
2. Probar conexión desde phpMyAdmin
3. Revisar límites de conexión de SiteGround

### Errores de Importación
1. Verificar que todas las dependencias estén instaladas
2. Comprobar versión de Python
3. Revisar paths en `sys.path`

### CORS Errors
1. Verificar `CORS_ORIGINS` en `.env`
2. Asegurar que el dominio tenga SSL
3. Comprobar headers en respuestas

## 📊 Monitoreo

### Logs de Aplicación
- Error logs: `~/logs/`
- Access logs: disponibles en cPanel

### Métricas de Performance
- Usar SiteGround Site Tools
- Monitorear uso de CPU/memoria
- Revisar estadísticas de base de datos

## 🔄 Actualizaciones

### Proceso de Actualización
1. Hacer backup de `.env` y base de datos
2. Subir nuevos archivos
3. Ejecutar migraciones si es necesario
4. Reiniciar Python App

### Backup
```bash
# Base de datos
mysqldump -u usuario -p base_datos > backup_$(date +%Y%m%d).sql

# Archivos
tar -czf backup_files_$(date +%Y%m%d).tar.gz ~/public_html/artyco-financial-app-rbac
```

## 📞 Soporte

- **SiteGround**: Ticket de soporte si hay problemas del servidor
- **Aplicación**: Revisar logs en `/logs/` directory
- **Base de Datos**: phpMyAdmin para diagnóstico manual