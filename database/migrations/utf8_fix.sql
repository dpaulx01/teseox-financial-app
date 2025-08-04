-- ================================
-- MIGRACIÓN UTF-8 PARA ANÁLISIS
-- ================================
-- Script para convertir tablas de análisis a UTF-8
-- Fecha: 2025-01-24

-- Establecer encoding para la sesión
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Convertir tablas existentes a UTF-8
ALTER TABLE analysis_types CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE account_exclusion_patterns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE analysis_type_config CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE analysis_visual_config CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Actualizar datos con caracteres especiales corregidos
UPDATE account_exclusion_patterns 
SET 
    pattern_name = REPLACE(pattern_name, 'gestiÃ³n', 'gestión'),
    pattern_value = REPLACE(pattern_value, 'gestiÃ³n', 'gestión')
WHERE pattern_name LIKE '%gestiÃ³n%' OR pattern_value LIKE '%gestiÃ³n%';

UPDATE account_exclusion_patterns 
SET 
    pattern_name = REPLACE(pattern_name, 'depreciaciÃ³n', 'depreciación'),
    pattern_value = REPLACE(pattern_value, 'depreciaciÃ³n', 'depreciación')
WHERE pattern_name LIKE '%depreciaciÃ³n%' OR pattern_value LIKE '%depreciaciÃ³n%';

UPDATE account_exclusion_patterns 
SET 
    pattern_name = REPLACE(pattern_name, 'amortizaciÃ³n', 'amortización'),
    pattern_value = REPLACE(pattern_value, 'amortizaciÃ³n', 'amortización')
WHERE pattern_name LIKE '%amortizaciÃ³n%' OR pattern_value LIKE '%amortizaciÃ³n%';

UPDATE account_exclusion_patterns 
SET 
    pattern_name = REPLACE(pattern_name, 'crÃ©dito', 'crédito'),
    pattern_value = REPLACE(pattern_value, 'crÃ©dito', 'crédito')
WHERE pattern_name LIKE '%crÃ©dito%' OR pattern_value LIKE '%crÃ©dito%';

UPDATE account_exclusion_patterns 
SET 
    pattern_name = REPLACE(pattern_name, 'prÃ©stamo', 'préstamo'),
    pattern_value = REPLACE(pattern_value, 'prÃ©stamo', 'préstamo')
WHERE pattern_name LIKE '%prÃ©stamo%' OR pattern_value LIKE '%prÃ©stamo%';

-- Verificar datos actualizados
SELECT pattern_group, pattern_name, pattern_value 
FROM account_exclusion_patterns 
WHERE pattern_name LIKE '%gestión%' OR pattern_value LIKE '%gestión%'
   OR pattern_name LIKE '%depreciación%' OR pattern_value LIKE '%depreciación%'
   OR pattern_name LIKE '%amortización%' OR pattern_value LIKE '%amortización%';