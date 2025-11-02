# Balance General Module

Este módulo extiende la plataforma para integrar el **Estado de Situación Financiera** (Balance General) con el mismo nivel de granularidad que el PyG.

## Flujo end-to-end

1. **Carga**
   - Desde `Configuración → Balance General` el usuario selecciona el archivo exportado desde Contífico (`CSV / XLS / XLSX`).
   - El frontend procesa el archivo con `xlsx` y envía un payload JSON normalizado al backend (`/api/balance/upload`).
   - El backend persiste los datos en `balance_data` (agregados) y `raw_balance_data` (detalle fila a fila).

2. **Procesamiento**
   - El servidor reconstruye la jerarquía Activo / Pasivo / Patrimonio a partir de los códigos (por ejemplo `1.1.3.2`).
   - Se calculan métricas clave: capital de trabajo, liquidez corriente, razón rápida, endeudamiento y diferencia Activo = Pasivo + Patrimonio.

3. **Consumo**
   - `GET /api/balance/data?year=` devuelve la estructura completa (`tree`), totales y métricas operativas (capital de trabajo, liquidez, etc.).
   - `GET /api/balance/ratios` combina el balance con la tabla `financial_data` (PyG) para calcular ROE, ROA, márgenes y apalancamiento.
   - `GET /api/balance/trends` expone series históricas anuales o mensuales listas para graficar.
   - `GET /api/balance/summary` y `GET /api/balance/years` proporcionan indicadores rápidos para la UI.
   - `POST /api/balance/config` permite registrar objetivos (targets) para comparar contra los resultados reales.

## Tablas creadas

Las migraciones se encuentran en `database/migrations/20251028_create_balance_module.sql`.

```sql
balance_data      -- Saldos agregados por cuenta, año y mes opcional
raw_balance_data  -- Fila original para auditoría y reconstrucción del árbol
balance_config    -- Objetivos y notas por año / compañía
```

Todas las tablas admiten multiempresa mediante `company_id` y se indexan por periodo para consultas eficientes.

## Endpoints

| Método & Ruta                | Descripción                                                     |
|-----------------------------|-----------------------------------------------------------------|
| `POST /api/balance/upload`  | Persiste un balance completo, reemplazando datos previos opcionalmente |
| `GET /api/balance/data`     | Devuelve totales, métricas y árbol jerárquico                    |
| `GET /api/balance/summary`  | Indicadores rápidos (`hasBalanceData`, `records`, `lastUpdated`) |
| `GET /api/balance/years`    | Años disponibles en la base                                      |
| `GET /api/balance/ratios`   | Ratios de liquidez, apalancamiento, rentabilidad + resumen PyG   |
| `GET /api/balance/trends`   | Serie histórica agregada (anual/mensual) para activos/pasivos/etc |
| `POST /api/balance/config`  | Guarda targets (capital de trabajo, liquidez, apalancamiento)    |
| `DELETE /api/balance/data`  | Elimina datos de un periodo específico                           |

## Integración frontend

- `src/utils/balanceStorage.ts` encapsula el consumo de la API, incluyendo la conversión del Excel y las nuevas llamadas (`loadBalanceRatios`, `loadBalanceTrends`).
- `DataConfiguration` incorpora una nueva tarjeta para subir el Balance y visualizar la vista previa.
- `BalanceAnalysis` (`src/pages/BalanceAnalysis.tsx`) ofrece un dashboard con métricas, indicadores financieros, serie histórica interactiva y árbol jerárquico.

## Uso recomendado

1. Exportar el Balance General desde Contífico sin modificar (mantener los códigos jerárquicos).
2. Cargar el archivo desde la sección de Configuración.
3. Revisar el módulo “Balance General” para analizar totales, jerarquía y ratios.
4. Asignar objetivos (targets) para poder comparar con los resultados reales en reportes posteriores.

> **Nota:** El módulo usa los permisos existentes de `financial_data:manage` / `financial_data:read`. Si se requiere un conjunto específico de permisos, se pueden agregar en una migración posterior.

## Umbrales de interpretación

El dashboard etiqueta cada KPI con una “condición” (Excelente, Saludable, Vigilancia, Alerta) y muestra un tooltip con acciones recomendadas. Los umbrales están codificados en `src/pages/BalanceAnalysis.tsx` y se recalculan dinámicamente por año/mes seleccionado.

| Indicador             | Excelente                     | Saludable                     | Vigilancia                    | Alerta / Riesgo                                   |
|-----------------------|-------------------------------|-------------------------------|-------------------------------|---------------------------------------------------|
| Liquidez corriente    | ≥ 2.00                        | [1.20 – 1.99]                 | [1.00 – 1.19]                 | \< 1.00                                           |
| Razón rápida          | ≥ 1.50                        | [1.00 – 1.49]                 | [0.80 – 0.99]                 | \< 0.80                                           |
| Endeudamiento         | ≤ 35 %                        | (35 % – 55 %]                 | (55 % – 70 %]                 | \> 70 %                                          |
| Deuda / Patrimonio    | ≤ 0.80×                       | (0.80× – 1.50×]               | (1.50× – 2.00×]               | \> 2.00×                                         |
| ROE                   | ≥ 18 %                        | [10 % – 18 %]                 | [3 % – 9 %]                   | \< 3 % o valores negativos                        |
| ROA                   | ≥ 12 %                        | [6 % – 11 %]                  | [2 % – 5 %]                   | \< 2 % o valores negativos                        |
| Margen operativo      | ≥ 18 %                        | [10 % – 17 %]                 | [3 % – 9 %]                   | \< 3 % o valores negativos                        |
| Margen neto           | ≥ 15 %                        | [8 % – 14 %]                  | [3 % – 7 %]                   | \< 3 % o valores negativos                        |

> Ajusta los tramos según tus políticas financieras editando los helpers `interpret*` dentro de `BalanceAnalysis.tsx`.

## Pruebas

- `tests/test_balance_processor.py` valida la construcción del árbol, las métricas base, los ratios y la agregación histórica sin depender de un motor MySQL.
- Ejecutar `python3 -m pytest tests/test_balance_processor.py` dentro del contenedor/entorno donde esté disponible `pytest`.
