-- Corregir datos UTF-8 corruptos
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

-- Eliminar registros corruptos y reinsertarlos correctamente
DELETE FROM account_exclusion_patterns WHERE pattern_name LIKE '%Ã%';

-- Reinsertar datos correctos
INSERT INTO account_exclusion_patterns (pattern_group, pattern_name, pattern_value, pattern_type, is_active) VALUES
('depreciacion', 'Depreciación (es)', 'depreciación', 'contains', TRUE),
('depreciacion', 'Amortización (es)', 'amortización', 'contains', TRUE),
('intereses', 'Gastos de gestión', 'gastos de gestión', 'contains', TRUE),
('intereses', 'Gastos de gestión y crédito', 'gastos de gestión y crédito', 'contains', TRUE),
('intereses', 'Gestión y crédito', 'gestión y crédito', 'contains', TRUE);

-- Verificar datos
SELECT id, pattern_group, pattern_name, pattern_value FROM account_exclusion_patterns 
WHERE pattern_name LIKE '%gestión%' OR pattern_name LIKE '%depreciación%' OR pattern_name LIKE '%amortización%';