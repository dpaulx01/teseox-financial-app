# Artyco Financial App - RBAC Version

Esta es una versión clonada del proyecto Artyco Financial App con implementación completa de RBAC (Role-Based Access Control).

## 🚀 Diferencias con la versión original

- **Sistema de autenticación JWT**: Login seguro con tokens JWT
- **Control de acceso basado en roles**: Admin, Manager, Analyst, Viewer
- **Gestión de permisos granular**: Control detallado por recurso y acción
- **Auditoría completa**: Registro de todas las acciones importantes
- **Base de datos aislada**: MySQL en puerto 3307 (no interfiere con la original)
- **Puertos diferentes**: 
  - API: 8001 (original: 8000)
  - Frontend: 3001 (original: 3000)
  - MySQL: 3307 (original: 3306)
  - phpMyAdmin: 8081 (original: 8080)
- **Status Producción**: Nuevo módulo operativo con carga masiva de cotizaciones PDF o Excel, matriz editable y gestión de cobros.

## 📋 Requisitos previos

- Docker y Docker Compose instalados
- Puerto 3307, 8001, 3001 y 8081 disponibles

## 🛠️ Instalación y configuración

1. **Navegar al directorio del proyecto**:
   ```bash
   cd artyco-financial-app-rbac
   ```

2. **Configurar variables de entorno**:
   - Revisar y ajustar el archivo `.env`
   - Cambiar `JWT_SECRET_KEY` para producción
   - Añadir tu `ANTHROPIC_API_KEY` si usas el Brain System

3. **Construir e iniciar los contenedores**:
   ```bash
   docker-compose up --build
   ```
   > Si ya tienes la pila levantada y solo deseas aplicar las últimas actualizaciones del backend (parser PDF), ejecuta:
   > ```bash
   > docker compose up -d --build api-rbac
   > ```

4. **Verificar que todo esté funcionando**:
   - API: http://localhost:8001/docs
   - Frontend: http://localhost:3001
   - phpMyAdmin: http://localhost:8081

## 👥 Usuarios y roles predeterminados

### Usuario administrador
- **Email**: admin@artyco.com
- **Username**: admin
- **Password**: admin123 (¡CAMBIAR EN PRODUCCIÓN!)

### Roles disponibles
1. **Admin**: Acceso completo al sistema
2. **Manager**: Gestión de datos financieros y análisis
3. **Analyst**: Acceso de solo lectura y análisis
4. **Viewer**: Acceso básico de solo lectura

## 🔐 Permisos por rol

### Admin
- Todos los permisos del sistema

### Manager
- financial_data: read, write, export
- pyg_analysis: read, execute, configure
- portfolio: read, analyze, manage
- risk_analysis: read, execute
- transactions: read, analyze
- brain_system: query

### Analyst
- financial_data: read
- pyg_analysis: read, execute
- portfolio: read, analyze
- risk_analysis: read, execute
- transactions: read, analyze
- brain_system: query

## 🆕 Módulo Status Producción

- **Carga inteligente de cotizaciones**: arrastra tus PDF o la plantilla Excel (`.xls`/`.xlsx`) a la interfaz, se extraen número de cotización, cliente, ODC, líneas de producto y valores.
- **Matriz interactiva**: edita fechas de entrega, estatus operativos, notas de producción, facturación y condiciones de cobro por ítem.
- **Gestión de cobros integrada**: registra anticipos y saldos, visualiza totales abonados y saldo pendiente por cotización.
- **Progreso visual**: barra dinámica basada en fecha de ingreso y fecha de entrega estimada.

> Encontrarás el módulo dentro del frontend en la pestaña **Status Producción** de la barra lateral.

### Viewer
- Todos los recursos: solo read

## 📁 Estructura del proyecto RBAC

```
artyco-financial-app-rbac/
├── api_server.py          # API modificada con autenticación
├── auth/                  # Nuevo módulo de autenticación
│   ├── __init__.py
│   ├── dependencies.py    # Dependencias de seguridad
│   ├── jwt_handler.py     # Manejo de JWT
│   ├── password.py        # Utilidades de contraseñas
│   └── permissions.py     # Sistema de permisos
├── models/                # Modelos SQLAlchemy
│   ├── __init__.py
│   ├── user.py
│   ├── role.py
│   └── permission.py
├── routes/                # Rutas de API organizadas
│   ├── auth.py           # Login, registro, etc.
│   ├── users.py          # Gestión de usuarios
│   └── admin.py          # Panel de administración
└── docker/
    └── mysql/
        └── rbac_schema.sql  # Esquema RBAC completo
```

## 🔧 Comandos útiles

### Ver logs
```bash
docker-compose logs -f api-rbac
docker-compose logs -f mysql-rbac
```

### Acceder a la base de datos
```bash
docker exec -it artyco-mysql-rbac mysql -u root -p
# Password: rootpassword123
```

### Detener los servicios
```bash
docker-compose down
```

### Limpiar todo (incluyendo volúmenes)
```bash
docker-compose down -v
```

## 🚨 Notas importantes

1. **Seguridad**: Cambiar todas las contraseñas predeterminadas antes de usar en producción
2. **JWT Secret**: Generar un nuevo secreto seguro para JWT
3. **CORS**: Ajustar los orígenes permitidos según tu entorno
4. **Backup**: La base de datos es independiente, hacer backups regulares

## 📊 Endpoints de API principales

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/refresh` - Refrescar token
- `POST /auth/logout` - Cerrar sesión

### Gestión de usuarios (requiere permisos)
- `GET /users` - Listar usuarios
- `GET /users/{id}` - Obtener usuario
- `PUT /users/{id}` - Actualizar usuario
- `DELETE /users/{id}` - Eliminar usuario
- `POST /users/{id}/roles` - Asignar roles

### Endpoints financieros (con control de acceso)
- Todos los endpoints originales ahora requieren autenticación y permisos adecuados

## 🐛 Solución de problemas

1. **Puerto en uso**: Verificar que los puertos 3307, 8001, 3001, 8081 estén libres
2. **Contenedor no inicia**: Revisar logs con `docker-compose logs [servicio]`
3. **Error de conexión a BD**: Esperar que MySQL esté completamente iniciado
4. **Token inválido**: Verificar que el JWT_SECRET_KEY sea el mismo en frontend y backend
