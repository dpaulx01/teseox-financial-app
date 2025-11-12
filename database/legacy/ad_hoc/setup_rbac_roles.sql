-- ========================================
-- SETUP COMPLETO DE ROLES Y PERMISOS RBAC
-- Para Artyco Financial App
-- ========================================

USE artyco_financial_rbac;

-- Limpiar datos existentes (en orden correcto para evitar conflictos de FK)
DELETE FROM role_permissions;
DELETE FROM user_roles;
DELETE FROM permissions;
DELETE FROM roles;

-- ========================================
-- 1. CREAR ROLES ESPECÍFICOS PARA APP FINANCIERA
-- ========================================

INSERT INTO roles (id, name, description) VALUES
(1, 'CEO/Director', 'Acceso total al sistema, visión estratégica y toma de decisiones'),
(2, 'CFO/Gerente Financiero', 'Gestión financiera completa, aprobaciones y configuración'),
(3, 'Analista Senior', 'Análisis avanzado, creación de reportes y modificación de datos'),
(4, 'Analista Junior', 'Análisis básico y visualización de reportes'),
(5, 'Contador', 'Gestión de datos financieros y reconciliación'),
(6, 'Auditor', 'Solo lectura con acceso a logs y trazabilidad'),
(7, 'Inversionista', 'Acceso limitado a KPIs y reportes ejecutivos'),
(8, 'Consultor Externo', 'Acceso temporal a módulos específicos');

-- ========================================
-- 2. CREAR PERMISOS GRANULARES POR MÓDULO
-- ========================================

-- Dashboard KPIs
INSERT INTO permissions (name, resource, action, description) VALUES
('dashboard.view', 'dashboard', 'read', 'Ver dashboard principal y KPIs'),
('dashboard.export', 'dashboard', 'export', 'Exportar datos del dashboard'),
('dashboard.customize', 'dashboard', 'write', 'Personalizar widgets y métricas del dashboard');

-- Análisis PyG (Pérdidas y Ganancias)
INSERT INTO permissions (name, resource, action, description) VALUES
('pyg.view', 'pyg', 'read', 'Ver análisis de pérdidas y ganancias'),
('pyg.create', 'pyg', 'create', 'Crear nuevos análisis PyG'),
('pyg.edit', 'pyg', 'write', 'Editar datos de PyG existentes'),
('pyg.delete', 'pyg', 'delete', 'Eliminar análisis PyG'),
('pyg.export', 'pyg', 'export', 'Exportar reportes PyG'),
('pyg.compare', 'pyg', 'analyze', 'Realizar comparaciones entre períodos');

-- Punto de Equilibrio
INSERT INTO permissions (name, resource, action, description) VALUES
('breakeven.view', 'breakeven', 'read', 'Ver análisis de punto de equilibrio'),
('breakeven.calculate', 'breakeven', 'create', 'Calcular nuevos puntos de equilibrio'),
('breakeven.sensitivity', 'breakeven', 'analyze', 'Realizar análisis de sensibilidad'),
('breakeven.scenarios', 'breakeven', 'write', 'Crear y modificar escenarios'),
('breakeven.export', 'breakeven', 'export', 'Exportar análisis de punto de equilibrio');

-- Análisis Operacional
INSERT INTO permissions (name, resource, action, description) VALUES
('operational.view', 'operational', 'read', 'Ver métricas operacionales'),
('operational.production', 'operational', 'write', 'Modificar datos de producción'),
('operational.efficiency', 'operational', 'analyze', 'Analizar eficiencia operativa'),
('operational.costs', 'operational', 'write', 'Gestionar costos operativos'),
('operational.forecast', 'operational', 'create', 'Crear pronósticos operacionales');

-- Configuración de Datos
INSERT INTO permissions (name, resource, action, description) VALUES
('config.view', 'config', 'read', 'Ver configuración del sistema'),
('config.financial', 'config', 'write', 'Modificar configuración financiera'),
('config.upload', 'config', 'create', 'Cargar nuevos datos al sistema'),
('config.backup', 'config', 'export', 'Realizar respaldos de datos'),
('config.restore', 'config', 'write', 'Restaurar datos desde respaldos'),
('config.integrations', 'config', 'admin', 'Gestionar integraciones con otros sistemas');

-- Gestión de Usuarios (RBAC)
INSERT INTO permissions (name, resource, action, description) VALUES
('users.view', 'users', 'read', 'Ver lista de usuarios'),
('users.create', 'users', 'create', 'Crear nuevos usuarios'),
('users.edit', 'users', 'write', 'Editar usuarios existentes'),
('users.delete', 'users', 'delete', 'Eliminar usuarios'),
('users.roles', 'users', 'admin', 'Gestionar roles y permisos'),
('users.audit', 'users', 'read', 'Ver logs de auditoría de usuarios');

-- Brain System (IA)
INSERT INTO permissions (name, resource, action, description) VALUES
('brain.query', 'brain', 'read', 'Realizar consultas al sistema de IA'),
('brain.insights', 'brain', 'analyze', 'Obtener insights avanzados de IA'),
('brain.train', 'brain', 'admin', 'Entrenar y configurar modelos de IA'),
('brain.automation', 'brain', 'write', 'Configurar automatizaciones con IA');

-- Reportes y Exportación
INSERT INTO permissions (name, resource, action, description) VALUES
('reports.view', 'reports', 'read', 'Ver reportes generados'),
('reports.create', 'reports', 'create', 'Crear nuevos reportes personalizados'),
('reports.schedule', 'reports', 'write', 'Programar reportes automáticos'),
('reports.export.pdf', 'reports', 'export', 'Exportar reportes en PDF'),
('reports.export.excel', 'reports', 'export', 'Exportar reportes en Excel'),
('reports.share', 'reports', 'share', 'Compartir reportes con externos');

-- Auditoría y Compliance
INSERT INTO permissions (name, resource, action, description) VALUES
('audit.logs', 'audit', 'read', 'Ver logs de auditoría del sistema'),
('audit.compliance', 'audit', 'analyze', 'Verificar cumplimiento normativo'),
('audit.export', 'audit', 'export', 'Exportar registros de auditoría'),
('audit.alerts', 'audit', 'write', 'Configurar alertas de auditoría');

-- ========================================
-- 3. ASIGNAR PERMISOS A ROLES
-- ========================================

-- CEO/Director (Acceso total)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- CFO/Gerente Financiero (Todo excepto gestión de usuarios y configuración de IA)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE resource IN ('dashboard', 'pyg', 'breakeven', 'operational', 'config', 'reports', 'audit', 'brain')
AND action != 'admin';

-- Analista Senior (Análisis completo, sin eliminación ni admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE resource IN ('dashboard', 'pyg', 'breakeven', 'operational', 'reports', 'brain')
AND action IN ('read', 'create', 'write', 'analyze', 'export');

-- Analista Junior (Solo lectura y análisis básico)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions 
WHERE resource IN ('dashboard', 'pyg', 'breakeven', 'operational', 'reports')
AND action IN ('read', 'export');

-- Contador (Gestión de datos financieros)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions 
WHERE resource IN ('pyg', 'config', 'reports', 'audit')
AND action IN ('read', 'write', 'create', 'export');

-- Auditor (Solo lectura y auditoría)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions 
WHERE action = 'read' OR resource = 'audit';

-- Inversionista (KPIs y reportes ejecutivos)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions 
WHERE name IN ('dashboard.view', 'dashboard.export', 'reports.view', 'reports.export.pdf');

-- Consultor Externo (Personalizable según necesidad)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions 
WHERE resource IN ('dashboard', 'pyg', 'breakeven')
AND action = 'read';

-- ========================================
-- 4. ACTUALIZAR USUARIO ADMIN CON ROL CEO
-- ========================================

UPDATE users SET role_id = 1 WHERE username = 'admin';

-- ========================================
-- 5. CREAR USUARIOS DE EJEMPLO PARA CADA ROL
-- ========================================

-- Nota: Las contraseñas están hasheadas con bcrypt para 'password123'
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_superuser) VALUES
('cfo_maria', 'maria.gonzalez@artyco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'María', 'González', 2, true, false),
('senior_carlos', 'carlos.rodriguez@artyco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'Carlos', 'Rodríguez', 3, true, false),
('junior_ana', 'ana.martinez@artyco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'Ana', 'Martínez', 4, true, false),
('contador_luis', 'luis.sanchez@artyco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'Luis', 'Sánchez', 5, true, false),
('auditor_elena', 'elena.lopez@artyco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'Elena', 'López', 6, true, false),
('inversor_roberto', 'roberto.torres@external.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY0JQy4rsL8pSRe', 'Roberto', 'Torres', 7, true, false);

-- ========================================
-- 6. CREAR VISTA ÚTIL PARA VER PERMISOS POR ROL
-- ========================================

CREATE OR REPLACE VIEW v_role_permissions AS
SELECT 
    r.name AS role_name,
    r.description AS role_description,
    p.resource,
    p.action,
    p.name AS permission_name,
    p.description AS permission_description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.id, p.resource, p.action;

-- ========================================
-- 7. CREAR PROCEDIMIENTO PARA VERIFICAR PERMISOS
-- ========================================

DELIMITER //

CREATE PROCEDURE check_user_permission(
    IN p_user_id INT,
    IN p_resource VARCHAR(100),
    IN p_action VARCHAR(50)
)
BEGIN
    SELECT COUNT(*) > 0 AS has_permission
    FROM users u
    JOIN role_permissions rp ON u.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id
    AND p.resource = p_resource
    AND p.action = p_action
    AND u.is_active = TRUE;
END //

DELIMITER ;

-- ========================================
-- VERIFICACIÓN DE LA CONFIGURACIÓN
-- ========================================

SELECT 'Roles creados:' AS info;
SELECT * FROM roles;

SELECT '\nPermisos creados:' AS info;
SELECT COUNT(*) AS total_permisos FROM permissions;

SELECT '\nUsuarios por rol:' AS info;
SELECT r.name AS rol, COUNT(u.id) AS usuarios 
FROM roles r 
LEFT JOIN users u ON r.id = u.role_id 
GROUP BY r.id, r.name;

SELECT '\nPermisos del usuario admin:' AS info;
SELECT DISTINCT p.resource, p.action, p.description
FROM users u
JOIN role_permissions rp ON u.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'admin'
ORDER BY p.resource, p.action;