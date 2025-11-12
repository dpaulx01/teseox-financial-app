USE artyco_financial_rbac;

-- 1. Companies table
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Financial data table
CREATE TABLE financial_data (
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
    ingresos_operacionales DECIMAL(20,2) DEFAULT 0,
    ingresos_no_operacionales DECIMAL(20,2) DEFAULT 0,
    costos_directos DECIMAL(20,2) DEFAULT 0,
    costos_indirectos DECIMAL(20,2) DEFAULT 0,
    gastos_financieros DECIMAL(20,2) DEFAULT 0,
    utilidad_operacional DECIMAL(20,2) DEFAULT 0,
    upload_source VARCHAR(100) DEFAULT 'manual',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Production data table
CREATE TABLE production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    month INT NOT NULL,
    metros_producidos DECIMAL(12,2) DEFAULT 0,
    metros_vendidos DECIMAL(12,2) DEFAULT 0,
    unidades_producidas INT DEFAULT 0,
    unidades_vendidas INT DEFAULT 0,
    capacidad_instalada INT DEFAULT 0,
    utilizacion_capacidad DECIMAL(5,2) DEFAULT 0,
    costo_materiales DECIMAL(15,2) DEFAULT 0,
    costo_mano_obra DECIMAL(15,2) DEFAULT 0,
    costo_overhead DECIMAL(15,2) DEFAULT 0,
    costo_unitario DECIMAL(10,4) DEFAULT 0,
    tiempo_ciclo DECIMAL(8,2) DEFAULT 0,
    eficiencia_oee DECIMAL(5,2) DEFAULT 0,
    defectos_ppm INT DEFAULT 0,
    empleados_produccion INT DEFAULT 0,
    horas_trabajadas DECIMAL(10,2) DEFAULT 0,
    horas_extra DECIMAL(10,2) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_id, year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default company
INSERT INTO companies (id, name, description, industry, currency) VALUES
(1, 'Artyco Financial', 'Empresa principal para análisis financiero', 'Consultoría Financiera', 'USD');

SELECT 'Tablas básicas creadas' as status;