# Documentación de Auditoría de Base de Datos

Esta carpeta contiene auditorías y reportes de sincronización entre entornos local y Cloud SQL.

## 📚 Documentos

### [AUDIT_REPORT.md](./AUDIT_REPORT.md)
Reporte completo de auditoría de base de datos (2025-11-08).

**Entornos auditados:**
- Local Docker MySQL (127.0.0.1:3307)
- Cloud SQL Production (34.68.83.86)

**Hallazgos críticos:**
- ⚠️ Sistema RBAC incompleto en Cloud (82 → 8 permisos)
- ⚠️ 11 tablas faltantes en producción
- ⚠️ 4 vistas completamente ausentes
- ⚠️ Diferencias de datos significativas

**Contenido del reporte:**
1. Resumen ejecutivo
2. Comparación detallada por módulo (RBAC, Financiero, Producción, etc.)
3. Análisis de scripts SQL
4. Diferencias de datos críticas
5. Recomendaciones y plan de acción
6. Script de bootstrap reproducible
7. Script de validación post-bootstrap

## 🛠️ Scripts Relacionados

Los scripts de bootstrap y validación están en `/scripts/`:
- `bootstrap_cloud_sql_complete.sh` - Sincronización completa
- `validate_schema.sh` - Validación de esquema

## 📊 Resumen de Hallazgos

| Categoría | Local | Cloud | Estado |
|-----------|-------|-------|--------|
| Tablas | 36 | 25 | ❌ -11 |
| Vistas | 4 | 0 | ❌ -4 |
| Permisos | 82 | 8 | ❌ -74 |
| Usuarios | 3 | 1 | ⚠️ -2 |

## 🎯 Acción Requerida

1. Ejecutar `bootstrap_cloud_sql_complete.sh` para sincronizar Cloud SQL
2. Validar con `validate_schema.sh`
3. Verificar que todos los endpoints funcionen correctamente

## 📅 Última Auditoría
2025-11-08
