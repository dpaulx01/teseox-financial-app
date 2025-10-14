Status Producción – Visión General del Módulo
============================================

Propósito
---------
El módulo **Status Producción** centraliza el seguimiento operativo de las cotizaciones procesadas. Su interfaz principal es un **Cuadro de Mando Inteligente** que permite:

- **Visualizar KPIs clave**: Ofrece una vista gerencial del estado de la producción en tiempo real.
- **Gestionar producción activa**: Proporciona un panel de control operativo para los ítems que están en cola o en proceso.
- **Consultar registros históricos**: Mantiene un archivo de todos los ítems ya entregados.
- **Carga de archivos**: Permite registrar nuevas cotizaciones (PDF/Excel) y extraer automáticamente sus datos.
- **Gestión de cartera**: Facilita el seguimiento de facturas, vencimientos y pagos.

Arquitectura del Cuadro de Mando (Frontend)
-------------------------------------------
La interfaz principal es `ProductionDashboard.tsx`, que se organiza en tres vistas accesibles por pestañas:

### 1. Dashboard 360° (Vista Gerencial)
- Tarjetas con KPIs clave (Pedidos en Producción, Atrasados, Listos para Retiro, Valor Activo y Saldo por Cobrar).
- **Agenda diaria de producción**: gráfico de áreas (`ComposedChart`) que reparte metros y unidades planificadas día a día (M–V) hasta 21 días hacia adelante.
- **Carga de Producción por Estado** (`PieChart`) y **Clientes con mayor carga** (`BarChart`) para entender la distribución por estatus y top clientes.
- Listado de alertas operativas, métricas de capacidad y próximos vencimientos totalmente sincronizados con los datos del panel.

### 2. Panel de Control de Producción
- Tabla interactiva (`StatusTable.tsx`) con cuatro vistas conmutables:
  1. **Por cotización**: foco en cartera, progreso agregado y notas por cotización. La columna financiera muestra total, saldo y abre el modal de cobros.
  2. **Por producto**: listado granular; cada producto repetido se destaca con una franja de color y muestra capacidad diaria estimada.
  3. **Por cliente**: resumen ejecutivo con totales de metros/unidades, saldos y próximos compromisos.
  4. **Por día (agenda)**: tablero mensual tipo kanban que agrupa la producción por días hábiles. Ofrece navegación entre meses, tarjetas con carga total y modal de detalle (metros, unidades, productos, plan manual).
- Los filtros superiores (búsqueda, cliente, estatus, rango de fechas) afectan a todas las vistas. Las líneas catalogadas como “servicio” se excluyen automáticamente.
- Edición en línea de fechas de entrega, estatus y notas; el autoguardado (debounce 1.5 s) mantiene indicadores de estado por fila.
- La carga de cotizaciones ahora se activa desde un botón flotante “Subir cotización” que abre un modal centrado (`UploadCard`) para drag & drop o selección manual, liberando el espacio principal para los tableros.

### 3. Archivo Histórico
- Tabla con los ítems en estado **"Entregado"**, utilizable para trazabilidad. Comparte la vista “por cotización” sin controles de edición.

Arquitectura Back-End (`routes/production_status.py`)
-----------------------------------------------------
El backend ha sido actualizado para soportar el nuevo cuadro de mando.

1. **Nuevos Endpoints de Dashboard:**
   - **`GET /api/production/dashboard/kpis`**: Endpoint dedicado que calcula y devuelve todos los KPIs y datos para los gráficos de la vista gerencial.

2. **Endpoints de Items Segmentados:**
   - El antiguo `GET /api/production/items` ha sido refactorizado en tres endpoints específicos:
     - **`GET /api/production/items/active`**: Devuelve solo los productos activos (usado por el Panel de Control).
     - **`GET /api/production/items/archive`**: Devuelve solo los productos entregados (usado por el Archivo Histórico).
     - **`GET /api/production/items/all`**: Devuelve todos los productos (disponible para usos generales).

3. **Carga y Actualización (Sin cambios mayores):**
   - **`POST /api/production/quotes`**: Sigue manejando la carga y parseo de archivos PDF y Excel.
   - **`PUT /api/production/items/{id}`**: Sigue siendo el endpoint para actualizar un ítem individual, ahora llamado por el sistema de autoguardado.

Algoritmos y Lógica Relevante
----------------------------------

### Cálculo de Progreso (`computeProgress`)
- Se calculan los días hábiles entre `fecha_ingreso` (o hoy si ya pasó) y `fecha_entrega`, y se distribuye la cantidad total para obtener una tasa diaria uniforme.
- El avance por tiempo se basa en los días hábiles cumplidos; si no hay cantidad se usa sólo el estatus.
- El estatus manual sigue actuando como piso, pero ya no fuerza el 50%; si aún no empezó (día 0) se limita a un 10% máximo hasta que avance el calendario.
- La estimación producida (`producedEstimate`) se deriva del avance diario y alimenta tooltips y métricas de capacidad.

### Agenda de producción (Dashboard)
- `GET /api/production/dashboard/kpis` calcula `daily_workload`, un arreglo de fechas con metros y unidades distribuidos exclusivamente en días laborables según el calendario ecuatoriano; los periodos inician en el primer día hábil disponible y, si hay atrasos o feriados, se concentran en el siguiente día hábil.
- El frontend representa la agenda con un `ComposedChart` de dos áreas y métricas agregadas (total planificado, próximos 7 días, promedio diario).

### Control diario de producción
- El modelo `plan_diario_produccion` permite registrar manualmente la producción real por producto y día hábil; estos valores reemplazan la distribución automática en `daily_workload` y alimentan el tablero “Por día”.
- Endpoints disponibles:
  - `GET /api/production/items/{id}/daily-plan` y `PUT /api/production/items/{id}/daily-plan`. Validan días hábiles ecuatorianos y exigen que la suma manual coincida exactamente con la cantidad comprometida en la cotización (sin excedentes ni faltantes).
  - `GET /api/production/dashboard/schedule` entrega la agenda diaria: totales por día (metros/unidades/capacidad opcional), bandera de plan manual y lista detallada de productos. Sirve tanto para el ComposedChart del dashboard como para el tablero “Por día”.
- En la vista “Por producto”, cada fila ofrece la acción **Control diario** (modal) que precarga la distribución promedio, permite ajustes manuales y valida capacidades antes de guardar.

### Autoguardado con Debounce (Frontend)
- El componente `StatusTable.tsx` ahora gestiona el estado de todos los formularios de las filas.
- Un `useEffect` observa los cambios en un conjunto de `dirtyRowIds` (filas con cambios).
- Cuando los cambios se detienen por 1.5 segundos, un `setTimeout` dispara la función `handleAutoSave`.
- `handleAutoSave` crea y envía todas las peticiones de guardado para las filas modificadas en paralelo (`Promise.allSettled`).
- Un estado `savingStatus` por fila (`Record<number, 'saving' | 'success' | 'error'>`) se pasa a `ProductionRow` para mostrar el indicador visual correspondiente.

Referencias Principales
-----------------------
- **Dashboard UI**: `src/pages/ProductionDashboard.tsx`
- **Control Panel UI**: `src/pages/ProductionControlPanel.tsx`
- **Tabla y tablero**: `src/modules/statusProduccion/components/StatusTable.tsx`, `ProductionCalendarBoard.tsx`, `DailyProductionModal.tsx`
- **Hooks de Datos**: `useActiveProductionItems.ts`, `useArchivedProductionItems.ts`, `useProductionSchedule.ts`
- **Endpoints**: `routes/production_status.py`
- **Modelos compartidos**: `src/types/production.ts`
- **Carga/Modal**: `src/modules/statusProduccion/components/UploadCard.tsx`
