# Plan Integral de Modernización Multitenant y RBAC

**Fecha:** 2025-11-14  
**Autor:** Equipo Artyco (síntesis de análisis previos + revisión senior)  
**Alcance:** Base de datos, capa de aplicación, RBAC/ABAC, storage y despliegue  
**Decisión arquitectónica:** Base de datos compartida con `company_id` + aislamiento lógico (tenant context + RLS lógico). Híbrido y DB dedicadas quedarán para escalamiento futuro.

---

## 1. Resumen Ejecutivo
- La app está lista para evolucionar a SaaS multi-empresa siempre que se cierre la deuda técnica de integridad (53% de las tablas tienen `company_id`, solo 35% tienen FK).  
- Reutilizaremos la base compartida actual porque es la única económicamente viable para 200-1000 clientes de Contifico. El foco es endurecer aislamiento: `company_id` obligatorio, FK, índices compuestos, middleware de tenant, caches/archivos segregados y RBAC con contexto.
- Este documento unifica el diagnóstico de BD, la guía de RBAC y el plan de implementación en una sola ruta accionable (6-8 horas para Fase 1, ~3 semanas para completar backend/infra, ~4 semanas adicionales para ABAC + QA).

---

## 2. Estado Actual (Noviembre 2025)

### 2.1 Base de Datos
| Indicador | Valor | Riesgo |
|-----------|-------|--------|
| Tablas totales | 32 | - |
| Tablas con `company_id` | 17 (53%) | ⚠️ incompleto |
| Tablas con FK a `companies` | 6 (35% de las anteriores) | 🔴 data leakage potencial |
| Tablas sensibles sin `company_id` | 5 (cotizaciones, productos, plan diario, pagos, scenarios) | 🔴 crítico |
| Vistas que agregan sin `company_id` | `v_financial_summary`, `v_production_summary`, `v_sales_summary` | 🔴 |
| Caches con datos globales | `sales_kpis_cache`, `sales_saved_filters` | ⚠️ |

### 2.2 Capa de Aplicación (FastAPI / SQLAlchemy)
- `company_id` se filtra manualmente en algunas queries; ~80 endpoints no contemplan tenant.  
- No existe `TenantContext` global ni eventos SQLAlchemy para inyectar filtros.  
- El módulo Sales BI y Production Status consumen vistas/agregados no filtrados → dashboards mezclan datos.  
- Scripts (`sync_cloud_from_local`, `bootstrap_cloud_sql*`) aún exportan/importan todo sin segmentar.

### 2.3 RBAC / Autenticación
- RBAC clásico con roles/permissions granulares; logs y JWT activos.  
- Falta `Company` ORM, relationships y roles por empresa.  
- No hay ABAC, permisos temporales ni policy engine.  
- Tokens y sesiones no incluyen `company_id` como claim obligatorio.

### 2.4 Storage y Backups
- `file_uploads` tiene `company_id` pero los archivos se guardan en un solo directorio (`/uploads`).  
- Exportaciones PDF, backups, sync locales y bucket en Cloud Storage no segregan por tenant.

### 2.5 Observaciones Clave
1. **Integridad referencial** es la deuda más grave: cualquier endpoint sin filtro expone todas las empresas.  
2. **Backfill** no está documentado: antes de agregar FK hay que poblar `company_id` de datos heredados.  
3. **Storage y caches** no se aíslan.  
4. **RBAC** necesita conocer tenant para prevenir que un superuser de un cliente vea los datos de otro.  
5. **Validación**: no existen scripts ni CI que impidan que un nuevo PR rompa el aislamiento.

---

## 3. Migración de Datos y Backfill
### 3.1 Prerrequisitos
1. `companies` debe tener al menos el tenant por defecto (id=1).  
2. Respaldo completo (`mysqldump --single-transaction`) antes de tocar columnas.  
3. Script de validación para detectar `company_id` inexistentes.

### 3.2 Estrategia de Backfill
**Opción A (actual recomendada):** todos los registros existentes pertenecen al tenant por defecto.
```sql
INSERT INTO companies (id, name, slug, is_active, subscription_tier)
VALUES (1, 'Artyco Default', 'artyco-default', TRUE, 'pro')
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = TRUE;

-- Columnas + update + FK por tabla crítica
ALTER TABLE cotizaciones ADD COLUMN company_id INT NULL AFTER id;
UPDATE cotizaciones SET company_id = 1 WHERE company_id IS NULL;
ALTER TABLE cotizaciones
  MODIFY company_id INT NOT NULL,
  ADD CONSTRAINT fk_cotizaciones_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  ADD INDEX idx_cotizaciones_company_fecha (company_id, fecha_creacion);
-- Repetir patrón para productos, plan_diario_produccion, pagos, financial_scenarios (y dashboard_configs opcional)
```

**Opción B (si ya hay múltiples clientes mezclados):**
1. Detectar patrones (`cliente`, `razon_social`, dominios de email).  
2. Crear tabla temporal de mapeo (`cliente_pattern`, `company_id`).  
3. Actualizar cada tabla con `JOIN` a mapeo.  
4. Registros sin match → tenant por defecto hasta que el negocio los clasifique manualmente.

### 3.3 Scripts de Validación
```sql
-- Verificar que no existan company_id inválidos
SELECT 'users' tabla, COUNT(*) registros_problema
FROM users
WHERE company_id IS NULL OR company_id NOT IN (SELECT id FROM companies)
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions WHERE company_id NOT IN (SELECT id FROM companies);

-- Estimar duplicados potenciales
SELECT nombre, COUNT(DISTINCT company_id) num_empresas
FROM productos
GROUP BY nombre HAVING num_empresas > 1;
```

### 3.4 Rollback
Eliminar FKs nuevas (`ALTER TABLE ... DROP FOREIGN KEY`), restaurar backup si es imposible revertir manualmente.  **Nunca** eliminar `company_id` si ya existen datos válidos; preferir backup + restore.

---

## 4. Actualizaciones de Esquema e Índices
### 4.1 Extender `companies`
Agregar campos SaaS esenciales para pricing, billing y activación.
```sql
ALTER TABLE companies
  ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER slug,
  ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'trial' AFTER is_active,
  ADD COLUMN subscription_expires_at DATETIME NULL AFTER subscription_tier,
  ADD COLUMN max_users INT DEFAULT 5 AFTER subscription_expires_at;
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_subscription_tier ON companies(subscription_tier);
```

### 4.2 FK obligatorias en tablas con `company_id`
| Tabla | Acción |
|-------|--------|
| `users` | `ALTER TABLE users ADD CONSTRAINT fk_users_company ... ON DELETE RESTRICT;` |
| `raw_account_data`, `raw_balance_data`, `balance_data`, `sales_transactions`, `sales_alerts`, `sales_kpis_cache`, `sales_saved_filters`, `production_config`, `production_combined_data`, `role_permissions` (si aplica) | Agregar FK + índices (`company_id,...`). |

### 4.3 Tablas que reciben `company_id`
`cotizaciones`, `productos`, `plan_diario_produccion`, `pagos`, `financial_scenarios`, `dashboard_configs` (opcional).  Incluir `company_id` en claves únicas existentes si el dato debe ser único por tenant.

### 4.4 Índices compuestos (performance)
```
CREATE INDEX idx_sales_company_year_month ON sales_transactions(company_id, year, month);
CREATE INDEX idx_sales_company_cliente ON sales_transactions(company_id, cliente_nombre);
CREATE INDEX idx_financial_company_account ON financial_data(company_id, account_code);
CREATE INDEX idx_raw_account_company_date ON raw_account_data(company_id, date);
CREATE INDEX idx_productos_company_nombre ON productos(company_id, nombre);
CREATE INDEX idx_cotizaciones_company_estado ON cotizaciones(company_id, estado);
```
Evaluar `EXPLAIN` antes/después y ajustar dashboards que hagan `GROUP BY` altos (BI, producción, PyG).

### 4.5 Vistas y rutinas
- Agregar `company_id` a todas las vistas (`v_financial_summary`, `v_production_summary`, `v_sales_summary`).  
- Reemplazar `SELECT ... FROM vista` por `SELECT ... WHERE company_id = :tenant`.  
- Revisar stored procedures/triggers para asegurar que copian `company_id` al insertar en historiales.

---

## 5. Capa de Aplicación y Servicios
### 5.1 Tenant Context Middleware
```python
# auth/tenant_context.py
from contextvars import ContextVar
_current_tenant = ContextVar('current_tenant', default=None)

def set_current_tenant(company_id: int): _current_tenant.set(company_id)

def get_current_tenant():
    tenant = _current_tenant.get()
    if tenant is None:
        raise HTTPException(403, 'Tenant context missing')
    return tenant

# dependencies.py
async def require_tenant(user: User = Depends(get_current_user)):
    set_current_tenant(user.company_id)
    return user
```
- Inyectar `require_tenant` en **cada** router.  
- Event listener SQLAlchemy para autoaplicar `company_id` en `before_compile` cuando una entidad tiene el mixin `TenantScoped`.

### 5.2 Refactor de Endpoints
| Módulo | Acción |
|--------|--------|
| `routes/financial_data.py` | Añadir `tenant_id` a `query.filter(...)`, reutilizar `TenantScopedQuery`. |
| `routes/production_status.py` | Asegurar que `Cotizacion`, `Producto`, `PlanDiario` y `Pagos` filtran por `tenant` y escriben `company_id` al crear. |
| `routes/sales_bi_api.py` | Actualizar ~30 queries (resúmenes, rankings, caches) con `company_id`. |
| `routes/balance.py` | Forzar filtros en `financial_data`, `balance_data`, `raw_account_data`. |
| `routes/users.py` | Al crear usuarios asignar `company_id` explícito; restringir listados al tenant actual salvo superadmins globales. |

### 5.3 Vistas React / Frontend
- Sales BI, Production Dashboard y módulos operativos deben mostrar chips de filtros activos (ya implementado en `CommercialView`) y asegurarse de enviar `tenant context` (JWT ya lo incluirá).  
- Bloquear UI si la empresa está inactiva (`is_active = FALSE`).

### 5.4 Caches y Jobs
- `sales_kpis_cache` / `sales_saved_filters`: agregar `company_id` en llaves y claves únicas (`(company_id, cache_key)`).  
- Jobs programados (`cron`/Cloud Scheduler) deben iterar por tenant, no procesar globalmente.

### 5.5 Scripts y Pipelines
- `scripts/bootstrap_cloud_sql_complete.sh`, `sync_cloud_from_local.sh`: agregar parámetro `--tenant` para export/import parcial.  
- `scripts/validate_schema.sh`: incluir verificación de FKs `company_id` y vistas.

---

## 6. Storage, Exportaciones y Backups
1. **File uploads:** guardar en `/uploads/company_{id}/...` y validar `company_id` antes de servir o borrar.  
2. **Reportes PDF/Excel:** generar en subcarpetas por tenant y registrar en `data_audit_log` con `company_id`.  
3. **Backups locales/Cloud Storage:** mantener estructura `gs://artyco-backups/company_{id}/...` para restauraciones rápidas.  
4. **Sync Cloud ↔ Local:** permitir seleccionar tenant, o en su defecto comprimir exportaciones por carpeta.  
5. **Logs/auditoría:** `audit_logs` ya tiene `user_id`; agregar `company_id` derivado para filtrar en dashboards.

---

## 7. RBAC Multitenant y Seguridad
### 7.1 Modelo ORM
```python
class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    slug = Column(String(255), unique=True)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String(50), default='trial')
    subscription_expires_at = Column(DateTime)
    users = relationship('User', back_populates='company')

class User(Base):
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    company = relationship('Company', back_populates='users')
```
- Roles y permisos deben poder asociarse por empresa (`role_assignments` con `company_id`).  
- Crear tabla `role_permission_overrides` para reglas específicas por tenant.

### 7.2 ABAC + Policy Engine
- Extender permisos con atributos (horario, dispositivo, tipo de dato) según recomendaciones del análisis RBAC.  
- `PolicyEngine.evaluate(user, action, resource, context)` debe validar `company_id` antes que cualquier otra condición.  
- Permisos temporales (`valid_from`, `valid_until`) para consultores externos.  
- Incluir `company_id` y lista de roles en los JWT; middleware niega acceso si la compañía está inactiva o el token no coincide.

### 7.3 Sesiones y Auditoría
- `user_sessions` debe almacenar `company_id` y tener índice `(company_id, created_at)`.  
- `audit_logs` registrar `company_id` para cada acción; dashboards de compliance deben filtrarse automáticamente.

---

## 8. Rendimiento y Observabilidad
1. Monitorizar `slow_query_log` en Cloud SQL después de agregar índices.  
2. Configurar Alerting (Cloud Monitoring) para: conexiones, CPU > 70%, storage > 80%, errores 5xx relacionados con tenant context.  
3. Crear métricas custom en FastAPI (por ejemplo, requests por tenant) para detectar comportamientos anómalos.  
4. Planificar particionamiento futuro (por año o por tenant) si `sales_transactions` supera 1M filas.

---

## 9. Validación y QA
| Tipo | Acción |
|------|--------|
| **Unit tests** | Mock `TenantContext` y verificar que cada repositorio aplica `company_id`. |
| **Integration tests** | Cargar datos de dos tenants ficticios y asegurar que endpoints devuelven únicamente el tenant correspondiente. |
| **Schema validation** | Extender `scripts/validate_schema.sh` para comprobar FKs `company_id`, vistas y columnas nuevas de `companies`. |
| **CI/CD** | Añadir step que corre `pytest -m multitenant` y el script de validación antes de desplegar a Cloud Run. |
| **Manual UAT** | Lista de chequeo por módulo (Sales BI, Production, PyG) validando filtros dinámicos y chips visibles. |

---

## 10. Roadmap de Despliegue
| Fase | Duración | Objetivo |
|------|----------|----------|
| **0. Preparación** | 0.5 día | Backup, scripts de validación, habilitar tenant context (sin enforcement). |
| **1. Esquema & Backfill** | 1 día | Extender `companies`, agregar `company_id` + FK + índices, ejecutar Option A/B de backfill, validar. |
| **2. Capa de Datos** | 2-3 días | Refactor vistas SQL, caches, scripts; actualizar endpoints críticos con `require_tenant`. |
| **3. Storage & Assets** | 0.5 día | Segregar uploads, exportaciones y backups. |
| **4. RBAC Moderno** | 3-4 días | Company ORM, roles por tenant, JWT con `company_id`, ABAC básico, policy engine, permisos temporales. |
| **5. QA & Observabilidad** | 2 días | Tests automatizados, monitoreo, documentación de soporte. |
| **6. Rollout Cloud SQL** | 0.5 día | Aplicar migraciones en producción, validar dashboards, comunicar a clientes. |

---

## 11. Riesgos y Mitigaciones
| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Data leakage durante migración | Alto | Correr validaciones antes de FKs, usar transacciones y backups. |
| Queries olvidan `TenantContext` | Alto | Enforce middleware global + tests automáticos + revisión de PR. |
| Degradación de performance | Medio | Índices compuestos + monitoreo `EXPLAIN`. |
| Tokens viejos sin `company_id` | Medio | Rotar claves JWT y forzar re-login. |
| Storage legacy mezclado | Medio | Script para mover archivos a carpetas por tenant y actualizar rutas en `file_uploads`. |
| Falta de capacidad operativa | Medio | Automatizar scripts y priorizar módulos críticos primero (Sales BI, Production). |

---

## 12. Próximos Pasos Inmediatos
1. Ejecutar respaldo y Option A de backfill en ambiente local.  
2. Refactorizar vistas SQL principales (`v_financial_summary`, `v_production_summary`, `v_sales_summary`).  
3. Implementar `TenantContext` + dependencia global en FastAPI, y actualizar Sales BI + Production endpoints.  
4. Ajustar `file_uploads` y exportaciones para segregación por carpeta.  
5. Actualizar JWT/ sesiones con `company_id` y documentar el nuevo flujo para el frontend.  
6. Correr `scripts/validate_schema.sh` extendido y añadirlo a CI/CD.  
7. Compartir este plan con el equipo para alinear responsabilidades y calendario.

---

Con este plan unificado, TODO el stack (BD, API, frontend, storage y seguridad) queda alineado con un modelo multitenant robusto y listo para escalar a cientos de empresas sin comprometer datos.  Ejecuta las fases en orden; cada paso construye sobre el anterior.
