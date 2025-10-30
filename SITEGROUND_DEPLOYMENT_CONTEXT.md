# SiteGround Deployment Context

Este documento resume la investigación realizada sobre el despliegue de **Artyco Financial App (RBAC)** en SiteGround, incluyendo referencias a la experiencia previa con **Artyco Exhibiciones** para evitar errores repetidos.

## 1. Arquitectura de la App Actual
- **Backend:** FastAPI + SQLAlchemy + MySQL, entrada principal `api_server_rbac.py` con rutas RBAC, BI y Status Producción (`api_server_rbac.py`).
- **Frontend:** React + Vite; build en `dist/` servido como SPA (Vite config en `vite.config.js`).
- **Configuración dinámica:** `config.py` detecta entorno SiteGround y ajusta rutas (`config.py:6-76`).
- **Persistencia:** Esquema inicial en `docker/mysql/*.sql`; `init_db.sql` genera roles, permisos y usuario admin por defecto.
- **Docker:** Solo para desarrollo (no aplicable en hosting compartido).

## 2. Datos Operativos para SiteGround
- Archivo provisto por el usuario: `Datos Para Siteground.txt` (repositorio raíz). Actualmente está vacío, por lo que las credenciales deben completarse antes del deploy (`Datos Para Siteground.txt`).
- Variables esperadas en `.env` de producción (auto-generado por `setup_siteground.sh`): host, puerto, nombre y usuario de la base, contraseña, `JWT_SECRET_KEY`, `CORS_ORIGINS`, `ANTHROPIC_API_KEY` opcional (`setup_siteground.sh:44-81`).
- Asegurar que el nombre real de la base siga el formato `user_dbname` de SiteGround; ajustar scripts y SQLs para evitar referencias rígidas a `artyco_financial_rbac`.

## 3. Lecciones del Proyecto `artyco-exhibiciones`
Documento fuente: `/mnt/e/artyco-exhibiciones/CLAUDE.md`.

Errores corregidos allí:
- **403 Forbidden:** causado por archivos fuera de `public_html`; solución: mantener todo dentro de esa carpeta (`CLAUDE.md:77-101`).
- **Assets 404:** SiteGround no sirve Vite/React estáticos desde subcarpetas; se usó controlador personalizado para entregar assets (`deploy-siteground/app/Http/Controllers/AssetController.php`).
- **Migraciones obsoletas:** se detectó estructura distinta de BD; se aplicó `migrate:fresh` + importación (`CLAUDE.md`, sección “Estructura de BD diferente”).
- **Dependencias corruptas:** vendor incompleto; decisión: instalar `composer` en servidor en vez de transferir vendor (`CLAUDE.md`, sección “Vendor corrupto”).
- **Scripts administrativos web:** se emplearon endpoints PHP porque el acceso SSH era limitado (`scripts/sg-install.php`, `sg-fix-403.php`).

Prácticas exitosas heredables:
- Empaquetar únicamente archivos requeridos (`scripts/update-production.sh`).
- Checklist detallado previo al deploy (`GUIA_ACTUALIZACION_PRODUCCION.md`).
- Scripts de validación (`scripts/sg-check-requirements.php`) para confirmar compatibilidad SiteGround.

## 4. Riesgos Detectados en la App Actual
- `setup_siteground.sh` asume Python 3.9 y uso CGI (`setup_siteground.sh:16-119`); en SiteGround es preferible Passenger con ASGI → WSGI para evitar instanciación por request.
- Script de base de datos utiliza `USE artyco_financial_rbac;` (`docker/mysql/03-rbac-schema.sql:1-7`), lo que fallará si la BD tiene otro nombre.
- `requirements.txt` incluye dependencias pesadas (numpy/pandas/scikit-learn) que suelen fallar en hosting compartido sin wheels; considerar `requirements_minimal.txt` o subir ruedas precompiladas.
- No existe `.htaccess` adaptado para enrutar `/api` a la app Python y servir `dist/` como SPA.
- Archivo de credenciales SiteGround está vacío; despliegue no debe continuar sin esos datos.

## 5. Plan de Despliegue Recomendado
1. **Preparación local**
   - Completar `Datos Para Siteground.txt` y `.env` con credenciales reales.
   - Ajustar scripts SQL/entorno para usar nombres de BD dinámicos (`Config.DB_NAME`).
   - Seleccionar subconjunto de dependencias compatibles con SiteGround o preparar wheelhouse.
   - Construir frontend (`npm run build`) verificando que todas las llamadas lean `VITE_API_BASE_URL`.

2. **Empaquetado**
   - Crear carpeta `siteground/` con backend, `dist/`, scripts y configuraciones necesarias.
   - Generar `passenger_wsgi.py` y `.htaccess` adaptados (similar a soluciones de `artyco-exhibiciones`).
   - Excluir `node_modules/`, `__pycache__/`, dumps y archivos grandes innecesarios.

3. **Servidor SiteGround**
   - Subir paquete a `public_html/artyco-financial-app`.
   - Crear y activar virtualenv (`python3.X -m venv venv`), instalar dependencias desde wheel o lista reducida.
   - Ejecutar `python setup_database.py` (revisado) para crear BD y tablas.
   - Verificar `passenger_wsgi.py` y permisos de archivos (`chmod` similares a `setup_siteground.sh`).

4. **Validación**
   - Probar `/api/health`, `/docs`, flujo de login, carga de CSV y Status Producción.
   - Revisar logs en `logs/` y ajustar CORS al dominio final.
   - Cambiar contraseña del admin por defecto (`init_db.sql`).

## 6. Checklist para Claude / Próximos Pasos
- [ ] Completar credenciales reales en `Datos Para Siteground.txt` y `.env`.
- [ ] Revisar y adaptar `setup_siteground.sh` → Passenger en vez de CGI.
- [ ] Parametrizar scripts SQL para evitar `USE` fijo.
- [ ] Definir estrategia de dependencias (wheelhouse o lista mínima).
- [ ] Preparar `.htaccess` + `passenger_wsgi.py`.
- [ ] Crear paquete de despliegue con archivos mínimos.
- [ ] Ejecutar pruebas post-deploy (login, BI, carga CSV, producción).

> Esta guía brinda el contexto necesario para que otro agente (Claude) continúe con ajustes y despliegue, reutilizando aprendizajes del proyecto Laravel previo y minimizando riesgos en SiteGround.

