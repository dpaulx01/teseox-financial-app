-- Migración para agregar campo de seguimiento manual al plan diario
-- Fecha: 2024-10-15
-- Objetivo: Prevenir sobrescritura automática de ajustes manuales

ALTER TABLE plan_diario_produccion 
ADD COLUMN is_manually_edited BOOLEAN DEFAULT FALSE NOT NULL;

-- Marcar como editados manualmente todos los planes existentes para preservar datos
UPDATE plan_diario_produccion 
SET is_manually_edited = TRUE 
WHERE id > 0;

-- Crear índice para optimizar consultas
CREATE INDEX idx_plan_diario_manual_edit ON plan_diario_produccion(is_manually_edited);