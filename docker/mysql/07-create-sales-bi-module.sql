-- ===================================================================
-- MÓDULO BI: ANÁLISIS DE VENTAS COMERCIAL Y FINANCIERO
-- Este archivo se ejecuta automáticamente al crear el contenedor MySQL
-- ===================================================================

USE artyco_financial_rbac;

-- Tabla principal de transacciones de ventas
CREATE TABLE IF NOT EXISTS sales_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_emision DATE NOT NULL,
    year INT GENERATED ALWAYS AS (YEAR(fecha_emision)) STORED,
    month INT GENERATED ALWAYS AS (MONTH(fecha_emision)) STORED,
    quarter INT GENERATED ALWAYS AS (QUARTER(fecha_emision)) STORED,
    categoria_producto VARCHAR(100) NOT NULL,
    vendedor VARCHAR(200) NOT NULL,
    numero_factura VARCHAR(50) NOT NULL,
    canal_comercial VARCHAR(100) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    producto VARCHAR(255) NOT NULL,
    cantidad_facturada DECIMAL(12, 2) NOT NULL DEFAULT 0,
    factor_conversion DECIMAL(10, 4) DEFAULT 1,
    m2 DECIMAL(12, 2) DEFAULT 0,
    venta_bruta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
    venta_neta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    costo_venta DECIMAL(12, 2) DEFAULT 0,
    costo_unitario DECIMAL(12, 4) DEFAULT 0,
    rentabilidad DECIMAL(12, 2) DEFAULT 0,
    company_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha_emision),
    INDEX idx_year_month (year, month),
    INDEX idx_categoria (categoria_producto),
    INDEX idx_cliente (razon_social),
    INDEX idx_producto (producto),
    INDEX idx_canal (canal_comercial),
    INDEX idx_vendedor (vendedor),
    INDEX idx_factura (numero_factura),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de KPIs calculados
CREATE TABLE IF NOT EXISTS sales_kpis_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    month INT DEFAULT NULL,
    dimension_type ENUM('global', 'categoria', 'cliente', 'producto', 'canal', 'vendedor') NOT NULL,
    dimension_value VARCHAR(255) DEFAULT NULL,
    venta_bruta DECIMAL(12, 2) DEFAULT 0,
    venta_neta DECIMAL(12, 2) DEFAULT 0,
    descuento DECIMAL(12, 2) DEFAULT 0,
    cantidad_transacciones INT DEFAULT 0,
    cantidad_unidades DECIMAL(12, 2) DEFAULT 0,
    ticket_promedio DECIMAL(12, 2) DEFAULT 0,
    porcentaje_descuento DECIMAL(5, 2) DEFAULT 0,
    costo_venta DECIMAL(12, 2) DEFAULT 0,
    rentabilidad DECIMAL(12, 2) DEFAULT 0,
    margen_porcentaje DECIMAL(5, 2) DEFAULT 0,
    ratio_costo_venta DECIMAL(5, 2) DEFAULT 0,
    company_id INT DEFAULT 1,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_kpi (year, month, dimension_type, dimension_value, company_id),
    INDEX idx_year_month (year, month),
    INDEX idx_dimension (dimension_type, dimension_value),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de alertas
CREATE TABLE IF NOT EXISTS sales_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type ENUM('descuento_alto', 'margen_bajo', 'caida_ventas', 'cliente_inactivo', 'producto_lento') NOT NULL,
    severity ENUM('info', 'warning', 'critical') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    dimension_type VARCHAR(50),
    dimension_value VARCHAR(255),
    metric_value DECIMAL(12, 2),
    threshold_value DECIMAL(12, 2),
    status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    acknowledged_by INT,
    acknowledged_at TIMESTAMP NULL,
    company_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (alert_type),
    INDEX idx_company (company_id),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de filtros guardados
CREATE TABLE IF NOT EXISTS sales_saved_filters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT DEFAULT 1,
    filter_name VARCHAR(100) NOT NULL,
    filter_type ENUM('comercial', 'financiero') NOT NULL,
    filter_config JSON NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_type (filter_type),
    INDEX idx_company (company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos RBAC
INSERT INTO permissions (resource, action, description, created_at) VALUES
('bi', 'view', 'Ver módulo de inteligencia de negocios', NOW()),
('bi', 'export', 'Exportar reportes y datos de BI', NOW()),
('bi_comercial', 'view', 'Ver análisis comercial', NOW()),
('bi_financiero', 'view', 'Ver análisis financiero', NOW()),
('sales', 'view_all', 'Ver todas las ventas de la empresa', NOW()),
('sales', 'view_own', 'Ver solo ventas propias', NOW()),
('sales', 'upload', 'Cargar datos de ventas desde CSV', NOW()),
('sales', 'manage', 'Gestionar datos de ventas', NOW())
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Vista resumen
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
    year,
    month,
    categoria_producto,
    canal_comercial,
    vendedor,
    COUNT(DISTINCT numero_factura) as num_facturas,
    COUNT(DISTINCT razon_social) as num_clientes,
    SUM(cantidad_facturada) as total_unidades,
    SUM(venta_bruta) as total_venta_bruta,
    SUM(descuento) as total_descuento,
    SUM(venta_neta) as total_venta_neta,
    SUM(costo_venta) as total_costo_venta,
    SUM(rentabilidad) as total_rentabilidad,
    CASE
        WHEN SUM(venta_neta) > 0 THEN (SUM(rentabilidad) / SUM(venta_neta)) * 100
        ELSE 0
    END as margen_porcentaje
FROM sales_transactions
WHERE company_id = 1
GROUP BY year, month, categoria_producto, canal_comercial, vendedor;
