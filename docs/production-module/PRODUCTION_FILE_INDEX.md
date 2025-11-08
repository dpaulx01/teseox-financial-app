# PRODUCTION STATUS MODULE - FILE STRUCTURE INDEX

## Frontend Files

### Pages (Entry Points)
- `/src/pages/ProductionDashboard.tsx` - Main dashboard with 360° KPI view
- `/src/pages/ProductionControlPanel.tsx` - Management & editing interface
- `/src/pages/ProductionArchive.tsx` - Historical/delivered items view

### Components
- `/src/modules/statusProduccion/components/StatusTable.tsx` - Main data grid (4479 lines)
- `/src/modules/statusProduccion/components/ProductionCalendarBoard.tsx` - Calendar visualization
- `/src/modules/statusProduccion/components/ProductSummaryView.tsx` - Product summary cards
- `/src/modules/statusProduccion/components/DailyProductionModal.tsx` - Daily plan editor
- `/src/modules/statusProduccion/components/StockPlanningUploadModal.tsx` - Stock management
- `/src/modules/statusProduccion/components/ClientDetailDrawer.tsx` - Client info panel
- `/src/modules/statusProduccion/components/FinancialDetailModal.tsx` - Payment tracking
- `/src/modules/statusProduccion/components/ProductProgressCard.tsx` - Product status card
- `/src/modules/statusProduccion/components/SupervisorKPIs.tsx` - Supervisor metrics
- `/src/modules/statusProduccion/components/UploadCard.tsx` - File upload interface

### Hooks (Data Management)
- `/src/modules/statusProduccion/hooks/useActiveProductionItems.ts` - Active items management
- `/src/modules/statusProduccion/hooks/useArchivedProductionItems.ts` - Archived items management
- `/src/modules/statusProduccion/hooks/useDailyPlans.ts` - Daily plan caching (5-min TTL)
- `/src/modules/statusProduccion/hooks/useProductionSchedule.ts` - Schedule fetching
- `/src/modules/statusProduccion/hooks/useProductSummaryData.ts` - Product aggregation
- `/src/modules/statusProduccion/hooks/useSupervisorKPIs.ts` - Supervisor metrics
- `/src/modules/statusProduccion/hooks/useStockPlanningUpload.ts` - Stock planning

### Utilities
- `/src/modules/statusProduccion/utils/quantityUtils.ts` - Quantity parsing & formatting
- `/src/modules/statusProduccion/utils/dateUtils.ts` - Date utilities & calculations
- `/src/modules/statusProduccion/utils/textUtils.ts` - Text normalization

### Type Definitions
- `/src/types/production.ts` - All TypeScript interfaces for production module

### API Service
- `/src/services/api.ts` - API client with production endpoints
- `/src/utils/productionStorage.ts` - Local storage utilities
- `/src/utils/productionStorage-simple.ts` - Alternative storage

---

## Backend Files

### Routes & API Endpoints
- `/routes/production_status.py` - Main production status endpoints (2503 lines)
  - `GET /production/dashboard/kpis` - Dashboard KPIs
  - `POST /production/quotes` - Upload quotations
  - `GET /production/items/active` - Active items
  - `GET /production/items/archived` - Archived items
  - `PUT /production/items/{id}` - Update item
  - `DELETE /production/quotes/{id}` - Delete quote
  - `GET /production/items/{id}/daily-plan` - Get daily plan
  - `POST /production/items/{id}/daily-plan` - Create daily plan
  - `GET /production/schedule` - Get schedule
  - `POST /production/stock-planning/parse` - Parse stock Excel
  - `POST /production/stock-planning/confirm` - Confirm stock plan

- `/routes/production_data_api.py` - Aggregated production data endpoints
  - Monthly data management
  - Production configuration
  - Combined data analytics

### Database Models
- `/models/production.py` - SQLAlchemy models
  - `ProductionQuote` - Quotations
  - `ProductionProduct` - Products
  - `ProductionDailyPlan` - Daily plans
  - `ProductionPayment` - Payments
  - `ProductionMonthlyData` - Monthly aggregates
  - `ProductionConfigModel` - Configuration
  - `ProductionCombinedData` - JSON data storage

### Database Migrations
- `/database/migrations/20241005_add_plan_diario_produccion.sql` - Daily plan table
- `/docker/mysql/04-align-production-metrics.sql` - Align production data
- `/docker/mysql/05-add-production-rbac.sql` - RBAC for production
- `/docker/mysql/06-create-production-config.sql` - Config tables
- `/docker/mysql/07-create-sales-bi-module.sql` - Sales BI integration

---

## Database Tables

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `cotizaciones` | Quotations | numero_cotizacion, tipo_produccion, cliente, valor_total |
| `productos` | Products | descripcion, cantidad, valor_subtotal, fecha_entrega, estatus |
| `plan_diario_produccion` | Daily plans | fecha, metros, unidades, completado |
| `pagos` | Payments | monto, fecha_pago, descripcion |

### Analytics Tables
| Table | Purpose |
|-------|---------|
| `production_data` | Monthly aggregated data |
| `production_config` | Operational configuration |
| `production_combined_data` | JSON consolidated data |

---

## Key Implementation Files

### Parsing Logic
- `/routes/production_status.py` line 1186: `parse_quote_excel()` - Excel parsing function
- `/routes/production_status.py` line 890-920: Pattern definitions for metadata detection

### KPI Calculation
- `/routes/production_status.py` line 245: `get_dashboard_kpis()` - KPI endpoint
- Calculates: status_breakdown, risk_alerts, financial_summary, data_gaps, daily_workload

### Type Definitions
- `/src/types/production.ts` - Complete type definitions including:
  - ProductionItem, ProductionPayment
  - DailyProductionPlanEntry, DailyScheduleDay
  - StockPlanningData, DashboardKpisResponse

---

## Configuration Files

### API Configuration
- `/src/config/apiBaseUrl.ts` - Base API URL configuration
- `/src/services/api.ts` - API client initialization

### Database Configuration
- `/database/connection.py` - Database connection settings
- `/config.py` - Application configuration

---

## Testing & Documentation

### Documentation
- This report (comprehensive module documentation)
- File structure (this index)

### Example SQL
- `/database/init/01-create-database.sql` - Database setup
- `/database/init/02-enhanced-schema.sql` - Enhanced schema

---

## Total Line Count by File

| File | Lines | Purpose |
|------|-------|---------|
| StatusTable.tsx | 4479 | Main data grid component |
| ProductionDashboard.tsx | 2180 | Dashboard page |
| production_status.py | 2503 | Backend routes |
| DailyProductionModal.tsx | 640 | Daily plan editor |
| StockPlanningUploadModal.tsx | 552 | Stock management |
| ProductionCalendarBoard.tsx | 545 | Calendar component |
| useProductSummaryData.ts | 366 | Product aggregation hook |
| ProductProgressCard.tsx | 292 | Product card component |
| ClientDetailDrawer.tsx | 272 | Client panel component |
| ProductSummaryView.tsx | 259 | Product summary view |
| FinancialDetailModal.tsx | 245 | Payment modal |
| dateUtils.ts | 185 | Date utilities |
| useSupervisorKPIs.ts | 182 | Supervisor metrics hook |
| useActiveProductionItems.ts | 143 | Active items hook |
| useArchivedProductionItems.ts | 143 | Archived items hook |
| useStockPlanningUpload.ts | 119 | Stock planning hook |
| UploadCard.tsx | 115 | Upload component |
| useDailyPlans.ts | 107 | Daily plans hook |
| quantityUtils.ts | 88 | Quantity utilities |

**Total Module: ~9,077 lines**

---

## Quick Navigation Guide

### To Understand How Data Flows:
1. Start: `/src/pages/ProductionDashboard.tsx` - Main entry
2. API calls: `/src/services/api.ts` - What endpoints exist
3. Backend: `/routes/production_status.py` - How data is processed
4. Database: `/models/production.py` - Data structure

### To Add a New Feature:
1. Frontend: Add component to `/src/modules/statusProduccion/components/`
2. State: Add hook to `/src/modules/statusProduccion/hooks/`
3. Backend: Add endpoint to `/routes/production_status.py`
4. Database: Update `/models/production.py` if needed
5. Types: Update `/src/types/production.ts`

### To Modify Excel Parsing:
1. Main function: `/routes/production_status.py` line 1186
2. Metadata detection: `/routes/production_status.py` line 857-888
3. Quantity extraction: `/src/modules/statusProduccion/utils/quantityUtils.ts`

### To Modify Dashboard:
1. KPI logic: `/routes/production_status.py` line 245
2. Dashboard layout: `/src/pages/ProductionDashboard.tsx`
3. Charts: See Recharts integration in dashboard file

---

## API Request/Response Types

### All types defined in:
- `/src/types/production.ts`

### Key Types:
- `ProductionItem` - Individual product in quotation
- `ProductionStatusResponse` - List of items with status options
- `DashboardKpisResponse` - Complete dashboard data
- `DailyProductionPlanEntry` - Daily plan entry
- `DailyScheduleDay` - Daily schedule with items
- `StockPlanningParsedData` - Parsed stock Excel
- `RiskAlertItem` - Alert for dashboard

