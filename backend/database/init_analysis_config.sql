-- Script de inicialización para configuración de análisis financieros
-- Base de datos: artyco_financial
-- Fecha: 2025-01-23

USE artyco_financial;

-- Tabla para tipos de análisis
CREATE TABLE IF NOT EXISTS analysis_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    calculation_method VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para patrones de exclusión
CREATE TABLE IF NOT EXISTS exclusion_patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pattern_group VARCHAR(50) NOT NULL,
    pattern_name VARCHAR(100) NOT NULL,
    pattern_value VARCHAR(255) NOT NULL,
    pattern_type ENUM('contains', 'starts_with', 'ends_with', 'exact', 'regex') DEFAULT 'contains',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    company_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pattern_group (pattern_group),
    INDEX idx_company_id (company_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar tipos de análisis por defecto
INSERT INTO analysis_types (code, name, description, calculation_method, sort_order) VALUES
('contable', 'Análisis Contable', 'Punto de Equilibrio Contable (Estándar). Incluye todos los gastos contables.', 'standard', 1),
('operativo', 'Análisis Operativo', 'Punto de Equilibrio Operativo (EBIT). Evalúa la eficiencia operativa sin considerar el financiamiento.', 'ebit', 2),
('caja', 'Análisis de Caja', 'Punto de Equilibrio de Caja (EBITDA). Excluye depreciación e intereses.', 'ebitda', 3)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    calculation_method = VALUES(calculation_method),
    sort_order = VALUES(sort_order);

-- Insertar patrones de depreciación por defecto
INSERT INTO exclusion_patterns (pattern_group, pattern_name, pattern_value, pattern_type, sort_order) VALUES
-- Patrones de depreciación con y sin acentos
('depreciacion', 'Depreciación (con acento)', 'depreciación', 'contains', 1),
('depreciacion', 'Depreciacion (sin acento)', 'depreciacion', 'contains', 2),
('depreciacion', 'Amortización (con acento)', 'amortización', 'contains', 3),
('depreciacion', 'Amortizacion (sin acento)', 'amortizacion', 'contains', 4),
('depreciacion', 'Propiedades Plantas y Equipos', 'propiedades', 'contains', 5),
('depreciacion', 'Intangibles', 'intangible', 'contains', 6),

-- Patrones de intereses
('intereses', 'Intereses (sin acento)', 'interes', 'contains', 1),
('intereses', 'Interés (con acento)', 'interés', 'contains', 2),
('intereses', 'Gastos financieros', 'gastos financieros', 'contains', 3),
('intereses', 'Financiero', 'financiero', 'contains', 4),
('intereses', 'Gastos de gestión y crédito', 'gastos de gestión y credito', 'contains', 5),
('intereses', 'Préstamo (con acento)', 'préstamo', 'contains', 6),
('intereses', 'Prestamo (sin acento)', 'prestamo', 'contains', 7),
('intereses', 'Crédito (con acento)', 'crédito', 'contains', 8),
('intereses', 'Credito (sin acento)', 'credito', 'contains', 9),

-- Patrones de impuestos
('impuestos', 'Impuesto', 'impuesto', 'contains', 1),
('impuestos', 'Tributo', 'tributo', 'contains', 2),
('impuestos', 'Fiscal', 'fiscal', 'contains', 3),
('impuestos', 'Tax (inglés)', 'tax', 'contains', 4)

ON DUPLICATE KEY UPDATE
    pattern_name = VALUES(pattern_name),
    pattern_value = VALUES(pattern_value),
    pattern_type = VALUES(pattern_type),
    sort_order = VALUES(sort_order);

-- Verificar inserción
SELECT 'Tipos de análisis insertados:' as Info;
SELECT * FROM analysis_types ORDER BY sort_order;

SELECT 'Patrones de exclusión insertados:' as Info;
SELECT pattern_group, COUNT(*) as total_patterns 
FROM exclusion_patterns 
WHERE is_active = TRUE 
GROUP BY pattern_group 
ORDER BY pattern_group;

-- Mostrar algunos patrones de ejemplo
SELECT 'Patrones de depreciación:' as Info;
SELECT pattern_name, pattern_value, pattern_type 
FROM exclusion_patterns 
WHERE pattern_group = 'depreciacion' AND is_active = TRUE 
ORDER BY sort_order;