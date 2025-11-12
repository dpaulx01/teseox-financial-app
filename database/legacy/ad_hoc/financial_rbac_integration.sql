-- Financial Tables Integration with RBAC
-- This script adds financial tables to the RBAC database

USE artyco_financial_rbac;

-- ========================================
-- COMPANY TABLE (for multi-tenant support)
-- ========================================
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company
INSERT INTO companies (name, code) VALUES ('Artyco', 'ARTYCO') ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ========================================
-- SIMPLIFIED FINANCIAL DATA TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS financial_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    period_date DATE NOT NULL,
    
    -- Revenue
    revenue_total DECIMAL(20,2) DEFAULT 0,
    
    -- Costs
    cost_of_sales DECIMAL(20,2) DEFAULT 0,
    
    -- Expenses
    operating_expenses DECIMAL(20,2) DEFAULT 0,
    administrative_expenses DECIMAL(20,2) DEFAULT 0,
    
    -- Calculated fields
    gross_profit DECIMAL(20,2) GENERATED ALWAYS AS (revenue_total - cost_of_sales) STORED,
    net_profit DECIMAL(20,2) DEFAULT 0,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_period (company_id, period_date),
    INDEX idx_period_date (period_date),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- PRODUCTION DATA TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    period_date DATE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Production metrics
    quantity_produced DECIMAL(20,2) DEFAULT 0,
    quantity_sold DECIMAL(20,2) DEFAULT 0,
    unit_price DECIMAL(20,2) DEFAULT 0,
    unit_cost DECIMAL(20,2) DEFAULT 0,
    
    -- Calculated fields
    revenue DECIMAL(20,2) GENERATED ALWAYS AS (quantity_sold * unit_price) STORED,
    cost DECIMAL(20,2) GENERATED ALWAYS AS (quantity_produced * unit_cost) STORED,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_period_product (company_id, period_date, product_name),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- KPI DEFINITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    formula VARCHAR(500),
    category VARCHAR(50),
    description TEXT,
    is_percentage BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common KPIs
INSERT INTO kpi_definitions (name, formula, category, description, is_percentage) VALUES
('Gross Margin', '(gross_profit / revenue_total) * 100', 'Profitability', 'Gross profit as percentage of revenue', TRUE),
('Net Margin', '(net_profit / revenue_total) * 100', 'Profitability', 'Net profit as percentage of revenue', TRUE),
('Operating Expense Ratio', '(operating_expenses / revenue_total) * 100', 'Efficiency', 'Operating expenses as percentage of revenue', TRUE)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- ========================================
-- BRAIN SYSTEM QUERIES LOG
-- ========================================
CREATE TABLE IF NOT EXISTS brain_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query_text TEXT NOT NULL,
    response_text TEXT,
    confidence_score DECIMAL(5,2),
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_queries (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- ADD FINANCIAL PERMISSIONS
-- ========================================
-- These should already exist from the RBAC schema, but let's ensure they're there
INSERT INTO permissions (resource, action, description) VALUES
-- Financial data permissions
('financial_data', 'read', 'View financial data and reports'),
('financial_data', 'write', 'Create and modify financial data'),
('financial_data', 'delete', 'Delete financial data'),
('financial_data', 'export', 'Export financial data'),

-- Production data permissions
('production_data', 'read', 'View production data'),
('production_data', 'write', 'Create and modify production data'),

-- KPI permissions
('kpis', 'read', 'View KPIs and dashboards'),
('kpis', 'configure', 'Configure KPI definitions'),

-- Brain permissions
('brain_system', 'query', 'Query the AI Brain system'),
('brain_system', 'train', 'Train the AI Brain system'),
('brain_system', 'configure', 'Configure Brain system settings')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ========================================
-- GRANT PERMISSIONS TO ROLES
-- ========================================
-- Admin already has all permissions

-- Manager role - full financial access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'manager' 
AND p.resource IN ('financial_data', 'production_data', 'kpis', 'brain_system')
AND p.action IN ('read', 'write', 'export', 'query')
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Analyst role - read and analyze
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'analyst' 
AND p.resource IN ('financial_data', 'production_data', 'kpis', 'brain_system')
AND p.action IN ('read', 'export', 'query')
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- Viewer role - read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'viewer' 
AND p.resource IN ('financial_data', 'production_data', 'kpis')
AND p.action = 'read'
ON DUPLICATE KEY UPDATE granted_at = CURRENT_TIMESTAMP;

-- ========================================
-- CREATE VIEW FOR MONTHLY SUMMARY
-- ========================================
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
    fd.company_id,
    c.name as company_name,
    DATE_FORMAT(fd.period_date, '%Y-%m') as period,
    fd.revenue_total,
    fd.cost_of_sales,
    fd.gross_profit,
    fd.operating_expenses,
    fd.administrative_expenses,
    fd.net_profit,
    CASE 
        WHEN fd.revenue_total > 0 THEN (fd.gross_profit / fd.revenue_total) * 100 
        ELSE 0 
    END as gross_margin,
    CASE 
        WHEN fd.revenue_total > 0 THEN (fd.net_profit / fd.revenue_total) * 100 
        ELSE 0 
    END as net_margin
FROM financial_data fd
JOIN companies c ON fd.company_id = c.id
ORDER BY fd.company_id, fd.period_date;

-- ========================================
-- STORED PROCEDURE FOR PERMISSION CHECK
-- ========================================
DELIMITER //

CREATE PROCEDURE sp_check_financial_permission(
    IN p_user_id INT,
    IN p_resource VARCHAR(100),
    IN p_action VARCHAR(50),
    OUT p_has_permission BOOLEAN
)
BEGIN
    -- Check if user has permission through their roles
    SELECT COUNT(*) > 0 INTO p_has_permission
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id 
    AND u.is_active = TRUE
    AND p.resource = p_resource 
    AND p.action = p_action;
    
    -- Superuser always has permission
    IF NOT p_has_permission THEN
        SELECT is_superuser INTO p_has_permission
        FROM users 
        WHERE id = p_user_id AND is_active = TRUE;
    END IF;
END//

DELIMITER ;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================
-- Insert sample financial data
INSERT INTO financial_data (company_id, period_date, revenue_total, cost_of_sales, operating_expenses, administrative_expenses, net_profit, created_by)
VALUES 
(1, '2024-01-01', 150000.00, 90000.00, 20000.00, 15000.00, 25000.00, 1),
(1, '2024-02-01', 165000.00, 95000.00, 22000.00, 15000.00, 33000.00, 1),
(1, '2024-03-01', 180000.00, 100000.00, 25000.00, 16000.00, 39000.00, 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Grant execute permission on stored procedures
GRANT EXECUTE ON PROCEDURE artyco_financial_rbac.sp_check_financial_permission TO 'artyco_user'@'%';

-- Create additional indexes for performance
CREATE INDEX idx_financial_data_user ON financial_data(created_by);
CREATE INDEX idx_production_data_date ON production_data(period_date);
CREATE INDEX idx_brain_queries_user_date ON brain_queries(user_id, created_at DESC);