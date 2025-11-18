# Plan de Implementación Super Admin (nivel de detalle estilo MULTITENANT_IMPLEMENTATION_PLAN)

**Última actualización:** 2025-11-17
**Estado:** Fases 0-1 ✅ completadas; Fase 2 🔄 en progreso; Fases 3-5 pendientes
**Calificación actual:** 7.5/10 ⭐⭐⭐⭐⭐⭐⭐☆☆☆
**Objetivo:** Construir y endurecer el módulo de Super Admin para gestión cross-tenant con UX usable, aislamiento y bases para multi-empresa por usuario y controles avanzados.

---

## Contexto y Principios

- **Seguridad:** Todas las rutas superadmin protegidas con `require_superuser()`. JWT incluye `company_id`; `/auth/me` expone `company_id/company_name` para el front.
- **Aislamiento:** DB compartida con `company_id` + FK; ContextVar para tenant en backend. Evitar filtrado incorrecto y caches sin namespace.
- **Evolución incremental:** cambios pequeños, con pruebas (suite `tests/test_tenant_isolation.py` y flujo UI) para no romper.
- **Fallback seguro:** Si falta empresa en sesión, bloquear acciones sensibles y usar branding de plataforma (Teseo X) solo como fallback.

---

## Fases y Estado

### Fase 0 — Infra y endpoints base (**✅ completado**)
- `/auth/me` retorna `company_id` y `company_name` (backend principal y minimal).
- Router superadmin cargado y protegido (`require_superuser`).
- Endpoints disponibles: listar/crear/activar/desactivar compañías; listar/crear usuarios cross-tenant; mover usuario de empresa; métricas overview.
- Integridad: tablas críticas con `company_id` + FK (según plan multitenant).

### Fase 1 — UX básica usable (**✅ completado**)
- UI superadmin con formularios inline para crear/editar compañías (nombre, tier, max_users, industria).
- Listas con búsqueda y toggle de estado (activar/desactivar empresa).
- UI superadmin crea/edita usuarios (empresa, credenciales, rol superuser) y activa/desactiva.
- Feedback visible de éxito/error y refresco de métricas.
- Branding dinámico por empresa en la UI (confirmación de tenant).
**Pendiente dentro de Fase 1:** (n/a) consolidado en Fase 2.

### Fase 2 — Operaciones esenciales de gestión (**🔄 en progreso**)
✔ Edición de usuario (email/username/pass/nombres/superuser) + activar/desactivar desde UI
✔ Cambio de empresa al editar usuario (usa endpoint `/superadmin/users/{id}/change-company`)
✔ Filtro por empresa en listado de usuarios
✔ Formulario de compañías reutilizado para crear/editar con feedback
✔ Asignación manual de roles en UI Super Admin (selección múltiple; backend `POST /api/superadmin/users/{id}/roles`; listado muestra roles)

**Pendientes de Fase 2:**
- Validación de formularios en tiempo real (nombres/slugs/emails)
- Confirmaciones modales para acciones destructivas (desactivar empresa/usuario)
- Acción dedicada de reset password (botón separado, no mezclado con edición completa)
- Modal de edición de empresa (mejor UX que formulario inline)
- Paginación con controles prev/next (actualmente límites hardcodeados a 100/200)
- Rate limiting en endpoints superadmin (max 100 req/min por usuario)
- Validación server-side de slugs (solo [a-z0-9-])

### Fase 3 — Aislamiento de datos en cliente (**🔴 CRÍTICO - pendiente**)

**Problema identificado:** 20+ archivos usan `localStorage.setItem/getItem` sin namespace por `company_id`
- **Riesgo:** Leak de datos entre empresas si un usuario cambia de tenant
- **Archivos afectados:** `api.ts`, `Login.tsx`, `tenantBrand.ts`, storage utilities, dashboards

**Tareas:**
1. Crear utility `TenantStorage` con auto-prefixing por `company_id`
2. Reemplazar `localStorage` → `TenantStorage` en 20 archivos
3. Implementar `TenantStorage.switchTenant()` que limpia storage anterior
4. Migrar keys existentes con script de transformación
5. Testing con 2 empresas en mismo navegador

**Código base propuesto:**
```typescript
// src/utils/tenantStorage.ts
export class TenantStorage {
  private static getPrefix(): string {
    const user = JSON.parse(localStorage.getItem('artyco-user') || '{}');
    return `artyco-c${user.company_id || 'default'}-`;
  }

  static setItem(key: string, value: string): void {
    localStorage.setItem(this.getPrefix() + key, value);
  }

  static getItem(key: string): string | null {
    return localStorage.getItem(this.getPrefix() + key);
  }

  static clearTenant(companyId: number): void {
    const prefix = `artyco-c${companyId}-`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}
```

**Tiempo estimado:** 4-6 horas

### Fase 4 — Selector multi-empresa por usuario (**🟡 BLOQUEANTE para escalabilidad**)

**Limitación actual:** Modelo 1:1 User↔Company (un usuario = una empresa)
- ❌ Consultores externos que trabajan para múltiples clientes
- ❌ Empleados de holding que acceden a subsidiarias
- ❌ Usuarios de soporte multi-empresa

**Solución propuesta - Opción A (RECOMENDADO para SaaS):**

1. **Nueva tabla relacional:**
```sql
CREATE TABLE user_companies (
  user_id INT NOT NULL,
  company_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  role_id INT NULL,  -- rol específico por empresa
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, company_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

2. **JWT extendido:**
```python
payload = {
  "user_id": user_id,
  "username": username,
  "company_ids": [1, 2, 5],  # lista de empresas accesibles
  "current_company_id": 1,   # empresa activa en esta sesión
  ...
}
```

3. **Endpoint para switch:**
```python
@router.post("/auth/switch-company")
async def switch_company(new_company_id: int, user: User = Depends(get_current_user)):
    # Verificar acceso, generar nuevo token con current_company_id actualizado
```

4. **UI - Selector de empresa:**
```typescript
<select value={currentCompanyId} onChange={handleSwitchCompany}>
  {userCompanies.map(c => <option value={c.id}>{c.name}</option>)}
</select>
```

**Opción B (SIMPLE - solo super admin cross-tenant):**
- Mantener modelo 1:1 actual
- Super admins pueden actuar sobre cualquier empresa (ya implementado)
- Para casos edge, crear usuarios duplicados por empresa

**Recomendación:** Opción A si target es SaaS multi-empresa; Opción B si es herramienta interna

**Tiempo estimado Opción A:** 12-16 horas (migración + endpoints + frontend + testing)

### Fase 5 — Controles avanzados y observabilidad (**✅ Código listo / ⚠️ Migración + UI pendientes**)

**Estado actual:**
- ✅ Modelos `RolePermissionOverride` y `UserRoleOverride` implementados en `models/rbac_overrides.py`
- ✅ `PolicyEngine` con evaluación en cascada: base → role overrides → user overrides
- ✅ Soporte para permisos temporales (`valid_from`/`valid_until` con `is_currently_valid()`)
- ✅ Migración SQL `004_rbac_multitenant_phase5.sql` idempotente
- ✅ Tests unitarios en `tests/test_rbac_policy_engine.py`
- ⚠️ **PENDIENTE:** Ejecutar migración en MySQL/Cloud SQL
- ❌ **PENDIENTE:** UI para gestionar overrides (crear/ver/revocar permisos temporales)
- ❌ **PENDIENTE:** Dashboard de auditoría con filtros avanzados

**Tareas de completado:**

1. **Ejecutar migración SQL (30 min):**
```bash
# Local
mysql -u artyco_user -p artyco_financial_rbac < schema/migrations/004_rbac_multitenant_phase5.sql

# Cloud SQL
gcloud sql connect artyco-financial-db --user=artycofinancial
source /path/to/004_rbac_multitenant_phase5.sql
```

2. **Endpoint de auditoría avanzada:**
```python
@router.get("/audit-logs")
async def get_audit_logs(
    company_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0, limit: int = 100,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    # Filtrar audit_logs por parámetros y retornar paginado
```

3. **UI para RBAC Overrides:**
- Página para crear override temporal: "Dar permission X a role Y en empresa Z por N días"
- Listado de overrides activos con countdown de expiración
- Botón de revocación anticipada

4. **Sistema de Quotas (INNOVACIÓN):**
```python
# models/company.py
max_storage_mb = Column(Integer, default=1000)
current_storage_mb = Column(Integer, default=0)
max_api_requests_per_day = Column(Integer, default=10000)

def is_quota_exceeded(self, quota_type: str) -> bool:
    # Validar límites de storage, users, requests
```

5. **Theming/Branding por Tenant:**
```python
# models/company.py
logo_url = Column(String(500))
primary_color = Column(String(7), default="#00ff9f")
accent_color = Column(String(7), default="#7b2cbf")
custom_domain = Column(String(255), unique=True)
```

**Innovaciones adicionales sugeridas:**
- **Impersonación segura:** Super admin puede "hacerse pasar" por usuario con audit trail
- **Alertas de overrides expirando:** Notificar 24h antes de vencimiento
- **Cache de permisos evaluados:** LRU cache para evitar queries repetidas
- **Retención de auditoría:** Cronjob que archiva logs >90 días

**Tiempo estimado completo:** 8-12 horas (migración + endpoints + UI + testing)

---

## Checklists por fase

- **F0:** `/auth/me` con empresa; superadmin router protegido; endpoints CRUD compañías/usuarios y métricas; FK + `company_id` en tablas.
- **F1:** Formularios de crear/editar compañías y usuarios; toggles de estado; feedback en UI; branding dinámico. (Hecho, salvo mejoras UX inline).
- **F2:** Edición avanzada empresa/usuario (incl. mover usuario), paginación/filtros, confirmaciones.
- **F3:** Namespacing y limpieza de storage por tenant.
- **F4:** Modelo multi-empresa y selector de tenant en login; caches aisladas.
- **F5:** Auditoría en UI; alertas/quotas; overrides avanzados; theming por tenant.

---

## Alcance actual (estado real)

- **Backend (9/10):**
  - ✅ Endpoints CRUD completos para companies y users (`routes/superadmin.py`)
  - ✅ Protección con `require_superuser()` en todos los endpoints
  - ✅ Locks pesimistas para evitar race conditions en `max_users`
  - ✅ Auditoría completa con `AuditLog.log_action()` en todas las operaciones
  - ✅ Policy Engine con overrides (código completo, migración pendiente)
  - ⚠️ Falta rate limiting en endpoints superadmin

- **Frontend (7/10):**
  - ✅ UI completa con vistas Overview/Companies/Users (`SuperAdminDashboard.tsx`)
  - ✅ Formularios inline para crear/editar companies y users
  - ✅ Filtrado por empresa en listado de usuarios
  - ✅ Feedback visual con estados de carga y mensajes
  - ⚠️ Falta validación de formularios en tiempo real
  - ⚠️ Falta confirmaciones modales para acciones destructivas
  - ⚠️ Paginación hardcodeada (límites fijos 100/200)
  - ⚠️ Reset password mezclado con edición completa de usuario

- **Seguridad (7/10):**
  - ✅ JWT incluye `company_id` y valida subscripción activa
  - ✅ TenantContext aísla datos en backend
  - 🔴 **CRÍTICO:** localStorage sin namespace por tenant (20+ archivos)
  - ⚠️ Sin 2FA para super admins
  - ⚠️ Validación de slugs incompleta (acepta caracteres inválidos)

- **Escalabilidad (6/10):**
  - 🟡 Modelo 1:1 User↔Company limita multi-empresa por usuario
  - ⚠️ Sin paginación real (todos los registros en memoria)
  - ⚠️ Auditoría sin retención/archivado (tabla crece indefinidamente)

**Riesgos principales:**
1. **localStorage leak** entre tenants → Fase 3 URGENTE
2. **Modelo 1:1** bloquea escalabilidad → Fase 4 si target es SaaS
3. **Migración Fase 5** no ejecutada → 30 min para resolver

---

## Próximos pasos propuestos (ROADMAP REVISADO)

### 🔴 Sprint 1 - URGENTE (Semana 1)

**Prioridad:** Completar funcionalidad básica y resolver riesgos críticos

1. **Completar Fase 2 (8h):**
   - Validación de formularios en tiempo real (2h)
   - Confirmaciones modales para acciones destructivas (1h)
   - Reset password como acción independiente (1h)
   - Paginación con controles prev/next (2h)
   - Modal de edición de empresa (mejor UX) (2h)

2. **Fase 3 - localStorage namespace (4-6h):**
   - Crear `TenantStorage` utility
   - Reemplazar en 20 archivos
   - Script de migración de keys existentes
   - Testing con 2 empresas

3. **Fase 5 - Ejecutar migración SQL (30 min):**
   - Backup de base de datos
   - Ejecutar `004_rbac_multitenant_phase5.sql`
   - Verificar tablas y FKs creadas

4. **Testing exhaustivo (4h):**
   - Crear 2 empresas de prueba
   - Validar aislamiento de datos
   - Testing de formularios y validaciones
   - Verificar localStorage namespace

**Resultado esperado:** Sistema funcional, seguro y sin riesgos críticos

---

### 🟡 Sprint 2 - IMPORTANTE (Semana 2)

**Prioridad:** Observabilidad y controles avanzados

1. **Sistema de Quotas (6h):**
   - Agregar campos a `Company` (max_storage_mb, max_api_requests)
   - Endpoint para tracking de uso
   - Dashboard de quotas en SuperAdmin UI
   - Alertas cuando se acerca al límite

2. **Dashboard de Auditoría (4h):**
   - Endpoint `/superadmin/audit-logs` con filtros
   - UI con búsqueda por empresa/usuario/acción/fecha
   - Export de logs a CSV
   - Paginación y sorting

3. **Rate Limiting (2h):**
   - Middleware de throttling por usuario
   - Límite 100 req/min en endpoints superadmin
   - Header `X-RateLimit-Remaining` en respuestas

4. **Mejoras de seguridad (4h):**
   - Validación estricta de slugs (solo [a-z0-9-])
   - Policy de passwords para super admins (min 12 chars)
   - Considerar 2FA opcional para is_superuser

**Resultado esperado:** Sistema observable y con controles de seguridad reforzados

---

### 🟢 Sprint 3 - OPCIONAL (Semanas 3-4)

**Prioridad:** Escalabilidad y funciones avanzadas (solo si requerido por negocio)

1. **Fase 4 - Multi-empresa por usuario (12-16h):**
   - Tabla `user_companies` (many-to-many)
   - JWT con `company_ids[]` y `current_company_id`
   - Endpoint `/auth/switch-company`
   - UI con selector de empresa
   - Migración de datos existentes

2. **UI para RBAC Overrides (6h):**
   - Página para crear permisos temporales
   - Listado de overrides activos con countdown
   - Botón de revocación anticipada
   - Alertas de overrides expirando

3. **Impersonación segura (4h):**
   - Endpoint `/superadmin/impersonate/{user_id}`
   - JWT con flag `impersonated_by`
   - Banner de advertencia en UI
   - Botón "Stop Impersonation"

4. **Theming/Branding avanzado (4h):**
   - Upload de logo por empresa
   - Selector de colores primary/accent
   - Custom domain por tenant
   - Aplicar branding dinámico en CSS

**Resultado esperado:** Sistema enterprise-ready con máxima flexibilidad

---

### 📊 Checklist de Validación Pre-Producción

**Funcionalidad:**
- [ ] Super admin puede crear/editar/desactivar empresas
- [ ] Super admin puede crear/editar/mover usuarios entre empresas
- [ ] Formularios validan campos en tiempo real
- [ ] Acciones destructivas piden confirmación
- [ ] Paginación funciona correctamente
- [ ] Filtros por empresa funcionan

**Seguridad:**
- [ ] localStorage usa namespace por tenant
- [ ] Usuario de empresa A NO ve datos de empresa B
- [ ] Todos los endpoints superadmin protegidos con `require_superuser()`
- [ ] Race condition de max_users mitigada (locks)
- [ ] Auditoría registra todas las acciones sensibles
- [ ] Rate limiting activo en endpoints críticos

**Base de datos:**
- [ ] Migración 004 ejecutada correctamente
- [ ] Tablas `role_permission_overrides` y `user_role_overrides` existen
- [ ] FKs e índices creados
- [ ] Policy Engine funciona con overrides

**Testing:**
- [ ] 2+ empresas creadas para testing
- [ ] Usuarios de diferentes empresas aislados
- [ ] Switch de empresa limpia localStorage anterior
- [ ] Permisos temporales expiran correctamente
- [ ] Formularios rechazan inputs inválidos

**Documentación:**
- [ ] README actualizado con sección Super Admin
- [ ] Endpoints documentados en OpenAPI/Swagger
- [ ] Guía de uso para super admins creada
- [ ] Changelog actualizado con cambios Fase 0-5
