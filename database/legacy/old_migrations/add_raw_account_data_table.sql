-- Migration: Create raw_account_data table
-- Description: Tabla para almacenar datos crudos del plan de cuentas importado desde CSV
-- Date: 2025-01-06

-- Create raw_account_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS `raw_account_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `import_date` date NOT NULL,
  `account_code` varchar(20) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `period_year` int NOT NULL,
  `period_month` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_period` (`company_id`,`account_code`,`period_year`,`period_month`),
  KEY `idx_company_year` (`company_id`,`period_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verification query
SELECT 'raw_account_data table created successfully' AS status;
