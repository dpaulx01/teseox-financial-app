-- ========================================
-- CREAR ESTRUCTURA COMPLETA DE TABLAS FINANCIERAS
-- ========================================

USE artyco_financial_rbac;

-- 1. TABLA DE EMPRESAS/COMPANIES
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2. TABLA DE DATOS FINANCIEROS PRINCIPALES
CREATE TABLE IF NOT EXISTS financial_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    data_type ENUM('monthly', 'yearly', 'quarterly') DEFAULT 'monthly',
    period_year INT NOT NULL,
    period_month INT NULL,
    period_quarter INT NULL,
    
    -- Ingresos
    ingresos DECIMAL(15,2) DEFAULT 0,
    ingresos_operacionales DECIMAL(15,2) DEFAULT 0,
    ingresos_no_operacionales DECIMAL(15,2) DEFAULT 0,
    
    -- Costos
    costo_ventas DECIMAL(15,2) DEFAULT 0,
    costos_directos DECIMAL(15,2) DEFAULT 0,
    costos_indirectos DECIMAL(15,2) DEFAULT 0,
    
    -- Gastos Operacionales
    gastos_administrativos DECIMAL(15,2) DEFAULT 0,
    gastos_ventas DECIMAL(15,2) DEFAULT 0,
    gastos_financieros DECIMAL(15,2) DEFAULT 0,
    
    -- Métricas Calculadas
    utilidad_bruta DECIMAL(15,2) DEFAULT 0,
    utilidad_operacional DECIMAL(15,2) DEFAULT 0,
    utilidad_neta DECIMAL(15,2) DEFAULT 0,
    ebitda DECIMAL(15,2) DEFAULT 0,
    
    -- Metadatos
    upload_source VARCHAR(100) DEFAULT 'manual',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_period (company_id, period_year, period_month),
    UNIQUE KEY unique_period (company_id, data_type, period_year, period_month, period_quarter)
);

-- 3. TABLA DE DATOS DE PRODUCCIÓN
CREATE TABLE IF NOT EXISTS production_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    
    -- Datos de Producción
    unidades_producidas INT DEFAULT 0,
    unidades_vendidas INT DEFAULT 0,
    capacidad_instalada INT DEFAULT 0,
    utilizacion_capacidad DECIMAL(5,2) DEFAULT 0, -- Porcentaje
    
    -- Costos de Producción
    costo_materiales DECIMAL(15,2) DEFAULT 0,
    costo_mano_obra DECIMAL(15,2) DEFAULT 0,
    costo_overhead DECIMAL(15,2) DEFAULT 0,
    costo_unitario DECIMAL(10,4) DEFAULT 0,
    
    -- Métricas de Eficiencia
    tiempo_ciclo DECIMAL(8,2) DEFAULT 0, -- horas
    eficiencia_oee DECIMAL(5,2) DEFAULT 0, -- Overall Equipment Effectiveness %
    defectos_ppm INT DEFAULT 0, -- Parts per million
    
    -- Personal
    empleados_produccion INT DEFAULT 0,
    horas_trabajadas DECIMAL(10,2) DEFAULT 0,
    horas_extra DECIMAL(10,2) DEFAULT 0,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_production_period (company_id, period_year, period_month),
    UNIQUE KEY unique_production_period (company_id, period_year, period_month)
);

-- 4. TABLA DE PUNTO DE EQUILIBRIO Y COSTOS
CREATE TABLE IF NOT EXISTS breakeven_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    period_year INT NOT NULL,
    period_month INT NULL,
    
    -- Clasificación de Costos
    costos_fijos DECIMAL(15,2) DEFAULT 0,
    costos_variables DECIMAL(15,2) DEFAULT 0,
    costos_mixtos DECIMAL(15,2) DEFAULT 0,
    
    -- Datos para Punto de Equilibrio
    precio_venta_unitario DECIMAL(10,4) DEFAULT 0,
    costo_variable_unitario DECIMAL(10,4) DEFAULT 0,
    margen_contribucion DECIMAL(10,4) DEFAULT 0,
    
    -- Resultados
    punto_equilibrio_unidades INT DEFAULT 0,
    punto_equilibrio_ventas DECIMAL(15,2) DEFAULT 0,
    margen_seguridad DECIMAL(15,2) DEFAULT 0,
    margen_seguridad_porcentaje DECIMAL(5,2) DEFAULT 0,
    
    -- Análisis de Sensibilidad
    elasticidad_precio DECIMAL(8,4) DEFAULT 0,
    apalancamiento_operativo DECIMAL(8,4) DEFAULT 0,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_breakeven_period (company_id, period_year, period_month),
    UNIQUE KEY unique_breakeven_period (company_id, period_year, period_month)
);

-- 5. TABLA DE CUENTAS CONTABLES
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type ENUM('activo', 'pasivo', 'patrimonio', 'ingreso', 'costo', 'gasto') NOT NULL,
    account_subtype VARCHAR(100),
    
    -- Clasificación para análisis
    is_fixed_cost BOOLEAN DEFAULT FALSE,
    is_variable_cost BOOLEAN DEFAULT FALSE,
    is_mixed_cost BOOLEAN DEFAULT FALSE,
    cost_behavior VARCHAR(50), -- 'fixed', 'variable', 'mixed', 'step', 'curvilinear'
    
    parent_account_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_account_code (company_id, account_code)
);

-- 6. TABLA DE TRANSACCIONES/MOVIMIENTOS CONTABLES
CREATE TABLE IF NOT EXISTS account_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    account_id INT,
    transaction_date DATE NOT NULL,
    description TEXT,
    
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    
    reference_number VARCHAR(50),
    source_document VARCHAR(100),
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_account_date (company_id, account_id, transaction_date)
);

-- 7. TABLA DE CONFIGURACIONES POR USUARIO
CREATE TABLE IF NOT EXISTS user_configurations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    config_key VARCHAR(100) NOT NULL,
    config_value JSON,
    config_type ENUM('dashboard', 'analysis', 'general', 'ui') DEFAULT 'general',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_config (user_id, config_key)
);

-- 8. TABLA DE CARGAS DE ARCHIVOS/UPLOADS
CREATE TABLE IF NOT EXISTS file_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    user_id INT,
    
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INT,
    file_type VARCHAR(50),
    upload_type ENUM('financial_data', 'production_data', 'chart_of_accounts', 'transactions') NOT NULL,
    
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    records_processed INT DEFAULT 0,
    errors_count INT DEFAULT 0,
    error_details JSON,
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 9. TABLA DE DASHBOARDS PERSONALIZADOS
CREATE TABLE IF NOT EXISTS dashboard_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    dashboard_name VARCHAR(100) NOT NULL,
    layout_config JSON,
    widgets_config JSON,
    filters_config JSON,
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 10. TABLA DE AUDITORÍA DE DATOS
CREATE TABLE IF NOT EXISTS data_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_user_timestamp (user_id, timestamp)
);

-- ========================================
-- INSERTAR DATOS INICIALES
-- ========================================

-- Insertar empresa por defecto
INSERT INTO companies (id, name, description, industry, currency, created_by) VALUES
(1, 'Artyco Financial', 'Empresa principal para análisis financiero', 'Consultoría Financiera', 'USD', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insertar cuentas contables básicas
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, account_subtype, is_fixed_cost, is_variable_cost, created_by) VALUES
(1, '4100', 'Ingresos por Ventas', 'ingreso', 'operacional', FALSE, FALSE, 1),
(1, '4200', 'Ingresos No Operacionales', 'ingreso', 'no_operacional', FALSE, FALSE, 1),
(1, '5100', 'Costo de Ventas', 'costo', 'directo', FALSE, TRUE, 1),
(1, '5200', 'Costos de Producción', 'costo', 'produccion', FALSE, TRUE, 1),
(1, '6100', 'Gastos Administrativos', 'gasto', 'administrativo', TRUE, FALSE, 1),
(1, '6200', 'Gastos de Ventas', 'gasto', 'comercial', FALSE, TRUE, 1),
(1, '6300', 'Gastos Financieros', 'gasto', 'financiero', TRUE, FALSE, 1)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name);

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista resumen financiero por período
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT 
    c.name as company_name,
    fd.period_year,
    fd.period_month,
    fd.ingresos,
    fd.costo_ventas,
    fd.utilidad_bruta,
    fd.gastos_administrativos + fd.gastos_ventas + fd.gastos_financieros as total_gastos,
    fd.utilidad_operacional,
    fd.utilidad_neta,
    fd.ebitda,
    ROUND((fd.utilidad_bruta / NULLIF(fd.ingresos, 0)) * 100, 2) as margen_bruto_pct,
    ROUND((fd.utilidad_operacional / NULLIF(fd.ingresos, 0)) * 100, 2) as margen_operacional_pct,
    ROUND((fd.utilidad_neta / NULLIF(fd.ingresos, 0)) * 100, 2) as margen_neto_pct
FROM financial_data fd
JOIN companies c ON fd.company_id = c.id
WHERE fd.data_type = 'monthly';

-- Vista resumen de producción
CREATE OR REPLACE VIEW v_production_summary AS
SELECT 
    c.name as company_name,
    pd.period_year,
    pd.period_month,
    pd.unidades_producidas,
    pd.unidades_vendidas,
    pd.capacidad_instalada,
    pd.utilizacion_capacidad,
    pd.costo_unitario,
    pd.eficiencia_oee,
    pd.empleados_produccion,
    ROUND(pd.horas_trabajadas / NULLIF(pd.empleados_produccion, 0), 2) as horas_promedio_empleado
FROM production_data pd
JOIN companies c ON pd.company_id = c.id;

SELECT 'Estructura de base de datos creada exitosamente' as message;
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'artyco_financial_rbac' AND table_type = 'BASE TABLE';