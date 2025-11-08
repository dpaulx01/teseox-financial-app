# PRODUCTION STATUS MODULE - COMPREHENSIVE REPORT
## Artyco Financial App

---

## 1. SYSTEM OVERVIEW

The Production Status Module is a comprehensive production tracking and management system that handles:
- Quotation/Quote management (cotizaciones)
- Product line tracking
- Daily production planning and scheduling
- Financial tracking (payments, receivables)
- Risk alerts and KPI dashboards
- Stock planning management

**Module Location**: `/src/modules/statusProduccion/`  
**Backend Routes**: `/routes/production_status.py` and `/routes/production_data_api.py`  
**Database Models**: `/models/production.py`  

---

## 2. PRODUCTION TRACKING SYSTEM ARCHITECTURE

### Data Flow Diagram
```
Excel Upload (Quotation Files)
        ↓
Parser (parse_quote_excel)
        ↓
Extract Products & Metadata
        ↓
Database (cotizaciones, productos, pagos)
        ↓
Frontend (React Components)
        ↓
KPIs Dashboard & Control Panels
```

### Core Process Flow

1. **Input**: Excel files containing quotations
2. **Parsing**: Intelligent extraction of:
   - Quote number (numero_cotizacion)
   - Client information
   - Products with descriptions, quantities, subtotals
   - Metadata (payment terms, delivery dates, etc.)
3. **Storage**: Persistent storage in MySQL
4. **Tracking**: Real-time status updates and monitoring
5. **Reporting**: Dashboard KPIs and analytics

---

## 3. QUOTATION TRACKING SYSTEM

### Quotation Model (ProductionQuote)
**Table**: `cotizaciones`

```
ProductionQuote
├── numero_cotizacion (STRING, UNIQUE, INDEXED)
├── tipo_produccion (ENUM: 'cliente' | 'stock')
├── numero_pedido_stock (for stock orders)
├── cliente (Client name)
├── bodega (Warehouse/Storage)
├── responsable (Person responsible)
├── contacto (Contact information)
├── proyecto (Project name)
├── odc (Purchase order number)
├── valor_total (Total quote value)
├── fecha_ingreso (Receipt date)
├── fecha_inicio_periodo (Start date)
├── fecha_fin_periodo (End date)
├── fecha_vencimiento (Expiration date)
├── nombre_archivo_pdf (PDF file reference)
└── Relationships
    ├── productos (List[ProductionProduct])
    └── pagos (List[ProductionPayment])
```

### Two Types of Quotations
1. **Cliente**: Customer orders (tipo_produccion = 'cliente')
2. **Stock**: Inventory orders (tipo_produccion = 'stock')

---

## 4. PRODUCT DATA EXTRACTION

### Product Model (ProductionProduct)
**Table**: `productos`

```
ProductionProduct
├── cotizacion_id (FOREIGN KEY → cotizaciones)
├── descripcion (Product description/name)
├── cantidad (Quantity text: "100 un" or "50 m²")
├── valor_subtotal (Product value)
├── fecha_entrega (Delivery date)
├── estatus (Production status - ENUM)
├── notas_estatus (Status notes)
├── factura (Invoice number)
└── plan_diario (List[ProductionDailyPlan])
```

### Extraction Process
The `parse_quote_excel()` function:

1. **Reads Excel files** using pandas
2. **Detects headers** by looking for keywords:
   - "CANT", "CANTIDAD" → quantity column
   - "UNID", "UNIDAD" → unit column
   - "BIEN", "SERVICIO", "DESCRIP" → description
   - "SUBTOTAL", "TOTAL", "VALOR" → price column

3. **Extracts quantities** with unit detection:
   - METER_KEYWORDS: M, MT, MTS, METRO, M2, M3, etc.
   - UNIT_KEYWORDS: UN, UNIDAD, PIEZA, PZA, etc.

4. **Filters metadata**:
   - Removes rows with payment terms, delivery notes
   - Checks for keywords: "TIEMPO DE PRODUCCION", "CONDICIONES DE PAGO", etc.
   - Skips rows with only metadata information

5. **Removes duplicates** using (description, quantity, subtotal) tuple

---

## 5. VISUAL FLOWS & CONTROL FLOWS

### A. PRODUCTION FLOW (Status Progression)
```
ProductionStatusEnum:
1. EN_COLA (In Queue) → Initial state
2. EN_PRODUCCION (In Production) → Active production
3. PRODUCCION_PARCIAL (Partial Production) → Partial completion
4. LISTO_PARA_RETIRO (Ready for Pickup) → Finished, ready for customer
5. EN_BODEGA (In Warehouse) → Stock items stored
6. ENTREGADO (Delivered) → Final state
```

### B. CONTROL FLOW (Decision Points)
```
Dashboard KPI Calculation Flow:

Active Items Query
├── Filter by active statuses (not ENTREGADO, not EN_BODEGA)
├── Calculate metrics
│   ├── Today's entries (today only)
│   ├── Weekly entries (7 days)
│   ├── Status breakdown (count, value, units, metros)
│   ├── Risk alerts detection
│   │   ├── Overdue items (fecha_entrega < today)
│   │   ├── Due soon items (fecha_entrega ≤ today + 7 days)
│   │   ├── Missing dates (null fecha_entrega)
│   │   └── Missing status (null estatus)
│   ├── Financial calculations
│   │   ├── Total active value
│   │   ├── Overdue value
│   │   ├── Ready for pickup value
│   │   └── Receivables (saldo_por_cobrar)
│   └── Data gaps analysis
└── Generate Dashboard Response
```

### C. VISUAL FLOW (UI/UX Navigation)
```
ProductionDashboard (Main Entry)
├── Dashboard 360° Tab (KPI View)
│   ├── KPI Cards (Active lines, Overdue, Deliveries, Value, Receivables)
│   ├── Production Schedule Chart (Daily workload visualization)
│   ├── Risk Alerts Panel (Overdue, Due Soon, Missing Data)
│   ├── Capacity & Rhythm Section
│   ├── Financial Summary Section
│   ├── Status Distribution Chart (Units/Meters by Status)
│   ├── Top Clients Chart (By Units/Meters)
│   └── 7-Day Delivery Calendar
│
├── Control Panel Tab
│   ├── View Mode Selector
│   │   ├── Por Cotización (By Quote)
│   │   ├── Por Producto (By Product)
│   │   ├── Por Cliente (By Client)
│   │   └── Por Día (By Day - Calendar)
│   ├── Upload Section (Excel files)
│   ├── StatusTable (Detailed data grid)
│   ├── ProductSummaryView (Product cards)
│   ├── ProductionCalendarBoard (Daily schedule)
│   └── ClientDetailDrawer (Client info panel)
│
└── Archive Tab (Historical view)
    └── Delivered items only
```

---

## 6. CURRENT ARCHITECTURE & COMPONENTS

### Frontend Architecture

**Pages** (Top-level routes):
- `/pages/ProductionDashboard.tsx` (2180 lines) - Main dashboard entry point
- `/pages/ProductionControlPanel.tsx` - Management & editing interface
- `/pages/ProductionArchive.tsx` - Historical records

**Module Components** (`/src/modules/statusProduccion/components/`):
1. **StatusTable.tsx** (4479 lines) - Complex table for quote/product editing
   - Multiple view modes (quotes, products, clients)
   - Inline editing for dates, status, notes, payments
   - PDF export functionality
   - Sorting and filtering

2. **ProductionCalendarBoard.tsx** (545 lines) - Calendar visualization
   - Daily production schedule grid
   - Click to view/edit daily items
   - Manual vs. automatic scheduling indicators

3. **ProductSummaryView.tsx** (259 lines) - Product summary cards
   - Supervisor KPIs
   - Quick filters (delayed, at risk, upcoming)
   - Alert summaries

4. **DailyProductionModal.tsx** (640 lines) - Daily plan editor
   - Add/edit daily production quantities
   - Meters vs. units tracking
   - Progress tracking

5. **StockPlanningUploadModal.tsx** (552 lines) - Stock inventory manager
   - Parse stock planning Excel
   - Daily programming by product
   - Warehouse assignment

6. **ClientDetailDrawer.tsx** (272 lines) - Client information panel
   - Client summary statistics
   - Related orders
   - Financial details

7. **FinancialDetailModal.tsx** (245 lines) - Payment tracking
   - Payment history
   - Add new payments
   - Outstanding balance calculation

8. **ProductProgressCard.tsx** (292 lines) - Individual product status card
   - Status indicator
   - Delivery date countdown
   - Progress metrics

9. **SupervisorKPIs.tsx** (138 lines) - Supervisor dashboard metrics
   - On-time delivery rate
   - Overdue items count
   - Workload distribution

10. **UploadCard.tsx** (115 lines) - File upload interface
    - Drag & drop support
    - Multiple file selection

### Hooks (Data Management)

**`useActiveProductionItems.ts`** (143 lines)
- Fetch active production items
- Upload quotations
- Update item details
- Delete quotes
- Manage save state

**`useDailyPlans.ts`** (107 lines)
- Cache-based daily plan fetching (5-minute TTL)
- Concurrent request handling
- Plan preloading

**`useProductionSchedule.ts`** (44 lines)
- Fetch daily schedule (grouped by date)
- Loading & error states

**`useProductSummaryData.ts`** (366 lines)
- Aggregate product summaries
- Calculate alerts per product
- Delivery date analysis

**`useSupervisorKPIs.ts`** (182 lines)
- Calculate supervisor metrics
- On-time delivery calculations
- Workload distribution

**`useStockPlanningUpload.ts`** (119 lines)
- Parse stock planning Excel
- Confirm & save stock data

**`useArchivedProductionItems.ts`** (143 lines)
- Fetch delivered/archived items
- Update archived records

### Utilities

**`quantityUtils.ts`** (88 lines)
- Extract numeric quantities from text
- Detect units (meters vs. units)
- Format numbers for display

**`dateUtils.ts`** (185 lines)
- Date parsing and formatting
- Working day calculations
- Relative date descriptions

**`textUtils.ts`** - Text normalization
- Unicode handling
- String cleaning

---

## 7. DATABASE SCHEMA & RELATIONSHIPS

### Main Tables

**1. cotizaciones (ProductionQuote)**
```sql
CREATE TABLE cotizaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_cotizacion VARCHAR(64) UNIQUE INDEXED,
  tipo_produccion ENUM('cliente', 'stock'),
  numero_pedido_stock VARCHAR(50),
  cliente VARCHAR(255),
  bodega VARCHAR(100),
  responsable VARCHAR(100),
  contacto VARCHAR(255),
  proyecto VARCHAR(255),
  odc VARCHAR(128),
  valor_total DECIMAL(12,2),
  fecha_ingreso DATETIME,
  fecha_inicio_periodo DATE,
  fecha_fin_periodo DATE,
  fecha_vencimiento DATE,
  nombre_archivo_pdf VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME
);
```

**2. productos (ProductionProduct)**
```sql
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cotizacion_id INT FOREIGN KEY,
  descripcion TEXT,
  cantidad VARCHAR(128),
  valor_subtotal DECIMAL(12,2),
  fecha_entrega DATE,
  estatus ENUM('En cola', 'En producción', 'Producción parcial', 
               'Listo para retiro', 'En bodega', 'Entregado'),
  notas_estatus TEXT,
  factura VARCHAR(128),
  created_at DATETIME,
  updated_at DATETIME
);
```

**3. plan_diario_produccion (ProductionDailyPlan)**
```sql
CREATE TABLE plan_diario_produccion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT FOREIGN KEY,
  fecha DATE,
  metros DECIMAL(12,2),
  unidades DECIMAL(12,2),
  cantidad_sugerida DECIMAL(12,2),
  notas TEXT,
  is_manually_edited BOOLEAN,
  completado BOOLEAN,
  fecha_completado DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE(producto_id, fecha)
);
```

**4. pagos (ProductionPayment)**
```sql
CREATE TABLE pagos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cotizacion_id INT FOREIGN KEY,
  monto DECIMAL(12,2),
  fecha_pago DATE,
  descripcion VARCHAR(255),
  created_at DATETIME
);
```

**5. production_data (ProductionMonthlyData)**
```sql
CREATE TABLE production_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT INDEXED,
  year INT INDEXED,
  month INT,
  period_year INT,
  period_month INT,
  metros_producidos DECIMAL(15,2),
  metros_vendidos DECIMAL(15,2),
  unidades_producidas DECIMAL(15,2),
  unidades_vendidas DECIMAL(15,2),
  capacidad_instalada DECIMAL(15,2),
  created_at DATETIME,
  updated_at DATETIME
);
```

**6. production_config (ProductionConfigModel)**
```sql
CREATE TABLE production_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  year INT,
  capacidad_maxima_mensual DECIMAL(15,2),
  costo_fijo_produccion DECIMAL(15,2),
  meta_precio_promedio DECIMAL(15,2),
  meta_margen_minimo DECIMAL(5,2),
  last_updated TIMESTAMP,
  UNIQUE(company_id, year)
);
```

**7. production_combined_data (ProductionCombinedData)**
```sql
CREATE TABLE production_combined_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  year INT,
  data JSON,
  last_updated TIMESTAMP,
  UNIQUE(company_id, year)
);
```

### Entity Relationships

```
ProductionQuote (1) → (M) ProductionProduct
ProductionQuote (1) → (M) ProductionPayment
ProductionProduct (1) → (M) ProductionDailyPlan
```

---

## 8. UI COMPONENTS FOR PRODUCTION STATUS

### Dashboard Components

**KpiCard**
- Displays single metric (label + value)
- Optional color indicator (red for alerts)
- Used for: Active lines, Overdue count, Deliveries, Value, Receivables

**StatusTable**
- Main data grid for production items
- Multiple view modes:
  - Quotes view: Grouped by cotización
  - Products view: Granular product level
  - Clients view: Aggregated by client
  - Calendar view: Daily schedule
- Features:
  - Inline editing (dates, status, notes)
  - Quick save indicators
  - Payment management
  - PDF export (jsPDF with autoTable)

**ProductionCalendarBoard**
- Visual calendar grid for daily planning
- Color coding:
  - Manual entries (amber ring)
  - Automatic entries (blue border)
  - Today (primary border with glow)
  - Weekends (faded background)
- Click-to-edit daily items

**RiskAlertPanel**
- Visual alerts for problematic items
- Alert types:
  - Overdue (High severity)
  - Due soon (Medium severity)
  - Missing date (Medium severity)
  - Missing status (Low severity)
- Clickable to navigate to item

**FinancialSummarySection**
- Total active quote value
- Overdue value
- Ready for pickup value
- Outstanding receivables
- All with currency formatting

**ProductSummaryView**
- Product-level summary cards
- Quick filters (All, Delayed, At Risk, Upcoming 3d, No Date)
- Search functionality
- Supervisor KPIs integration

**DailyProductionModal**
- Date-based production planning
- Add daily quantities (metros/unidades)
- Quantity unit detection
- Manual edit tracking
- Completion status

**StockPlanningUploadModal**
- Excel parsing for stock inventory
- Daily programming visualization
- Warehouse assignment
- Confirmation workflow

---

## 9. KEY API ENDPOINTS

### Dashboard & KPIs
- `GET /api/production/dashboard/kpis` → DashboardKpisResponse
  - Returns: KPI cards, charts, alerts, financial summary, data gaps

### Quotations & Products
- `POST /api/production/quotes` → Upload Excel files
- `GET /api/production/items/active` → Active items list
- `GET /api/production/items/archived` → Delivered items
- `PUT /api/production/items/{item_id}` → Update item (status, dates, notes)
- `DELETE /api/production/quotes/{quote_id}` → Delete quotation

### Daily Planning
- `GET /api/production/items/{item_id}/daily-plan` → Get daily plan
- `POST /api/production/items/{item_id}/daily-plan` → Create/update daily plan
- `GET /api/production/schedule` → Daily schedule (grouped by date)

### Stock Planning
- `POST /api/production/stock-planning/parse` → Parse stock Excel
- `POST /api/production/stock-planning/confirm` → Save stock plan

---

## 10. DATA PROCESSING FLOWS

### KPI Calculation Flow
```
1. Query active products (not Entregado, not En Bodega)
2. Separate by date windows:
   - Today (ingresos_hoy)
   - This week (ingresos_semana, entregas_semana)
   - For delivery (due_next_7)
   - Overdue (today > fecha_entrega)
3. Extract quantities (quantity_numeric, unit type)
4. Aggregate by status → status_breakdown
5. Identify data gaps → data_gaps
6. Calculate financial metrics:
   - Total valor_total from quotes with active products
   - Total abonado from payments
   - Calculate saldo_por_cobrar
7. Detect risk alerts:
   - Overdue: alert type = "overdue", severity = "high"
   - Due soon: alert type = "due_soon", severity = "medium"
   - Missing dates: alert type = "missing_date", severity = "medium"
   - Missing status: alert type = "missing_status", severity = "low"
8. Build daily workload chart (21-day lookforward)
9. Return DashboardKpisResponse
```

### Excel Parsing Flow
```
1. Read Excel with pandas
2. Clean cell contents (whitespace, accents)
3. Detect quote number:
   - Search for "COT" pattern
   - Format: COT-XXXXX
4. Detect headers (first 50 rows):
   - Look for: CANT, UNID, DESCRIPCION, SUBTOTAL/VALOR
   - Map column indices
5. Extract product rows:
   - Iterate from header+1 to first TOTAL row
   - Skip metadata (CONDICIONES, TIEMPO, etc.)
   - Parse quantity + unit
   - Parse decimal subtotal (handling comma/dot)
   - Deduplicate by (description, quantity, subtotal)
6. Extract metadata:
   - Cliente: search regex pattern
   - Contacto, Proyecto, ODC: search patterns
   - Payment terms, delivery estimates
7. Return parsed dict with:
   - numero_cotizacion
   - cliente
   - productos (list with descripcion, cantidad, valor_subtotal)
   - metadata_notes
```

---

## 11. CURRENT IMPLEMENTATION SUMMARY

### Strengths
1. **Multi-view Interface**: Quote, Product, Client, and Calendar views for different workflows
2. **Smart Parsing**: Intelligent Excel extraction with metadata filtering
3. **Real-time KPIs**: Comprehensive dashboard with 10+ metrics
4. **Risk Detection**: Automatic alert generation for overdue and missing data
5. **Payment Tracking**: Full payment history and receivables calculation
6. **Daily Planning**: Granular production scheduling with manual/automatic tracking
7. **Stock Management**: Separate flow for inventory planning
8. **Responsive Design**: Mobile-friendly UI with dark theme support

### Data Model Highlights
1. Clear separation: Quotations → Products → Daily Plans → Payments
2. Flexible quantity tracking: Supports both meters and units
3. Status progression: 6-state production lifecycle
4. Metadata handling: Distinguishes metadata from actual product lines
5. Audit trail: created_at, updated_at on all major tables

### Frontend Patterns
1. Custom hooks for data fetching and caching
2. React context for external navigation
3. Modal-based editing interfaces
4. PDF export with jsPDF
5. Intelligent sorting and filtering

---

## 12. TECHNOLOGY STACK

**Frontend**:
- React + TypeScript
- TailwindCSS (dark theme)
- Recharts (data visualization)
- jsPDF + jsPDF-autotable (PDF export)
- Lucide icons
- Axios (HTTP client)

**Backend**:
- Python (FastAPI)
- SQLAlchemy ORM
- Pandas (Excel parsing)
- MySQL database
- JWT authentication

**Key Libraries**:
- openpyxl / xlrd (Excel reading)
- unicodedata (text normalization)
- regex (pattern matching)

