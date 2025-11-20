# Production Dashboard & Status Producción - Overview Único

## Qué es
Módulo operativo de producción (frontend React + backend FastAPI) que gestiona cotizaciones, productos, planes diarios, estatus, cobros y reportes (KPIs, panel, calendario, estado de cuenta).

## Frontend (React/TS) - rutas clave
- Páginas: `src/pages/ProductionDashboard.tsx` (KPI 360°), `src/pages/ProductionControlPanel.tsx` (vistas por cotización/producto/cliente/día/estado de cuenta), `src/pages/ProductionArchive.tsx` (histórico).
- Componentes núcleo de Status Producción: `src/modules/statusProduccion/components/StatusTable.tsx`, `ProductionCalendarBoard.tsx`, `ProductSummaryView.tsx`, `ClientDetailDrawer.tsx`, `FinancialDetailModal.tsx`, `SupervisorKPIs.tsx`, `ProductProgressCard.tsx`, `UploadCard.tsx`, `StockPlanningUploadModal.tsx`, `DailyProductionModal.tsx`, `AccountStatusReport.tsx`.
- Hooks: `useActiveProductionItems.ts`, `useProductionSchedule.ts`, `useDailyPlans.ts`, `useSupervisorKPIs.ts`, `useArchivedProductionItems.ts`, `useProductSummaryData.ts`.
- Tipos/servicios: `src/types/production.ts`, `src/services/api.ts`.
- Utilidades y filtros: `src/modules/statusProduccion/utils/*.ts`, `src/components/filters/AdvancedFilters.tsx`, `QuickFilters.tsx`.
- Rutas app: `src/App.tsx` (tabs: status, bi-ventas).

## Backend (FastAPI) - rutas clave
- Modelos: `models/production.py` (ProductionQuote, ProductionProduct, ProductionDailyPlan, ProductionPayment, ProductionMonthlyData, ProductionConfigModel, ProductionCombinedData).
- Endpoints principales: `routes/production_status.py` (GET /api/production/dashboard/kpis; CRUD de items; upload cotizaciones; schedule; stock planning; estado de cuenta), `routes/production_data_api.py` (agregados).
- Config: `config.py`. DB init: `database/`.

## Vistas y funciones principales
- **Dashboard 360°**: KPIs, carga por status, alertas de riesgo, capacidad/ritmo, resumen financiero, distribución, top clientes, calendario 7 días, calidad de datos.
- **Panel de Control**: vistas por cotización/producto/cliente/día; tabla editable, filtros inline, uploads (cotizaciones, stock), plan diario. Cada cotización permite editar la ODC directamente en la matriz (campo inline + guardar) y muestra un “estado primario” unificado, igual al que exporta el PDF.
- **Archivo histórico**: entregados/archivados. UI basada en tarjetas y chips de fechas de despacho (top recientes + “ver todos”) con botones de selección rápida en lugar de la tabla masiva original.
- **Estado de Cuenta**: preset Pendientes/Completado/Todos, quick toggles (vencido, por vencer, sin factura), badges de vencimiento/pago. Tabla sortable por cualquier columna, badges clicables para fijar status, export PDF con el mismo look & feel premium del resto del módulo.
- **Reportes/Export**: PDF desde StatusTable (con columnas ODC + fechas de entrega/despacho) y desde el estado de cuenta.

## Modelo de datos (resumen)
- ProductionQuote (cotizaciones): cliente/bodega, contacto, proyecto, ODC, valor_total, fechas ingreso/vencimiento, PDF, relación 1:N con productos y pagos.
- ProductionProduct (productos): descripción, cantidad (string con unidad), valor_subtotal, fecha_entrega, estatus (enum), notas, factura, guía, fecha_despacho, relación con plan_diario.
- ProductionDailyPlan: fecha, metros/unidades, notas, manual/auto, completado.
- ProductionPayment: monto, fecha_pago, descripción.
- Enums estatus: En cola, En producción, Producción parcial, Listo para retiro, En bodega, Entregado.

## Filtros (StatusTable y Estado de Cuenta)
- Query, cliente, estatus, tipo de pedido (cliente/stock), rango de fechas, presets de vencimiento (vencido/por vencer/al día/pagado), toggle sin factura, presets Pendientes vs Completado.
- Click en cliente/cotización/producto aplica filtro automático; en el estado de cuenta también puedes fijar el status tocando el badge en la tabla.

## Endpoints destacados
- GET `/api/production/dashboard/kpis` → `DashboardKpisResponse`.
- GET `/api/production/items/active|archive|all` → `ProductionStatusResponse`.
- PUT `/api/production/items/{id}` → `ProductionUpdatePayload` (estatus, fechas, notas, factura/guía/despacho, pagos).
- POST `/api/production/quotes` (upload Excel) / DELETE `/api/production/quotes/{quote_id}`.
- GET `/api/production/dashboard/schedule` (cronograma diario).
- Stock planning: POST parse/confirm.
- GET `/api/production/account-status` (estado de cuenta, presets, filtros y PDF en frontend).

## Lógica de KPIs (resumen)
- Ítems activos: estatus no entregado/en bodega. Atrasados por fecha_entrega < hoy; por vencer (0–3 días); próximos 7 días. Riesgos limitados (top severidad). Calendario diario mezcla plan manual y entrega, con reglas por tipo stock/cliente.

## Multiempresa y auth
- Todos los queries filtran por `company_id` (tenant). JWT + roles (admin/supervisor/user). Tenant obtenido de headers o `current_user.company_id`.

## Ruta rápida de archivos
Frontend base: `src/pages`, `src/modules/statusProduccion/**`, `src/types/production.ts`, `src/services/api.ts`. Backend base: `routes/production_status.py`, `models/production.py`, `config.py`.

## Notas operativas recientes
- `useActiveProductionItems` y `/api/production/items/active` ya omiten items entregados con saldo <= USD 0.01, de modo que la vista principal solo muestra casos vivos; los saldados pasan al histórico.
- `ProductionArchive` ahora expone chips/cards de fechas de despacho (selección rápida, botón “Mostrar todas las fechas”) para hacer el filtro intuitivo.
- `StatusTable` (vista por cotización) soporta edición inline de ODC, reordena estados para mostrar el principal y exporta PDFs con ODC + fechas.
- `AccountStatusReport` ganó sort inteligente, filtros via badges y PDF con la estética premium del módulo; sirve como referencia para cualquier auditoría de cartera.
