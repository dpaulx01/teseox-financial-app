-- 06-create-production-config.sql
-- Crea tablas de configuración y almacenamiento de métricas de producción.

USE artyco_financial_rbac;

CREATE TABLE IF NOT EXISTS production_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    capacidad_maxima_mensual DECIMAL(15,2) NOT NULL DEFAULT 0,
    costo_fijo_produccion DECIMAL(15,2) NOT NULL DEFAULT 0,
    meta_precio_promedio DECIMAL(15,2) NOT NULL DEFAULT 0,
    meta_margen_minimo DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_production_config_company_year (company_id, year)
);

CREATE TABLE IF NOT EXISTS production_combined_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    data JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prod_combined_company_year (company_id, year)
);
