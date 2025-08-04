-- Initial database setup
CREATE DATABASE IF NOT EXISTS artyco_financial;
USE artyco_financial;

-- Create companies table first (required for foreign keys)
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default company
INSERT INTO companies (name) VALUES ('Artyco Financial') ON DUPLICATE KEY UPDATE name = name;

-- Create original tables for backward compatibility
CREATE TABLE IF NOT EXISTS financial_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    metros_producidos DECIMAL(12,2) DEFAULT 0,
    metros_vendidos DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Insert sample data for testing
INSERT INTO production_config (company_id, capacidad_maxima_mensual, costo_fijo_mensual, precio_objetivo, margen_objetivo) 
VALUES (1, 10000, 50000, 25.00, 30.00) 
ON DUPLICATE KEY UPDATE capacidad_maxima_mensual = capacidad_maxima_mensual;