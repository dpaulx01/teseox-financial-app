-- Establecer codificación UTF-8
SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

USE artyco_financial_rbac;

-- Corregir las descripciones mal codificadas
UPDATE roles SET 
    description = 'Análisis básico y visualización' 
WHERE id = 4;

UPDATE roles SET 
    description = 'Análisis avanzado y reportes' 
WHERE id = 3;

UPDATE roles SET 
    description = 'Gestión financiera completa' 
WHERE id = 2;

UPDATE roles SET 
    description = 'Acceso total al sistema' 
WHERE id = 1;

-- Agregar roles adicionales con codificación correcta
INSERT INTO roles (id, name, description) VALUES
(5, 'Contador', 'Gestión de datos financieros y reconciliación'),
(6, 'Auditor', 'Solo lectura con acceso a logs y trazabilidad'),
(7, 'Inversionista', 'Acceso limitado a KPIs y reportes ejecutivos'),
(8, 'Consultor Externo', 'Acceso temporal a módulos específicos')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name), 
    description = VALUES(description);

-- Verificar resultados
SELECT id, name, description FROM roles ORDER BY id;