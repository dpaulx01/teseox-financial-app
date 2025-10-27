# 📊 MÓDULO BI VENTAS - CONTEXTO COMPLETO

## 🎯 Descripción General

Módulo de Business Intelligence para análisis de ventas integrado en la aplicación financiera ARTYCO. Permite análisis dinámico de datos de ventas con dos perspectivas: **Comercial** y **Financiera**, similar a tablas dinámicas de Excel pero con una interfaz profesional y elegante.

### Características Principales
- ✅ Filtros dinámicos (año, mes, categoría, canal, vendedor)
- ✅ KPIs en tiempo real
- ✅ Dos vistas especializadas (Comercial y Financiera)
- ✅ Gráficos interactivos con Tremor/Recharts
- ✅ Análisis por múltiples dimensiones
- ✅ Carga de datos desde CSV

---

## 🏗️ ARQUITECTURA

### Stack Tecnológico

**Backend:**
- FastAPI
- SQLAlchemy
- MySQL 8.0
- Python 3.12

**Frontend:**
- React 18.2.0
- Tremor React
- Heroicons React
- Vite

**Autenticación:**
- JWT con RBAC (Role-Based Access Control)
- Permisos: `bi:view`, `bi:export`, `bi_comercial:view`, `bi_financiero:view`

---

## 📁 ESTRUCTURA DE ARCHIVOS

### Backend

```
routes/
├── sales_bi_api.py                    # Router principal con endpoints BI
models/
├── sales.py                           # Modelos SQLAlchemy
database/migrations/
├── 20251026_create_sales_bi_module.sql # Schema de base de datos
api_server_rbac.py                     # Registro del router
```

### Frontend

```
src/
├── pages/
│   └── SalesBIDashboard.tsx           # Dashboard principal
├── modules/salesBI/components/
│   ├── CommercialView.tsx             # Vista comercial
│   ├── FinancialView.tsx              # Vista financiera
│   └── SalesDataUploadModal.tsx       # Modal para carga de CSV
├── components/layout/
│   └── Navigation.tsx                 # Menú con ítem "BI Ventas"
└── App.tsx                            # Routing y configuración
```

### Scripts

```
upload_sales_csv.py                    # Script de carga de CSV
BD Artyco Ventas Costos.csv           # Datos fuente
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### Tabla: `sales_transactions`

```sql
CREATE TABLE IF NOT EXISTS sales_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Información temporal
    fecha_emision DATE NOT NULL,
    year INT GENERATED ALWAYS AS (YEAR(fecha_emision)) STORED,
    month INT GENERATED ALWAYS AS (MONTH(fecha_emision)) STORED,
    quarter INT GENERATED ALWAYS AS (QUARTER(fecha_emision)) STORED,

    -- Información comercial
    categoria_producto VARCHAR(100) NOT NULL,
    vendedor VARCHAR(200) NOT NULL,
    numero_factura VARCHAR(50) NOT NULL,
    canal_comercial VARCHAR(100) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    producto VARCHAR(255) NOT NULL,

    -- Cantidades
    cantidad_facturada DECIMAL(12, 2) NOT NULL DEFAULT 0,
    factor_conversion DECIMAL(10, 4) DEFAULT 1,
    m2 DECIMAL(12, 2) DEFAULT 0,

    -- Montos financieros
    venta_bruta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
    venta_neta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    costo_venta DECIMAL(12, 2) DEFAULT 0,
    costo_unitario DECIMAL(12, 4) DEFAULT 0,
    rentabilidad DECIMAL(12, 2) DEFAULT 0,

    -- Metadata
    company_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices para performance
    INDEX idx_fecha (fecha_emision),
    INDEX idx_year_month (year, month),
    INDEX idx_categoria (categoria_producto),
    INDEX idx_cliente (razon_social),
    INDEX idx_producto (producto),
    INDEX idx_canal (canal_comercial),
    INDEX idx_vendedor (vendedor),
    INDEX idx_factura (numero_factura),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔌 ENDPOINTS DE LA API

### Base URL: `http://localhost:8001/api/sales-bi`

#### 1. Dashboard Summary
`GET /dashboard/summary`

#### 2. Commercial Analysis
`GET /analysis/commercial`

#### 3. Financial Analysis
`GET /analysis/financial`

#### 4. Monthly Trends
`GET /trends/monthly`

#### 5. Filter Options
`GET /filters/options`

#### 6. CSV Upload
`POST /upload/csv`

#### 7. Active Alerts
`GET /alerts/active`

#### 8. Saved Filters (CRUD)
`GET, POST, PUT, DELETE /saved-filters`

---

## 🎨 COMPONENTES DEL FRONTEND

### 1. `SalesBIDashboard.tsx`
Dashboard principal con filtros, KPIs, y vistas de análisis.

### 2. `CommercialView.tsx`
Vista con análisis de ventas, descuentos y clientes.

### 3. `FinancialView.tsx`
Vista con análisis de costos, márgenes y rentabilidad.

### 4. `SalesDataUploadModal.tsx`
Modal para la carga de archivos CSV de ventas.

---

## 🚀 ESTADO ACTUAL DEL MÓDULO

### ✅ Completamente Funcional

1. **Backend:**
   - ✅ Todos los endpoints implementados y probados.
   - ✅ Modelos SQLAlchemy funcionando.
   - ✅ Esquema de BD creado automáticamente.
   - ✅ RBAC integrado.

2. **Frontend:**
   - ✅ Dashboard con filtros dinámicos.
   - ✅ KPI cards con datos en tiempo real.
   - ✅ Vistas Comercial y Financiera funcionales.
   - ✅ Carga de CSV implementada.

---

## 🐛 TROUBLESHOOTING

### Error: "Failed to resolve import @heroicons/react"
**Solución:**
```bash
docker exec artyco-frontend-rbac npm install @heroicons/react
docker-compose restart frontend-rbac
```

### Error: "api.get is not a function"
**Causa:** La clase `FinancialAPIService` no tenía métodos HTTP genéricos.
**Solución:** Se agregaron métodos genéricos (`get`, `post`, `put`, `delete`) a la clase en `src/services/api.ts`.

### Error: "403 Forbidden" en API
**Causa:** Falta de autenticación o permisos.
**Solución:**
1. Verificar token JWT válido.
2. Verificar que el usuario tenga el permiso `bi:view`.
3. Revisar `auth.dependencies.require_permission()`.
