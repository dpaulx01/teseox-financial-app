-- Enhanced Database Schema for Advanced Financial Analysis
-- This script creates the enhanced tables for sophisticated analysis
USE artyco_financial;

-- ========================================
-- ENHANCED FINANCIAL DATA TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS financial_data_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL,
    
    -- Revenue streams (detailed)
    revenue_sales DECIMAL(20,2) DEFAULT 0,
    revenue_services DECIMAL(20,2) DEFAULT 0,
    revenue_other DECIMAL(20,2) DEFAULT 0,
    revenue_total DECIMAL(20,2) GENERATED ALWAYS AS (revenue_sales + revenue_services + revenue_other) STORED,
    
    -- Cost breakdown (Activity-Based Costing compatible)
    cost_raw_materials DECIMAL(20,2) DEFAULT 0,
    cost_direct_labor DECIMAL(20,2) DEFAULT 0,
    cost_manufacturing_overhead DECIMAL(20,2) DEFAULT 0,
    cost_sales_total DECIMAL(20,2) DEFAULT 0,
    
    -- Operating expenses (detailed)
    expense_admin_salaries DECIMAL(20,2) DEFAULT 0,
    expense_admin_other DECIMAL(20,2) DEFAULT 0,
    expense_sales_marketing DECIMAL(20,2) DEFAULT 0,
    expense_sales_commissions DECIMAL(20,2) DEFAULT 0,
    expense_r_and_d DECIMAL(20,2) DEFAULT 0,
    expense_depreciation DECIMAL(20,2) DEFAULT 0,
    expense_amortization DECIMAL(20,2) DEFAULT 0,
    
    -- Financial costs
    expense_interest DECIMAL(20,2) DEFAULT 0,
    expense_taxes DECIMAL(20,2) DEFAULT 0,
    
    -- Calculated metrics (stored for performance)
    gross_profit DECIMAL(20,2) GENERATED ALWAYS AS (revenue_total - cost_sales_total) STORED,
    operating_profit DECIMAL(20,2) DEFAULT 0,
    ebitda DECIMAL(20,2) DEFAULT 0,
    ebit DECIMAL(20,2) DEFAULT 0,
    net_profit DECIMAL(20,2) DEFAULT 0,
    
    -- Statistical fields
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    is_outlier BOOLEAN DEFAULT FALSE,
    is_forecast BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_period (company_id, period_date),
    INDEX idx_period_date (period_date),
    INDEX idx_company_period (company_id, period_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TIME SERIES METRICS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS time_series_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    period_date DATE NOT NULL,
    
    -- Current period values
    value DECIMAL(20,4) NOT NULL,
    
    -- Period comparisons
    value_previous_period DECIMAL(20,4),
    change_absolute DECIMAL(20,4),
    change_percentage DECIMAL(10,4),
    
    -- Moving averages
    ma_3_periods DECIMAL(20,4),
    ma_6_periods DECIMAL(20,4),
    ma_12_periods DECIMAL(20,4),
    
    -- Growth rates
    growth_rate_period DECIMAL(10,4),
    growth_rate_yoy DECIMAL(10,4),
    growth_rate_compound DECIMAL(10,4),
    
    -- Volatility measures
    std_dev_3_periods DECIMAL(20,4),
    std_dev_12_periods DECIMAL(20,4),
    coefficient_variation DECIMAL(10,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_metric (company_id, metric_name, period_date),
    INDEX idx_metric_lookup (company_id, metric_name, period_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- FINANCIAL RATIOS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS financial_ratios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL,
    
    -- Liquidity Ratios
    current_ratio DECIMAL(10,4),
    quick_ratio DECIMAL(10,4),
    cash_ratio DECIMAL(10,4),
    
    -- Profitability Ratios
    gross_margin DECIMAL(10,4),
    operating_margin DECIMAL(10,4),
    net_margin DECIMAL(10,4),
    return_on_assets DECIMAL(10,4),
    return_on_equity DECIMAL(10,4),
    
    -- Efficiency Ratios
    asset_turnover DECIMAL(10,4),
    inventory_turnover DECIMAL(10,4),
    receivables_turnover DECIMAL(10,4),
    
    -- Leverage Ratios
    debt_to_equity DECIMAL(10,4),
    debt_to_assets DECIMAL(10,4),
    interest_coverage DECIMAL(10,4),
    
    -- DuPont Analysis Components
    dupont_margin DECIMAL(10,4),
    dupont_turnover DECIMAL(10,4),
    dupont_leverage DECIMAL(10,4),
    dupont_roe DECIMAL(10,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_ratio_period (company_id, period_date),
    INDEX idx_period (period_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- CORRELATION MATRIX TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS correlation_matrix (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    calculation_date DATE NOT NULL,
    variable1 VARCHAR(100) NOT NULL,
    variable2 VARCHAR(100) NOT NULL,
    
    -- Correlation coefficients
    pearson_correlation DECIMAL(10,6),
    spearman_correlation DECIMAL(10,6),
    kendall_correlation DECIMAL(10,6),
    
    -- Statistical significance
    p_value DECIMAL(10,8),
    is_significant BOOLEAN DEFAULT FALSE,
    sample_size INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_correlation (company_id, calculation_date, variable1, variable2),
    INDEX idx_correlation_lookup (company_id, calculation_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- DATA QUALITY CHECKS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS data_quality_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    table_name VARCHAR(100) NOT NULL,
    
    -- Quality metrics
    total_records INT,
    null_count INT,
    duplicate_count INT,
    outlier_count INT,
    
    -- Completeness metrics
    completeness_score DECIMAL(5,2),
    accuracy_score DECIMAL(5,2),
    consistency_score DECIMAL(5,2),
    
    -- Issues found
    issues_found JSON,
    
    INDEX idx_quality_checks (company_id, check_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Monthly financial summary view
CREATE OR REPLACE VIEW v_monthly_financial_summary AS
SELECT 
    fd.company_id,
    fd.period_date,
    DATE_FORMAT(fd.period_date, '%Y-%m') as period,
    fd.revenue_total,
    fd.gross_profit,
    fd.operating_profit,
    fd.ebitda,
    fd.net_profit,
    fr.gross_margin,
    fr.operating_margin,
    fr.net_margin,
    tsm.growth_rate_yoy as revenue_growth_yoy
FROM financial_data_enhanced fd
LEFT JOIN financial_ratios fr ON fd.company_id = fr.company_id AND fd.period_date = fr.period_date
LEFT JOIN time_series_metrics tsm ON fd.company_id = tsm.company_id 
    AND fd.period_date = tsm.period_date 
    AND tsm.metric_name = 'revenue_total';

-- Trend analysis view
CREATE OR REPLACE VIEW v_trend_analysis AS
SELECT 
    company_id,
    metric_name,
    period_date,
    value,
    ma_3_periods,
    ma_12_periods,
    growth_rate_period,
    growth_rate_yoy,
    std_dev_12_periods
FROM time_series_metrics
ORDER BY company_id, metric_name, period_date;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Additional indexes for common query patterns
CREATE INDEX idx_financial_enhanced_analysis ON financial_data_enhanced(company_id, period_date, revenue_total, net_profit);
CREATE INDEX idx_time_series_lookup ON time_series_metrics(company_id, metric_name, period_date DESC);
CREATE INDEX idx_ratios_trends ON financial_ratios(company_id, period_date DESC, gross_margin, net_margin);