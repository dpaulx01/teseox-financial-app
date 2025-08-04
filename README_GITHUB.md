# 🏦 Artyco Financial App - RBAC Edition

Sistema completo de análisis financiero con autenticación JWT, control de permisos granular y análisis inteligente con IA.

## ✨ Características Principales

- 🔐 **Sistema RBAC Completo**: Autenticación JWT con roles y permisos granulares
- 📊 **Análisis Financiero**: PyG, Portfolio, Análisis de Riesgo  
- 🧠 **IA Integrada**: Brain System con Anthropic Claude
- 🗄️ **Base de Datos Segura**: MySQL con auditoría
- 📚 **API REST Documentada**: Swagger UI incluido
- 🐳 **Docker Ready**: Configuración completa

## 🚀 Inicio Rápido

```bash
# Iniciar servicios
docker-compose -f docker-compose-api.yml up --build

# Probar API
python test_api.py
```

**Servicios**: API (8001), Docs (8001/docs), phpMyAdmin (8081)
**Credenciales**: admin / admin123

## 🎭 Roles

- **Admin**: Acceso completo
- **Manager**: Gestión financiera  
- **Analyst**: Análisis y consultas
- **Viewer**: Solo lectura

## 📊 Endpoints Principales

- `POST /api/auth/login` - Login
- `POST /api/pyg/analyze` - Análisis PyG
- `GET /api/users/` - Gestión usuarios
- `GET /api/admin/stats` - Estadísticas

Documentación completa en `/docs`