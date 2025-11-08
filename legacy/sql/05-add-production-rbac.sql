-- Migration: Add Status Producción permissions and create user roles
-- Date: 2025-10-24
-- Description: Agrega permisos para el módulo de Status Producción y crea usuarios específicos

USE artyco_financial_rbac;

-- =====================================================
-- 1. AGREGAR PERMISOS PARA STATUS PRODUCCIÓN
-- =====================================================

INSERT INTO permissions (resource, action, description) VALUES
-- Status Producción permissions
('production', 'read', 'Ver datos de producción y dashboard'),
('production', 'write', 'Crear y modificar órdenes de producción'),
('production', 'delete', 'Eliminar cotizaciones de producción'),
('production', 'plan', 'Gestionar planes diarios de producción'),
('production', 'export', 'Exportar reportes de producción a PDF'),
('production', 'upload', 'Subir cotizaciones y pedidos de stock'),

-- Configuración permissions
('settings', 'read', 'Ver configuración del sistema'),
('settings', 'write', 'Modificar configuración del sistema')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- =====================================================
-- 2. CREAR ROL "produccion"
-- =====================================================
-- Control total del módulo Status Producción

INSERT INTO roles (name, description, is_system_role) VALUES
('produccion', 'Control total del módulo de Status Producción', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Asignar permisos al rol "produccion"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'produccion'
AND p.resource = 'production'
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 3. CREAR ROL "financiero"
-- =====================================================
-- Control total de todos los módulos EXCEPTO:
-- - Status Producción
-- - Configuración
-- - Gestión RBAC

INSERT INTO roles (name, description, is_system_role) VALUES
('financiero', 'Control total de módulos financieros (excepto producción, configuración y RBAC)', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Asignar permisos al rol "financiero"
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'financiero'
AND p.resource IN (
    'financial_data',
    'pyg_analysis',
    'brain_system',
    'portfolio',
    'risk_analysis',
    'transactions'
)
AND p.resource NOT IN ('production', 'settings', 'users', 'roles', 'system')
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 4. ACTUALIZAR ROL "admin"
-- =====================================================
-- Asegurar que admin tiene TODOS los permisos (incluyendo los nuevos)

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 5. CREAR USUARIOS
-- =====================================================

-- Usuario 1: admin (ya existe, solo actualizar si es necesario)
-- Este usuario ya está creado en el script inicial
-- Password: admin

-- Usuario 2: produccion
-- Password: produccion123
INSERT INTO users (email, username, password_hash, first_name, last_name, is_superuser, is_active)
VALUES (
    'produccion@artyco.com',
    'produccion',
    '$2b$12$b7QqT/2OHD2Bp8PkL9I4buSjkmtIg4Q8wgg7UxVNhkS2AlgPW9YnO',
    'Usuario',
    'Producción',
    FALSE,
    TRUE
)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    is_active = VALUES(is_active);

-- Usuario 3: financiero
-- Password: financiero123
INSERT INTO users (email, username, password_hash, first_name, last_name, is_superuser, is_active)
VALUES (
    'financiero@artyco.com',
    'financiero',
    '$2b$12$UMkuKgrA.lC/Y8XoQkrf7.mm/di3UzTmAjq6/kvq5QUFWt9yOi2Ca',
    'Usuario',
    'Financiero',
    FALSE,
    TRUE
)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    is_active = VALUES(is_active);

-- =====================================================
-- 6. ASIGNAR ROLES A USUARIOS
-- =====================================================

-- Admin user - rol admin (ya existe, pero asegurar)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin' AND r.name = 'admin'
ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP;

-- Producción user - rol produccion
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'produccion' AND r.name = 'produccion'
ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP;

-- Financiero user - rol financiero
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'financiero' AND r.name = 'financiero'
ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================

-- Ver usuarios creados
SELECT
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active,
    u.is_superuser,
    GROUP_CONCAT(r.name) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username IN ('admin', 'produccion', 'financiero')
GROUP BY u.id;

-- Ver permisos por rol
SELECT
    r.name as role_name,
    COUNT(p.id) as permission_count,
    GROUP_CONCAT(CONCAT(p.resource, ':', p.action) SEPARATOR ', ') as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('admin', 'produccion', 'financiero')
GROUP BY r.id
ORDER BY r.name;
