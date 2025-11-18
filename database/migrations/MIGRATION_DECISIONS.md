# Decisiones de Migración Multitenant

**Fecha**: 2025-11-14
**Fase**: 0 - Preparación
**Estado**: Documentado ✅

---

## 📋 Resumen Ejecutivo

Este documento registra las decisiones técnicas para la migración de la base de datos actual (single-tenant implícito) a una arquitectura multitenant explícita con aislamiento por `company_id`.

**Validación Pre-Migración**: ✅ Completada
**Backup**: ✅ Completado (676KB, comprimido 116KB)
**Registros huérfanos**: ✅ Ninguno
**Empresa por defecto**: ✅ Existe (id=1)

---

## 🎯 Estrategia General

### Patrón Elegido
**Shared Database + company_id** (Discriminador por columna)

### Justificación
- ✅ Menor complejidad operacional
- ✅ Costo-efectivo para escala inicial
- ✅ Facilita reportes consolidados
- ✅ Backup/restore unificado
- ⚠️ Requiere disciplina en queries (mitigado con middleware)

### Alternativas Descartadas
- ❌ **Database per tenant**: Overhead operacional alto
- ❌ **Schema per tenant**: Complejidad en migraciones
- ✅ **Shared DB + company_id**: ELEGIDO

---

## 📊 Estado Actual de la Base de Datos

### Tablas Verificadas

| Tabla | company_id | FK | Registros | Estado |
|-------|------------|----|-----------| -------|
| **companies** | N/A | N/A | 1 | ✅ Parent table |
| **users** | ✅ | ❌ | 3 | ⚠️ Falta FK |
| **balance_data** | ✅ | ❌ | 99 | ⚠️ Falta FK |
| **financial_data** | ✅ | ✅ | 21 | ✅ Completo |
| **raw_account_data** | ✅ | ❌ | 1,639 | ⚠️ Falta FK |
| **sales_transactions** | ✅ | ❌ | 1,019 | ⚠️ Falta FK |
| **cotizaciones** | ❌ | ❌ | ? | ❌ Requiere columna |
| **productos** | ❌ | ❌ | ? | ❌ Requiere columna |
| **pagos** | ❌ | ❌ | ? | ❌ Requiere columna |
| **plan_diario_produccion** | ❌ | ❌ | ? | ❌ Requiere columna |
| **financial_scenarios** | ❌ | ❌ | ? | ❌ Requiere columna |

**Total registros verificados**: 2,781 (todos con company_id válido)

### Métricas
- Tablas con company_id: **5/10 (50%)**
- Tablas con FK: **1/5 (20%)**
- Registros huérfanos: **0**
- Integridad referencial: **100%** (en tablas con company_id)

---

## 🔧 Decisiones de Implementación

### 1. Tablas Sin company_id

**Tablas afectadas**: `cotizaciones`, `productos`, `pagos`, `plan_diario_produccion`, `financial_scenarios`

#### ✅ DECISIÓN 1.1: Agregar columna company_id

```sql
ALTER TABLE {table_name}
ADD COLUMN company_id INT NOT NULL DEFAULT 1
AFTER id;
```

**Justificación**:
- Todos los datos existentes pertenecen a la empresa actual (id=1)
- DEFAULT 1 permite inserción sin especificar company_id durante transición
- Se quitará DEFAULT después de actualizar la aplicación

#### ✅ DECISIÓN 1.2: Backfill a company_id=1

```sql
UPDATE {table_name}
SET company_id = 1
WHERE company_id IS NULL OR company_id = 0;
```

**Justificación**:
- Empresa id=1 ya existe en producción
- Todos los datos actuales pertenecen a esta empresa
- No hay ambigüedad en la asignación

**Tablas a procesar**:
1. `cotizaciones` → company_id = 1
2. `productos` → company_id = 1
3. `pagos` → company_id = 1
4. `plan_diario_produccion` → company_id = 1
5. `financial_scenarios` → company_id = 1

---

### 2. Foreign Keys Faltantes

**Tablas afectadas**: `users`, `balance_data`, `raw_account_data`, `sales_transactions`

#### ✅ DECISIÓN 2.1: Agregar FK con ON DELETE RESTRICT

```sql
ALTER TABLE {table_name}
ADD CONSTRAINT fk_{table_name}_company
FOREIGN KEY (company_id)
REFERENCES companies(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

**Justificación**:
- `ON DELETE RESTRICT`: Previene eliminar empresas con datos
- `ON UPDATE CASCADE`: Permite renumerar IDs si necesario
- Garantiza integridad referencial

**Tablas a procesar**:
1. `users`
2. `balance_data`
3. `raw_account_data`
4. `sales_transactions`

**IMPORTANTE**: Estas tablas YA tienen company_id, solo falta la FK.

---

### 3. Nuevas Tablas (Sin company_id)

#### ✅ DECISIÓN 3.1: Agregar columna + FK + DEFAULT

Para las 5 tablas que NO tienen company_id:

```sql
-- Paso 1: Agregar columna
ALTER TABLE {table_name}
ADD COLUMN company_id INT NOT NULL DEFAULT 1;

-- Paso 2: Backfill (opcional si hay DEFAULT)
UPDATE {table_name} SET company_id = 1 WHERE company_id IS NULL;

-- Paso 3: Agregar FK
ALTER TABLE {table_name}
ADD CONSTRAINT fk_{table_name}_company
FOREIGN KEY (company_id)
REFERENCES companies(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Paso 4: Crear índice
CREATE INDEX idx_{table_name}_company_id ON {table_name}(company_id);
```

**Orden de ejecución** (por dependencias):
1. `productos` (no tiene FK a otras tablas)
2. `cotizaciones` (puede referenciar productos)
3. `pagos` (referencia cotizaciones)
4. `plan_diario_produccion` (puede referenciar productos)
5. `financial_scenarios` (independiente)

---

### 4. Columnas SaaS en Tabla companies

**Columnas faltantes**: `slug`, `is_active`, `subscription_tier`, `subscription_expires_at`, `max_users`

#### ✅ DECISIÓN 4.1: Agregar columnas con valores por defecto

```sql
ALTER TABLE companies
ADD COLUMN slug VARCHAR(100) UNIQUE NOT NULL DEFAULT 'artyco',
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN subscription_tier ENUM('free', 'professional', 'enterprise') NOT NULL DEFAULT 'enterprise',
ADD COLUMN subscription_expires_at DATETIME NULL DEFAULT NULL,
ADD COLUMN max_users INT NULL DEFAULT NULL;
```

**Valores para empresa existente (id=1)**:

```sql
UPDATE companies
SET
    slug = 'artyco',
    is_active = TRUE,
    subscription_tier = 'enterprise',
    subscription_expires_at = NULL,  -- Sin límite
    max_users = NULL                  -- Ilimitado
WHERE id = 1;
```

**Justificación**:
- `slug = 'artyco'`: Identificador URL-friendly único
- `is_active = TRUE`: Empresa activa
- `subscription_tier = 'enterprise'`: Cliente actual tiene todas las features
- `subscription_expires_at = NULL`: Sin límite de tiempo
- `max_users = NULL`: Sin límite de usuarios

---

### 5. Índices de Rendimiento

#### ✅ DECISIÓN 5.1: Crear índices compuestos

**Principio**: Todas las queries deben filtrar por `company_id` PRIMERO

```sql
-- Índices simples en company_id
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_balance_data_company_id ON balance_data(company_id);
CREATE INDEX idx_financial_data_company_id ON financial_data(company_id);
CREATE INDEX idx_raw_account_data_company_id ON raw_account_data(company_id);
CREATE INDEX idx_sales_transactions_company_id ON sales_transactions(company_id);
CREATE INDEX idx_cotizaciones_company_id ON cotizaciones(company_id);
CREATE INDEX idx_productos_company_id ON productos(company_id);
CREATE INDEX idx_pagos_company_id ON pagos(company_id);
CREATE INDEX idx_plan_diario_produccion_company_id ON plan_diario_produccion(company_id);
CREATE INDEX idx_financial_scenarios_company_id ON financial_scenarios(company_id);
```

**Índices compuestos** (queries frecuentes):

```sql
-- Para queries de usuarios activos por empresa
CREATE INDEX idx_users_company_active ON users(company_id, is_active);

-- Para queries de transacciones por fecha
CREATE INDEX idx_sales_transactions_company_date
ON sales_transactions(company_id, transaction_date);

-- Para queries de producción por fecha
CREATE INDEX idx_plan_diario_produccion_company_fecha
ON plan_diario_produccion(company_id, fecha);
```

**Justificación**:
- Mejora performance de queries filtradas por tenant
- Previene full table scans
- Facilita JOIN optimizados

---

### 6. Constraints Adicionales

#### ✅ DECISIÓN 6.1: NOT NULL en company_id

```sql
ALTER TABLE {table_name}
MODIFY COLUMN company_id INT NOT NULL;
```

**Aplicar a TODAS las tablas** después del backfill.

**Justificación**:
- Garantiza que NINGÚN registro quede sin tenant
- Previene inserción accidental sin company_id
- Facilita detección temprana de errores

#### ✅ DECISIÓN 6.2: Unique Constraints con company_id

Para evitar duplicados cross-tenant:

```sql
-- Ejemplo: slug único POR empresa
ALTER TABLE products
ADD CONSTRAINT uk_products_company_slug
UNIQUE (company_id, slug);

-- Ejemplo: email único POR empresa
ALTER TABLE users
ADD CONSTRAINT uk_users_company_email
UNIQUE (company_id, email);
```

**Aplicar según lógica de negocio**.

---

## 🔒 Decisiones de Seguridad

### 1. Row-Level Security (RLS)

#### ⏭️ DECISIÓN FUTURA: Implementar RLS en MySQL 8.0+

**Nota**: MySQL no tiene RLS nativo como PostgreSQL.

**Alternativas**:
1. ✅ **Views con seguridad** (Fase 3)
2. ✅ **Middleware en aplicación** (Fase 2)
3. ⏭️ **Migración a PostgreSQL** (Fase 6 - opcional)

#### ✅ DECISIÓN 7.1: Views con filtro de tenant

```sql
CREATE OR REPLACE VIEW users_tenant_view AS
SELECT * FROM users
WHERE company_id = @tenant_id;
```

**Implementar en Fase 3**.

---

### 2. Tenant Context en Aplicación

#### ✅ DECISIÓN 8.1: Usar ContextVars en Python/FastAPI

```python
from contextvars import ContextVar

tenant_context: ContextVar[Optional[int]] = ContextVar('tenant_context', default=None)

def get_current_tenant_id() -> int:
    tenant_id = tenant_context.get()
    if tenant_id is None:
        raise ValueError("Tenant context not set")
    return tenant_id
```

**Implementar en Fase 2**.

#### ✅ DECISIÓN 8.2: JWT debe incluir company_id

```python
# ANTES (routes/auth.py)
payload = {
    "user_id": user.id,
    "username": user.username,
    "email": user.email,
    # ❌ FALTA company_id
}

# DESPUÉS (Fase 2)
payload = {
    "user_id": user.id,
    "username": user.username,
    "email": user.email,
    "company_id": user.company_id,  # ✅ AGREGADO
}
```

---

## 📝 Decisiones de Datos

### 1. Mapeo de Datos Existentes

#### ✅ DECISIÓN 9.1: Todos los datos → company_id = 1

**Tablas afectadas**: TODAS (10 tablas)

**Justificación**:
- Existe solo 1 empresa actualmente (id=1)
- Todos los datos históricos pertenecen a esta empresa
- No hay ambigüedad ni conflicto

**Implementación**:
```sql
-- Para tablas SIN company_id
UPDATE {table_name} SET company_id = 1;

-- Para tablas CON company_id (validación)
SELECT COUNT(*) FROM {table_name} WHERE company_id != 1;
-- Resultado esperado: 0
```

---

### 2. Datos de Prueba (Fase 2)

#### ✅ DECISIÓN 10.1: Crear empresa de prueba (id=2)

```sql
INSERT INTO companies (id, name, slug, is_active, subscription_tier)
VALUES (2, 'Empresa Demo', 'demo', TRUE, 'free');
```

**Datos de prueba**:
- 2-3 usuarios test en company_id=2
- 5-10 cotizaciones test
- 3-5 productos test

**Objetivo**: Validar aislamiento de tenants.

---

## 🚦 Plan de Rollback

### Si falla la migración

#### DECISIÓN 11.1: Rollback desde backup

```bash
# Detener aplicación
docker compose down

# Restaurar backup
docker compose exec mysql-rbac mysql -u artyco_user -partyco_password123 \
  artyco_financial_rbac < database/backups/multitenant/backup_pre_multitenant_20251114_204841.sql

# Reiniciar aplicación
docker compose up -d
```

**Tiempo estimado de rollback**: 5-10 minutos

#### DECISIÓN 11.2: Rollback parcial (si solo fallan FKs)

```sql
-- Remover FKs agregadas
ALTER TABLE {table_name} DROP FOREIGN KEY fk_{table_name}_company;

-- Las columnas company_id pueden quedarse (no afectan funcionalidad)
```

---

## 📅 Cronograma de Ejecución

### Fase 0: Preparación ✅ COMPLETADA

- [x] Backup completo (676KB)
- [x] Validación pre-migración
- [x] Documentación de decisiones

**Tiempo real**: 1.5 horas

---

### Fase 1: Schema Changes (⏭️ Siguiente)

**Duración estimada**: 4-6 horas

**Orden de ejecución**:

1. **Agregar columnas SaaS a companies** (30 min)
   - slug, is_active, subscription_tier, max_users
   - Actualizar registro id=1

2. **Agregar company_id a tablas faltantes** (1h)
   - productos
   - cotizaciones
   - pagos
   - plan_diario_produccion
   - financial_scenarios

3. **Backfill company_id = 1** (30 min)
   - Todas las tablas nuevas

4. **Agregar Foreign Keys** (1h)
   - 4 tablas existentes + 5 tablas nuevas = 9 FKs

5. **Crear índices** (30 min)
   - 10 índices simples
   - 3-5 índices compuestos

6. **Validación post-migración** (1h)
   - Verificar constraints
   - Verificar índices
   - Query performance test

7. **Backup post-migración** (30 min)

**Checkpoint**: Sistema funcional con schema multitenant completo.

---

## 🎯 Criterios de Éxito

### Fase 1 (Schema)

- [ ] Todas las tablas tienen company_id
- [ ] Todas las FKs agregadas
- [ ] Todos los índices creados
- [ ] 0 registros huérfanos
- [ ] Backup post-migración completado
- [ ] Performance acceptable (queries < 100ms)

### Fase 2 (Aplicación)

- [ ] JWT incluye company_id
- [ ] Middleware de tenant activo
- [ ] 100% endpoints críticos con tenant filter
- [ ] Tests de aislamiento pasando

### Fase 3 (Avanzado)

- [ ] RLS implementado (o equivalent)
- [ ] Audit logs con tenant_id
- [ ] Multi-DB support (opcional)

---

## 📚 Referencias

- [MULTITENANT_IMPLEMENTATION_PLAN.md](../../docs/MULTITENANT_IMPLEMENTATION_PLAN.md) - Plan maestro
- [Validation Report](../backups/multitenant/validation_report_20251114_205530.txt) - Reporte pre-migración
- [Backup Metadata](../backups/multitenant/backup_20251114_204841_metadata.txt) - Info del backup

---

## ✅ Firma de Aprobación

**Decisiones revisadas por**: Claude Code
**Fecha**: 2025-11-14
**Estado**: ✅ Aprobado para Fase 1

**Próximo paso**: Ejecutar script `database/migrations/phase1_add_company_id.sql`
