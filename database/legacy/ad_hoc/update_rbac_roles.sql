-- ========================================
-- ACTUALIZACIÓN DE ROLES Y PERMISOS RBAC
-- Para Artyco Financial App
-- ========================================

USE artyco_financial_rbac;

-- Primero, limpiar las tablas de asociación
DELETE FROM role_permissions;
DELETE FROM user_roles WHERE role_id > 4;

-- Actualizar roles existentes con mejores descripciones
UPDATE roles SET name = 'CEO/Director', description = 'Acceso total al sistema, visión estratégica y toma de decisiones' WHERE id = 1;
UPDATE roles SET name = 'CFO/Gerente Financiero', description = 'Gestión financiera completa, aprobaciones y configuración' WHERE id = 2;
UPDATE roles SET name = 'Analista Senior', description = 'Análisis avanzado, creación de reportes y modificación de datos' WHERE id = 3;
UPDATE roles SET name = 'Analista Junior', description = 'Análisis básico y visualización de reportes' WHERE id = 4;

-- Agregar nuevos roles específicos
INSERT INTO roles (id, name, description) VALUES
(5, 'Contador', 'Gestión de datos financieros y reconciliación'),
(6, 'Auditor', 'Solo lectura con acceso a logs y trazabilidad'),
(7, 'Inversionista', 'Acceso limitado a KPIs y reportes ejecutivos'),
(8, 'Consultor Externo', 'Acceso temporal a módulos específicos')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Limpiar permisos existentes
DELETE FROM permissions;

-- Insertar permisos granulares completos
-- Dashboard KPIs
INSERT INTO permissions (id, name, resource, action, description) VALUES
(1, 'dashboard.view', 'dashboard', 'read', 'Ver dashboard principal y KPIs'),
(2, 'dashboard.export', 'dashboard', 'export', 'Exportar datos del dashboard'),
(3, 'dashboard.customize', 'dashboard', 'write', 'Personalizar widgets y métricas del dashboard');

-- Análisis PyG (Pérdidas y Ganancias)
INSERT INTO permissions (id, name, resource, action, description) VALUES
(4, 'pyg.view', 'pyg', 'read', 'Ver análisis de pérdidas y ganancias'),
(5, 'pyg.create', 'pyg', 'create', 'Crear nuevos análisis PyG'),
(6, 'pyg.edit', 'pyg', 'write', 'Editar datos de PyG existentes'),
(7, 'pyg.delete', 'pyg', 'delete', 'Eliminar análisis PyG'),
(8, 'pyg.export', 'pyg', 'export', 'Exportar reportes PyG'),
(9, 'pyg.compare', 'pyg', 'analyze', 'Realizar comparaciones entre períodos');

-- Punto de Equilibrio
INSERT INTO permissions (id, name, resource, action, description) VALUES
(10, 'breakeven.view', 'breakeven', 'read', 'Ver análisis de punto de equilibrio'),
(11, 'breakeven.calculate', 'breakeven', 'create', 'Calcular nuevos puntos de equilibrio'),
(12, 'breakeven.sensitivity', 'breakeven', 'analyze', 'Realizar análisis de sensibilidad'),
(13, 'breakeven.scenarios', 'breakeven', 'write', 'Crear y modificar escenarios'),
(14, 'breakeven.export', 'breakeven', 'export', 'Exportar análisis de punto de equilibrio');

-- Análisis Operacional
INSERT INTO permissions (id, name, resource, action, description) VALUES
(15, 'operational.view', 'operational', 'read', 'Ver métricas operacionales'),
(16, 'operational.production', 'operational', 'write', 'Modificar datos de producción'),
(17, 'operational.efficiency', 'operational', 'analyze', 'Analizar eficiencia operativa'),
(18, 'operational.costs', 'operational', 'write', 'Gestionar costos operativos'),
(19, 'operational.forecast', 'operational', 'create', 'Crear pronósticos operacionales');

-- Configuración de Datos
INSERT INTO permissions (id, name, resource, action, description) VALUES
(20, 'config.view', 'config', 'read', 'Ver configuración del sistema'),
(21, 'config.financial', 'config', 'write', 'Modificar configuración financiera'),
(22, 'config.upload', 'config', 'create', 'Cargar nuevos datos al sistema'),
(23, 'config.backup', 'config', 'export', 'Realizar respaldos de datos'),
(24, 'config.restore', 'config', 'write', 'Restaurar datos desde respaldos'),
(25, 'config.integrations', 'config', 'admin', 'Gestionar integraciones con otros sistemas');

-- Gestión de Usuarios (RBAC)
INSERT INTO permissions (id, name, resource, action, description) VALUES
(26, 'users.view', 'users', 'read', 'Ver lista de usuarios'),
(27, 'users.create', 'users', 'create', 'Crear nuevos usuarios'),
(28, 'users.edit', 'users', 'write', 'Editar usuarios existentes'),
(29, 'users.delete', 'users', 'delete', 'Eliminar usuarios'),
(30, 'users.roles', 'users', 'admin', 'Gestionar roles y permisos'),
(31, 'users.audit', 'users', 'read', 'Ver logs de auditoría de usuarios');

-- Brain System (IA)
INSERT INTO permissions (id, name, resource, action, description) VALUES
(32, 'brain.query', 'brain', 'read', 'Realizar consultas al sistema de IA'),
(33, 'brain.insights', 'brain', 'analyze', 'Obtener insights avanzados de IA'),
(34, 'brain.train', 'brain', 'admin', 'Entrenar y configurar modelos de IA'),
(35, 'brain.automation', 'brain', 'write', 'Configurar automatizaciones con IA');

-- Reportes y Exportación
INSERT INTO permissions (id, name, resource, action, description) VALUES
(36, 'reports.view', 'reports', 'read', 'Ver reportes generados'),
(37, 'reports.create', 'reports', 'create', 'Crear nuevos reportes personalizados'),
(38, 'reports.schedule', 'reports', 'write', 'Programar reportes automáticos'),
(39, 'reports.export.pdf', 'reports', 'export', 'Exportar reportes en PDF'),
(40, 'reports.export.excel', 'reports', 'export', 'Exportar reportes en Excel'),
(41, 'reports.share', 'reports', 'share', 'Compartir reportes con externos');

-- Auditoría y Compliance
INSERT INTO permissions (id, name, resource, action, description) VALUES
(42, 'audit.logs', 'audit', 'read', 'Ver logs de auditoría del sistema'),
(43, 'audit.compliance', 'audit', 'analyze', 'Verificar cumplimiento normativo'),
(44, 'audit.export', 'audit', 'export', 'Exportar registros de auditoría'),
(45, 'audit.alerts', 'audit', 'write', 'Configurar alertas de auditoría');

-- ========================================
-- ASIGNAR PERMISOS A ROLES
-- ========================================

-- CEO/Director (Rol 1) - Acceso total
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- CFO/Gerente Financiero (Rol 2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE id IN (1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,32,33,35,36,37,38,39,40,41,42,43,44,45);

-- Analista Senior (Rol 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE id IN (1,2,4,5,6,8,9,10,11,12,13,14,15,17,32,33,36,37,38,39,40);

-- Analista Junior (Rol 4)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions 
WHERE id IN (1,2,4,8,10,14,15,32,36,39);

-- Contador (Rol 5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions 
WHERE id IN (4,5,6,8,20,21,22,36,37,39,40,42);

-- Auditor (Rol 6)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions 
WHERE action = 'read' OR id IN (42,43,44);

-- Inversionista (Rol 7)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions 
WHERE id IN (1,2,36,39);

-- Consultor Externo (Rol 8)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions 
WHERE id IN (1,4,10,15);

-- ========================================
-- CREAR USUARIOS DE EJEMPLO
-- ========================================

-- Verificar si los usuarios ya existen antes de crearlos
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_superuser)
SELECT * FROM (
    SELECT 'cfo_maria' as username, 'maria.gonzalez@artyco.com' as email, 
           '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe' as password_hash,
           'María' as first_name, 'González' as last_name, 2 as role_id, true as is_active, false as is_superuser
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'cfo_maria');

INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_superuser)
SELECT * FROM (
    SELECT 'senior_carlos' as username, 'carlos.rodriguez@artyco.com' as email, 
           '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe' as password_hash,
           'Carlos' as first_name, 'Rodríguez' as last_name, 3 as role_id, true as is_active, false as is_superuser
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'senior_carlos');

INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_superuser)
SELECT * FROM (
    SELECT 'junior_ana' as username, 'ana.martinez@artyco.com' as email, 
           '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe' as password_hash,
           'Ana' as first_name, 'Martínez' as last_name, 4 as role_id, true as is_active, false as is_superuser
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'junior_ana');

-- ========================================
-- RESUMEN FINAL
-- ========================================

SELECT '=== ROLES CONFIGURADOS ===' AS info;
SELECT id, name, description FROM roles ORDER BY id;

SELECT '\n=== TOTAL DE PERMISOS ===' AS info;
SELECT COUNT(*) AS total_permisos FROM permissions;

SELECT '\n=== USUARIOS POR ROL ===' AS info;
SELECT r.name AS rol, COUNT(u.id) AS cantidad_usuarios 
FROM roles r 
LEFT JOIN users u ON r.id = u.role_id 
GROUP BY r.id, r.name
ORDER BY r.id;