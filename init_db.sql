-- Simple RBAC Schema initialization
USE artyco_financial_rbac;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_permission (resource, action)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Insert basic roles
INSERT INTO roles (name, description, is_system_role) VALUES
('admin', 'Full system access', TRUE),
('manager', 'Financial data management', TRUE),
('analyst', 'Read-only access to financial data', TRUE),
('viewer', 'Basic read-only access', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert basic permissions
INSERT INTO permissions (resource, action, description) VALUES
('financial_data', 'read', 'View financial data'),
('financial_data', 'write', 'Create and modify financial data'),
('users', 'read', 'View user accounts'),
('users', 'write', 'Create and modify users'),
('system', 'admin', 'Full system administration')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Create a test admin user with bcrypt hash for 'admin123'
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