# SiteGround Deployment Guide

Este documento resume los pasos concretos para desplegar **Artyco Financial App RBAC** en un hosting compartido de SiteGround usando Passenger para servir FastAPI y Nginx/Apache para los assets de Vite.

> **Requisitos previos**
>
> - Acceso SSH o SFTP al servidor.
> - Base de datos MySQL creada en SiteGround con usuario y contraseña (ver `Datos Para Siteground.txt`; asegúrate de mantenerlo fuera de cualquier despliegue público).
> - Node.js/NPM instalados en tu máquina local para construir el frontend.
> - Python 3.9 o 3.10 disponible en SiteGround (Passenger lo soporta).

## 1. Preparación local

1. **Instala dependencias y construye el frontend**
   ```bash
   npm install
   npm run build
   ```
   Esto genera los archivos listos para producción en `dist/`.
   > El `package.json` ya usa `framer-motion@11.11.17` (evita el bug del bundle). Si reinstalas dependencias, confirma que esa versión se mantiene.

2. **Selecciona dependencias Python compatibles**
   - Usa `requirements_minimal.txt` para el servidor. Si necesitas librerías adicionales, añádelas con cuidado (SiteGround no permite compilar binarios pesados).

3. **Prepara el paquete a subir**
   - Crea una carpeta temporal, por ejemplo `deploy/siteground/build/`.
   - Copia los siguientes elementos:
     ```
     api_server_rbac.py
     config.py
     routes/
     auth/
     models/
     database/
     utils/            (si existe)
     brain/            (solo si usas el módulo Brain)
     uploads/          (dejar vacía pero crear la carpeta)
     logs/             (dejar vacía pero crear la carpeta)
     dist/             (resultado del build frontend)
     requirements_minimal.txt
     deploy/siteground/passenger_wsgi.py      (ajusta rutas internas si tu carpeta difiere)
     deploy/siteground/.htaccess              (actualiza PassengerAppRoot/PassengerPython)
     docker/mysql/*.sql   (DDL y datos iniciales)
     scripts/import_sales_csv.py (opcional para mantenimiento)
     ```
   - Excluye carpetas pesadas (`node_modules/`, `__pycache__/`, archivos `.csv` grandes de pruebas).

4. **Ajusta las referencias a la base de datos**
   - En los SQL (`docker/mysql/*.sql`) comenta o reemplaza cualquier línea `USE artyco_financial_rbac;` por `USE dbhvwc3icpvb0z;` (tu nombre real de base en SiteGround).
   - Verifica que `config.py` funcione con variables de entorno:
     - `DB_HOST=localhost`
     - `DB_PORT=3306`
     - `DB_NAME=dbhvwc3icpvb0z`
     - `DB_USER=u6ugyggyggw7u`
     - `DB_PASSWORD=WBfwbn-yPeYp7d5`
     - `CORS_ORIGINS=https://cfg.artycoec.com` (tu subdominio).

5. **Empaqueta los archivos**
   - Desde la carpeta donde reuniste todo, crea un zip:
     ```bash
     cd deploy/siteground/build
     zip -r ../artyco-financial-siteground.zip .
     ```
   - Sube ese `.zip` a SiteGround (SFTP/SSH) en `public_html/artyco-financial-app`.

## 2. Configuración en SiteGround

1. **Descomprime el paquete**
   ```bash
   cd ~/public_html/artyco-financial-app
   unzip artyco-financial-siteground.zip
   ```
   - Ajusta `deploy/siteground/.htaccess` (`PassengerAppRoot` y `PassengerPython`) y, si la carpeta final difiere, actualiza `SITEGROUND_PROJECT_ROOT` en tu `.env`.
   - Copia el contenido actualizado de `Datos Para Siteground.txt` a un lugar seguro del servidor (no lo subas dentro de `public_html`).

2. **Crea y activa el entorno virtual**
   ```bash
   python3.9 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements_minimal.txt
   ```

3. **Crea el archivo `.env`**
   ```bash
   cat <<'EOF' > .env
   ENVIRONMENT=production
   SITEGROUND=true
   SITEGROUND_PROJECT_ROOT=/home/customer/www/cfg.artycoec.com
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=dbhvwc3icpvb0z
   DB_USER=u6ugyggyggw7u
   DB_PASSWORD=WBfwbn-yPeYp7d5
   JWT_SECRET_KEY=<genera_uno_seguro>
   CORS_ORIGINS=https://cfg.artycoec.com
   DEBUG=false
   RELOAD=false
   EOF
   chmod 600 .env
   ```
   > Genera un `JWT_SECRET_KEY` aleatorio (`openssl rand -hex 32`).

4. **Configura Passenger**
   - El archivo `passenger_wsgi.py` y `.htaccess` incluidos ya están preparados para leer `api_server_rbac.py`. Asegúrate de que estén en la raíz (`public_html/artyco-financial-app`).
   - Crea `tmp/restart.txt` para forzar reinicio:
     ```bash
     mkdir -p tmp
     touch tmp/restart.txt
     ```

5. **Permisos de carpetas**
   ```bash
   chmod 755 .
   chmod 755 uploads logs dist
   ```

## 3. Inicializar la base de datos

1. **Carga la estructura principal**
   ```bash
   source venv/bin/activate
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/01-create-financial-tables.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/02-create-raw-table.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/03-rbac-schema.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/04-align-production-metrics.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/05-add-production-rbac.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/06-create-production-config.sql
   mysql -u u6ugyggyggw7u -p'WBfwbn-yPeYp7d5' dbhvwc3icpvb0z < docker/mysql/07-create-sales-bi-module.sql
   ```
   > Asegúrate de que cada archivo tenga `USE dbhvwc3icpvb0z;` como primera línea.

2. **Datos iniciales opcionales**
   - Si tienes un dump de producción o CSV a importar, usa el script `scripts/import_sales_csv.py`.

## 4. Validación

1. **API**  
   - Visita `https://cfg.artycoec.com/api/health` → debe devolver `{"status": "ok"}`.  
   - Comprueba `https://cfg.artycoec.com/api/docs`.

2. **Frontend**  
   - Navega a `https://cfg.artycoec.com`.  
   - Inicia sesión con `admin / admin` (cambia la contraseña de inmediato).

3. **Administración**  
   - Revisa `logs/passenger.log` y `logs/error.log` si hay errores.  
   - Cambia el password del usuario admin desde la app.  
   - Verifica carga de CSV pequeñas para confirmar permisos en `uploads/`.

## 5. Troubleshooting rápido

| Problema | Acción |
|----------|--------|
| `500 Internal Server Error` | Revisa `logs/error.log`, asegura `venv` activado y dependencias instaladas. |
| `ModuleNotFoundError` | Passenger no ve el proyecto; revisa `passenger_wsgi.py` y que `venv` tenga las librerías. |
| `Access denied for user` | Confirma credenciales en `.env` y permisos del usuario en MySQL. |
| React en blanco | Revisa que `dist/` exista y `.htaccess` permita servir archivos estáticos. |
| No arranca API | Crea/actualiza `tmp/restart.txt` para reiniciar Passenger. |

## 6. Próximos pasos

- Configura HTTPS (SiteGround → SSL Manager).
- Ajusta CORS y `JWT_SECRET_KEY` cada vez que repliques el entorno.
- Implementa backups automáticos (BD y carpeta `uploads/`).
- Documenta credenciales seguras fuera del repositorio.

Con esto tienes una ruta completa para desplegar la app en tu hosting SiteGround. Sigue cada sección en orden y usa este documento como checklist. ¡Éxitos con el deploy!
