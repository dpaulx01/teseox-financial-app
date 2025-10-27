-- ===================================================================
-- MÓDULO BI: ANÁLISIS DE VENTAS COMERCIAL Y FINANCIERO
-- Fecha: 2025-10-26
-- Descripción: Tablas para sistema de inteligencia de negocios
-- ===================================================================

-- Tabla principal de transacciones de ventas
CREATE TABLE IF NOT EXISTS sales_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Información temporal
    fecha_emision DATE NOT NULL,
    year INT GENERATED ALWAYS AS (YEAR(fecha_emision)) STORED,
    month INT GENERATED ALWAYS AS (MONTH(fecha_emision)) STORED,
    quarter INT GENERATED ALWAYS AS (QUARTER(fecha_emision)) STORED,

    -- Información comercial
    categoria_producto VARCHAR(100) NOT NULL,
    vendedor VARCHAR(200) NOT NULL,
    numero_factura VARCHAR(50) NOT NULL,
    canal_comercial VARCHAR(100) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    producto VARCHAR(255) NOT NULL,

    -- Cantidades
    cantidad_facturada DECIMAL(12, 2) NOT NULL DEFAULT 0,
    factor_conversion DECIMAL(10, 4) DEFAULT 1,
    m2 DECIMAL(12, 2) DEFAULT 0,

    -- Montos financieros
    venta_bruta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
    venta_neta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    costo_venta DECIMAL(12, 2) DEFAULT 0,
    costo_unitario DECIMAL(12, 4) DEFAULT 0,
    rentabilidad DECIMAL(12, 2) DEFAULT 0,

    -- Metadata
    company_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices para performance
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

-- Tabla de KPIs calculados (cache para performance)
CREATE TABLE IF NOT EXISTS sales_kpis_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Dimensiones
    year INT NOT NULL,
    month INT DEFAULT NULL,
    dimension_type ENUM('global', 'categoria', 'cliente', 'producto', 'canal', 'vendedor') NOT NULL,
    dimension_value VARCHAR(255) DEFAULT NULL,

    -- KPIs Comerciales
    venta_bruta DECIMAL(12, 2) DEFAULT 0,
    venta_neta DECIMAL(12, 2) DEFAULT 0,
    descuento DECIMAL(12, 2) DEFAULT 0,
    cantidad_transacciones INT DEFAULT 0,
    cantidad_unidades DECIMAL(12, 2) DEFAULT 0,
    ticket_promedio DECIMAL(12, 2) DEFAULT 0,
    porcentaje_descuento DECIMAL(5, 2) DEFAULT 0,

    -- KPIs Financieros
    costo_venta DECIMAL(12, 2) DEFAULT 0,
    rentabilidad DECIMAL(12, 2) DEFAULT 0,
    margen_porcentaje DECIMAL(5, 2) DEFAULT 0,
    ratio_costo_venta DECIMAL(5, 2) DEFAULT 0,

    -- Metadata
    company_id INT DEFAULT 1,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Índices
    UNIQUE KEY unique_kpi (year, month, dimension_type, dimension_value, company_id),
    INDEX idx_year_month (year, month),
    INDEX idx_dimension (dimension_type, dimension_value),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de alertas y notificaciones
CREATE TABLE IF NOT EXISTS sales_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    alert_type ENUM('descuento_alto', 'margen_bajo', 'caida_ventas', 'cliente_inactivo', 'producto_lento') NOT NULL,
    severity ENUM('info', 'warning', 'critical') NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Datos del contexto
    dimension_type VARCHAR(50),
    dimension_value VARCHAR(255),
    metric_value DECIMAL(12, 2),
    threshold_value DECIMAL(12, 2),

    -- Estado
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

-- Tabla de configuración de filtros guardados
CREATE TABLE IF NOT EXISTS sales_saved_filters (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    company_id INT DEFAULT 1,

    filter_name VARCHAR(100) NOT NULL,
    filter_type ENUM('comercial', 'financiero') NOT NULL,

    -- Configuración JSON del filtro
    filter_config JSON NOT NULL,

    -- Metadata
    is_favorite BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user (user_id),
    INDEX idx_type (filter_type),
    INDEX idx_company (company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar permisos RBAC para el módulo BI
INSERT INTO permissions (resource, action, description, created_at) VALUES
('bi', 'view', 'Ver módulo de inteligencia de negocios', NOW()),
('bi', 'export', 'Exportar reportes y datos de BI', NOW()),
('bi_comercial', 'view', 'Ver análisis comercial (ventas, clientes, productos)', NOW()),
('bi_financiero', 'view', 'Ver análisis financiero (márgenes, costos, rentabilidad)', NOW()),
('sales', 'view_all', 'Ver todas las ventas de la empresa', NOW()),
('sales', 'view_own', 'Ver solo ventas propias (vendedor)', NOW()),
('sales', 'upload', 'Cargar datos de ventas desde CSV', NOW()),
('sales', 'manage', 'Gestionar y editar datos de ventas', NOW())
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Asignar permisos al rol admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.resource IN ('bi', 'bi_comercial', 'bi_financiero', 'sales')
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Crear vista materializada para consultas rápidas
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

-- Procedimiento almacenado para recalcular KPIs
DELIMITER $$

CREATE PROCEDURE sp_recalculate_sales_kpis(IN p_company_id INT, IN p_year INT, IN p_month INT)
BEGIN
    -- Eliminar KPIs antiguos para el período
    DELETE FROM sales_kpis_cache
    WHERE company_id = p_company_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month);

    -- KPI Global
    INSERT INTO sales_kpis_cache (
        year, month, dimension_type, dimension_value,
        venta_bruta, venta_neta, descuento,
        cantidad_transacciones, cantidad_unidades, ticket_promedio,
        porcentaje_descuento, costo_venta, rentabilidad,
        margen_porcentaje, ratio_costo_venta, company_id
    )
    SELECT
        year,
        CASE WHEN p_month IS NULL THEN NULL ELSE month END,
        'global',
        'TOTAL',
        SUM(venta_bruta),
        SUM(venta_neta),
        SUM(descuento),
        COUNT(*),
        SUM(cantidad_facturada),
        AVG(venta_neta),
        CASE WHEN SUM(venta_bruta) > 0 THEN (SUM(descuento) / SUM(venta_bruta)) * 100 ELSE 0 END,
        SUM(costo_venta),
        SUM(rentabilidad),
        CASE WHEN SUM(venta_neta) > 0 THEN (SUM(rentabilidad) / SUM(venta_neta)) * 100 ELSE 0 END,
        CASE WHEN SUM(venta_neta) > 0 THEN (SUM(costo_venta) / SUM(venta_neta)) * 100 ELSE 0 END,
        p_company_id
    FROM sales_transactions
    WHERE company_id = p_company_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month)
    GROUP BY year, CASE WHEN p_month IS NULL THEN NULL ELSE month END;

    -- KPIs por Categoría
    INSERT INTO sales_kpis_cache (
        year, month, dimension_type, dimension_value,
        venta_bruta, venta_neta, descuento,
        cantidad_transacciones, cantidad_unidades,
        costo_venta, rentabilidad, margen_porcentaje, company_id
    )
    SELECT
        year,
        CASE WHEN p_month IS NULL THEN NULL ELSE month END,
        'categoria',
        categoria_producto,
        SUM(venta_bruta),
        SUM(venta_neta),
        SUM(descuento),
        COUNT(*),
        SUM(cantidad_facturada),
        SUM(costo_venta),
        SUM(rentabilidad),
        CASE WHEN SUM(venta_neta) > 0 THEN (SUM(rentabilidad) / SUM(venta_neta)) * 100 ELSE 0 END,
        p_company_id
    FROM sales_transactions
    WHERE company_id = p_company_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month)
    GROUP BY year, CASE WHEN p_month IS NULL THEN NULL ELSE month END, categoria_producto;

    -- KPIs por Cliente (Top 100)
    INSERT INTO sales_kpis_cache (
        year, month, dimension_type, dimension_value,
        venta_neta, rentabilidad, margen_porcentaje,
        cantidad_transacciones, company_id
    )
    SELECT
        year,
        CASE WHEN p_month IS NULL THEN NULL ELSE month END,
        'cliente',
        razon_social,
        SUM(venta_neta),
        SUM(rentabilidad),
        CASE WHEN SUM(venta_neta) > 0 THEN (SUM(rentabilidad) / SUM(venta_neta)) * 100 ELSE 0 END,
        COUNT(*),
        p_company_id
    FROM sales_transactions
    WHERE company_id = p_company_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month)
    GROUP BY year, CASE WHEN p_month IS NULL THEN NULL ELSE month END, razon_social
    ORDER BY SUM(venta_neta) DESC
    LIMIT 100;

    -- KPIs por Canal
    INSERT INTO sales_kpis_cache (
        year, month, dimension_type, dimension_value,
        venta_neta, rentabilidad, margen_porcentaje,
        cantidad_transacciones, company_id
    )
    SELECT
        year,
        CASE WHEN p_month IS NULL THEN NULL ELSE month END,
        'canal',
        canal_comercial,
        SUM(venta_neta),
        SUM(rentabilidad),
        CASE WHEN SUM(venta_neta) > 0 THEN (SUM(rentabilidad) / SUM(venta_neta)) * 100 ELSE 0 END,
        COUNT(*),
        p_company_id
    FROM sales_transactions
    WHERE company_id = p_company_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month)
    GROUP BY year, CASE WHEN p_month IS NULL THEN NULL ELSE month END, canal_comercial;

END$$

DELIMITER ;
