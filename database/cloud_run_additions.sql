-- ============================================================
-- Additional tables required for Cloud Run / Cloud SQL deploys
-- Mirrors the ORM models used by the RBAC backend
-- ============================================================

-- Production quotes (cotizaciones) for Status Producción module
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_cotizacion VARCHAR(64) NOT NULL UNIQUE,
    tipo_produccion ENUM('cliente', 'stock') NOT NULL DEFAULT 'cliente',
    numero_pedido_stock VARCHAR(50),
    cliente VARCHAR(255),
    bodega VARCHAR(100),
    responsable VARCHAR(100),
    contacto VARCHAR(255),
    proyecto VARCHAR(255),
    odc VARCHAR(128),
    valor_total DECIMAL(12,2),
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio_periodo DATE,
    fecha_fin_periodo DATE,
    fecha_vencimiento DATE,
    nombre_archivo_pdf VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cotizaciones_tipo (tipo_produccion),
    INDEX idx_cotizaciones_numero_stock (numero_pedido_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Productos asociados a las cotizaciones
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad VARCHAR(128),
    valor_subtotal DECIMAL(12,2),
    fecha_entrega DATE,
    estatus ENUM(
        'En cola',
        'En producción',
        'Producción parcial',
        'Listo para retiro',
        'En bodega',
        'Entregado'
    ),
    notas_estatus TEXT,
    factura VARCHAR(128),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_productos_cotizacion (cotizacion_id),
    CONSTRAINT fk_productos_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos asociados a las cotizaciones
CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    fecha_pago DATE,
    descripcion VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pagos_cotizacion (cotizacion_id),
    CONSTRAINT fk_pagos_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Balance General aggregated data
CREATE TABLE IF NOT EXISTS balance_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    period_year INT NOT NULL,
    period_month INT,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL DEFAULT 1,
    parent_code VARCHAR(50),
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_balance_company_year (company_id, period_year),
    INDEX idx_balance_month (period_month),
    INDEX idx_balance_account (account_code),
    INDEX idx_balance_parent (parent_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Balance General raw rows (detalle completo)
CREATE TABLE IF NOT EXISTS raw_balance_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    period_year INT NOT NULL,
    period_month INT,
    row_index INT NOT NULL,
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    balance DECIMAL(15,2),
    extra JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_raw_balance_company_year (company_id, period_year),
    INDEX idx_raw_balance_month (period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Balance targets / annotations
CREATE TABLE IF NOT EXISTS balance_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    year INT NOT NULL,
    working_capital_target DECIMAL(15,2),
    liquidity_target DECIMAL(7,2),
    leverage_target DECIMAL(7,2),
    notes VARCHAR(1024),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_balance_config_company_year (company_id, year),
    INDEX idx_balance_config_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Financial scenarios storage (JSON payload per scenario)
CREATE TABLE IF NOT EXISTS financial_scenarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_year INT NOT NULL,
    financial_data JSON NOT NULL,
    is_template BOOLEAN DEFAULT FALSE,
    category VARCHAR(100) DEFAULT 'simulación',
    status VARCHAR(50) DEFAULT 'draft',
    owner_id INT NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP NULL,
    INDEX idx_financial_scenarios_name (name),
    CONSTRAINT fk_financial_scenarios_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mixed cost catalog for breakeven analysis
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

-- General analysis configuration (key/value)
CREATE TABLE IF NOT EXISTS analysis_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_analysis_config_company_key (company_id, config_key),
    INDEX idx_analysis_config_company (company_id),
    INDEX idx_analysis_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
