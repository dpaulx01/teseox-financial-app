-- ========================================
-- IMPORTAR ESTRUCTURA DEL PROYECTO ORIGINAL
-- Adaptado para base de datos RBAC
-- ========================================

USE artyco_financial_rbac;

-- 1. Crear tabla de empresas/companies
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla de datos financieros (compatible con proyecto original)
CREATE TABLE IF NOT EXISTS financial_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Campos del proyecto original
    ingresos DECIMAL(20,2) DEFAULT 0,
    costo_ventas_total DECIMAL(20,2) DEFAULT 0,
    gastos_admin_total DECIMAL(20,2) DEFAULT 0,
    gastos_ventas_total DECIMAL(20,2) DEFAULT 0,
    utilidad_bruta DECIMAL(20,2) DEFAULT 0,
    ebitda DECIMAL(20,2) DEFAULT 0,
    utilidad_neta DECIMAL(20,2) DEFAULT 0,
    costo_materia_prima DECIMAL(20,2) DEFAULT 0,
    costo_produccion DECIMAL(20,2) DEFAULT 0,
    costo_operativo DECIMAL(20,2) DEFAULT 0,
    punto_equilibrio DECIMAL(20,2) DEFAULT 0,
    punto_equilibrio_acumulado DECIMAL(20,2) DEFAULT 0,
    
    -- Campos adicionales para mejor análisis
    ingresos_operacionales DECIMAL(20,2) DEFAULT 0,
    ingresos_no_operacionales DECIMAL(20,2) DEFAULT 0,
    costos_directos DECIMAL(20,2) DEFAULT 0,
    costos_indirectos DECIMAL(20,2) DEFAULT 0,
    gastos_financieros DECIMAL(20,2) DEFAULT 0,
    utilidad_operacional DECIMAL(20,2) DEFAULT 0,
    
    -- Metadatos
    upload_source VARCHAR(100) DEFAULT 'manual',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Datos de producción (del proyecto original)
CREATE TABLE IF NOT EXISTS production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Campos originales
    metros_producidos DECIMAL(12,2) DEFAULT 0,
    metros_vendidos DECIMAL(12,2) DEFAULT 0,
    
    -- Campos adicionales expandidos
    unidades_producidas INT DEFAULT 0,
    unidades_vendidas INT DEFAULT 0,
    capacidad_instalada INT DEFAULT 0,
    utilizacion_capacidad DECIMAL(5,2) DEFAULT 0,
    
    -- Costos de producción
    costo_materiales DECIMAL(15,2) DEFAULT 0,
    costo_mano_obra DECIMAL(15,2) DEFAULT 0,
    costo_overhead DECIMAL(15,2) DEFAULT 0,
    costo_unitario DECIMAL(10,4) DEFAULT 0,
    
    -- Métricas de eficiencia
    tiempo_ciclo DECIMAL(8,2) DEFAULT 0,
    eficiencia_oee DECIMAL(5,2) DEFAULT 0,
    defectos_ppm INT DEFAULT 0,
    
    -- Personal
    empleados_produccion INT DEFAULT 0,
    horas_trabajadas DECIMAL(10,2) DEFAULT 0,
    horas_extra DECIMAL(10,2) DEFAULT 0,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Configuración de producción
CREATE TABLE IF NOT EXISTS production_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    capacidad_maxima_mensual DECIMAL(12,2) DEFAULT 0,
    costo_fijo_mensual DECIMAL(20,2) DEFAULT 0,
    precio_objetivo DECIMAL(10,2) DEFAULT 0,
    margen_objetivo DECIMAL(5,2) DEFAULT 0,
    
    -- Configuraciones adicionales
    unidad_medida VARCHAR(50) DEFAULT 'metros',
    moneda VARCHAR(10) DEFAULT 'USD',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_config (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Métricas operacionales
CREATE TABLE IF NOT EXISTS operational_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Métricas originales
    precio_promedio_metro DECIMAL(10,2) DEFAULT 0,
    costo_produccion_metro DECIMAL(10,2) DEFAULT 0,
    margen_bruto_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_operativo_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_ebitda_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_neto_porcentaje DECIMAL(5,2) DEFAULT 0,
    productividad_porcentaje DECIMAL(5,2) DEFAULT 0,
    eficiencia_ventas_porcentaje DECIMAL(5,2) DEFAULT 0,
    
    -- Métricas adicionales
    rotacion_inventario DECIMAL(8,2) DEFAULT 0,
    ciclo_conversion_efectivo INT DEFAULT 0,
    roi_porcentaje DECIMAL(8,4) DEFAULT 0,
    roa_porcentaje DECIMAL(8,4) DEFAULT 0,
    roe_porcentaje DECIMAL(8,4) DEFAULT 0,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Archivos CSV cargados
CREATE TABLE IF NOT EXISTS csv_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    processing_summary JSON NULL,
    created_by INT,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Análisis de punto de equilibrio
CREATE TABLE IF NOT EXISTS breakeven_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NULL,
    
    -- Clasificación de costos
    costos_fijos DECIMAL(15,2) DEFAULT 0,
    costos_variables DECIMAL(15,2) DEFAULT 0,
    costos_mixtos DECIMAL(15,2) DEFAULT 0,
    
    -- Datos para punto de equilibrio
    precio_venta_unitario DECIMAL(10,4) DEFAULT 0,
    costo_variable_unitario DECIMAL(10,4) DEFAULT 0,
    margen_contribucion DECIMAL(10,4) DEFAULT 0,
    
    -- Resultados
    punto_equilibrio_unidades INT DEFAULT 0,
    punto_equilibrio_ventas DECIMAL(15,2) DEFAULT 0,
    margen_seguridad DECIMAL(15,2) DEFAULT 0,
    margen_seguridad_porcentaje DECIMAL(5,2) DEFAULT 0,
    
    -- Análisis de sensibilidad
    elasticidad_precio DECIMAL(8,4) DEFAULT 0,
    apalancamiento_operativo DECIMAL(8,4) DEFAULT 0,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_period (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    config_key VARCHAR(100) NOT NULL,
    config_value JSON,
    config_type ENUM('dashboard', 'analysis', 'general', 'ui') DEFAULT 'general',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_config (user_id, config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Logs del sistema con RBAC
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    table_affected VARCHAR(100),
    record_id INT,
    old_values JSON,
    new_values JSON,
    user_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_table_record (table_affected, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- INSERTAR DATOS INICIALES
-- ========================================

-- Empresa por defecto
INSERT INTO companies (id, name, description, industry, currency, created_by) VALUES
(1, 'Artyco Financial', 'Empresa principal para análisis financiero', 'Consultoría Financiera', 'USD', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Configuración de producción por defecto
INSERT INTO production_config (company_id, capacidad_maxima_mensual, costo_fijo_mensual, precio_objetivo, margen_objetivo, created_by) 
VALUES (1, 10000, 50000, 25.00, 30.00, 1) 
ON DUPLICATE KEY UPDATE capacidad_maxima_mensual = VALUES(capacidad_maxima_mensual);

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista resumen financiero mensual
CREATE OR REPLACE VIEW v_financial_monthly AS
SELECT 
    c.name as company_name,
    f.year,
    f.month,
    f.ingresos,
    f.costo_ventas_total,
    f.utilidad_bruta,
    f.gastos_admin_total + f.gastos_ventas_total + IFNULL(f.gastos_financieros, 0) as total_gastos,
    f.utilidad_operacional,
    f.utilidad_neta,
    f.ebitda,
    ROUND((f.utilidad_bruta / NULLIF(f.ingresos, 0)) * 100, 2) as margen_bruto_pct,
    ROUND((f.utilidad_operacional / NULLIF(f.ingresos, 0)) * 100, 2) as margen_operacional_pct,
    ROUND((f.utilidad_neta / NULLIF(f.ingresos, 0)) * 100, 2) as margen_neto_pct,
    u.username as created_by_user
FROM financial_data f
JOIN companies c ON f.company_id = c.id
LEFT JOIN users u ON f.created_by = u.id
ORDER BY f.year DESC, f.month DESC;

-- Vista resumen de producción
CREATE OR REPLACE VIEW v_production_monthly AS
SELECT 
    c.name as company_name,
    p.year,
    p.month,
    p.metros_producidos,
    p.metros_vendidos,
    p.unidades_producidas,
    p.unidades_vendidas,
    p.utilizacion_capacidad,
    p.costo_unitario,
    p.eficiencia_oee,
    p.empleados_produccion,
    CASE 
        WHEN p.empleados_produccion > 0 THEN ROUND(p.horas_trabajadas / p.empleados_produccion, 2)
        ELSE 0 
    END as horas_promedio_empleado,
    u.username as created_by_user
FROM production_data p
JOIN companies c ON p.company_id = c.id
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.year DESC, p.month DESC;

-- Vista dashboard ejecutivo
CREATE OR REPLACE VIEW v_executive_dashboard AS
SELECT 
    f.year,
    f.month,
    f.ingresos,
    f.utilidad_neta,
    f.ebitda,
    ROUND((f.utilidad_neta / NULLIF(f.ingresos, 0)) * 100, 2) as margen_neto_pct,
    p.metros_producidos,
    p.utilizacion_capacidad,
    om.productividad_porcentaje,
    om.eficiencia_ventas_porcentaje
FROM financial_data f
LEFT JOIN production_data p ON f.company_id = p.company_id AND f.year = p.year AND f.month = p.month
LEFT JOIN operational_metrics om ON f.company_id = om.company_id AND f.year = om.year AND f.month = om.month
WHERE f.company_id = 1
ORDER BY f.year DESC, f.month DESC;

SELECT 'Base de datos clonada y adaptada exitosamente' as message;
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'artyco_financial_rbac' AND table_type = 'BASE TABLE';