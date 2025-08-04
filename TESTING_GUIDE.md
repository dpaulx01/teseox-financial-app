# 🧪 Guía de Testing - Artyco Financial RBAC

## 🚀 Ejecutar el proyecto localmente

### 1. Iniciar los servicios Docker

```bash
cd /home/dpaulx/artyco-financial-app-rbac
docker-compose up --build
```

**Servicios disponibles:**
- **API**: http://localhost:8001
- **Frontend**: http://localhost:3001  
- **MySQL**: localhost:3307
- **phpMyAdmin**: http://localhost:8081

### 2. Verificar que los servicios estén funcionando

Espera a ver estos mensajes en los logs:
```
✅ Database initialized successfully
🧠 Brain System initialized for API
🚀 Starting Artyco Financial API Server with RBAC...
```

## 🧪 Ejecutar Tests Automáticos

### Script de Testing Integrado

```bash
# Ejecutar todas las pruebas
python test_api.py

# Con URL personalizada
python test_api.py --url http://localhost:8001

# Con credenciales específicas
python test_api.py --username admin --password admin123
```

### Pruebas que se ejecutan:

1. **Health Check** - Endpoint público
2. **System Info** - Información del sistema  
3. **Login** - Autenticación con admin
4. **User Info** - Datos del usuario actual
5. **Users List** - Gestión de usuarios
6. **Admin Stats** - Estadísticas del sistema
7. **Financial Analysis** - Endpoint protegido
8. **Logout** - Cerrar sesión
9. **Unauthorized Access** - Verificar seguridad

## 📋 Testing Manual con cURL

### 1. Health Check (Público)
```bash
curl -X GET http://localhost:8001/api/health
```

### 2. Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "refresh_token": "eyJ0eXAiOiJKV1Q...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "username": "admin",
    "roles": ["admin"],
    "permissions": ["*:*"]
  }
}
```

### 3. Usar el Token
```bash
# Guardar token en variable
TOKEN="tu_token_aqui"

# Hacer petición autenticada
curl -X GET http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Probar Endpoint Protegido
```bash
curl -X POST http://localhost:8001/api/pyg/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "financial_data": {
      "accounts": [
        {"code": "4110", "name": "Ingresos", "annual_total": 1000000}
      ]
    },
    "view_type": "contable"
  }'
```

## 🌐 Testing con Navegador

### 1. Documentación de API
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### 2. Frontend React
- **App**: http://localhost:3001
- Deberá mostrar interfaz de login
- Usar credenciales: admin / admin123

### 3. phpMyAdmin
- **URL**: http://localhost:8081
- **Usuario**: root
- **Password**: rootpassword123
- **Base de datos**: artyco_financial_rbac

## 👥 Usuarios de Prueba

### Usuario Administrador (Creado automáticamente)
- **Email**: admin@artyco.com
- **Username**: admin  
- **Password**: admin123
- **Roles**: admin (todos los permisos)

### Crear Usuario de Prueba
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "test123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

## 🔐 Testing de Permisos

### 1. Probar Acceso sin Token
```bash
# Debe devolver 401 Unauthorized
curl -X GET http://localhost:8001/api/users/
```

### 2. Probar con Token Inválido
```bash
curl -X GET http://localhost:8001/api/users/ \
  -H "Authorization: Bearer token_invalido"
```

### 3. Probar Permisos Insuficientes
```bash
# Login como usuario normal
TOKEN_USER="token_de_usuario_normal"

# Intentar acceder a endpoint de admin (debe devolver 403)
curl -X GET http://localhost:8001/api/admin/stats \
  -H "Authorization: Bearer $TOKEN_USER"
```

## 🔧 Endpoints por Rol

### Viewer (Solo lectura)
- ✅ `GET /api/auth/me`
- ✅ `GET /api/system/info`
- ❌ `POST /api/pyg/analyze`
- ❌ `GET /api/users/`

### Analyst (Análisis)
- ✅ `GET /api/auth/me`
- ✅ `POST /api/pyg/analyze`
- ✅ `POST /api/risk/analyze`
- ❌ `GET /api/users/`

### Manager (Gestión)
- ✅ `GET /api/auth/me`
- ✅ `POST /api/pyg/analyze`
- ✅ `POST /api/portfolio/analyze`
- ✅ `POST /api/brain/query`
- ❌ `GET /api/admin/stats`

### Admin (Todo)
- ✅ Todos los endpoints

## 🐛 Solución de Problemas

### Error de Conexión a Base de Datos
```bash
# Verificar que MySQL esté corriendo
docker-compose ps

# Ver logs de MySQL
docker-compose logs mysql-rbac

# Reiniciar MySQL
docker-compose restart mysql-rbac
```

### Error 500 en API
```bash
# Ver logs de la API
docker-compose logs api-rbac

# Verificar configuración
cat .env
```

### Token Expirado
```bash
# Usar endpoint de refresh
curl -X POST http://localhost:8001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "tu_refresh_token"}'
```

### Problemas de CORS
- Verificar que `CORS_ORIGINS` en `.env` incluya el origen correcto
- Para desarrollo local: `http://localhost:3001`

## 📊 Métricas de Testing

### Tests Esperados: ✅ PASS
- Health Check
- Login con admin
- Información de usuario
- Acceso a endpoints protegidos (con permisos)
- Logout
- Denegación de acceso sin token

### Rendimiento Esperado
- Login: < 500ms
- Endpoints protegidos: < 1s
- Análisis PyG: < 3s (sin Brain System), < 10s (con IA)

## 🚀 Próximos Pasos

1. **Frontend Integration**: Actualizar React app para usar autenticación
2. **Role Management UI**: Interfaz para gestión de usuarios y roles
3. **Advanced Testing**: Tests de carga y integración
4. **Production Deploy**: Configurar para SiteGround

¡Tu API RBAC está lista para usar! 🎉