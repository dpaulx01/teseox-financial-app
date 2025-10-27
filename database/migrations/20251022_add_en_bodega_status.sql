-- Migration: Add 'EN_BODEGA' status for stock products
-- Date: 2025-10-22
-- Description: Adds 'En bodega' status option for stock products to differentiate from 'Entregado' (for client orders)

-- Modify the enum to include the new status
ALTER TABLE productos
MODIFY COLUMN estatus ENUM(
    'EN_COLA',
    'EN_PRODUCCION',
    'PRODUCCION_PARCIAL',
    'LISTO_PARA_RETIRO',
    'EN_BODEGA',
    'ENTREGADO'
);

-- Update documentation
-- 'EN_BODEGA' should be used for stock products when they are completed and in warehouse
-- 'ENTREGADO' should be used for client orders when they are delivered to the customer
