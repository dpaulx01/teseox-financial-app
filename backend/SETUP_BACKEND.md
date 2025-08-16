# 🚀 Configuración del Backend API - Artyco Financial

## 📋 Requisitos Previos

- PHP 7.4 o superior
- MySQL 8.0 o superior
- Extensiones PHP: `pdo`, `pdo_mysql`, `json`, `mbstring`

## 🔧 Configuración de Base de Datos

### 1. Crear Base de Datos (si no existe)

```sql
CREATE DATABASE IF NOT EXISTS artyco_financial 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'artyco'@'localhost' IDENTIFIED BY 'artyco123';
GRANT ALL PRIVILEGES ON artyco_financial.* TO 'artyco'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Ejecutar Script de Inicialización

```bash
# Conectar a MySQL y ejecutar el script
mysql -u artyco -p artyco_financial < backend/database/init_analysis_config.sql
```

## 🌐 Iniciar Servidor de Desarrollo

### Opción 1: Usar Script Batch (Windows)

```bash
# Ejecutar desde la raíz del proyecto
start-backend.bat
```

### Opción 2: Usar Script PHP

```bash
# Navegar al directorio backend
cd backend

# Ejecutar servidor PHP
php start-server.php
```

### Opción 3: Comando Manual

```bash
# Desde el directorio backend
cd backend
php -S localhost:8001 -t .
```

## 🧪 Verificar Configuración

### 1. Test de Conectividad

```bash
# Verificar que el servidor esté corriendo
curl http://localhost:8001/api/analysis_config.php?action=types
```

### 2. Test de Base de Datos

```bash
# Verificar patrones de exclusión
curl http://localhost:8001/api/analysis_config.php?action=patterns
```

## 📁 Estructura de Archivos

```
backend/
├── api/
│   ├── analysis_config.php     # API principal de configuración
│   ├── financial_data_v2.php   # API de datos financieros
│   └── ...
├── config/
│   └── database_final.php      # Configuración de BD
├── database/
│   └── init_analysis_config.sql # Script de inicialización
├── start-server.php            # Launcher del servidor
└── SETUP_BACKEND.md           # Esta guía
```

## 🔗 Endpoints Disponibles

### Tipos de Análisis
- `GET /api/analysis_config.php?action=types` - Obtener tipos de análisis
- `POST /api/analysis_config.php?action=add_type` - Agregar tipo de análisis

### Patrones de Exclusión
- `GET /api/analysis_config.php?action=patterns` - Obtener patrones
- `POST /api/analysis_config.php?action=add_pattern` - Agregar patrón
- `POST /api/analysis_config.php?action=update_pattern` - Actualizar patrón
- `POST /api/analysis_config.php?action=delete_pattern` - Eliminar patrón

### Configuración
- `GET /api/analysis_config.php?action=config` - Obtener configuración completa

## 🔧 Variables de Entorno

El sistema usa las siguientes variables de entorno (con valores por defecto):

```bash
DB_HOST=mysql          # Host de la base de datos
DB_PORT=3306          # Puerto de MySQL
DB_NAME=artyco_financial  # Nombre de la base de datos
DB_USER=artyco        # Usuario de MySQL
DB_PASS=artyco123     # Contraseña de MySQL
```

## 🐛 Solución de Problemas

### Error: "Connection refused"
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql
# O en Windows:
net start mysql80
```

### Error: "Access denied"
```bash
# Verificar credenciales en database_final.php
# Asegurar que el usuario 'artyco' tenga permisos
```

### Error: "Table doesn't exist"
```bash
# Re-ejecutar script de inicialización
mysql -u artyco -p artyco_financial < backend/database/init_analysis_config.sql
```

### Puerto 8001 en uso
```bash
# Verificar qué proceso usa el puerto
netstat -tulpn | grep :8001
# Cambiar puerto en start-server.php si es necesario
```

## 📊 Datos de Prueba

El script de inicialización incluye:
- 3 tipos de análisis (contable, operativo, caja)
- 13 patrones de depreciación con y sin acentos
- 9 patrones de intereses
- 4 patrones de impuestos

## 🔄 Integración con Frontend

Una vez configurado el backend, el frontend automáticamente:
1. Detecta si el servidor local está disponible (puerto 8001)
2. Usa la API para obtener patrones dinámicos
3. Permite CRUD completo de patrones de exclusión
4. Cachea configuraciones para mejor rendimiento

## 🚀 Despliegue en Producción

Para producción, configurar:
1. Variables de entorno apropiadas
2. SSL/HTTPS
3. Permisos de base de datos restrictivos
4. Logs de error y monitoreo

---

**✅ ¡Backend API configurado correctamente!**

El sistema ahora puede gestionar dinámicamente los patrones de exclusión para análisis EBITDA sin necesidad de modificar código frontend.