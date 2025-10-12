Status Producción – Visión General del Módulo
============================================

Propósito
---------
El módulo **Status Producción** centraliza el seguimiento operativo de las cotizaciones procesadas (PDF o Excel). Permite:
- Registrar nuevos archivos y extraer automáticamente productos, valores y notas de programación.
- Gestionar cartera ligera (factura, fecha de vencimiento, pagos, saldo).
- Monitorear el avance de producción por ítem (estatus, fecha objetivo, progreso estimado).
- Consultar notas globales de la cotización (campo “Descripción:” del Excel) sin abrir el archivo original.

Arquitectura Back-End (`routes/production_status.py`)
-----------------------------------------------------
1. **Carga de archivos (`POST /api/production/quotes`)**
   - Recibe múltiples PDFs/XLS/XLSX.
   - Normaliza el nombre y guarda una copia en `uploads/production/<timestamp>_<nombre>`.
   - Identifica si es PDF o Excel y despacha a `parse_quote_pdf` o `parse_quote_excel`.
   - Si la cotización ya existe:
     - Limpia productos y pagos asociados.
     - Mantiene el ID, actualiza `fecha_ingreso`, datos de cabecera y valor total.

2. **Parseo de Excel (`parse_quote_excel`)**
   - Usa `pandas` + `xlrd`/`openpyxl` con encabezado libre (se detecta fila de tabla por palabras clave “Cant/Unid/Descripción/Subtotal”).
   - Limpia tildes y espacios para facilitar patrones.
   - Identifica cada línea de producto:
     - Descarta filas vacías o encabezados repetidos.
     - Detecta columnas de cantidad, unidad, subtotal, código.
     - Aplica `_parse_decimal` para normalizar números (tolera coma/punto y símbolos).
   - **Notas de programación**: `_is_metadata_description` filtra celdas que contienen:
     - Keywords (`TIEMPO DE PRODUCCION`, `PROGRAMACION`, `DESPACHO`, etc.).
     - Cadena separadora `||`.
     - Coincidencias con ODC.
     - Estas celdas se guardan en `metadata_notes`.
   - Calcula `valor_total` tomando el MAX entre:
     - El total explícito encontrado (líneas “TOTAL/GRAN TOTAL/SALDO”).
     - La suma de subtotales válidos.

3. **Parseo de PDF (`parse_quote_pdf`)**
   - Aplica heurísticas similares pero enfocadas a texto boleta/tablas con `pdfplumber`.
   - Extrae productos y totales; por ahora `metadata_notes` queda vacío.

4. **Persistencia**
   - Se crean instancias de `ProductionQuote` y `ProductionProduct`.
   - Cada nota global se guarda como `ProductionProduct` auxiliar (sin cantidad/subtotal) para facilitar queries; posteriormente se filtra en la vista.

5. **Lectura (`GET /api/production/items`)**
   - Devuelve todos los productos asociados, ordenados por `fecha_ingreso`.
   - `product_to_dict` adjunta:
     - Pagos ordenados por fecha.
     - Totales consolidados (monto de la cotización vs. suma de subtotales).
     - Saldo pendiente (`valor_total - total_abonado`, no negativo).
     - Array `metadataNotes` con notas únicas filtradas mediante `_is_metadata_description`.
   - Se incluye `statusOptions` con los valores válidos de `ProductionStatusEnum` para poblar selects.

6. **Actualización (`PUT /api/production/items/{id}`)**
   - Permite modificar campos operativos de un producto:
     - Fecha de entrega, estatus, notas, factura, fecha de vencimiento, valor total opcional (para ajustes) y pagos.
   - Persistencia automática del saldo calculado al recomputar pagos en el front.

Modelo de Datos (extracto `models/production.py`)
--------------------------------------------------
- `ProductionQuote`:
  - `numero_cotizacion`, `cliente`, `contacto`, `proyecto`, `odc`, `valor_total`.
  - Relación 1-N con `ProductionProduct` y `ProductionPayment`.
- `ProductionProduct`:
  - `descripcion`, `cantidad`, `valor_subtotal`.
  - Campos operativos: `fecha_entrega`, `estatus`, `notas_estatus`, `factura`.
  - Notas globales se almacenan aquí evaluando `descripcion`.
- `ProductionPayment`:
  - `monto`, `fecha_pago`, `descripcion`.

Arquitectura Front-End
----------------------
### Hook principal (`useStatusProduccion`)
- Carga inicial de ítems (`getProductionItems`).
- Maneja estado de carga, errores, y lista ordenada (fecha ingreso DESC, luego ID).
- Expone acciones:
  - `uploadQuotes`: envía `FormData` con archivos y refresca la tabla.
  - `updateItem`: PUT individual con payload de cartera/estatus.
  - `deleteQuote`: elimina toda la cotización (`DELETE /api/production/quotes/{id}`).
  - `resetUploadStatus`, `isSaving` por item y `refetch`.

### Componente de subida (`UploadCard.tsx`)
- Arrastrar y soltar múltiples archivos (10 máx).
- Acepta `.pdf`, `.xls`, `.xlsx` y muestra resultado del backend.

### Tabla (`StatusTable.tsx`)
Estructura multi-nivel con agrupación por cotización.

1. **Filtros y ordenamiento**
   - Filtros: búsqueda general, cliente/contacto, estatus, rango de fechas de ingreso.
   - Ordenamiento configurable por columnas clave (`fechaIngreso`, `ODC`, `cliente`, totales).

2. **Agrupación (`QuoteGroup`)**
   - Se construye un `Map` por `cotizacionId` que consolida:
     - `totalCotizacion`: máximo entre valor explícito y suma de subtotales válidos (igual que backend).
     - Pagos combinados y normalizados.
     - Saldo calculado (total - abonado).
     - `metadataNotes`: se almacenan en un `Set` para evitar duplicados. Se alimenta tanto de productos marcados como nota (backend) como del array `metadataNotes` recibido en cada item.

3. **Fila plegable `QuoteRow`**
   - Columna “Cliente / Proyecto”: muestra botón circular **Info** (Icono `Info`) que despliega popover con cada nota de programación (texto derivado de “Descripción:” del Excel).
   - Columna “Factura(s)”:
     - Campo para asignar factura actual.
     - Historial de facturas detectadas en los ítems (Set).
   - Columna “Cobro”:
     - Selector de fecha de vencimiento dentro del panel de cartera.
     - Mensaje contextual (vence hoy, vence en X días, vencido) con color según cercanía (`dueDateStatus`).
     - Saldo pendiente y total abonado.
     - Listado editable de pagos (monto, fecha, descripción) con eliminación individual.
     - Botón “Guardar cartera” que propaga updates a todos los productos del grupo.
   - Columna “Acciones”: botón para eliminar la cotización completa (confirma con `window.confirm`).
   - Métricas adicionales:
     - Progreso promedio del grupo (`overallProgress`), calculado con `computeProgress` reutilizando estatus y fechas individuales.
     - Totales formateados con `formatCurrency`.

4. **Detalle expandible `ProductionRow`**
   - Tabla hija con columnas: Producto, Cantidad, Fecha entrega, Progreso, Estatus, Notas, Acciones.
   - Calcula `totalCotizacion` de respaldo por item: usa el total del grupo, si no, el `valorTotal` del item, y en última instancia el `valorSubtotal`.
   - Formulario por item:
     - Fecha de entrega (date input).
     - Select de estatus (opciones de backend).
     - Campo de notas operativas.
     - Botón “Guardar” que envía payload limitado a ese producto.
   - `computeProgress` estima avance/tooltip combinando estatus, fecha objetivo y cantidad (si se puede parsear número de la columna `cantidad`).

Algoritmos y Utilidades Relevantes
----------------------------------
- **Normalización de texto y acentos**: `_strip_accents` + `_clean_line` garantizan comparaciones homogéneas.
- **Detección de notas (“Descripción:”)**: `_is_metadata_description` utiliza:
  - Lista de keywords.
  - Presencia de separador `||`.
  - Coincidencia con ODC.
  - Expresiones regulares para encabezados tipo “ODC / ORDEN DE COMPRA”.
- **Cálculo de totales**:
  - Backend: `_parse_total` selecciona la cifra más fiable; fallback a suma de subtotales.
  - Frontend: `quoteTotals` toma el mayor valor entre total explícito y suma de subtotales>0.
- **Gestión de pagos**:
  - Se limpian entradas con monto <= 0.
  - Al guardar, se envían pagos normalizados (números flotantes y fechas ISO).
- **Alertas de cartera**:
  - Diferencia de días respecto a `Date.now()` para etiquetar “Vence hoy”, “Vencido”, “Vence en X días”.
  - Estilos condicionales (rojo para vencido, ámbar para próximo, gris por defecto).

Puntos de Integración Clave
---------------------------
- **API Routes:** `routes/production_status.py`.
- **Front:** `src/modules/statusProduccion/` (principal) + `src/types/production.ts`.
- **Dependencias necesarias**:
  - Python: `pandas`, `xlrd`, `openpyxl`, `pdfplumber`, `pypdfium2`.
  - Frontend: React + Vite, utilidades `lucide-react`, `axios`.

Flujo de Trabajo Recomendado
----------------------------
1. Ejecutar backend con `uvicorn api_server_rbac:app --reload` (o contenedor `api-rbac` en modo dev).
2. Correr front con `npm run dev` o contenedor `frontend-rbac`.
3. Subir archivos mediante la tarjeta “Carga de cotizaciones”.
4. Revisar matriz principal:
   - Popover “Descripción” para notas globales.
   - Columna “Cobro” para gestionar factura/pagos/saldo/vencimiento.
   - Expandir filas para actualizar estatus y fechas individuales.
5. Guardar/actualizar; la UI envía PUT por producto y actualiza inmediatamente la tabla.

Ideas para Iteraciones Posteriores
----------------------------------
- Validación automática de ODC/facturas (por ejemplo, matching vs. órdenes del ERP).
- Historial de cambios por producto/pago.
- Integración con notificaciones según proximidad de vencimientos.
- Soporte extendido a múltiples “Descripción:” (dividir en bloques).
- Visualización kanban o calendario usando los datos ya expuestos.

Este resumen cubre la estructura actual para que otros agentes (Claude, Gemini) dispongan del contexto completo antes de proponer refactorizaciones o nuevos features. Referencias principales:
- Back-end: `routes/production_status.py`, `models/production.py`.
- Front-end: `src/modules/statusProduccion/components/StatusTable.tsx`, `UploadCard.tsx`, `hooks/useStatusProduccion.ts`.
