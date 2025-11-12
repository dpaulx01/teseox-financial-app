-- ============================================================================
-- Migration: Ensure users table includes company_id column
-- Date: 2025-10-27
-- Description: Adds company_id field (with index) expected by ORM models
-- ============================================================================

USE artyco_financial_rbac;

-- Add company_id column if missing
SET @add_company_id := IF(
    (SELECT COUNT(*)
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac'
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE users ADD COLUMN company_id INT NULL DEFAULT 1 AFTER last_name;',
    'SELECT 1;'
);
PREPARE stmt FROM @add_company_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure index exists for company_id lookups
SET @add_company_index := IF(
    (SELECT COUNT(*)
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'artyco_financial_rbac'
       AND TABLE_NAME = 'users'
       AND INDEX_NAME = 'idx_users_company_id') = 0,
    'ALTER TABLE users ADD INDEX idx_users_company_id (company_id);',
    'SELECT 1;'
);
PREPARE stmt2 FROM @add_company_index;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Populate existing rows with default company
UPDATE users
SET company_id = COALESCE(company_id, 1);
