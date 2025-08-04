-- Enhanced Database Schema for Advanced Financial Analysis
-- Version: 2.0
-- Purpose: Enable sophisticated financial, statistical, and econometric analysis

-- ========================================
-- CORE FINANCIAL DATA TABLES
-- ========================================

-- Enhanced financial_data table with more granular detail
CREATE TABLE IF NOT EXISTS financial_data_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL, -- Using DATE for better time series analysis
    
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
    operating_profit DECIMAL(20,2) DEFAULT 0, -- Will be calculated via trigger
    ebitda DECIMAL(20,2) DEFAULT 0,
    ebit DECIMAL(20,2) DEFAULT 0,
    net_profit DECIMAL(20,2) DEFAULT 0,
    
    -- Statistical fields
    data_quality_score DECIMAL(5,2) DEFAULT 100, -- 0-100 score
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
-- TIME SERIES ANALYSIS TABLES
-- ========================================

-- Store pre-calculated time series metrics for faster analysis
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
-- RATIO ANALYSIS TABLE
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
-- FORECAST AND BUDGET TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS financial_forecasts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL,
    forecast_type ENUM('budget', 'forecast', 'scenario') NOT NULL,
    scenario_name VARCHAR(100),
    
    -- Forecasted values (same structure as financial_data_enhanced)
    revenue_forecast DECIMAL(20,2),
    cost_forecast DECIMAL(20,2),
    expense_forecast DECIMAL(20,2),
    ebitda_forecast DECIMAL(20,2),
    net_profit_forecast DECIMAL(20,2),
    
    -- Confidence intervals
    confidence_level DECIMAL(5,2) DEFAULT 95,
    lower_bound DECIMAL(20,2),
    upper_bound DECIMAL(20,2),
    
    -- Forecast metadata
    forecast_method VARCHAR(50), -- 'linear', 'exponential', 'arima', 'ml'
    accuracy_score DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    INDEX idx_forecast_lookup (company_id, period_date, forecast_type),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- VARIANCE ANALYSIS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS variance_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL,
    
    -- Actual vs Budget variances
    revenue_actual DECIMAL(20,2),
    revenue_budget DECIMAL(20,2),
    revenue_variance DECIMAL(20,2),
    revenue_variance_pct DECIMAL(10,4),
    
    cost_actual DECIMAL(20,2),
    cost_budget DECIMAL(20,2),
    cost_variance DECIMAL(20,2),
    cost_variance_pct DECIMAL(10,4),
    
    -- Volume and price variances
    volume_variance DECIMAL(20,2),
    price_variance DECIMAL(20,2),
    mix_variance DECIMAL(20,2),
    
    -- Efficiency variances
    efficiency_variance DECIMAL(20,2),
    capacity_variance DECIMAL(20,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_variance_period (company_id, period_date),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- STATISTICAL ANALYSIS SUPPORT
-- ========================================

CREATE TABLE IF NOT EXISTS statistical_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_type ENUM('regression', 'arima', 'exponential_smoothing', 'ml') NOT NULL,
    target_variable VARCHAR(100) NOT NULL,
    
    -- Model parameters (stored as JSON)
    model_parameters JSON,
    
    -- Model performance metrics
    r_squared DECIMAL(10,6),
    adjusted_r_squared DECIMAL(10,6),
    mse DECIMAL(20,6),
    mae DECIMAL(20,6),
    mape DECIMAL(10,6),
    aic DECIMAL(20,6),
    bic DECIMAL(20,6),
    
    -- Model metadata
    training_start_date DATE,
    training_end_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_active_models (company_id, is_active),
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
-- SEGMENT ANALYSIS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS segment_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_date DATE NOT NULL,
    segment_type ENUM('product', 'customer', 'region', 'channel') NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    
    -- Segment metrics
    revenue DECIMAL(20,2),
    costs DECIMAL(20,2),
    gross_profit DECIMAL(20,2),
    contribution_margin DECIMAL(20,2),
    
    -- Relative metrics
    revenue_share DECIMAL(10,4), -- Percentage of total
    profit_share DECIMAL(10,4),
    
    -- ABC Analysis classification
    abc_classification CHAR(1), -- 'A', 'B', or 'C'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_segment_lookup (company_id, period_date, segment_type),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- DATA QUALITY MONITORING
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
    completeness_score DECIMAL(5,2), -- 0-100
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
-- STORED PROCEDURES FOR ANALYSIS
-- ========================================

DELIMITER //

-- Calculate time series metrics for a given metric
CREATE PROCEDURE sp_calculate_time_series_metrics(
    IN p_company_id INT,
    IN p_metric_name VARCHAR(100)
)
BEGIN
    -- This will be implemented to calculate moving averages, growth rates, etc.
    -- Placeholder for now
    SELECT 'Time series calculation logic to be implemented' as message;
END//

-- Run correlation analysis
CREATE PROCEDURE sp_calculate_correlations(
    IN p_company_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- This will calculate correlations between key financial metrics
    -- Placeholder for now
    SELECT 'Correlation calculation logic to be implemented' as message;
END//

DELIMITER ;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Additional indexes for common query patterns
CREATE INDEX idx_financial_enhanced_analysis ON financial_data_enhanced(company_id, period_date, revenue_total, net_profit);
CREATE INDEX idx_time_series_lookup ON time_series_metrics(company_id, metric_name, period_date DESC);
CREATE INDEX idx_ratios_trends ON financial_ratios(company_id, period_date DESC, gross_margin, net_margin);

-- ========================================
-- TRIGGERS FOR DATA INTEGRITY
-- ========================================

DELIMITER //

-- Trigger to calculate operating profit and other metrics
CREATE TRIGGER tr_calculate_financial_metrics
BEFORE INSERT ON financial_data_enhanced
FOR EACH ROW
BEGIN
    -- Calculate operating profit
    SET NEW.operating_profit = NEW.gross_profit - 
        (NEW.expense_admin_salaries + NEW.expense_admin_other + 
         NEW.expense_sales_marketing + NEW.expense_sales_commissions + 
         NEW.expense_r_and_d);
    
    -- Calculate EBITDA
    SET NEW.ebitda = NEW.operating_profit + NEW.expense_depreciation + NEW.expense_amortization;
    
    -- Calculate EBIT
    SET NEW.ebit = NEW.operating_profit;
    
    -- Calculate Net Profit
    SET NEW.net_profit = NEW.ebit - NEW.expense_interest - NEW.expense_taxes;
END//

-- Similar trigger for UPDATE
CREATE TRIGGER tr_calculate_financial_metrics_update
BEFORE UPDATE ON financial_data_enhanced
FOR EACH ROW
BEGIN
    -- Same calculations as insert trigger
    SET NEW.operating_profit = NEW.gross_profit - 
        (NEW.expense_admin_salaries + NEW.expense_admin_other + 
         NEW.expense_sales_marketing + NEW.expense_sales_commissions + 
         NEW.expense_r_and_d);
    
    SET NEW.ebitda = NEW.operating_profit + NEW.expense_depreciation + NEW.expense_amortization;
    SET NEW.ebit = NEW.operating_profit;
    SET NEW.net_profit = NEW.ebit - NEW.expense_interest - NEW.expense_taxes;
END//

DELIMITER ;