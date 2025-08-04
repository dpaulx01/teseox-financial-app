-- Create raw_account_data table for storing CSV data
CREATE TABLE IF NOT EXISTS raw_account_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    import_date DATE NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_period (company_id, account_code, period_year, period_month),
    INDEX idx_company_year (company_id, period_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;