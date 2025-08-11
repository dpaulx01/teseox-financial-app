-- ARTYCO FINANCIAL APP - OPTIMIZACIÓN MULTI-AÑO
-- Indices para mejorar performance de consultas por año

USE artyco_financial_rbac;

-- Índice compuesto para raw_account_data (consultas más frecuentes)
CREATE INDEX IF NOT EXISTS idx_raw_company_year_month 
ON raw_account_data(company_id, period_year, period_month);

-- Índice específico para filtros por año únicamente
CREATE INDEX IF NOT EXISTS idx_raw_period_year 
ON raw_account_data(period_year);

-- Índice para búsquedas por código de cuenta y año
CREATE INDEX IF NOT EXISTS idx_raw_account_year 
ON raw_account_data(account_code, period_year);

-- Índice compuesto para financial_data
CREATE INDEX IF NOT EXISTS idx_financial_company_year_month 
ON financial_data(company_id, year, month);

-- Índice específico para filtros por año en financial_data
CREATE INDEX IF NOT EXISTS idx_financial_year 
ON financial_data(year);

-- Índice compuesto para production_data
CREATE INDEX IF NOT EXISTS idx_production_company_year_month 
ON production_data(company_id, year, month);

-- Índice específico para filtros por año en production_data  
CREATE INDEX IF NOT EXISTS idx_production_year 
ON production_data(year);

-- Mostrar índices creados
SHOW INDEX FROM raw_account_data WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM financial_data WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM production_data WHERE Key_name LIKE 'idx_%';

-- Estadísticas de optimización
SELECT 
    'raw_account_data' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT period_year) as años_distintos,
    MIN(period_year) as año_minimo,
    MAX(period_year) as año_maximo
FROM raw_account_data

UNION ALL

SELECT 
    'financial_data' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT year) as años_distintos,
    MIN(year) as año_minimo,
    MAX(year) as año_maximo
FROM financial_data

UNION ALL

SELECT 
    'production_data' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT year) as años_distintos,
    MIN(year) as año_minimo,
    MAX(year) as año_maximo
FROM production_data;