# ANÁLISIS COMPLETO: MODERNIZACIÓN RBAC Y ARQUITECTURA SAAS MULTI-TENANT
## Artyco Financial App

**Fecha:** 08 de Noviembre, 2025
**Versión:** 1.0
**Estado:** Recomendaciones para Implementación

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
3. [Estrategias Multi-Tenant para SaaS](#estrategias-multi-tenant-para-saas)
4. [Comparación de Arquitecturas](#comparación-de-arquitecturas)
5. [Recomendación Específica para Artyco](#recomendación-específica-para-artyco)
6. [Modernización del RBAC](#modernización-del-rbac)
7. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
8. [Consideraciones de Google Cloud](#consideraciones-de-google-cloud)
9. [Compliance y Seguridad](#compliance-y-seguridad)
10. [Costos Estimados](#costos-estimados)
11. [Conclusiones y Próximos Pasos](#conclusiones-y-próximos-pasos)

---

## 1. RESUMEN EJECUTIVO

### Situación Actual

Artyco Financial App es una aplicación de análisis financiero que procesa reportes de **Contifico** (sistema contable ecuatoriano). Actualmente está diseñada como aplicación **single-tenant** con capacidad multi-tenant básica:

- ✅ **RBAC robusto** implementado con FastAPI + SQLAlchemy
- ✅ **Autenticación JWT** con refresh tokens y session tracking
- ⚠️ **Multi-tenancy incompleto**: Tabla `companies` existe pero sin modelo ORM
- ⚠️ **Filtrado manual** por `company_id` (riesgo de data leakage)
- ⚠️ **Sin aislamiento garantizado** entre empresas

### Oportunidad de Negocio

**Contifico** tiene múltiples clientes (empresas). Tu visión es:
- Convertir Artyco en **SaaS multi-empresa**
- Cada cliente de Contifico = 1 tenant en Artyco
- Ofrecer análisis financiero como servicio

### Decisión Crítica

**¿Una base de datos compartida o una base de datos por empresa?**

**Recomendación:** **Base de datos compartida con schema único y tenant_id** (tu arquitectura actual) + mejoras críticas de aislamiento.

**Justificación:**
- ✅ Costo-eficiente para Google Cloud Run + Cloud SQL
- ✅ Mantenimiento simplificado (un solo esquema)
- ✅ Escalable hasta 1000+ empresas pequeñas/medianas
- ✅ Compatible con tu arquitectura actual
- ⚠️ Requiere implementar aislamiento estricto (RLS o middleware)

---

## 2. ANÁLISIS DEL SISTEMA ACTUAL

### 2.1 Stack Tecnológico Actual

**Backend:**
- **Framework:** FastAPI 0.104+
- **ORM:** SQLAlchemy 2.0+
- **Base de datos:** MySQL (Cloud SQL)
- **Autenticación:** JWT + bcrypt
- **Deployment:** Google Cloud Run + Cloud SQL
- **Python:** 3.8+

**Frontend:**
- **Framework:** React 18.2 + TypeScript
- **Build:** Vite 4.1
- **UI:** Tailwind CSS, Tremor, Lucide Icons
- **Charts:** Chart.js, Recharts

### 2.2 Módulo RBAC Actual

#### Fortalezas

✅ **Sistema completo de roles y permisos:**
```python
# Roles predefinidos
1. CEO/Director - Acceso total
2. CFO/Gerente Financiero - Gestión financiera completa
3. Analista Senior - Análisis avanzado
4. Analista Junior - Análisis básico
5. Contador - Gestión de datos financieros
6. Auditor - Solo lectura + logs
7. Inversionista - KPIs y reportes ejecutivos
8. Consultor Externo - Acceso temporal personalizable
```

✅ **Permisos granulares** con formato `resource:action`:
- `dashboard:read`, `pyg:create`, `breakeven:analyze`
- `users:admin`, `roles:assign`, `audit:export`
- Soporte para wildcards: `('*', '*')`, `('financial', '*')`

✅ **Middleware robusto:**
```python
# FastAPI dependencies
- get_current_user() - Valida JWT + sesión activa
- require_permission(resource, action) - Verifica permiso específico
- require_role(role_name) - Verifica rol
- require_superuser() - Solo superadmins
```

✅ **Auditoría completa:**
- Logs de login/logout, cambios de roles, acciones administrativas
- Tracking de IP, user-agent, detalles JSON
- Tabla `audit_logs` con toda la trazabilidad

#### Debilidades

❌ **Multi-tenancy incompleto:**
```sql
-- Tabla existe pero sin modelo SQLAlchemy
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    ...
) ENGINE=InnoDB;
```

❌ **No existe modelo Company en Python:**
```python
# models/company.py NO EXISTE
# User tiene company_id pero no hay relación ORM
class User(Base):
    company_id = Column(Integer, default=1)  # ⚠️ Sin FK ni relationship
```

❌ **Filtrado manual en cada query:**
```python
# Ejemplo actual en routes/sales_bi_api.py
query = db.query(SalesTransaction).filter(
    SalesTransaction.company_id == current_user.company_id  # ⚠️ Manual
)
```

**Riesgos:**
- 🚨 Olvido de filtro → **Data leakage entre empresas**
- 🚨 Sin validación automática de tenant
- 🚨 No hay tenant context global

### 2.3 Arquitectura de Deployment Actual

**Google Cloud:**
```yaml
# Docker containers en Cloud Run
- Backend API (FastAPI) → Cloud Run Service
- Frontend (React) → Cloud Run Service o Storage + CDN
- Base de datos → Cloud SQL (MySQL)
```

**Configuración actual (config.py:43):**
```python
# Production
CORS_ORIGINS = 'https://cfg.artycoec.com'
DATABASE_URL = Cloud SQL connection
```

**Problema:** Arquitectura single-domain, single-database.

---

## 3. ESTRATEGIAS MULTI-TENANT PARA SAAS

### 3.1 Tres Estrategias Principales

#### Estrategia 1: Base de Datos Compartida con Schema Compartido (Tenant ID)

```
┌─────────────────────────────────────┐
│      Una Base de Datos MySQL        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  users                       │  │
│  │  - id                        │  │
│  │  - company_id ← DISCRIMINADOR│  │
│  │  - email                     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  financial_data              │  │
│  │  - id                        │  │
│  │  - company_id ← DISCRIMINADOR│  │
│  │  - amount                    │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

Todas las queries tienen:
WHERE company_id = current_tenant
```

**Ventajas:**
- ✅ **Costo-eficiente**: Una instancia Cloud SQL para todos
- ✅ **Mantenimiento simple**: Un solo esquema, una migración
- ✅ **Escalable**: Hasta 1000+ tenants pequeños/medianos
- ✅ **Onboarding rápido**: INSERT en `companies`, listo
- ✅ **Backup/restore simple**: Un solo dump

**Desventajas:**
- ⚠️ **Riesgo de data leakage** si falla filtro de tenant
- ⚠️ **Performance degradation** con millones de registros
- ⚠️ **Sin aislamiento físico** (todos comparten recursos)
- ⚠️ **Compliance complejo** para industrias reguladas

**Ideal para:**
- 🎯 Startups y SMBs (pequeñas/medianas empresas)
- 🎯 Tenants con volúmenes similares de datos
- 🎯 Aplicaciones B2B estándar
- 🎯 **Tu caso: Clientes de Contifico (empresas ecuatorianas)**

---

#### Estrategia 2: Base de Datos Compartida con Schema por Tenant

```
┌─────────────────────────────────────┐
│      Una Base de Datos MySQL        │
│                                     │
│  SCHEMA: tenant_empresa_a           │
│  ┌──────────────────────────────┐  │
│  │  users                       │  │
│  │  financial_data              │  │
│  └──────────────────────────────┘  │
│                                     │
│  SCHEMA: tenant_empresa_b           │
│  ┌──────────────────────────────┐  │
│  │  users                       │  │
│  │  financial_data              │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

Cada tenant tiene su propio namespace
```

**Ventajas:**
- ✅ **Aislamiento lógico fuerte**: No puede haber leakage
- ✅ **Costo moderado**: Una instancia Cloud SQL
- ✅ **Backups selectivos**: Restore solo un tenant
- ✅ **Personalización**: Schema customizado por tenant

**Desventajas:**
- ⚠️ **Migraciones complejas**: Aplicar a 100+ schemas
- ⚠️ **Mantenimiento costoso**: Tracking de versiones por tenant
- ⚠️ **Límite de schemas**: MySQL ~64k schemas (poco realista)
- ⚠️ **Connection pooling complejo**

**Ideal para:**
- 🎯 10-500 tenants medianos/grandes
- 🎯 Clientes enterprise con customizaciones
- 🎯 Industrias con compliance estricto

---

#### Estrategia 3: Base de Datos por Tenant

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Cloud SQL       │  │  Cloud SQL       │  │  Cloud SQL       │
│  empresa_a       │  │  empresa_b       │  │  empresa_c       │
│                  │  │                  │  │                  │
│  users           │  │  users           │  │  users           │
│  financial_data  │  │  financial_data  │  │  financial_data  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Ventajas:**
- ✅ **Aislamiento completo**: Seguridad máxima
- ✅ **Performance dedicado**: Recursos por tenant
- ✅ **Compliance fácil**: Cumple SOC2, GDPR, HIPAA
- ✅ **Escalabilidad independiente**: Resize por tenant
- ✅ **Disaster recovery**: Backup/restore individual

**Desventajas:**
- ❌ **Costo prohibitivo**: Cloud SQL × N tenants
- ❌ **Mantenimiento pesadilla**: N migraciones, N backups
- ❌ **Onboarding lento**: Provisionar DB (5-10 min)
- ❌ **Overhead operacional**: Monitoring × N instancias

**Costo estimado Google Cloud:**
```
Cloud SQL (MySQL) base: $25-50/mes por instancia
100 empresas = $2,500-5,000/mes solo en DB
1000 empresas = $25,000-50,000/mes 🔥
```

**Ideal para:**
- 🎯 Clientes enterprise grandes (Fortune 500)
- 🎯 Industrias ultra-reguladas (healthcare, finance)
- 🎯 Tenants con volúmenes masivos de datos
- 🎯 SaaS premium con contratos $10k+/mes

---

#### Estrategia 4: Arquitectura Híbrida

```
┌─────────────────────────────────────┐
│  Shared DB (Tier Free/Basic)       │
│  company_id: 1-1000                 │
│  ┌──────────────────────────────┐  │
│  │ Tenants pequeños compartidos │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│  Dedicated DB    │  │  Dedicated DB    │
│  Tier Enterprise │  │  Tier Premium    │
│  Cliente grande A│  │  Cliente grande B│
└──────────────────┘  └──────────────────┘
```

**Ejemplo de tiers:**
- **Tier Free/Trial**: Shared DB, límite 1000 registros
- **Tier Basic** ($50/mes): Shared DB, límite 50k registros
- **Tier Professional** ($200/mes): Shared DB o Schema dedicado
- **Tier Enterprise** ($1000+/mes): DB dedicada + customización

**Ideal para:**
- 🎯 SaaS con múltiples planes de precio
- 🎯 Migración progresiva de shared a dedicated
- 🎯 Balance costo vs. seguridad

---

### 3.2 Comparación de Estrategias

| Criterio                | Shared DB + tenant_id | Shared DB + Schemas | DB por Tenant | Híbrido |
|-------------------------|-----------------------|---------------------|---------------|---------|
| **Costo (100 tenants)** | $50-150/mes          | $100-300/mes        | $2,500-5,000/mes | $300-1,000/mes |
| **Aislamiento datos**   | ⭐⭐ (Riesgo medio)   | ⭐⭐⭐⭐ (Alto)      | ⭐⭐⭐⭐⭐ (Máximo) | ⭐⭐⭐⭐ |
| **Mantenimiento**       | ⭐⭐⭐⭐⭐ (Fácil)     | ⭐⭐⭐ (Moderado)    | ⭐ (Complejo) | ⭐⭐⭐ |
| **Escalabilidad**       | Hasta 1000 tenants    | Hasta 500 tenants   | Ilimitado     | Ilimitado |
| **Onboarding**          | < 1 segundo           | < 5 segundos        | 5-10 minutos  | Variable |
| **Compliance**          | ⭐⭐ (Requiere RLS)   | ⭐⭐⭐⭐            | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐ |
| **Performance**         | Alta densidad         | Media densidad      | Dedicado      | Flexible |
| **Migraciones**         | Una migración         | N migraciones       | N migraciones | Mixto |
| **Backup/Restore**      | Todo o nada           | Por schema          | Por tenant    | Flexible |

---

## 4. RECOMENDACIÓN ESPECÍFICA PARA ARTYCO

### 4.1 Análisis de Tu Caso de Uso

**Contexto:**
- Clientes de Contifico son **SMBs ecuatorianas** (pequeñas/medianas empresas)
- Volumen de datos por empresa: **Moderado** (facturas, productos, producción)
- Perfil de uso: **Análisis periódico** (no transaccional 24/7)
- Mercado objetivo: **200-1000 empresas** en los primeros 2-3 años
- Presupuesto: **Startup** (optimizar costos es crítico)

**Requerimientos:**
- ✅ Aislamiento de datos entre empresas
- ✅ Costo-eficiencia para escalar
- ✅ Onboarding rápido de nuevos clientes
- ✅ Mantenimiento simple (equipo pequeño)
- ⚠️ Compliance: Datos financieros (no healthcare/banking ultra-regulado)

### 4.2 Recomendación: **Shared Database + tenant_id con RLS**

**Estrategia recomendada:** **MANTENER** tu arquitectura actual (shared DB + company_id) pero **REFORZAR** con:

1. ✅ **Row-Level Security (RLS)** en MySQL
2. ✅ **Tenant Context Middleware**
3. ✅ **Modelo Company en SQLAlchemy**
4. ✅ **Validación automática de tenant**
5. ✅ **Tests de aislamiento**

**Justificación:**

✅ **Costo-eficiente para Google Cloud:**
```
Cloud SQL (MySQL db-f1-micro): ~$25-50/mes
→ Soporta 500-1000 empresas pequeñas
→ Escalable a db-n1-standard-1: ~$150/mes (5000+ empresas)

vs.

DB por tenant: $25 × 100 empresas = $2,500/mes 🔥
```

✅ **Compatible con tu arquitectura actual:**
- Ya tienes `company_id` en las tablas principales
- No requiere reescritura completa
- Migración incremental

✅ **Mantenimiento simple:**
- Una migración de schema
- Un backup/restore
- Una instancia para monitorear

✅ **Escalabilidad probada:**
- Stripe, Slack, Notion empezaron así
- Funcionan hasta 10k-100k tenants

⚠️ **Requiere implementar aislamiento estricto:**
- RLS en MySQL (views con filtro automático)
- Middleware de tenant context
- Tests exhaustivos de data isolation

### 4.3 Plan de Migración Futura (Opcional)

Si en 3-5 años tienes:
- 50-100 clientes enterprise con > 1M registros cada uno
- Presupuesto > $5k/mes en infraestructura
- Requerimientos de compliance SOC2 Type II

**Entonces migrar a arquitectura híbrida:**
```
Shared DB: 900 clientes SMB (Tier Basic)
Dedicated DB: 10 clientes enterprise (Tier Enterprise)
```

Pero **HOY** no es necesario.

---

## 5. MODERNIZACIÓN DEL RBAC

### 5.1 Mejoras Recomendadas

Tu RBAC actual es robusto pero se puede modernizar con:

#### 1. **Migrar de RBAC puro a RBAC + ABAC (Attribute-Based Access Control)**

**RBAC actual:**
```python
# Solo rol
if user.has_role('Analista Senior'):
    allow_access()
```

**RBAC + ABAC moderno:**
```python
# Rol + atributos contextuales
if (user.has_role('Analista Senior') and
    resource.company_id == user.company_id and
    resource.department == user.department and
    current_time.is_business_hours()):
    allow_access()
```

**Beneficios:**
- ✅ Políticas dinámicas basadas en contexto
- ✅ Acceso condicional (horario, ubicación, dispositivo)
- ✅ Mejor compliance (GDPR, SOC2)

**Ejemplo para Artyco:**
```python
# Políticas ABAC
class FinancialDataPolicy:
    def can_access(self, user, resource):
        # Regla 1: Mismo tenant
        if resource.company_id != user.company_id:
            return False

        # Regla 2: Rol adecuado
        if not user.has_permission('financial', 'read'):
            return False

        # Regla 3: Datos sensibles solo para CFO/CEO
        if resource.is_sensitive and not user.has_role_in(['CEO', 'CFO']):
            return False

        # Regla 4: Auditores solo lectura + no puede modificar
        if user.has_role('Auditor') and action == 'write':
            return False

        return True
```

#### 2. **Permissions Inheritance (Herencia de Permisos)**

**Actual:** Permisos planos `('financial', 'read')`

**Moderno:** Jerarquía de recursos
```python
# Definir jerarquía
financial/
├── pyg/
│   ├── income/
│   └── expenses/
├── breakeven/
└── cashflow/

# Permiso en padre aplica a hijos
user.grant_permission('financial', 'read')
→ Tiene acceso a pyg, breakeven, cashflow

user.grant_permission('financial/pyg', 'write')
→ Solo puede escribir en PyG
```

#### 3. **Temporal Permissions (Permisos Temporales)**

**Caso de uso:** Consultores externos con acceso limitado en tiempo

```python
class Permission(Base):
    # ... campos existentes
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)

    def is_valid_now(self):
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True
```

**Uso:**
```python
# Dar acceso temporal a consultor por 30 días
grant_permission(
    user=consultant,
    resource='financial',
    action='read',
    valid_until=datetime.now() + timedelta(days=30)
)
```

#### 4. **Permission Conditions (Condiciones de Permiso)**

```python
class PermissionCondition(Base):
    id = Column(Integer, primary_key=True)
    permission_id = Column(Integer, ForeignKey('permissions.id'))
    condition_type = Column(String(50))  # 'time', 'ip', 'device', 'location'
    condition_value = Column(JSON)

    # Ejemplo:
    # condition_type = 'time'
    # condition_value = {'hours': [9, 10, 11, 12, 13, 14, 15, 16, 17]}

    # condition_type = 'ip_whitelist'
    # condition_value = {'ips': ['192.168.1.0/24', '10.0.0.5']}
```

#### 5. **Policy Engine (Motor de Políticas)**

```python
# policy_engine.py
class PolicyEngine:
    """
    Motor centralizado para evaluar políticas de acceso
    Combina RBAC + ABAC + condiciones contextuales
    """

    def evaluate(self, user, action, resource, context=None):
        """
        Evalúa si user puede hacer action sobre resource

        context = {
            'ip_address': '192.168.1.100',
            'time': datetime.now(),
            'device': 'web',
            'tenant_id': 1
        }
        """
        # 1. Validar tenant (crítico)
        if not self._validate_tenant(user, resource, context):
            return PolicyResult(False, reason='tenant_mismatch')

        # 2. Check RBAC básico
        if not self._check_rbac(user, action, resource):
            return PolicyResult(False, reason='insufficient_permissions')

        # 3. Check ABAC conditions
        if not self._check_abac(user, action, resource, context):
            return PolicyResult(False, reason='abac_condition_failed')

        # 4. Check temporal validity
        if not self._check_temporal(user, action):
            return PolicyResult(False, reason='permission_expired')

        return PolicyResult(True)

    def _validate_tenant(self, user, resource, context):
        """CRÍTICO: Validar aislamiento de tenant"""
        if hasattr(resource, 'company_id'):
            if resource.company_id != user.company_id:
                # Log potential data breach attempt
                audit_log.warning(
                    f"Tenant violation: user {user.id} (company {user.company_id}) "
                    f"attempted to access resource from company {resource.company_id}"
                )
                return False
        return True
```

### 5.2 Arquitectura RBAC Modernizada

```
┌─────────────────────────────────────────────────────┐
│                  FastAPI Request                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Tenant Context Middleware                   │
│  - Extrae company_id del user                        │
│  - Establece context global                          │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Authentication (JWT)                        │
│  - Valida token                                      │
│  - Obtiene user con roles/permissions                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Policy Engine                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. Tenant Validation (CRÍTICO)                │  │
│  │    → company_id match                         │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 2. RBAC Check                                 │  │
│  │    → role + resource:action                   │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 3. ABAC Check                                 │  │
│  │    → attributes + context                     │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 4. Temporal Check                             │  │
│  │    → valid_from/valid_until                   │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 5. Conditions Check                           │  │
│  │    → time, IP, device                         │  │
│  └───────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
                    ✅ Allow / ❌ Deny
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Audit Log                                   │
│  - Registra decisión                                 │
│  - Incluye contexto completo                         │
└─────────────────────────────────────────────────────┘
```

---

## 6. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1: Fundamentos Multi-Tenant (2-3 semanas)

**Prioridad:** 🔥 CRÍTICA

**Objetivo:** Garantizar aislamiento de datos entre tenants

#### Tareas:

**1.1 Crear Modelo Company**
```python
# models/company.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

class Company(Base):
    __tablename__ = 'companies'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)  # para URLs
    description = Column(Text)
    industry = Column(String(100))
    currency = Column(String(10), default='USD')

    # SaaS fields
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String(50), default='trial')  # trial, basic, pro, enterprise
    subscription_expires_at = Column(DateTime, nullable=True)
    max_users = Column(Integer, default=5)

    # Metadata
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by = Column(Integer, nullable=True)

    # Relationships
    users = relationship('User', back_populates='company')
    financial_data = relationship('FinancialData', back_populates='company', cascade='all, delete-orphan')
    sales_transactions = relationship('SalesTransaction', back_populates='company', cascade='all, delete-orphan')
    production_data = relationship('ProductionMonthlyData', back_populates='company', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', tier='{self.subscription_tier}')>"

    def is_subscription_active(self):
        if not self.is_active:
            return False
        if self.subscription_expires_at:
            from datetime import datetime
            return datetime.utcnow() < self.subscription_expires_at
        return True

    def can_add_user(self):
        current_users = len(self.users)
        return current_users < self.max_users
```

**1.2 Actualizar Modelo User**
```python
# models/user.py
from sqlalchemy.orm import relationship

class User(Base):
    # ... campos existentes

    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)

    # Relationships
    company = relationship('Company', back_populates='users')

    # ... resto del código
```

**1.3 Crear Tenant Context**
```python
# auth/tenant_context.py
from contextvars import ContextVar
from typing import Optional

# Context var para tenant actual
_current_tenant_id: ContextVar[Optional[int]] = ContextVar('current_tenant_id', default=None)

def set_current_tenant(tenant_id: int):
    """Establece el tenant actual en el contexto"""
    _current_tenant_id.set(tenant_id)

def get_current_tenant() -> Optional[int]:
    """Obtiene el tenant actual del contexto"""
    return _current_tenant_id.get()

def clear_current_tenant():
    """Limpia el tenant actual"""
    _current_tenant_id.set(None)

class TenantContext:
    """Context manager para establecer tenant temporalmente"""
    def __init__(self, tenant_id: int):
        self.tenant_id = tenant_id
        self.previous_tenant_id = None

    def __enter__(self):
        self.previous_tenant_id = get_current_tenant()
        set_current_tenant(self.tenant_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.previous_tenant_id is not None:
            set_current_tenant(self.previous_tenant_id)
        else:
            clear_current_tenant()
```

**1.4 Middleware de Tenant**
```python
# auth/tenant_middleware.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from auth.tenant_context import set_current_tenant, clear_current_tenant
from auth.jwt_handler import verify_token

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware que establece el tenant context basado en el usuario autenticado
    """
    async def dispatch(self, request: Request, call_next):
        # Limpiar context al inicio
        clear_current_tenant()

        try:
            # Extraer token JWT
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                payload = verify_token(token)

                if payload:
                    # Extraer company_id del token
                    company_id = payload.get('company_id')
                    if company_id:
                        set_current_tenant(company_id)

            response = await call_next(request)
            return response

        finally:
            # Limpiar context al final
            clear_current_tenant()
```

**1.5 Dependency para Validar Tenant**
```python
# auth/dependencies.py (actualizar)
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from auth.tenant_context import get_current_tenant

async def validate_tenant_access(
    resource_company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Valida que el usuario solo acceda a recursos de su propia empresa
    """
    if current_user.is_superuser:
        return  # Superusers pueden acceder a todo (para admin panel)

    if current_user.company_id != resource_company_id:
        # Log intento de acceso cross-tenant
        from models.audit import AuditLog
        audit = AuditLog(
            user_id=current_user.id,
            action='tenant_violation_attempt',
            resource='cross_tenant_access',
            details={
                'user_company_id': current_user.company_id,
                'attempted_company_id': resource_company_id
            }
        )
        db.add(audit)
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Access denied: Cannot access resources from different company"
        )

def require_active_company(current_user: User = Depends(get_current_user)):
    """Requiere que la empresa del usuario tenga suscripción activa"""
    if not current_user.company.is_subscription_active():
        raise HTTPException(
            status_code=402,
            detail="Subscription expired. Please renew your subscription."
        )
    return current_user
```

**1.6 SQLAlchemy Event Listener para Auto-Filtrar**
```python
# database/tenant_filter.py
from sqlalchemy import event
from sqlalchemy.orm import Session
from auth.tenant_context import get_current_tenant

def enable_tenant_filter():
    """
    Habilita filtro automático de tenant en queries
    """
    @event.listens_for(Session, 'do_orm_execute')
    def receive_do_orm_execute(orm_execute_state):
        if not orm_execute_state.is_select:
            return

        # Obtener tenant actual
        tenant_id = get_current_tenant()
        if tenant_id is None:
            return  # No hay tenant context, no filtrar (ej: admin endpoints)

        # Aplicar filtro a todas las entidades con company_id
        for entity in orm_execute_state.bind_mapper.entities:
            mapper = entity.mapper
            if hasattr(mapper.class_, 'company_id'):
                orm_execute_state.statement = orm_execute_state.statement.filter(
                    mapper.class_.company_id == tenant_id
                )
```

**⚠️ ALTERNATIVA MÁS SEGURA: Row-Level Security (RLS) en MySQL**

SQLAlchemy events pueden fallar. Mejor opción: **MySQL Views con filtro automático**

```sql
-- database/migrations/create_tenant_views.sql

-- View para users (auto-filtra por company_id)
CREATE OR REPLACE VIEW v_users_tenant AS
SELECT u.*
FROM users u
WHERE u.company_id = @current_tenant_id;

-- View para financial_data
CREATE OR REPLACE VIEW v_financial_data_tenant AS
SELECT f.*
FROM financial_data f
WHERE f.company_id = @current_tenant_id;

-- View para sales_transactions
CREATE OR REPLACE VIEW v_sales_transactions_tenant AS
SELECT s.*
FROM sales_transactions s
WHERE s.company_id = @current_tenant_id;
```

**Uso en la aplicación:**
```python
# Antes de cada request, establecer variable de sesión
@app.middleware("http")
async def set_tenant_session_variable(request: Request, call_next):
    tenant_id = get_current_tenant()
    if tenant_id:
        # Establecer variable MySQL session
        db.execute(f"SET @current_tenant_id = {tenant_id}")
    response = await call_next(request)
    return response
```

**1.7 Migración de Base de Datos**
```sql
-- database/migrations/20251108_add_company_relationships.sql

-- Agregar foreign key a users
ALTER TABLE users
ADD CONSTRAINT fk_users_company_id
FOREIGN KEY (company_id) REFERENCES companies(id)
ON DELETE RESTRICT;

-- Agregar campos SaaS a companies
ALTER TABLE companies
ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'trial',
ADD COLUMN subscription_expires_at DATETIME NULL,
ADD COLUMN max_users INT DEFAULT 5;

-- Índices
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Agregar company_id a todas las tablas si no existe
ALTER TABLE financial_data
ADD COLUMN company_id INT DEFAULT 1 AFTER id,
ADD CONSTRAINT fk_financial_data_company_id FOREIGN KEY (company_id) REFERENCES companies(id);

-- ... repetir para todas las tablas
```

**1.8 Tests de Aislamiento**
```python
# tests/test_tenant_isolation.py
import pytest
from models.user import User
from models.company import Company
from models.financial_data import FinancialData

def test_user_cannot_access_other_company_data(db, client):
    """Test crítico: Usuario no puede acceder a datos de otra empresa"""

    # Crear dos empresas
    company_a = Company(name='Company A', slug='company-a')
    company_b = Company(name='Company B', slug='company-b')
    db.add_all([company_a, company_b])
    db.commit()

    # Crear usuarios
    user_a = User(username='user_a', company_id=company_a.id)
    user_b = User(username='user_b', company_id=company_b.id)
    db.add_all([user_a, user_b])
    db.commit()

    # Crear datos financieros
    data_a = FinancialData(company_id=company_a.id, amount=1000)
    data_b = FinancialData(company_id=company_b.id, amount=2000)
    db.add_all([data_a, data_b])
    db.commit()

    # User A intenta acceder a datos de Company B
    token_a = create_access_token(user_a)
    response = client.get(
        f'/financial/{data_b.id}',
        headers={'Authorization': f'Bearer {token_a}'}
    )

    # Debe ser denegado
    assert response.status_code == 403
    assert 'different company' in response.json()['detail'].lower()

def test_query_auto_filters_by_tenant(db):
    """Test: Queries deben auto-filtrar por tenant"""

    company_a = Company(name='Company A')
    company_b = Company(name='Company B')
    db.add_all([company_a, company_b])
    db.commit()

    # Crear 5 registros para company A, 3 para company B
    for i in range(5):
        db.add(FinancialData(company_id=company_a.id, amount=i))
    for i in range(3):
        db.add(FinancialData(company_id=company_b.id, amount=i))
    db.commit()

    # Establecer tenant context a Company A
    with TenantContext(company_a.id):
        results = db.query(FinancialData).all()
        assert len(results) == 5  # Solo debe ver datos de Company A

    # Establecer tenant context a Company B
    with TenantContext(company_b.id):
        results = db.query(FinancialData).all()
        assert len(results) == 3  # Solo debe ver datos de Company B
```

**Criterios de éxito Fase 1:**
- ✅ Modelo Company existe y está relacionado
- ✅ Todas las queries filtran automáticamente por company_id
- ✅ Tests de aislamiento pasan 100%
- ✅ No es posible acceder a datos de otro tenant

---

### FASE 2: Onboarding y Gestión de Tenants (1-2 semanas)

**Prioridad:** 🔥 ALTA

**Objetivo:** Sistema para crear y gestionar empresas/tenants

#### Tareas:

**2.1 API de Gestión de Companies**
```python
# routes/companies.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.company import Company
from models.user import User
from auth.dependencies import require_superuser, get_current_user

router = APIRouter(prefix='/companies', tags=['companies'])

@router.post('/', response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Solo superadmins pueden crear empresas"""

    # Validar slug único
    existing = db.query(Company).filter(Company.slug == company_data.slug).first()
    if existing:
        raise HTTPException(400, "Company slug already exists")

    company = Company(**company_data.dict())
    db.add(company)
    db.commit()
    db.refresh(company)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action='company_created',
        resource='company',
        resource_id=company.id,
        details=company_data.dict()
    )
    db.add(audit)
    db.commit()

    return company

@router.get('/me', response_model=CompanyResponse)
async def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información de la empresa del usuario"""
    return current_user.company

@router.put('/{company_id}', response_model=CompanyResponse)
async def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Actualizar empresa (solo superadmins)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    for key, value in company_data.dict(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company

@router.post('/{company_id}/deactivate')
async def deactivate_company(
    company_id: int,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Desactivar empresa (suspender suscripción)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    company.is_active = False
    db.commit()

    return {"message": "Company deactivated successfully"}
```

**2.2 Proceso de Onboarding**
```python
# services/onboarding.py
from sqlalchemy.orm import Session
from models.company import Company
from models.user import User
from auth.password import hash_password

class OnboardingService:
    """Servicio para onboarding de nuevos tenants"""

    def create_tenant(
        self,
        company_name: str,
        admin_email: str,
        admin_password: str,
        industry: str = None,
        subscription_tier: str = 'trial',
        db: Session = None
    ):
        """
        Crea un nuevo tenant completo:
        1. Empresa
        2. Usuario admin
        3. Roles y permisos por defecto
        4. Configuración inicial
        """

        # 1. Crear empresa
        slug = self._generate_slug(company_name)
        company = Company(
            name=company_name,
            slug=slug,
            industry=industry,
            subscription_tier=subscription_tier,
            is_active=True
        )
        db.add(company)
        db.flush()  # Para obtener company.id

        # 2. Crear usuario admin
        admin_user = User(
            username=admin_email,
            email=admin_email,
            password_hash=hash_password(admin_password),
            company_id=company.id,
            is_active=True,
            first_name='Admin',
            last_name=company_name
        )
        db.add(admin_user)
        db.flush()

        # 3. Asignar rol CEO al admin
        from models.role import Role
        ceo_role = db.query(Role).filter(Role.name == 'CEO/Director').first()
        if ceo_role:
            admin_user.roles.append(ceo_role)

        # 4. Crear configuración inicial (opcional)
        # Por ejemplo: dashboards por defecto, configuración de reportes, etc.

        db.commit()
        db.refresh(company)

        return {
            'company': company,
            'admin_user': admin_user,
            'credentials': {
                'email': admin_email,
                'password': '[REDACTED]'  # No devolver password en producción
            }
        }

    def _generate_slug(self, company_name: str) -> str:
        """Genera slug único para la empresa"""
        import re
        slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-')
        # Agregar timestamp si ya existe
        return slug
```

**2.3 Endpoint Público de Registro**
```python
# routes/public.py
from fastapi import APIRouter
from services.onboarding import OnboardingService

router = APIRouter(prefix='/public', tags=['public'])

@router.post('/register-company')
async def register_company(
    registration: CompanyRegistration,
    db: Session = Depends(get_db)
):
    """
    Registro público de nueva empresa (self-service)

    Solo para tier trial. Para planes pagos, requerir proceso de ventas.
    """

    # Validaciones
    if registration.subscription_tier != 'trial':
        raise HTTPException(400, "Public registration only available for trial tier")

    # Validar email único
    existing_user = db.query(User).filter(User.email == registration.admin_email).first()
    if existing_user:
        raise HTTPException(400, "Email already registered")

    # Crear tenant
    onboarding = OnboardingService()
    result = onboarding.create_tenant(
        company_name=registration.company_name,
        admin_email=registration.admin_email,
        admin_password=registration.admin_password,
        industry=registration.industry,
        subscription_tier='trial',
        db=db
    )

    # Enviar email de bienvenida (TODO: implementar)
    # send_welcome_email(result['admin_user'].email)

    return {
        "message": "Company registered successfully",
        "company_id": result['company'].id,
        "company_slug": result['company'].slug,
        "login_url": f"https://cfg.artycoec.com/login"
    }
```

**2.4 Frontend: Página de Registro**
```typescript
// src/pages/RegisterCompany.tsx
export function RegisterCompany() {
  const [formData, setFormData] = useState({
    companyName: '',
    adminEmail: '',
    adminPassword: '',
    industry: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await api.post('/public/register-company', {
        company_name: formData.companyName,
        admin_email: formData.adminEmail,
        admin_password: formData.adminPassword,
        industry: formData.industry,
        subscription_tier: 'trial',
      });

      // Redirigir a login
      navigate('/login?registered=true');
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="register-company">
      <h1>Registra tu Empresa</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre de la Empresa"
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email del Administrador"
          value={formData.adminEmail}
          onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={formData.adminPassword}
          onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
        />
        <select
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
        >
          <option value="">Selecciona Industria</option>
          <option value="retail">Retail</option>
          <option value="manufacturing">Manufactura</option>
          <option value="services">Servicios</option>
          <option value="consulting">Consultoría</option>
        </select>
        <button type="submit">Crear Cuenta (30 días gratis)</button>
      </form>
    </div>
  );
}
```

**Criterios de éxito Fase 2:**
- ✅ API para crear/actualizar/desactivar empresas
- ✅ Proceso de onboarding automatizado
- ✅ Registro self-service funcional
- ✅ Admin de cada empresa puede gestionar sus usuarios

---

### FASE 3: RBAC Modernizado (2-3 semanas)

**Prioridad:** 🟡 MEDIA

**Objetivo:** Implementar RBAC + ABAC con permisos contextuales

#### Tareas:

**3.1 Extender Modelo de Permisos**
```python
# models/permission.py (actualizar)
class Permission(Base):
    # ... campos existentes

    # Temporal permissions
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)

    # Herencia de recursos
    parent_resource = Column(String(100), nullable=True)  # 'financial' es padre de 'financial/pyg'

    def is_valid_now(self):
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True
```

**3.2 Crear PermissionCondition**
```python
# models/permission_condition.py
class PermissionCondition(Base):
    __tablename__ = 'permission_conditions'

    id = Column(Integer, primary_key=True)
    permission_id = Column(Integer, ForeignKey('permissions.id'))
    condition_type = Column(String(50))  # 'time', 'ip_whitelist', 'device'
    condition_value = Column(JSON)
    is_active = Column(Boolean, default=True)

    permission = relationship('Permission', back_populates='conditions')
```

**3.3 Policy Engine**
```python
# auth/policy_engine.py
class PolicyEngine:
    def evaluate(self, user, action, resource, context=None):
        """Evalúa políticas RBAC + ABAC"""
        context = context or {}

        # 1. CRÍTICO: Validar tenant
        if not self._validate_tenant(user, resource, context):
            return PolicyResult(False, reason='tenant_mismatch')

        # 2. RBAC básico
        if not user.has_permission(resource, action):
            return PolicyResult(False, reason='insufficient_permissions')

        # 3. ABAC conditions
        if not self._check_conditions(user, action, resource, context):
            return PolicyResult(False, reason='abac_condition_failed')

        # 4. Temporal validity
        # TODO: Implementar

        return PolicyResult(True)
```

**Criterios de éxito Fase 3:**
- ✅ Permisos temporales funcionan
- ✅ Condiciones ABAC (horario, IP) funcionan
- ✅ Policy engine centralizado
- ✅ Tests de políticas complejas pasan

---

### FASE 4: UI de Administración Multi-Tenant (2 semanas)

**Prioridad:** 🟡 MEDIA-BAJA

**Objetivo:** Panel de administración para gestionar empresas

#### Tareas:

**4.1 Dashboard de Superadmin**
```typescript
// src/pages/admin/CompaniesDashboard.tsx
export function CompaniesDashboard() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.get('/companies').then(res => setCompanies(res.data));
  }, []);

  return (
    <div>
      <h1>Empresas Registradas</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Usuarios</th>
            <th>Plan</th>
            <th>Estado</th>
            <th>Expira</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(company => (
            <tr key={company.id}>
              <td>{company.id}</td>
              <td>{company.name}</td>
              <td>{company.users_count}</td>
              <td>{company.subscription_tier}</td>
              <td>{company.is_active ? '✅' : '❌'}</td>
              <td>{company.subscription_expires_at}</td>
              <td>
                <button onClick={() => viewCompany(company.id)}>Ver</button>
                <button onClick={() => deactivateCompany(company.id)}>Desactivar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**4.2 Gestión de Usuarios por Empresa**
```typescript
// src/pages/admin/UsersManagement.tsx
// UI para que cada admin gestione sus propios usuarios
```

**Criterios de éxito Fase 4:**
- ✅ Superadmin puede ver todas las empresas
- ✅ Admin de empresa puede gestionar sus usuarios
- ✅ Métricas de uso por empresa
- ✅ Activar/desactivar suscripciones

---

### FASE 5: Integración con Contifico (3-4 semanas)

**Prioridad:** 🔥 ALTA (Revenue-critical)

**Objetivo:** Automatizar onboarding desde Contifico

#### Tareas:

**5.1 API Webhook de Contifico**
```python
# routes/integrations/contifico.py
@router.post('/webhooks/contifico/company-created')
async def handle_contifico_company_created(
    webhook_data: ContifficoWebhook,
    api_key: str = Header(..., alias='X-Contifico-API-Key'),
    db: Session = Depends(get_db)
):
    """
    Webhook que Contifico llama cuando un cliente se registra

    Webhook payload:
    {
        "company_name": "Empresa XYZ",
        "admin_email": "admin@empresa.com",
        "industry": "retail",
        "contifico_company_id": "12345"
    }
    """

    # Validar API key de Contifico
    if not validate_contifico_api_key(api_key):
        raise HTTPException(401, "Invalid API key")

    # Crear tenant automáticamente
    onboarding = OnboardingService()
    result = onboarding.create_tenant(
        company_name=webhook_data.company_name,
        admin_email=webhook_data.admin_email,
        admin_password=generate_random_password(),
        industry=webhook_data.industry,
        subscription_tier='basic',  # Clientes de Contifico inician en Basic
        db=db
    )

    # Enviar email con credenciales
    send_onboarding_email(
        to=webhook_data.admin_email,
        company_name=webhook_data.company_name,
        login_url=f"https://cfg.artycoec.com/login",
        temp_password=result['credentials']['password']
    )

    return {"message": "Tenant created successfully"}
```

**5.2 Importador de Datos de Contifico**
```python
# services/contifico_importer.py
class ContifficoImporter:
    """Importa datos financieros desde API de Contifico"""

    async def import_financial_data(self, company_id: int, contifico_api_key: str):
        """
        Importa datos desde Contifico:
        - Cuentas contables
        - Transacciones
        - Estado de resultados
        - Balance general
        """

        # Llamar a API de Contifico
        contifico_data = await fetch_contifico_data(contifico_api_key)

        # Transformar y guardar en Artyco
        for transaction in contifico_data['transactions']:
            financial_data = FinancialData(
                company_id=company_id,
                account=transaction['account'],
                amount=transaction['amount'],
                date=transaction['date'],
                # ... resto de campos
            )
            db.add(financial_data)

        db.commit()
```

**Criterios de éxito Fase 5:**
- ✅ Webhook de Contifico funciona
- ✅ Onboarding automático desde Contifico
- ✅ Importador de datos funcional
- ✅ Sincronización periódica configurada

---

### FASE 6: Facturación y Suscripciones (2-3 semanas)

**Prioridad:** 🟡 MEDIA (Revenue-critical pero no bloqueante)

**Objetivo:** Sistema de billing y gestión de planes

#### Tareas:

**6.1 Definir Planes de Suscripción**
```python
# models/subscription_plan.py
class SubscriptionPlan(Base):
    __tablename__ = 'subscription_plans'

    id = Column(Integer, primary_key=True)
    name = Column(String(50))  # 'trial', 'basic', 'pro', 'enterprise'
    price_usd = Column(Numeric(10, 2))
    price_local = Column(Numeric(10, 2))  # Precio en moneda local
    currency = Column(String(10), default='USD')

    # Límites
    max_users = Column(Integer)
    max_monthly_transactions = Column(Integer)
    max_storage_gb = Column(Integer)

    # Features
    features = Column(JSON)  # {"brain_analysis": true, "api_access": false}

    is_active = Column(Boolean, default=True)
```

**Planes sugeridos:**
```yaml
Trial (30 días gratis):
  - max_users: 3
  - max_transactions: 1000
  - features: basic dashboards, PyG, Breakeven

Basic ($50/mes):
  - max_users: 5
  - max_transactions: 10000
  - features: todo excepto Brain AI

Pro ($150/mes):
  - max_users: 15
  - max_transactions: 50000
  - features: todo incluyendo Brain AI

Enterprise ($500+/mes):
  - max_users: ilimitado
  - max_transactions: ilimitado
  - features: todo + soporte prioritario + customización
```

**6.2 Integración con Stripe**
```python
# services/billing.py
import stripe
from config import Config

stripe.api_key = Config.STRIPE_SECRET_KEY

class BillingService:
    def create_subscription(self, company_id: int, plan_name: str):
        """Crea suscripción en Stripe"""

        company = db.query(Company).get(company_id)

        # Crear customer en Stripe
        customer = stripe.Customer.create(
            email=company.users[0].email,  # Admin email
            name=company.name,
            metadata={'company_id': company_id}
        )

        # Crear suscripción
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': get_stripe_price_id(plan_name)}]
        )

        # Actualizar company
        company.stripe_customer_id = customer.id
        company.stripe_subscription_id = subscription.id
        company.subscription_tier = plan_name
        db.commit()

        return subscription
```

**Criterios de éxito Fase 6:**
- ✅ Planes de suscripción definidos
- ✅ Integración con Stripe funcional
- ✅ Upgrades/downgrades funcionan
- ✅ Webhook de Stripe para renovaciones

---

### FASE 7: Monitoreo y Observabilidad (1 semana)

**Prioridad:** 🟢 BAJA (pero importante)

**Objetivo:** Monitoring, logs, alertas

#### Tareas:

**7.1 Google Cloud Logging**
```python
# utils/logging.py
from google.cloud import logging as cloud_logging

logging_client = cloud_logging.Client()
logger = logging_client.logger('artyco-financial-app')

def log_tenant_event(event_type: str, company_id: int, details: dict):
    """Log eventos a Google Cloud Logging"""
    logger.log_struct({
        'event_type': event_type,
        'company_id': company_id,
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    })
```

**7.2 Métricas de Uso**
```python
# services/analytics.py
class TenantAnalytics:
    def get_usage_stats(self, company_id: int, month: int, year: int):
        """Obtiene estadísticas de uso por tenant"""

        return {
            'active_users': count_active_users(company_id, month, year),
            'api_requests': count_api_requests(company_id, month, year),
            'storage_used_gb': calculate_storage(company_id),
            'transactions_processed': count_transactions(company_id, month, year)
        }
```

**Criterios de éxito Fase 7:**
- ✅ Logs estructurados en Google Cloud
- ✅ Métricas de uso por tenant
- ✅ Alertas de errores
- ✅ Dashboard de monitoreo

---

## 7. CONSIDERACIONES DE GOOGLE CLOUD

### 7.1 Arquitectura Recomendada en GCP

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cloud Load Balancer                                 │  │
│  │  - SSL/TLS termination                               │  │
│  │  - DDoS protection                                   │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│         ┌─────────────┴─────────────┐                       │
│         │                           │                       │
│  ┌──────▼──────┐             ┌──────▼──────┐              │
│  │ Cloud Run   │             │ Cloud Run   │              │
│  │ (Backend)   │             │ (Frontend)  │              │
│  │             │             │             │              │
│  │ FastAPI     │             │ React       │              │
│  │ Auto-scale  │             │ Static Site │              │
│  │ 1-100 inst. │             │             │              │
│  └──────┬──────┘             └─────────────┘              │
│         │                                                   │
│         │ Private IP                                        │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────┐  │
│  │  Cloud SQL (MySQL)                                  │  │
│  │  - db-n1-standard-1 (1 vCPU, 3.75 GB RAM)          │  │
│  │  - 100 GB SSD                                       │  │
│  │  - Automatic backups (daily)                        │  │
│  │  - High Availability (opcional)                     │  │
│  └──────┬──────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────┐  │
│  │  Cloud Storage                                       │  │
│  │  - Uploads de archivos                               │  │
│  │  - Backups de base de datos                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Secret Manager                                       │  │
│  │  - JWT_SECRET_KEY                                     │  │
│  │  - DB_PASSWORD                                        │  │
│  │  - API keys                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cloud Logging + Monitoring                           │  │
│  │  - Application logs                                   │  │
│  │  - Audit logs                                         │  │
│  │  - Alerting                                           │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Configuración de Cloud Run

**Backend (FastAPI):**
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/artyco-backend:$SHORT_SHA', '-f', 'Dockerfile.api', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/artyco-backend:$SHORT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'artyco-backend'
      - '--image=gcr.io/$PROJECT_ID/artyco-backend:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--set-env-vars=ENVIRONMENT=production'
      - '--set-cloudsql-instances=$PROJECT_ID:us-central1:artyco-db'
      - '--memory=1Gi'
      - '--cpu=1'
      - '--min-instances=1'
      - '--max-instances=10'
      - '--concurrency=80'
```

**Cloud SQL Connection:**
```python
# config.py (actualizar)
if Config.IS_PRODUCTION:
    # Cloud SQL via Unix socket
    unix_socket = f'/cloudsql/{os.getenv("CLOUD_SQL_CONNECTION_NAME")}'
    DATABASE_URL = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?unix_socket={unix_socket}'
```

### 7.3 Costos Estimados Google Cloud

**Configuración recomendada para 100-500 empresas:**

| Servicio | Especificación | Costo Mensual (USD) |
|----------|---------------|---------------------|
| **Cloud Run (Backend)** | 1-10 instancias, 1 vCPU, 1GB RAM | $10-50 |
| **Cloud Run (Frontend)** | Static hosting | $5-10 |
| **Cloud SQL (MySQL)** | db-n1-standard-1 (1 vCPU, 3.75GB) | $50-80 |
| **Cloud SQL Storage** | 100GB SSD | $17 |
| **Cloud Storage** | 50GB (archivos) | $1-5 |
| **Cloud Load Balancer** | Tráfico moderado | $20-40 |
| **Cloud Logging** | 10GB logs/mes | $5-10 |
| **Bandwidth** | 100GB egress | $12 |
| **Total** | | **$120-214/mes** |

**Comparación con DB por tenant:**
```
Shared DB: $120-214/mes → $1.20-2.14 por empresa (100 empresas)
DB por tenant: $25 × 100 = $2,500/mes → $25 por empresa

Ahorro: ~92% 🚀
```

**Escalabilidad:**
- **500 empresas:** $200-300/mes (mismo hardware)
- **1000 empresas:** $300-500/mes (upgrade a db-n1-standard-2)
- **5000 empresas:** $800-1200/mes (db-n1-standard-4 + sharding)

### 7.4 High Availability (Opcional)

Para clientes enterprise con SLA 99.95%:

```yaml
Cloud SQL:
  - high_availability: true
  - automatic_failover: true
  - costo adicional: +$50-100/mes

Cloud Run:
  - min_instances: 3 (en multiple regions)
  - costo adicional: +$100-200/mes
```

**Total para HA:** +$150-300/mes

---

## 8. COMPLIANCE Y SEGURIDAD

### 8.1 Requerimientos de Compliance

**SOC 2 Type II (recomendado para B2B SaaS):**
- ✅ Data encryption at rest (Cloud SQL)
- ✅ Data encryption in transit (HTTPS/TLS)
- ✅ Access controls (RBAC)
- ✅ Audit logging
- ✅ Incident response plan
- ⚠️ Requiere auditoría externa ($15k-50k)

**GDPR (si tienes clientes europeos):**
- ✅ Right to deletion (implementar endpoint `/delete-account`)
- ✅ Data portability (exportar datos en JSON/CSV)
- ✅ Privacy policy actualizado
- ✅ Consent management

**PCI DSS (si procesas pagos):**
- ✅ Usar Stripe/PayPal (no guardar tarjetas)
- ✅ No requiere compliance directo

### 8.2 Checklist de Seguridad

**Fase Crítica (antes de lanzar):**
- [ ] Row-Level Security o tenant filtering implementado
- [ ] Tests de aislamiento de datos pasan 100%
- [ ] JWT secrets en Secret Manager (no hardcoded)
- [ ] HTTPS obligatorio (no HTTP)
- [ ] Rate limiting por tenant
- [ ] SQL injection prevention (usar parametrized queries)
- [ ] XSS prevention (sanitizar inputs)
- [ ] CORS configurado correctamente
- [ ] Backups automáticos diarios
- [ ] Logs de auditoría habilitados

**Fase Recomendada (primeros 6 meses):**
- [ ] Penetration testing
- [ ] Vulnerability scanning (Snyk, Dependabot)
- [ ] SOC 2 Type II certification
- [ ] Bug bounty program
- [ ] Disaster recovery plan documentado

### 8.3 Data Retention y Backups

**Estrategia recomendada:**
```yaml
Backups:
  - Automáticos diarios (Cloud SQL)
  - Retención: 30 días
  - Backups manuales antes de migraciones
  - Test de restore mensual

Data retention:
  - Audit logs: 2 años
  - Financial data: 7 años (requerimiento legal Ecuador)
  - User sessions: 90 días
  - Soft delete: 30 días antes de hard delete
```

---

## 9. CONCLUSIONES Y PRÓXIMOS PASOS

### 9.1 Decisiones Clave

**✅ Arquitectura Multi-Tenant:** Shared Database + company_id (tu modelo actual)

**Justificación:**
- Costo-eficiente: $120-214/mes vs $2,500/mes (DB por tenant)
- Escalable: Hasta 1000+ empresas sin cambios
- Mantenimiento simple: Un solo esquema
- Compatible con tu arquitectura actual

**⚠️ Requisito crítico:** Implementar Row-Level Security o middleware de tenant filter

---

**✅ Arquitectura de Deployment:** Google Cloud Run + Cloud SQL

**Justificación:**
- Ya está funcionando
- Serverless (auto-scaling)
- Pay-per-use (no pagar por idle)
- Fácil CI/CD

---

**✅ Modelo de Dominio:** Único dominio (cfg.artycoec.com)

**No recomendado:** Subdominio por tenant (empresa-a.artycoec.com)

**Justificación:**
- Más simple (un solo certificado SSL)
- No requiere DNS wildcard
- Mejor UX (un solo login URL)

---

**✅ RBAC Modernizado:** RBAC + ABAC híbrido

**Implementar:**
- Permisos temporales para consultores
- Políticas contextuales (horario, IP)
- Policy engine centralizado

---

### 9.2 Roadmap Ejecutivo

**Mes 1-2: Fundamentos (CRÍTICO)**
- Fase 1: Multi-tenancy robusto
- Fase 2: Onboarding de empresas
- Deploy a producción con primeros clientes beta

**Mes 3-4: Integración Contifico (REVENUE)**
- Fase 5: Webhook y sincronización
- Onboarding automático de clientes Contifico
- Marketing y ventas

**Mes 5-6: Monetización (REVENUE)**
- Fase 6: Facturación y suscripciones
- Planes de precio
- Upgrade flow

**Mes 7+: Optimización**
- Fase 3: RBAC avanzado
- Fase 4: UI de admin
- Fase 7: Monitoreo avanzado

---

### 9.3 Métricas de Éxito

**KPIs Técnicos:**
- 🎯 Data isolation: 0 incidentes de leakage
- 🎯 Uptime: >99.5%
- 🎯 Response time: <500ms (p95)
- 🎯 Onboarding time: <5 minutos

**KPIs de Negocio:**
- 🎯 Mes 1-3: 10-20 empresas beta
- 🎯 Mes 4-6: 50-100 empresas pagando
- 🎯 Mes 7-12: 200-500 empresas
- 🎯 ARR objetivo: $50k-100k año 1

---

### 9.4 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Data leakage entre tenants** | Media | 🔥 Crítico | Tests exhaustivos, RLS, code reviews |
| **Performance degradation** | Media | 🟡 Alto | Índices en company_id, caching, sharding futuro |
| **Onboarding lento de Contifico** | Alta | 🟡 Alto | API bien documentada, soporte dedicado |
| **Costos Cloud SQL crecen rápido** | Media | 🟡 Medio | Monitoring, alertas, upgrade gradual |
| **Compliance SOC2** | Baja | 🟢 Medio | Contratar auditor externo cuando sea necesario |

---

## 10. ANEXOS

### Anexo A: Comandos Útiles

**Crear migración:**
```bash
# Agregar modelo Company
alembic revision --autogenerate -m "add_company_model"
alembic upgrade head
```

**Deploy a Google Cloud:**
```bash
# Build y push
gcloud builds submit --tag gcr.io/PROJECT_ID/artyco-backend

# Deploy
gcloud run deploy artyco-backend \
  --image gcr.io/PROJECT_ID/artyco-backend \
  --region us-central1 \
  --platform managed
```

**Backup manual:**
```bash
gcloud sql backups create --instance=artyco-db
```

---

### Anexo B: Recursos Adicionales

**Documentación:**
- [Google Cloud Run Multi-tenancy Best Practices](https://cloud.google.com/architecture/best-practices-for-running-cost-effective-cloud-run-applications)
- [FastAPI Multi-tenancy Guide](https://fastapi.tiangolo.com/)
- [SQLAlchemy Tenant Filtering](https://docs.sqlalchemy.org/en/14/orm/session_events.html)

**Librerías útiles:**
- `starlette-context` - Context vars para FastAPI
- `sqlalchemy-utils` - Helpers para multi-tenancy
- `stripe` - Facturación

---

## RESUMEN FINAL

**TU SITUACIÓN:**
- App funcional single-tenant
- RBAC robusto
- Google Cloud Run + Cloud SQL
- Oportunidad: Clientes de Contifico

**DECISIÓN RECOMENDADA:**
- ✅ **Mantener Shared Database + company_id**
- ✅ **Reforzar aislamiento de datos (RLS/middleware)**
- ✅ **Un solo dominio cfg.artycoec.com**
- ✅ **Integración con Contifico vía webhook**
- ✅ **Planes: Trial → Basic ($50) → Pro ($150) → Enterprise ($500+)**

**COSTO INFRAESTRUCTURA:**
- 100 empresas: ~$120-214/mes
- 1000 empresas: ~$300-500/mes
- **92% más barato que DB por tenant**

**PRÓXIMO PASO INMEDIATO:**
1. Implementar Fase 1 (Fundamentos Multi-Tenant)
2. Deploy a staging con 3-5 empresas beta
3. Validar aislamiento de datos
4. Lanzar a producción

**TIEMPO ESTIMADO:** 2-3 meses para MVP multi-tenant completo

---

**¿Listo para empezar? 🚀**

El primer paso es implementar la Fase 1. ¿Quieres que empiece a crear los archivos para el modelo Company y el tenant context?
