-- RBAC Schema for Artyco Financial App
-- This creates all necessary tables for Role-Based Access Control

USE artyco_financial_rbac;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_permission (resource, action),
    INDEX idx_resource (resource),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Role relationship table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role-Permission relationship table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_role (role_id),
    INDEX idx_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session/Token management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO roles (name, description, is_system_role) VALUES
('admin', 'Full system access', TRUE),
('manager', 'Financial data management and analysis', TRUE),
('analyst', 'Read-only access to financial data and reports', TRUE),
('viewer', 'Basic read-only access', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert default permissions
INSERT INTO permissions (resource, action, description) VALUES
-- Financial data permissions
('financial_data', 'read', 'View financial data and reports'),
('financial_data', 'write', 'Create and modify financial data'),
('financial_data', 'delete', 'Delete financial data'),
('financial_data', 'export', 'Export financial data'),

-- PyG Analysis permissions
('pyg_analysis', 'read', 'View PyG analysis'),
('pyg_analysis', 'execute', 'Execute PyG analysis'),
('pyg_analysis', 'configure', 'Configure PyG analysis parameters'),

-- Brain System permissions
('brain_system', 'query', 'Query the AI Brain system'),
('brain_system', 'train', 'Train the AI Brain system'),
('brain_system', 'configure', 'Configure Brain system settings'),

-- Portfolio permissions
('portfolio', 'read', 'View portfolio data'),
('portfolio', 'analyze', 'Analyze portfolio performance'),
('portfolio', 'manage', 'Manage portfolio investments'),

-- Risk analysis permissions
('risk_analysis', 'read', 'View risk analysis'),
('risk_analysis', 'execute', 'Execute risk calculations'),

-- Transaction permissions
('transactions', 'read', 'View transactions'),
('transactions', 'analyze', 'Analyze transaction patterns'),

-- User management permissions
('users', 'read', 'View user accounts'),
('users', 'write', 'Create and modify user accounts'),
('users', 'delete', 'Delete user accounts'),

-- Role management permissions
('roles', 'read', 'View roles and permissions'),
('roles', 'write', 'Create and modify roles'),
('roles', 'assign', 'Assign roles to users'),

-- System permissions
('system', 'admin', 'Full system administration'),
('system', 'audit', 'View audit logs')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Assign permissions to roles
-- Admin role - all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'manager' 
AND (
    (p.resource IN ('financial_data', 'pyg_analysis', 'portfolio', 'risk_analysis', 'transactions') AND p.action IN ('read', 'write', 'execute', 'analyze', 'configure', 'manage'))
    OR (p.resource = 'brain_system' AND p.action = 'query')
    OR (p.resource = 'financial_data' AND p.action = 'export')
)
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Analyst role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'analyst' 
AND (
    (p.resource IN ('financial_data', 'pyg_analysis', 'portfolio', 'risk_analysis', 'transactions') AND p.action IN ('read', 'analyze'))
    OR (p.resource = 'brain_system' AND p.action = 'query')
    OR (p.resource IN ('pyg_analysis', 'risk_analysis') AND p.action = 'execute')
)
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'viewer' 
AND p.action = 'read'
AND p.resource IN ('financial_data', 'pyg_analysis', 'portfolio', 'risk_analysis', 'transactions')
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Create default admin user (password: admin123 - CHANGE THIS!)
-- Password hash is for 'admin123' using bcrypt
INSERT INTO users (email, username, password_hash, first_name, last_name, is_superuser) 
VALUES (
    'admin@artyco.com', 
    'admin', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGSqGqUDS6C',
    'System',
    'Administrator',
    TRUE
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u 
CROSS JOIN roles r 
WHERE u.username = 'admin' AND r.name = 'admin'
ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP;

-- Create view for user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    u.email,
    p.resource,
    p.action,
    p.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE;

-- Create stored procedure to check user permission
DELIMITER //
CREATE PROCEDURE check_user_permission(
    IN p_user_id INT,
    IN p_resource VARCHAR(100),
    IN p_action VARCHAR(50),
    OUT has_permission BOOLEAN
)
BEGIN
    SELECT COUNT(*) > 0 INTO has_permission
    FROM user_permissions_view
    WHERE user_id = p_user_id 
    AND resource = p_resource 
    AND action = p_action;
END//
DELIMITER ;