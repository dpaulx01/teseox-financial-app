-- Migración para soporte de producción de stock
-- Fecha: 2025-10-21
-- Propósito: Extender el módulo Status Producción para manejar pedidos de stock
--           además de cotizaciones de clientes, reutilizando toda la infraestructura existente

-- ============================================================================
-- 1. Extender tabla cotizaciones para manejar pedidos de stock
-- ============================================================================

-- Agregar campo tipo_produccion para diferenciar cliente vs stock
ALTER TABLE cotizaciones
    ADD COLUMN tipo_produccion ENUM('CLIENTE', 'STOCK') NOT NULL DEFAULT 'CLIENTE'
    AFTER numero_cotizacion;

-- Agregar número de pedido de stock (PDI ########)
ALTER TABLE cotizaciones
    ADD COLUMN numero_pedido_stock VARCHAR(50) NULL
    AFTER numero_cotizacion;

-- Agregar bodega destino para pedidos de stock
ALTER TABLE cotizaciones
    ADD COLUMN bodega VARCHAR(100) NULL
    AFTER cliente;

-- Agregar responsable del pedido (para stock)
ALTER TABLE cotizaciones
    ADD COLUMN responsable VARCHAR(100) NULL
    AFTER bodega;

-- Agregar fechas de período de producción (para stock semanal)
ALTER TABLE cotizaciones
    ADD COLUMN fecha_inicio_periodo DATE NULL
    AFTER fecha_ingreso;

ALTER TABLE cotizaciones
    ADD COLUMN fecha_fin_periodo DATE NULL
    AFTER fecha_inicio_periodo;

-- Índice para búsquedas por tipo de producción
CREATE INDEX idx_cotizaciones_tipo ON cotizaciones(tipo_produccion);

-- Índice para número de pedido de stock
CREATE INDEX idx_cotizaciones_pedido_stock ON cotizaciones(numero_pedido_stock);

-- ============================================================================
-- 2. Extender tabla plan_diario_produccion para soporte de stock
-- ============================================================================

-- Agregar cantidad sugerida (del Excel de Contifico)
ALTER TABLE plan_diario_produccion
    ADD COLUMN cantidad_sugerida DECIMAL(10,2) NULL
    AFTER unidades;

-- Agregar flag de completado (producido y en bodega)
ALTER TABLE plan_diario_produccion
    ADD COLUMN completado BOOLEAN NOT NULL DEFAULT FALSE
    AFTER is_manually_edited;

-- Agregar timestamp de completado
ALTER TABLE plan_diario_produccion
    ADD COLUMN fecha_completado TIMESTAMP NULL
    AFTER completado;

-- ============================================================================
-- 3. Comentarios de documentación
-- ============================================================================

ALTER TABLE cotizaciones
    MODIFY COLUMN tipo_produccion ENUM('CLIENTE', 'STOCK') NOT NULL DEFAULT 'CLIENTE'
    COMMENT 'Tipo de producción: cliente (cotización) o stock (inventario)';

ALTER TABLE cotizaciones
    MODIFY COLUMN numero_pedido_stock VARCHAR(50) NULL
    COMMENT 'Número de pedido de stock desde Contifico (ej: PDI 202409000006)';

ALTER TABLE cotizaciones
    MODIFY COLUMN bodega VARCHAR(100) NULL
    COMMENT 'Bodega destino para pedidos de stock';

ALTER TABLE cotizaciones
    MODIFY COLUMN responsable VARCHAR(100) NULL
    COMMENT 'Responsable del pedido de stock';

ALTER TABLE cotizaciones
    MODIFY COLUMN fecha_inicio_periodo DATE NULL
    COMMENT 'Fecha de inicio del período de producción (para stock)';

ALTER TABLE cotizaciones
    MODIFY COLUMN fecha_fin_periodo DATE NULL
    COMMENT 'Fecha de fin del período de producción (para stock)';

ALTER TABLE plan_diario_produccion
    MODIFY COLUMN cantidad_sugerida DECIMAL(10,2) NULL
    COMMENT 'Cantidad sugerida del Excel de Contifico (columna Sugerencia)';

ALTER TABLE plan_diario_produccion
    MODIFY COLUMN completado BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'Indica si la producción fue completada e ingresada a bodega';

ALTER TABLE plan_diario_produccion
    MODIFY COLUMN fecha_completado TIMESTAMP NULL
    COMMENT 'Fecha y hora en que se completó la producción';

-- ============================================================================
-- 4. Actualizar vistas existentes para excluir stock de métricas financieras
-- ============================================================================

-- Actualizar v_financial_summary para excluir stock
DROP VIEW IF EXISTS v_financial_summary;
CREATE VIEW v_financial_summary AS
SELECT
    SUM(CASE WHEN c.tipo_produccion = 'CLIENTE' THEN COALESCE(p.valor_subtotal, 0) ELSE 0 END) as total_en_produccion,
    SUM(CASE WHEN c.tipo_produccion = 'CLIENTE' THEN COALESCE(c.valor_total, 0) ELSE 0 END) as total_cotizaciones_activas,
    SUM(CASE WHEN c.tipo_produccion = 'CLIENTE' AND pg.monto IS NOT NULL THEN pg.monto ELSE 0 END) as total_pagado,
    SUM(CASE WHEN c.tipo_produccion = 'CLIENTE' THEN COALESCE(c.valor_total, 0) - COALESCE(pg.total_pagado, 0) ELSE 0 END) as saldo_por_cobrar
FROM cotizaciones c
LEFT JOIN productos p ON p.cotizacion_id = c.id
LEFT JOIN (
    SELECT cotizacion_id, SUM(monto) as total_pagado, MAX(monto) as monto
    FROM pagos
    GROUP BY cotizacion_id
) pg ON pg.cotizacion_id = c.id
WHERE c.tipo_produccion = 'CLIENTE';

-- ============================================================================
-- 5. Nota de compatibilidad
-- ============================================================================

-- Esta migración es retrocompatible:
-- - Todas las cotizaciones existentes tendrán tipo_produccion='CLIENTE' por defecto
-- - Los campos nuevos son NULL o tienen valores por defecto
-- - Las vistas y queries existentes seguirán funcionando
-- - El dashboard automáticamente separará stock de clientes usando tipo_produccion
