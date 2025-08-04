-- ================================
-- CONFIGURACIÓN DE TIPOS DE ANÁLISIS
-- ================================
-- Script para crear configuración global de análisis financieros
-- Soporte para: PyG (Estado de Resultados) y Punto de Equilibrio
-- Fecha: 2025-01-23

-- 1. Tabla de tipos de análisis disponibles
CREATE TABLE IF NOT EXISTS analysis_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    calculation_method VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de patrones de exclusión de cuentas
CREATE TABLE IF NOT EXISTS account_exclusion_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pattern_group VARCHAR(50) NOT NULL, -- 'depreciacion', 'intereses', 'impuestos'
    pattern_name VARCHAR(100) NOT NULL,
    pattern_value VARCHAR(255) NOT NULL,
    pattern_type ENUM('contains', 'starts_with', 'ends_with', 'exact', 'regex') DEFAULT 'contains',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pattern_group (pattern_group),
    INDEX idx_pattern_type (pattern_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de configuración de análisis (qué excluir en cada tipo)
CREATE TABLE IF NOT EXISTS analysis_type_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_type_id INT NOT NULL,
    pattern_group VARCHAR(50) NOT NULL,
    include_pattern BOOLEAN DEFAULT TRUE, -- TRUE = incluir, FALSE = excluir
    company_id INT NULL, -- NULL = configuración global, específico = override por empresa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (analysis_type_id) REFERENCES analysis_types(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_config (analysis_type_id, pattern_group, company_id),
    INDEX idx_analysis_company (analysis_type_id, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de configuración visual de análisis
CREATE TABLE IF NOT EXISTS analysis_visual_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_type_id INT NOT NULL,
    primary_color VARCHAR(7) NOT NULL, -- Hex color
    chart_color VARCHAR(7) NOT NULL,
    icon_emoji VARCHAR(10),
    bg_gradient VARCHAR(100),
    company_id INT NULL, -- Para overrides por empresa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (analysis_type_id) REFERENCES analysis_types(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_visual_config (analysis_type_id, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- DATOS INICIALES
-- ================================

-- Insertar tipos de análisis estándar
INSERT INTO analysis_types (code, name, description, calculation_method, sort_order) VALUES
('contable', 'P.E. Contable', 'Estado de resultados completo que incluye todos los ingresos, costos y gastos contables: depreciación, amortizaciones, intereses, impuestos y todos los demás gastos. Muestra la utilidad neta real según normas contables y fiscales.', 'STANDARD', 1),
('operativo', 'P.E. Operativo', 'Estado de resultados operativo (EBIT) que excluye únicamente los gastos financieros (intereses y comisiones bancarias). Incluye depreciación y amortizaciones. Ideal para evaluar la eficiencia operativa sin considerar la estructura de financiamiento.', 'EBIT', 2),
('caja', 'P.E. de Caja', 'Estado de resultados basado en flujo de efectivo (EBITDA). Excluye todos los gastos que no requieren salida inmediata de efectivo: depreciación de activos fijos, amortizaciones de intangibles, e intereses financieros. Muestra la generación real de caja operativa.', 'EBITDA', 3);

-- Insertar patrones de exclusión de depreciación
INSERT INTO account_exclusion_patterns (pattern_group, pattern_name, pattern_value, pattern_type) VALUES
('depreciacion', 'Depreciación (es)', 'depreciación', 'contains'),
('depreciacion', 'Depreciacion (sin acento)', 'depreciacion', 'contains'),
('depreciacion', 'Depreciation (en)', 'depreciation', 'contains'),
('depreciacion', 'Desgaste', 'desgaste', 'contains'),
('depreciacion', 'Amortización (es)', 'amortización', 'contains'),
('depreciacion', 'Amortizacion (sin acento)', 'amortizacion', 'contains'),
('depreciacion', 'Propiedades, plantas y equipos', 'propiedades, plantas y equipos', 'contains'),
('depreciacion', 'Intangibles', 'intangibles', 'contains');

-- Insertar patrones de exclusión de intereses
INSERT INTO account_exclusion_patterns (pattern_group, pattern_name, pattern_value, pattern_type) VALUES
('intereses', 'Intereses', 'intereses', 'contains'),
('intereses', 'Interest (en)', 'interest', 'contains'),
('intereses', 'Financier', 'financier', 'contains'),
('intereses', 'Financiera', 'financiera', 'contains'),
('intereses', 'Financiero', 'financiero', 'contains'),
('intereses', 'Financieros', 'financieros', 'contains'),
('intereses', 'Préstamo', 'préstamo', 'contains'),
('intereses', 'Prestamo (sin acento)', 'prestamo', 'contains'),
('intereses', 'Crédito', 'crédito', 'contains'),
('intereses', 'Credito (sin acento)', 'credito', 'contains'),
('intereses', 'Loan (en)', 'loan', 'contains'),
('intereses', 'Gastos financieros', 'gastos financieros', 'contains'),
('intereses', 'Comisiones bancarias', 'comisiones bancarias', 'contains'),
('intereses', 'Gastos de gestión', 'gastos de gestión', 'contains'),
('intereses', 'Gastos de gestión y credito', 'gastos de gestión y credito', 'contains'),
('intereses', 'Gestión y credito', 'gestión y credito', 'contains'),
('intereses', 'Otros gastos financieros', 'otros gastos financieros', 'contains');

-- Insertar patrones de exclusión de impuestos
INSERT INTO account_exclusion_patterns (pattern_group, pattern_name, pattern_value, pattern_type) VALUES
('impuestos', 'Impuesto', 'impuesto', 'contains'),
('impuestos', 'Tributo', 'tributo', 'contains'),
('impuestos', 'Fiscal', 'fiscal', 'contains'),
('impuestos', 'Tax (en)', 'tax', 'contains'),
('impuestos', 'Taxes (en)', 'taxes', 'contains');

-- Configurar qué excluir en cada tipo de análisis
-- CONTABLE: No excluir nada (incluir todo)
INSERT INTO analysis_type_config (analysis_type_id, pattern_group, include_pattern) VALUES
((SELECT id FROM analysis_types WHERE code = 'contable'), 'depreciacion', TRUE),
((SELECT id FROM analysis_types WHERE code = 'contable'), 'intereses', TRUE),
((SELECT id FROM analysis_types WHERE code = 'contable'), 'impuestos', TRUE);

-- OPERATIVO (EBIT): Excluir solo intereses
INSERT INTO analysis_type_config (analysis_type_id, pattern_group, include_pattern) VALUES
((SELECT id FROM analysis_types WHERE code = 'operativo'), 'depreciacion', TRUE),
((SELECT id FROM analysis_types WHERE code = 'operativo'), 'intereses', FALSE),
((SELECT id FROM analysis_types WHERE code = 'operativo'), 'impuestos', TRUE);

-- CAJA (EBITDA): Excluir depreciación e intereses
INSERT INTO analysis_type_config (analysis_type_id, pattern_group, include_pattern) VALUES
((SELECT id FROM analysis_types WHERE code = 'caja'), 'depreciacion', FALSE),
((SELECT id FROM analysis_types WHERE code = 'caja'), 'intereses', FALSE),
((SELECT id FROM analysis_types WHERE code = 'caja'), 'impuestos', TRUE);

-- Configuración visual por defecto
INSERT INTO analysis_visual_config (analysis_type_id, primary_color, chart_color, icon_emoji, bg_gradient) VALUES
((SELECT id FROM analysis_types WHERE code = 'contable'), '#00F0FF', '#00F0FF', '📊', 'from-primary/10 to-primary/5'),
((SELECT id FROM analysis_types WHERE code = 'operativo'), '#00FF99', '#00FF99', '📈', 'from-accent/10 to-accent/5'),
((SELECT id FROM analysis_types WHERE code = 'caja'), '#FFB800', '#FFB800', '💰', 'from-warning/10 to-warning/5');

-- ================================
-- VISTAS PARA CONSULTA RÁPIDA
-- ================================

-- Vista para obtener configuración completa de análisis
CREATE OR REPLACE VIEW v_analysis_config AS
SELECT 
    at.id as analysis_id,
    at.code as analysis_code,
    at.name as analysis_name,
    at.description,
    at.calculation_method,
    atc.pattern_group,
    atc.include_pattern,
    atc.company_id,
    CASE 
        WHEN atc.company_id IS NULL THEN 'Global'
        ELSE CONCAT('Company ', atc.company_id)
    END as config_scope
FROM analysis_types at
LEFT JOIN analysis_type_config atc ON at.id = atc.analysis_type_id
WHERE at.is_active = TRUE
ORDER BY at.sort_order, atc.pattern_group;

-- Vista para obtener patrones de exclusión agrupados
CREATE OR REPLACE VIEW v_exclusion_patterns AS
SELECT 
    pattern_group,
    pattern_type,
    GROUP_CONCAT(pattern_value SEPARATOR '|') as patterns,
    COUNT(*) as pattern_count
FROM account_exclusion_patterns
WHERE is_active = TRUE
GROUP BY pattern_group, pattern_type
ORDER BY pattern_group;

-- ================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ================================

-- Índices adicionales para consultas frecuentes
CREATE INDEX idx_analysis_types_code ON analysis_types(code);
CREATE INDEX idx_analysis_types_active ON analysis_types(is_active, sort_order);
CREATE INDEX idx_exclusion_patterns_active ON account_exclusion_patterns(is_active, pattern_group);
CREATE INDEX idx_config_analysis_pattern ON analysis_type_config(analysis_type_id, pattern_group);

-- ================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ================================

-- Agregar comentarios a las tablas para documentación
ALTER TABLE analysis_types COMMENT = 'Tipos de análisis financieros disponibles (PyG, Punto de Equilibrio, etc.)';
ALTER TABLE account_exclusion_patterns COMMENT = 'Patrones de texto para identificar cuentas a excluir en análisis';
ALTER TABLE analysis_type_config COMMENT = 'Configuración de qué patrones incluir/excluir por tipo de análisis';
ALTER TABLE analysis_visual_config COMMENT = 'Configuración visual (colores, iconos) para cada tipo de análisis';

-- ================================
-- TRIGGERS PARA AUDITORÍA
-- ================================

-- Trigger para actualizar timestamp automáticamente
DELIMITER //

CREATE TRIGGER tr_analysis_types_updated
    BEFORE UPDATE ON analysis_types
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER tr_account_exclusion_patterns_updated
    BEFORE UPDATE ON account_exclusion_patterns
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER tr_analysis_type_config_updated
    BEFORE UPDATE ON analysis_type_config
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER tr_analysis_visual_config_updated
    BEFORE UPDATE ON analysis_visual_config
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- ================================
-- SCRIPT COMPLETADO
-- ================================
-- Este script crea la infraestructura completa para configuración
-- de análisis financieros, incluyendo:
-- 
-- ✅ Tipos de análisis configurables
-- ✅ Patrones de exclusión dinámicos  
-- ✅ Configuración por empresa
-- ✅ Configuración visual
-- ✅ Vistas optimizadas
-- ✅ Índices de rendimiento
-- ✅ Triggers de auditoría
-- 
-- Uso: Ejecutar este script en la base de datos MySQL
-- Prerequisito: Tabla 'companies' debe existir
-- ================================