-- =========================================
-- SCRIPT DE MIGRACIÓN PARA SITEGROUND
-- =========================================
-- Ejecutar en phpMyAdmin de SiteGround

-- Crear tablas principales
-- Base de datos: dbfjhgbpsub7hm (ya existe en SiteGround)
USE dbfjhgbpsub7hm;

-- Tabla de datos financieros
CREATE TABLE IF NOT EXISTS financial_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    ingresos DECIMAL(15,2) DEFAULT 0,
    costo_ventas_total DECIMAL(15,2) DEFAULT 0,
    utilidad_bruta DECIMAL(15,2) DEFAULT 0,
    gastos_operativos DECIMAL(15,2) DEFAULT 0,
    utilidad_operacional DECIMAL(15,2) DEFAULT 0,
    gastos_financieros DECIMAL(15,2) DEFAULT 0,
    utilidad_antes_impuestos DECIMAL(15,2) DEFAULT 0,
    impuestos DECIMAL(15,2) DEFAULT 0,
    utilidad_neta DECIMAL(15,2) DEFAULT 0,
    ebitda DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    INDEX idx_year_month (year, month),
    INDEX idx_company_year (company_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de datos de producción
CREATE TABLE IF NOT EXISTS production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    metros_producidos DECIMAL(15,2) DEFAULT 0,
    metros_vendidos DECIMAL(15,2) DEFAULT 0,
    eficiencia_produccion DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_production_company_year_month (company_id, year, month),
    INDEX idx_production_year_month (year, month),
    INDEX idx_production_company_year (company_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de costos mixtos
CREATE TABLE IF NOT EXISTS mixed_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    cost_category VARCHAR(100) DEFAULT 'operativo',
    fixed_amount DECIMAL(15,2) DEFAULT 0,
    variable_rate DECIMAL(8,4) DEFAULT 0,
    driver_unit VARCHAR(50) DEFAULT 'metros',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mixed_costs_company_year (company_id, year),
    INDEX idx_mixed_costs_category (cost_category),
    INDEX idx_mixed_costs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de configuración de análisis
CREATE TABLE IF NOT EXISTS analysis_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_config (company_id, config_key),
    INDEX idx_config_company (company_id),
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuraciones por defecto
INSERT IGNORE INTO analysis_config (company_id, config_key, config_value, config_type, description) VALUES
(1, 'capacidad_maxima_metros', '1000', 'numeric', 'Capacidad máxima de producción en metros'),
(1, 'meta_eficiencia', '0.85', 'numeric', 'Meta de eficiencia de producción (0-1)'),
(1, 'meta_margen_bruto', '0.40', 'numeric', 'Meta de margen bruto (0-1)'),
(1, 'meta_margen_operativo', '0.25', 'numeric', 'Meta de margen operativo (0-1)'),
(1, 'precio_promedio_m2', '150', 'numeric', 'Precio promedio por metro cuadrado'),
(1, 'costo_promedio_m2', '90', 'numeric', 'Costo promedio por metro cuadrado'),
(1, 'empresa_nombre', 'ARTYCO', 'string', 'Nombre de la empresa'),
(1, 'moneda', 'USD', 'string', 'Moneda utilizada en análisis'),
(1, 'timezone', 'America/Guayaquil', 'string', 'Zona horaria de la empresa');

-- Crear índices para optimización
CREATE INDEX idx_financial_data_year_month ON financial_data(year, month);
CREATE INDEX idx_production_data_year_month ON production_data(year, month);

-- Verificar que las tablas se crearon correctamente
SHOW TABLES;

-- Mostrar estructura de tablas principales
DESCRIBE financial_data;
DESCRIBE production_data;
DESCRIBE mixed_costs;
DESCRIBE analysis_config;