Status Producción – Radiografía del Módulo
==========================================

> Última revisión: 19-oct-2025 (supervisor: producción cerámica & acabados)

Propósito y Alcance
-------------------
El módulo **Status Producción** concentra toda la operación productiva posterior a la comercialización. Desde la carga automática de cotizaciones hasta el seguimiento diario por líneas, responde a tres perfiles:

- **Dirección / Gerencia**: visión 360° con KPIs financieros y de carga.
- **Supervisión operativa**: tablero interactivo para reasignar fechas, monitorear alertas y planificar recursos.
- **Analistas / Back-office**: histórico entregado, control de cartera y trazabilidad documental.

Visión de Usuario
-----------------
1. **Ingreso de cotizaciones** (PDF/Excel) → extracción automática de productos, cantidades, valores, estatus iniciales y pagos asociados.
2. **Panel de control** para ajustar fechas de entrega, registrar notas, reprogramar cargas diarias (manual o automática) y revisar documentos.
3. **Dashboard 360°** con métricas vivas: pedidos atrasados, avance por cliente, capacidad (metros/unidades) y agenda operacional.
4. **Archivo histórico** para auditar entregas y alimentar informes financieros.

Arquitectura Frontend
---------------------
Principalmente React 18 + Vite (archivo `src/pages/ProductionDashboard.tsx`). Se apoya en hooks dedicados, servicios centralizados (`services/api.ts`) y componentes modulares bajo `src/modules/statusProduccion`.

### 1. Dashboard 360°
- **Tarjetas KPI** (`KpiCard`): líneas activas, pedidos atrasados, entregas próximos 7 días, valor activo y saldo por cobrar. Datos: `kpi_cards` del endpoint `/api/production/dashboard/kpis`.
- **Agenda de producción (metros/unidades)**:
  - Gráfico `ComposedChart` (Recharts) configurable mediante un **selector de rango operativo** (`Semana`, `15 días`, `Mes`) con navegación hacia adelante / atrás.
  - Resumen superior: totales del rango, fechas límite y cobertura futura disponible.
  - Se apoya en estado local `rangeType`, `rangeOffset` y filtra `daily_workload` devuelto por la API. Si un rango no tiene producción, muestra aviso contextual.
- **Distribución por estatus** (`BarChart`): cruza unidades + metros y muestra detalle por estatus (tabla auxiliar).
- **Clientes con mayor carga** (`BarChart` vertical):
  - Tooltip enriquecido (`renderTopClientsTooltip`) con unidades/metros/valor, ajustado para leer tanto `total_*` como `unidades/metros` según el payload.
- **Alertas operativas** (`risk_alerts`): atrasos, entregas próximas, faltantes de fecha/estatus. Se ordenan por severidad (alto > medio > bajo) y son accionables: un clic abre el Panel de Control filtrado en el producto/cotización correspondiente.
- **Calidad de datos** (`data_gaps`): resume incidencias como falta de programación, fecha, estatus, cliente, cantidad o factura. Muestra chips con contadores y un listado de ítems con badges por tipo de brecha; cada entrada permite saltar directamente al panel para completar la información.
- **Snapshot de carga** (`workload_snapshot`): ingresos por día/semana, entregas programadas y promedio de plazos / retrasos.
- **Próximas entregas**: lista priorizada con fechas formateadas (`formatDate`); cada entrega abre el panel enfocado en el producto.

### 2. Panel de Control (vista `control_panel`)
- Componente raíz `ProductionControlPanel` + `StatusTable.tsx`.
- Cuatro sub-vistas con toggles:
  1. **Por cotización**
  2. **Por producto**
  3. **Por cliente**
  4. **Agenda diaria (tablero mensual)**
- **Agenda mensual** (`ProductionCalendarBoard.tsx`):
  - Render tipo calendario (filas=semanas, columnas=lunes-domingo).
  - Permite navegar entre meses; cada día muestra totales de metros/unidades, capacidad, productos, badge manual/auto y abre modal detallado.
  - Modal (`DayDetailModal`) agrega agrupación por producto, totales y etiquetas de manual vs. auto.
  - Utiliza helper `parseScheduleDate` para evitar desfases de huso horario.
- **Edición en línea**:
  - Inputs con autoguardado (`useDebouncedEffect`) para fechas, estatus, notas.
  - Se integra con `financialAPI.updateProductionItem`.
- **Carga de documentos**:
  - Botón flotante abre `UploadCard` (drag & drop); delega a `POST /api/production/quotes`.
- **Filtros globales**: texto libre, cliente, estatus, rango de entrega, ordenamiento.

### 3. Archivo Histórico
- Comparte backbone de `StatusTable` pero se alimenta con `/api/production/items/archive`.
- No permite edición; se usa para auditoría y reconstrucción de reportería financiera.

Hooks y Servicios Frontend
--------------------------
- **`useProductionDashboard`** (contenido dentro de `ProductionDashboard.tsx`):
  - Maneja la carga inicial y refrescos del Dashboard 360° (`financialAPI.getDashboardKpis()`).
  - Define utilidades de formato (números/moneda/fechas).
- **`useProductionSchedule`**: consulta `/dashboard/schedule` para alimentar el tablero mensual (Panel → Agenda). Gestiona loading/error y normaliza datos.
- **Servicios REST** (`services/api.ts`):
  - `getDashboardKpis`, `getProductionSchedule`, `getActiveProductionItems`, `getArchivedProductionItems`, `updateProductionItem`, `get/saveProductionDailyPlan`, etc.
  - Centraliza headers (incluye bearer token) y manejo de respuestas Axios.

Backend – Endpoints Clave (`routes/production_status.py`)
---------------------------------------------------------
### A. Dashboard 360° (`GET /api/production/dashboard/kpis`)
Genera un `DashboardKpisResponse` con los bloques:

- **kpi_cards**: totales de líneas activas, atrasados, próximos 7 días, valor activo, saldo por cobrar.
- **production_load_chart**: suma metros + unidades por estatus activo.
- **status_breakdown**: desglose con valor económico, porcentaje sobre total de líneas y cantidades.
- **risk_alerts**: prioridad por severidad y días de atraso/entrega.
- **workload_snapshot**: ingresos diarios/semanales, entregas de la semana, promedios de plazo y retraso.
- **financial_summary**: sumatoria de valores en producción, valor de cotizaciones activas (distintas a la suma de productos), valor atrasado, listo para retiro y saldo por cobrar.
- **top_clients**: top 5 clientes por metros luego unidades.
- **upcoming_deliveries**: compromisos con entrega dentro de 7 días.
- **data_gaps**: conteos de productos sin fecha, estatus, cliente o cantidad interpretable.
- **daily_workload**: distribución diaria en días hábiles (lunes-viernes) para los próximos 21 días y hasta 31 días de histórico dentro del mes actual.

**Novedades recientes (oct-2025)**:
- Se respeta `min_allowed_date`: incluye producción manual o automática del mes en curso aunque sea previa a hoy.
- Planes manuales usan el día ingresado; sólo ajustan a día hábil anterior si cae en fin de semana.
- Entregas vencidas se reubican al último hábil disponible (no se "empujan" al futuro).

### B. Agenda diaria (`GET /api/production/dashboard/schedule`)
- Devuelve `DailyScheduleResponse` con días ordenados por fecha.
- Considera producción manual (`plan_diario_produccion`) y auto-distribución usando fechas de ingreso / entrega.
- Aplica reglas de días hábiles ecuatorianos (festivos calculados vía `_get_ecuador_holidays` + fallback).
- Fuentes para Dashboard y tablero mensual comparten lógica.

### C. Items & Planes
- **`GET /api/production/items/active` / `archive` / `all`**: segmenta según `estatus` (excluye entregados del panel activo).
- **`GET /api/production/items/{id}/daily-plan`** y **`PUT .../daily-plan`**: gestionan el plan manual por producto (incluye flag `is_manually_edited`).
- **`PUT /api/production/items/{id}`**: actualiza campos editables (estatus, fechas, notas, montos).
- **`DELETE /api/production/quotes/{quote_id}`**: limpieza completa de una cotización.

### D. Carga de Cotizaciones (`POST /api/production/quotes`)
- Procesa PDF/Excel, limpian metadatos (`_is_metadata_description`), detecta productos y cantidades (`_extract_quantity_info`), y persiste en base.
- Genera entradas en `cotizaciones`, `productos`, `pagos`.

Lógica Operativa Destacada
--------------------------
- **Identificación de metadatos**: `_is_metadata_description` descarta filas que representan ODC, condiciones o notas.
- **Detección de servicios**: `_is_service_product` filtra ítems que no deben computarse en métricas de producción.
- **Parsing de cantidades**: `_extract_quantity_info` reconoce unidades (metros vs. unidades) y normaliza decimales.
- **Calendario laboral**:
  - Festivos ecuatorianos vía `holidays` (con fallback en caso de error).
  - Funciones `_is_working_day`, `_next_working_day`, `_previous_working_day`, `_iter_working_days`.
- **Distribución automática**: reparte cantidades uniformemente entre días hábiles desde `fecha_ingreso` (o hoy) hasta el día laboral previo a `fecha_entrega`.
- **Planes manuales**: prioridad sobre distribución automática; se respeta la fecha ingresada, se marca `manual=True` y alimenta tanto `daily_workload` como los tableros.
- **Capacidad**: se suma metros + unidades por día y se limita el porcentaje a 999 para evitar overflow en cards.

Base de Datos
-------------
Tablas clave (`models/production.py`):

- **`cotizaciones`**: encabezados con `numero_cotizacion`, `cliente`, `valor_total`, `fecha_ingreso`, etc.
- **`productos`**: líneas de producción con `descripcion`, `cantidad`, `valor_subtotal`, `fecha_entrega`, `estatus`, `notas_estatus`, relación 1:N con cotizaciones.
- **`plan_diario_produccion`**: plan manual diario por `producto_id`, campos `metros`, `unidades`, `fecha`, `is_manually_edited`.
- **`pagos`**: registros de abonos relacionados a la cotización (para saldo por cobrar).

Otros componentes:
- **Vistas**: `v_financial_summary`, `v_production_summary` (compatibilidad legacy).
- **Migraciones**: `database/migrations/20241015_add_manual_edit_flag.sql` agrega `is_manually_edited`.
- **Scripts init**: `docker/mysql/rbac_schema.sql` carga usuario `admin` y roles; `init_db.sql` apto para entornos locales.

Autenticación & Seguridad
-------------------------
- Login (`/api/auth/login`) entrega JWT (`access_token` 24h + `refresh_token`). Usa `passlib` + bcrypt.
- Todos los endpoints de producción requieren `Authorization: Bearer`.
- Sesiones se almacenan en `user_sessions` con `token_hash`.

Flujo de Datos
--------------
1. **Carga inicial**:
   - Frontend → `financialAPI.getDashboardKpis()` (token en headers).
   - Backend calcula métricas, distribuye carga y retorna JSON completo.
   - React setea `kpiData`, formatea números y alimenta los gráficos.
2. **Navegación de la agenda**:
   - Rango seleccionado → filtra `daily_workload` en el cliente.
   - Resumen superior recalcula totales y cobertura.
   - Panel mensual (`useProductionSchedule`) consume `/dashboard/schedule` para mantener vista diaria consistente con el backend.
3. **Edición de producto**:
   - Inputs disparan `updateProductionItem` (PUT) con debounce.
   - Tras guardar, se recalculan progresos en memoria; el backend actualiza DB.
4. **Planes manuales**:
   - Modal de planificación llama `get/saveProductionDailyPlan`.
   - Backend ordena entradas, recalcula `is_manually_edited` y las incluye en la agenda.

Integración con otras áreas
---------------------------
- **Módulo financiero**: comparte cotizaciones, pagos y saldo (saldo por cobrar sincroniza con estados contables).
- **RBAC**: segregación vía roles (`admin`, `viewer`, etc.). Sólo perfiles con permiso `production:write` pueden editar.
- **Carga documental**: los archivos se guardan en `uploads/production`, enlazados a cada cotización para auditoría.
- **Logs**: `audit_logs` registra login, subidas, eliminaciones, cambios críticos.

Limitaciones y Próximos Pasos
-----------------------------
- Los rangos semana/quincena dependen del horizonte disponible; si se necesitan semanas anteriores, ampliar `min_allowed_date` (actualmente mes en curso o 31 días).
- Aún no existe vista comparativa plan vs. real consumiendo datos de sensores/fábrica.
- El backend aún genera advertencias por `bcrypt` en entornos sin la extensión; instalar `bcrypt>=4.0` puede silenciarlas.
- Se recomienda implementar paginación/virtualización en `StatusTable` para instalaciones con miles de líneas activas.
- Futuro: integrarlo con notificaciones push (alertas de atrasos) y reporte PDF automático.

Resumen
-------
El módulo Status Producción ofrece:

- **Visión integral** (Dashboard 360°) con rangos operativos flexibles.
- **Control fino** vía panel con edición en caliente y agenda mensual inteligente.
- **Procesamiento robusto** en backend (calendario laboral, planes manuales, métricas financieras).
- **Integración** con la base de datos de cotizaciones/pagos y con el sistema de autenticación RBAC.

Esta radiografía debe servir como base para onboarding, auditoría técnica y planificación de mejoras. Cualquier cambio estructural debe reflejarse aquí para mantener la documentación viva.***
