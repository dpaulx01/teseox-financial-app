# Plan Integral de Modernización Multitenant y RBAC

**Última actualización:** 2025-11-15 17:00
**Estado:** Fases 0-4 ✅ COMPLETADAS | Fase 5 🔄 EN PROGRESO
**Autor:** Equipo Artyco + Auditoría Senior
**Alcance:** Base de datos, capa de aplicación, RBAC/ABAC, storage y despliegue
**Decisión arquitectónica:** Base de datos compartida con `company_id` + aislamiento lógico (ContextVar + Middleware)

**Calificación actual:** 7.5/10 ⭐⭐⭐⭐⭐⭐⭐☆☆☆
**Progreso general:** ~85%

---

## ✅ ESTADO ACTUAL - NOVIEMBRE 2025

### Fases Completadas

| Fase | Estado | Duración | Completado |
|------|--------|----------|------------|
| **Fase 0: Preparación** | ✅ | 1.5h | 2025-11-14 |
| **Fase 1: Schema DB** | ✅ | 4-6h | 2025-11-14 |
| **Fase 2: Aplicación** | ✅ | 16-24h | 2025-11-14 |
| **Fase 2.5: Fixes Críticos** | ✅ | 80-100h | 2025-11-15 |
| **Fase 3: Rutas Restantes** | ✅ | 8h | 2025-11-15 |
| **Fase 4: Storage & Validación** | ✅ | 4h | 2025-11-15 |

### Resumen de Implementación

**✅ Logros:**
- Backup completo de base de datos (676KB)
- 10/10 tablas con `company_id` y FK
- 20+ índices compuestos creados
- Tenant Context con ContextVars implementado
- JWT incluye `company_id` en payload
- Rutas clave (`production_status`, `financial_data`, `sales_bi`, `users`, `superadmin`) usan `_get_company_id`
- Legacy API `api_financial_data.py` (CSV + producción) ahora respeta TenantContext (Phase 3 kickoff)
- Suite de aislamiento multitenant (`tests/test_tenant_isolation.py`) con 9/9 escenarios activos
- Validación multinivel (user → company → subscription)

**⚠️ Pendientes Próximos (Fase 5 en curso):**
- Company-user relationships avanzados + overrides RBAC (ver sección Fase 5)
- Policy Engine básico, permisos temporales y listeners automáticos
- Monetización/observabilidad avanzada (alertas max_users, storage quotas)
- Preparar despliegue final (Fases 5-6)

---

## 🔍 AUDITORÍA SENIOR - HALLAZGOS CLAVE

**Documento completo:** `docs/SENIOR_AUDIT_REPORT.md`

### Calificación por Categoría

| Categoría | Puntaje | Estado |
|-----------|---------|--------|
| Arquitectura | 8/10 | ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ |
| Seguridad | 7/10 | ⭐⭐⭐⭐⭐⭐⭐☆☆☆ |
| Código | 8/10 | ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ |
| Escalabilidad | 7/10 | ⭐⭐⭐⭐⭐⭐⭐☆☆☆ |
| Mantenibilidad | 6/10 | ⭐⭐⭐⭐⭐⭐☆☆☆☆ |

### 🚨 Vulnerabilidades Críticas Identificadas

#### 1. Race Condition en max_users ✅
**Archivo:** `routes/auth.py:242-247`
**Severidad:** ALTA
**Estado:** ✅ Resuelto (lock pesimista aplicado)

```python
# VULNERABLE
existing_users = db.query(User).filter(User.company_id == company.id).count()
if company.max_users and existing_users >= company.max_users:
    raise HTTPException(400, "Limit reached")
user = User(...)  # ❌ Otro request puede insertar aquí
db.add(user)
```

**Impacto:** 2 requests simultáneos podían violar límite de usuarios.

**Estado actual:** `routes/auth.py` usa `with_for_update()` y verifica `max_users` dentro de la misma transacción antes de insertar. Auditoría repetida el 2025-11-15 confirma que no se reproducen saltos de cupo en condiciones de carrera.

#### 2. Tests de Aislamiento (suite completa) 🟢
**Severidad:** CRÍTICA
**Estado:** ✅ 9/9 escenarios pasando (pendiente automatizar en CI)

`tests/test_tenant_isolation.py` cubre JWT, registro, max_users, joins, exports y ataques de token malicioso. La suite corre localmente (evidencia 2025-11-15); falta integrar la ejecución en pipeline CI/CD para evitar regresiones futuras.

#### 3. Interfaz de Super Admin ✅
**Severidad:** BLOQUEANTE
**Estado:** ✅ Implementada (`routes/superadmin.py`)

**Funcionalidades actuales:**
- Crear/editar/activar compañías
- Cambiar `subscription_tier`, `max_users`
- Crear usuarios en cualquier tenant y resetear contraseñas
- Consultar métricas y auditoría global (`AuditLog`)
- Todos los endpoints usan `Depends(require_superuser())` y registran acciones

---

## 🚨 ALERTAS DE SEGURIDAD - ESTADO ACTUALIZADO

**Fecha de verificación:** 2025-11-14
**Estado anterior:** 🔴 Data Leakage Confirmado
**Estado actual:** ✅ RESUELTO en Fases 1 y 2

### ✅ Vulnerabilidades RESUELTAS

#### ✅ 1. Módulo de Producción - CORREGIDO
**Archivo:** `routes/production_status.py:298-300`
**Antes:**
```python
active_items = db.query(ProductionProduct).filter(...).all()  # ❌ Sin filtro
```
**Después:**
```python
company_id = _get_company_id(current_user)
active_items = db.query(ProductionProduct).filter(
    ProductionProduct.company_id == company_id,  # ✅ Filtrado
    ...
).all()
```

#### ✅ 2. Upload Financiero - CORREGIDO
**Archivo:** `routes/financial_data.py`
**Estado:** Todas las 7 instancias de `company_id = 1` eliminadas y reemplazadas por `_get_company_id(current_user)`

#### ✅ 3. JWT - CORREGIDO
**Archivo:** `auth/jwt_handler.py:36-37`
**Estado:** JWT ahora incluye `company_id` en payload

#### ✅ 4. Modelos ORM - CORREGIDO
**Archivo:** `models/production.py`
**Estado:** Todos los modelos tienen `company_id` + FK a companies

#### ✅ 5. Foreign Keys - CORREGIDO
**Estado:** 10/10 tablas con FK implementadas vía `003_multitenant_phase1.sql`

### Resumen de Exposición ACTUALIZADO

| Componente | Estado Anterior | Estado Actual | Mejora |
|------------|-----------------|---------------|--------|
| **Módulo Producción** | 🔴 0% protegido | ✅ 100% aislado | +100% |
| **Módulo Financiero** | 🔴 Hardcoded | ✅ 100% aislado | +100% |
| **Autenticación** | 🔴 Sin tenant | ✅ JWT con company_id | +100% |
| **Base de Datos** | 🔴 14% con FK | ✅ 100% con FK | +86% |

**Conclusión:** ✅ Sistema AHORA ES multi-tenant seguro. Requiere Fase 3 (rutas legacy + storage/caches) para producción.

---

## 1. Resumen Ejecutivo

**Situación actual (Nov 2025):**
- ✅ Arquitectura multitenant implementada (Shared DB + ContextVars)
- ✅ 100% de tablas críticas con `company_id` + FK
- ✅ 80% de endpoints con aislamiento de tenant
- ⚠️ Falta: Tests, Super Admin, fixes críticos

**Progreso desde análisis inicial:**
- Base de datos: 8% → 100% con FK (+92%)
- Aplicación: 0% → 80% con tenant context (+80%)
- JWT: Sin company_id → Con company_id (✅)
- Aislamiento: Data leakage activo → Resuelto (✅)

**Impacto de negocio:** El sistema NO puede operar como SaaS multi-empresa de forma segura hasta corregir:
1. 5 tablas de producción sin `company_id` (data leakage activo)
2. 6 tablas sin FK (integridad rota)
3. JWT sin `company_id` (autenticación débil)
4. 7 endpoints con company_id hardcoded (solo funciona para empresa 1)

**Plan de acción:** Priorizar arreglos de seguridad (Fase 0-1-2) en **3-5 días** antes de cualquier desarrollo nuevo. Reutilizaremos la base compartida actual porque es económicamente viable, pero con enforcement estricto de aislamiento.

---

## 2. Estado Actual (Noviembre 2025) - DATOS VERIFICADOS

### 2.1 Base de Datos

**⚠️ ESTADO CRÍTICO DE SEGURIDAD - VERIFICADO EN CÓDIGO**

| Indicador | Valor Real | Riesgo |
|-----------|------------|--------|
| Tablas totales | 32 | - |
| Tablas críticas analizadas | 12 | - |
| Tablas con `company_id` | 7/12 (58%) | 🔴 **CRÍTICO** |
| Tablas con FK a `companies` | 1/7 (14%) | 🔴 **CRÍTICO - Data integrity ROTA** |
| Tablas producción SIN `company_id` | 5 (cotizaciones, productos, pagos, plan, scenarios) | 🔴 **DATA LEAKAGE ACTIVO** |
| Vistas sin filtrar tenant | `v_financial_summary`, `v_production_summary`, `v_sales_summary` | 🔴 |
| Caches con tenant | `sales_kpis_cache` tiene columna pero sin FK | ⚠️ |

**Desglose por Tabla (Verificado):**

| Tabla | company_id | FK a companies | Estado |
|-------|------------|----------------|--------|
| ✅ `financial_data` | ✅ SÍ | ✅ **SÍ** | Única tabla correcta |
| ✅ `users` | ✅ SÍ | ✅ **SÍ** | FK con `ON DELETE RESTRICT` (003_multitenant_phase1.sql) |
| ✅ `sales_transactions` | ✅ SÍ | ✅ **SÍ** | FK + índices combinados por `company_id` |
| ✅ `balance_data` | ✅ SÍ | ✅ **SÍ** | FK y cascada restringida |
| ✅ `raw_account_data` | ✅ SÍ | ✅ **SÍ** | FK asegurada |
| ✅ `sales_alerts` | ✅ SÍ | ✅ **SÍ** | FK + auditoría |
| ✅ `sales_kpis_cache` | ✅ SÍ | ✅ **SÍ** | FK aplicada (tanto cache como saved filters) |
| ✅ `cotizaciones` | ✅ SÍ | ✅ **SÍ** | **DATA LEAKAGE CERRADO** |
| ✅ `productos` | ✅ SÍ | ✅ **SÍ** | **DATA LEAKAGE CERRADO** |
| ✅ `pagos` | ✅ SÍ | ✅ **SÍ** | **DATA LEAKAGE CERRADO** |
| ✅ `plan_diario_produccion` | ✅ SÍ | ✅ **SÍ** | **DATA LEAKAGE CERRADO** |
| ✅ `financial_scenarios` | ✅ SÍ | ✅ **SÍ** | FK + Company relationship |

### 2.2 Capa de Aplicación (FastAPI / SQLAlchemy) - VERIFICADO

**Estado de Rutas por Módulo:**

| Módulo/Ruta | Archivo | Estado Filtrado | Situación actual |
|-------------|---------|-----------------|------------------|
| 🟢 **Production Status** | `routes/production_status.py` | **100%** | `_get_company_id` + TenantContext en todas las queries y escrituras |
| 🟢 **Financial Data** | `routes/financial_data.py` | **100%** | Todos los endpoints usan `_resolve_company_id` (adiós `company_id = 1`) |
| ⚠️ **Sales BI** | `routes/sales_bi_api.py` | **~80%** | Dashboard/refactor listo; falta cubrir caches, exports y endpoints legacy |
| ⚠️ **Balance Data** | `routes/balance_data_api.py` | **~80%** | Endpoints principales listos; restan utilitarios/exports |
| 🟢 **Users/Admin** | `routes/users.py`, `routes/superadmin.py` | **100%** | Users filtra todas las operaciones por tenant; superadmin usa `require_superuser()` correctamente |
| 🔄 **Financial Scenarios** | `routes/financial_scenarios.py` | **En progreso** | Modelos con `company_id` listos, falta revisión de endpoints y jobs |

**Componentes Actuales:**
- ✅ `TenantContext` (ContextVar) + middleware global (`auth/tenant_context.py`)
- ✅ Dependencias `require_tenant`/`_get_company_id` en módulos críticos
- ✅ JWT incluye `company_id` y valida `company.is_active`/suscripción
- ⚠️ Falta `TenantScoped` mixin + listeners automáticos (fase futura)
- ⚠️ Falta enforcement automático en ORM; hoy se filtra manualmente (Prioridad 1)

### 2.3 RBAC / Autenticación - VERIFICADO

**Estado de Componentes:**

| Componente | Estado | Archivo | Problema |
|------------|--------|---------|----------|
| ✅ RBAC básico | Funcional | `models/user.py`, `models/role.py` | OK |
| ✅ Company ORM | Completo | `models/company.py` | Campos SaaS + helpers `is_subscription_active` |
| 🟢 JWT | Completo | `auth/jwt_handler.py:13-42` | Incluye `company_id`, exp, iat |
| 🟢 User-Company relationship | Completo | `models/user.py` | `relationship('Company', back_populates='users')` |
| ❌ Policy Engine | No existe | - | Falta ABAC |
| ❌ role_permission_overrides | No existe | - | No hay personalización por empresa |
| ❌ Permisos temporales | No existe | - | No hay `valid_from`/`valid_until` |
| ⚠️ Sessions con company_id | No se usa | `models/session.py` | Tabla existe pero se requiere validación extra en logout/login |

**Hallazgos Críticos:**
```python
# auth/jwt_handler.py - ACTUAL (INSEGURO)
payload = {
    "user_id": user_id,
    "username": username,
    "email": email,
    "permissions": permissions or [],
    # ❌ FALTA: "company_id": company_id
}

# models/user.py - ACTUAL (INCOMPLETO)
class User(Base):
    company_id = Column(Integer, default=1, nullable=True, index=True)
    # ❌ NO HAY: company = relationship('Company', back_populates='users')
```

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

## 10. Roadmap de Despliegue - PRIORIZADO POR SEGURIDAD

### ⏱️ Timeline General
- **🔴 URGENTE (Fases 0-2):** 3-5 días - Arreglar data leakage activo
- **🟡 Importante (Fases 3-4):** 5-7 días - Completar multitenant
- **🟢 Mejoras (Fases 5-6):** 3-5 días - ABAC, QA, observabilidad

**Total estimado:** 11-17 días (~52-68 horas)

---

### 🔴 FASE 0: Preparación y Backup (4 horas) - DÍA 1
**Prioridad:** CRÍTICA - No tocar DB sin esto

| Tarea | Tiempo | Entregable |
|-------|--------|-----------|
| Backup completo DB local | 30 min | `backup_pre_multitenant_YYYYMMDD.sql` |
| Script validación pre-migración | 1h | `scripts/validate_pre_migration.py` |
| Verificar datos actuales | 1h | Reporte de company_id inválidos |
| Crear empresa por defecto | 30 min | `INSERT INTO companies (id=1)` |
| Documentar decisiones de mapeo | 1h | `MIGRATION_DECISIONS.md` |

**Criterio de éxito:** Backup existe y se puede restaurar en <5 min.

---

### 🔴 FASE 1: Esquema & Backfill (8 horas) - DÍA 1-2
**Prioridad:** CRÍTICA - Arregla data leakage

| Tarea | Tiempo | Archivo/Script |
|-------|--------|---------------|
| **1.1** Extender `companies` con campos SaaS | 30 min | `migrations/001_extend_companies.sql` |
| **1.2** Agregar `company_id` a 5 tablas producción | 1h | `migrations/002_add_company_id_production.sql` |
| **1.3** Backfill con company_id=1 | 1h | `migrations/003_backfill_company_id.sql` |
| **1.4** Agregar FKs a 6 tablas existentes | 2h | `migrations/004_add_foreign_keys.sql` |
| **1.5** Crear 15+ índices compuestos | 1.5h | `migrations/005_create_indexes.sql` |
| **1.6** Validar integridad | 1h | `scripts/validate_post_migration.py` |
| **1.7** Actualizar modelos ORM | 1h | `models/production.py`, `models/company.py` |

**Criterio de éxito:**
- ✅ Todas las tablas críticas tienen `company_id` NOT NULL
- ✅ Todas tienen FK a `companies`
- ✅ Validación pasa sin errores

---

### 🔴 FASE 2: Tenant Context & Endpoints Críticos (8 horas) - DÍA 2-3
**Prioridad:** CRÍTICA - Evita queries globales

| Tarea | Tiempo | Archivo |
|-------|--------|---------|
| **2.1** Implementar `TenantContext` | 1h | `auth/tenant_context.py` |
| **2.2** Crear `require_tenant` dependency | 1h | `auth/dependencies.py` |
| **2.3** Actualizar JWT con `company_id` | 2h | `auth/jwt_handler.py` + tests |
| **2.4** Arreglar Production Status (20 queries) | 2h | `routes/production_status.py` |
| **2.5** Quitar hardcode Financial Data (7 lugares) | 1h | `routes/financial_data.py` |
| **2.6** Middleware global de tenant | 1h | `main.py` |

**Criterio de éxito:**
- ✅ JWT incluye `company_id`
- ✅ Production Status NO retorna datos de otras empresas
- ✅ Financial Data NO usa company_id=1 hardcoded

---

### ✅ FASE 3: Rutas Restantes (8 horas) - COMPLETADA
**Prioridad:** ALTA - Completar coverage

| Tarea | Tiempo | Archivo | Estado |
|-------|--------|---------|--------|
| **3.1** | Sales BI (~15 queries pendientes) | 3h | `routes/sales_bi_api.py` | ✅ |
| **3.2** | Users (filtrar listados) | 1h | `routes/users.py` | ✅ |
| **3.3** | Balance (arreglar queries restantes) | 2h | `routes/balance_data_api.py` | ✅ |
| **3.4** | Vistas SQL | 1h | `database/init/02-create-views.sql` | ✅ |
| **3.5** | Caches (sales_kpis, saved_filters) | 1h | `models/sales.py` | ✅ |

**Criterio de éxito:**
- ✅ 100% de endpoints filtran por tenant
- ✅ Vistas SQL incluyen `company_id`

> ✅ (2025-11-15) **3.6 Legacy Financial API:** `api_financial_data.py` ahora reutiliza `_get_company_id` + TenantContext para CSV uploads, consultas y producción heredada. Las rutas legacy incluidas en `api_rbac_minimal.py` ya respetan el aislamiento de tenants.

---

### ✅ FASE 4: Storage & Validación (4 horas) - COMPLETADA
**Prioridad:** ALTA

| Tarea | Tiempo | Archivo / Acción | Estado |
|-------|--------|------------------|--------|
| **4.1** FileService segregado | 1.5h | `utils/file_storage.py` con sanitización, métodos `save/read/exists/delete/list`, integraciones en `routes/production_status.py`. | ✅ |
| **4.2** Migración & verificación de uploads | 1h | `scripts/migrate_files_by_tenant.py` (`--dry-run` + migración), wrapper `.sh`, verificador `scripts/verify_uploads.py`. | ✅ (sin legacy por mover) |
| **4.3** Automatizar QA/CI | 1.5h | `.github/workflows/multitenant-tests.yml` ejecuta `tests/test_tenant_isolation.py` (9/9) + `tests/test_file_storage.py`, coverage y escaneo Trivy. | ✅ |

**Criterio de éxito:** Cumplido. Archivos nuevos usan `/uploads/company_{id}/namespace/`, scripts disponibles para regularizar data existente, y la suite multitenant + storage se ejecuta en CI con reporte de cobertura (Codecov) y escaneo de seguridad (Trivy → SARIF). 

---

### 🟢 FASE 5: RBAC Avanzado (16 horas) - DÍA 5-7
**Prioridad:** MEDIA - Mejoras

| Tarea | Tiempo | Archivo | Estado |
|-------|--------|---------|--------|
| **5.1** Company-User relationships | 2h | `models/company.py`, `models/user.py` | ✅ |
| **5.2** RolePermissionOverride | 3h | `models/rbac_overrides.py` | ✅ |
| **5.3** Policy Engine básico | 4h | `auth/policy_engine.py` | ✅ |
| **5.4** Permisos temporales | 2h | `models/rbac_overrides.py` | ✅ |
| **5.5** Sessions con company_id | 1h | `models/session.py`, `models/audit.py` | ✅ |
| **5.6** Tests RBAC | 4h | `tests/test_rbac_policy_engine.py` | ✅ (unitarios SQLite) |
| **5.7** Migración SQL a MySQL | 2h | `schema/migrations/004_rbac_multitenant_phase5.sql` | ⚠️ Pendiente de ejecutar en MySQL/Cloud SQL |

**Recomendaciones de escalabilidad y tolerancia a fallos (pre-Fase 5):**
- Implementar listeners SQLAlchemy que auto-inyecten `company_id` en modelos `TenantScoped` para reducir errores humanos.
- Añadir cuotas por tenant (storage, max_users, requests) con alertas Prometheus/Cloud Monitoring y endpoints de auditoría.
- Configurar retención/versionado en `/uploads` (por ejemplo, snapshots diarios en Cloud Storage) para recuperación ante desastres.
- Integrar `FileStorageService` en módulos restantes (balance exports, financial uploads) y registrar metadatos en `data_audit_log`.

> **Nota de despliegue:** Ejecutar `schema/migrations/004_rbac_multitenant_phase5.sql` en la instancia MySQL antes de promover a Cloud. Ejemplo:
> `mysql -h <HOST> -u <USER> -p artyco_financial_rbac < schema/migrations/004_rbac_multitenant_phase5.sql`

---

### 🟢 FASE 6: QA & Deploy (8 horas) - DÍA 8
**Prioridad:** MEDIA

| Tarea | Tiempo | Archivo |
|-------|--------|---------|
| **6.1** Testing con 2+ empresas ficticias | 3h | Manual + automated |
| **6.2** Script validación automatizada | 2h | `scripts/validate_multitenant.sh` |
| **6.3** CI/CD integration | 1h | `.github/workflows/multitenant.yml` |
| **6.4** Aplicar a Cloud SQL | 1h | Ejecutar migraciones en prod |
| **6.5** Documentación | 1h | Actualizar README, CHANGELOG |

---

### 📊 Resumen por Prioridad

| Nivel | Fases | Días | Horas | % Crítico |
|-------|-------|------|-------|-----------|
| 🔴 URGENTE | 0-2 | 3-5 | 20h | **Data leakage resuelto** |
| 🟡 IMPORTANTE | 3-4 | 3-4 | 12h | Multitenant completo |
| 🟢 MEJORAS | 5-6 | 5-8 | 24h | ABAC, QA, observabilidad |
| **TOTAL** | 0-6 | **11-17** | **56h** | Sistema seguro |

**Recomendación:** Ejecutar Fases 0-2 INMEDIATAMENTE (esta semana), luego evaluar antes de Fase 3+.

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

## 12. Próximos Pasos Inmediatos - ACCIÓN URGENTE

### 🚨 ESTA SEMANA (Días 1-3): Resolver Data Leakage

**Lunes (Fase 0 - 4h):**
1. ✅ **Backup DB:** `mysqldump --all-databases > backup_pre_multitenant_$(date +%Y%m%d).sql`
2. ✅ **Verificar datos:**
   ```sql
   SELECT 'cotizaciones', COUNT(*) FROM cotizaciones;
   SELECT 'productos', COUNT(*) FROM productos;
   SELECT 'pagos', COUNT(*) FROM pagos;
   ```
3. ✅ **Crear empresa default:** `INSERT INTO companies (id, name, slug) VALUES (1, 'Default', 'default');`

**Martes (Fase 1 - 8h):**
1. ✅ Ejecutar `migrations/001_extend_companies.sql`
2. ✅ Ejecutar `migrations/002_add_company_id_production.sql`
3. ✅ Ejecutar `migrations/003_backfill_company_id.sql`
4. ✅ Ejecutar `migrations/004_add_foreign_keys.sql`
5. ✅ Ejecutar `migrations/005_create_indexes.sql`
6. ✅ Validar con `scripts/validate_post_migration.py`

**Miércoles (Fase 2 - 8h):**
1. ✅ Crear `auth/tenant_context.py`
2. ✅ Actualizar `auth/jwt_handler.py` - agregar `company_id` al payload
3. ✅ Arreglar `routes/production_status.py` - filtrar todas las queries
4. ✅ Arreglar `routes/financial_data.py` - quitar 7 hardcodes de `company_id = 1`
5. ✅ Testing manual con 2 empresas

### 📋 Checklist de Validación Post-Fase 2

- [ ] **DB:** Todas las tablas críticas tienen `company_id` NOT NULL con FK
- [ ] **JWT:** Token incluye `company_id` en payload
- [ ] **Production:** Endpoint `/production/dashboard` NO muestra datos de otras empresas
- [ ] **Financial:** Endpoint `/financial/upload` usa `current_user.company_id`
- [ ] **Tests:** Usuario empresa A NO ve datos de empresa B

### 🎯 Siguiente Sprint (Días 4-8): Completar Multitenant

**Solo después de validar Fases 0-2:**
- Ejecutar Fases 3-4 (rutas restantes + storage)
- Testing exhaustivo con múltiples empresas
- Aplicar a Cloud SQL

---

## 13. Conclusión

### Estado Actual Verificado
- 🔴 **Data leakage ACTIVO** en módulo de producción
- 🔴 **Solo empresa 1 funcional** en módulo financiero
- 🔴 **JWT sin tenant context** - vulnerabilidad de autenticación
- 🔴 **86% de tablas sin FK** - integridad rota

### Plan de Remediación
- ✅ **Fases 0-2 (URGENTES):** 20 horas - Resuelven todos los problemas críticos
- ⚠️ **Fases 3-4:** 12 horas - Completan coverage al 100%
- 🟢 **Fases 5-6:** 24 horas - Mejoras ABAC y QA

### Compromiso de Seguridad
**NO desarrollar features nuevas hasta completar Fases 0-2.**

Todo el stack (BD, API, storage, RBAC) quedará alineado con un modelo multitenant robusto, verificable y listo para escalar a cientos de empresas sin comprometer datos.

**Ejecuta las fases en orden estricto; cada paso construye sobre el anterior y valida el anterior.**
