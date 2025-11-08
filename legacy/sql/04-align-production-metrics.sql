-- 04-align-production-metrics.sql
-- Alinea la tabla production_data con los campos que espera el frontend RBAC.

USE artyco_financial_rbac;

-- Agregar metros_producidos si no existe
SET @add_metros_prod := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac' 
       AND TABLE_NAME = 'production_data' 
       AND COLUMN_NAME = 'metros_producidos') = 0,
    'ALTER TABLE production_data ADD COLUMN metros_producidos DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT \"Metros producidos en el periodo\" AFTER period_month;',
    'SELECT 1;'
);
PREPARE stmt FROM @add_metros_prod;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar metros_vendidos si no existe
SET @add_metros_vend := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac' 
       AND TABLE_NAME = 'production_data' 
       AND COLUMN_NAME = 'metros_vendidos') = 0,
    'ALTER TABLE production_data ADD COLUMN metros_vendidos DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT \"Metros vendidos en el periodo\" AFTER metros_producidos;',
    'SELECT 1;'
);
PREPARE stmt FROM @add_metros_vend;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar alias year si no existe
SET @add_year_col := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac' 
       AND TABLE_NAME = 'production_data' 
       AND COLUMN_NAME = 'year') = 0,
    'ALTER TABLE production_data ADD COLUMN year INT NULL COMMENT \"Alias opcional para period_year\" AFTER company_id;',
    'SELECT 1;'
);
PREPARE stmt FROM @add_year_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar alias month si no existe
SET @add_month_col := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac' 
       AND TABLE_NAME = 'production_data' 
       AND COLUMN_NAME = 'month') = 0,
    'ALTER TABLE production_data ADD COLUMN month INT NULL COMMENT \"Alias opcional para period_month\" AFTER year;',
    'SELECT 1;'
);
PREPARE stmt FROM @add_month_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE production_data
SET
    year = COALESCE(year, period_year),
    month = COALESCE(month, period_month);

UPDATE production_data
SET
    metros_producidos = CASE
        WHEN (metros_producidos IS NULL OR metros_producidos = 0)
             AND unidades_producidas IS NOT NULL
             THEN unidades_producidas
        ELSE metros_producidos
    END,
    metros_vendidos = CASE
        WHEN (metros_vendidos IS NULL OR metros_vendidos = 0)
             AND unidades_vendidas IS NOT NULL
             THEN unidades_vendidas
        ELSE metros_vendidos
    END;

-- Crear índice único si no existe
SET @add_unique_idx := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac'
       AND TABLE_NAME = 'production_data'
       AND INDEX_NAME = 'uq_production_year_month') = 0,
    'ALTER TABLE production_data ADD UNIQUE KEY uq_production_year_month (company_id, year, month);',
    'SELECT 1;'
);
PREPARE stmt FROM @add_unique_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
