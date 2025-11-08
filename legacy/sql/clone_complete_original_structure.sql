-- =====================================================
-- CLONACIÓN COMPLETA DEL PROYECTO ORIGINAL
-- Incluye TODAS las tablas, vistas y funcionalidades
-- =====================================================

-- Crear tabla raw_account_data (LA MÁS IMPORTANTE)
CREATE TABLE IF NOT EXISTS raw_account_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    import_date DATE NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_period (company_id, account_code, period_year, period_month),
    INDEX idx_company_year (company_id, period_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Actualizar tabla financial_data para que sea compatible
ALTER TABLE financial_data 
ADD COLUMN IF NOT EXISTS costo_materia_prima DECIMAL(20,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_produccion DECIMAL(20,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_operativo DECIMAL(20,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS punto_equilibrio DECIMAL(20,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS punto_equilibrio_acumulado DECIMAL(20,2) DEFAULT 0;

-- Crear tabla operational_metrics
CREATE TABLE IF NOT EXISTS operational_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    precio_promedio_metro DECIMAL(10,2) DEFAULT 0,
    costo_produccion_metro DECIMAL(10,2) DEFAULT 0,
    margen_bruto_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_operativo_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_ebitda_porcentaje DECIMAL(5,2) DEFAULT 0,
    margen_neto_porcentaje DECIMAL(5,2) DEFAULT 0,
    productividad_porcentaje DECIMAL(5,2) DEFAULT 0,
    eficiencia_ventas_porcentaje DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crear tabla production_config
CREATE TABLE IF NOT EXISTS production_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    capacidad_maxima_mensual DECIMAL(12,2) DEFAULT 0,
    costo_fijo_mensual DECIMAL(20,2) DEFAULT 0,
    precio_objetivo DECIMAL(10,2) DEFAULT 0,
    margen_objetivo DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_config (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crear tabla csv_files
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
    created_by VARCHAR(100) DEFAULT 'system',
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crear tabla system_logs
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    user_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- VISTAS EXACTAS DEL PROYECTO ORIGINAL
-- =====================================================

-- Vista principal: Métricas financieras automáticas
CREATE OR REPLACE VIEW v_financial_metrics AS
SELECT 
    company_id,
    period_year,
    period_month,
    
    -- ======================
    -- DATOS BASE AUTOMÁTICOS
    -- ======================
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) as ingresos,
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as costos_variables,
    SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as costos_fijos,
    
    -- ======================
    -- UTILIDADES AUTOMÁTICAS
    -- ======================
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as utilidad_bruta,
    
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) -
    SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as utilidad_neta,
    
    -- ======================
    -- MÁRGENES AUTOMÁTICOS
    -- ======================
    CASE 
        WHEN SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) > 0 
        THEN ROUND(
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)) * 100, 2
        )
        ELSE 0 
    END as margen_bruto_pct,
    
    CASE 
        WHEN SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) > 0 
        THEN ROUND(
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) -
              SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)) * 100, 2
        )
        ELSE 0 
    END as margen_neto_pct,
    
    -- ======================
    -- PUNTO DE EQUILIBRIO AUTOMÁTICO
    -- ======================
    CASE 
        WHEN (SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) > 0 
        THEN ROUND(
            SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) / 
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)), 2
        )
        ELSE 0 
    END as punto_equilibrio_contable,
    
    -- Fecha de última actualización
    MAX(import_date) as ultima_actualizacion
    
FROM raw_account_data 
GROUP BY company_id, period_year, period_month;

-- ==============================================
-- Vista de promedios mensuales automáticos
-- ==============================================
CREATE OR REPLACE VIEW v_financial_averages AS
SELECT 
    company_id,
    period_year,
    'PROMEDIO' as period_type,
    
    ROUND(AVG(ingresos), 2) as ingresos_promedio,
    ROUND(AVG(costos_variables), 2) as costos_variables_promedio,
    ROUND(AVG(costos_fijos), 2) as costos_fijos_promedio,
    ROUND(AVG(utilidad_bruta), 2) as utilidad_bruta_promedio,
    ROUND(AVG(utilidad_neta), 2) as utilidad_neta_promedio,
    ROUND(
        CASE 
            WHEN AVG(ingresos) > 0 
            THEN (AVG(utilidad_bruta) / AVG(ingresos)) * 100
            ELSE 0 
        END, 2
    ) as margen_bruto_promedio,
    ROUND(
        CASE 
            WHEN AVG(ingresos) > 0 
            THEN (AVG(utilidad_neta) / AVG(ingresos)) * 100
            ELSE 0 
        END, 2
    ) as margen_neto_promedio,
    ROUND(AVG(punto_equilibrio_contable), 2) as punto_equilibrio_promedio,
    
    COUNT(period_month) as meses_con_datos,
    MAX(ultima_actualizacion) as ultima_actualizacion
    
FROM v_financial_metrics 
GROUP BY company_id, period_year;

-- ==============================================
-- Vista de totales anuales automáticos  
-- ==============================================
CREATE OR REPLACE VIEW v_financial_totals AS
SELECT 
    company_id,
    period_year,
    'ANUAL' as period_type,
    
    SUM(ingresos) as ingresos_total,
    SUM(costos_variables) as costos_variables_total,
    SUM(costos_fijos) as costos_fijos_total,
    SUM(utilidad_bruta) as utilidad_bruta_total,
    SUM(utilidad_neta) as utilidad_neta_total,
    
    -- Márgenes calculados sobre totales anuales
    CASE 
        WHEN SUM(ingresos) > 0 
        THEN ROUND((SUM(utilidad_bruta) / SUM(ingresos)) * 100, 2)
        ELSE 0 
    END as margen_bruto_anual,
    
    CASE 
        WHEN SUM(ingresos) > 0 
        THEN ROUND((SUM(utilidad_neta) / SUM(ingresos)) * 100, 2)
        ELSE 0 
    END as margen_neto_anual,
    
    -- Punto de equilibrio anual
    CASE 
        WHEN SUM(utilidad_bruta) > 0 AND SUM(ingresos) > 0
        THEN ROUND(SUM(costos_fijos) / (SUM(utilidad_bruta) / SUM(ingresos)), 2)
        ELSE 0 
    END as punto_equilibrio_anual,
    
    COUNT(period_month) as meses_con_datos,
    MAX(ultima_actualizacion) as ultima_actualizacion
    
FROM v_financial_metrics 
GROUP BY company_id, period_year;

-- Insert default production config
INSERT INTO production_config (company_id, capacidad_maxima_mensual, costo_fijo_mensual, precio_objetivo, margen_objetivo) 
VALUES (1, 10000, 50000, 25.00, 30.00) 
ON DUPLICATE KEY UPDATE capacidad_maxima_mensual = capacidad_maxima_mensual;