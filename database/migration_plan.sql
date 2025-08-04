-- Migration Plan: From Current Schema to Enhanced Schema
-- This script migrates existing data to the new enhanced structure

-- ========================================
-- STEP 1: BACKUP EXISTING DATA
-- ========================================

-- Create backup tables
CREATE TABLE financial_data_backup AS SELECT * FROM financial_data;
CREATE TABLE production_data_backup AS SELECT * FROM production_data;
CREATE TABLE operational_metrics_backup AS SELECT * FROM operational_metrics;

-- ========================================
-- STEP 2: MIGRATE FINANCIAL DATA
-- ========================================

-- Migrate existing financial_data to financial_data_enhanced
INSERT INTO financial_data_enhanced (
    company_id,
    period_date,
    revenue_sales,
    revenue_services,
    revenue_other,
    cost_raw_materials,
    cost_direct_labor,
    cost_manufacturing_overhead,
    cost_sales_total,
    expense_admin_salaries,
    expense_admin_other,
    expense_sales_marketing,
    expense_sales_commissions,
    expense_r_and_d,
    expense_depreciation,
    expense_amortization,
    expense_interest,
    expense_taxes,
    data_quality_score,
    is_forecast
)
SELECT 
    company_id,
    CONCAT(year, '-', LPAD(month, 2, '0'), '-01') as period_date,
    ingresos as revenue_sales,
    0 as revenue_services,
    0 as revenue_other,
    COALESCE(costo_materia_prima, 0) as cost_raw_materials,
    COALESCE(costo_produccion - costo_materia_prima, 0) as cost_direct_labor,
    COALESCE(costo_operativo, 0) as cost_manufacturing_overhead,
    COALESCE(costo_ventas_total, 0) as cost_sales_total,
    COALESCE(gastos_admin_total * 0.7, 0) as expense_admin_salaries, -- Estimate 70% salaries
    COALESCE(gastos_admin_total * 0.3, 0) as expense_admin_other,    -- Estimate 30% other
    COALESCE(gastos_ventas_total * 0.6, 0) as expense_sales_marketing,
    COALESCE(gastos_ventas_total * 0.4, 0) as expense_sales_commissions,
    0 as expense_r_and_d,
    0 as expense_depreciation,
    0 as expense_amortization,
    0 as expense_interest,
    0 as expense_taxes,
    100 as data_quality_score,
    FALSE as is_forecast
FROM financial_data
WHERE year >= 2020; -- Adjust based on your data range

-- ========================================
-- STEP 3: CALCULATE FINANCIAL RATIOS
-- ========================================

INSERT INTO financial_ratios (
    company_id,
    period_date,
    gross_margin,
    operating_margin,
    net_margin,
    return_on_assets,
    return_on_equity
)
SELECT 
    company_id,
    period_date,
    CASE WHEN revenue_total > 0 THEN (gross_profit / revenue_total) * 100 ELSE 0 END as gross_margin,
    CASE WHEN revenue_total > 0 THEN (operating_profit / revenue_total) * 100 ELSE 0 END as operating_margin,
    CASE WHEN revenue_total > 0 THEN (net_profit / revenue_total) * 100 ELSE 0 END as net_margin,
    NULL as return_on_assets, -- Requires balance sheet data
    NULL as return_on_equity  -- Requires balance sheet data
FROM financial_data_enhanced;

-- ========================================
-- STEP 4: POPULATE TIME SERIES METRICS
-- ========================================

-- Revenue time series
INSERT INTO time_series_metrics (
    company_id,
    metric_name,
    period_date,
    value,
    value_previous_period,
    change_absolute,
    change_percentage
)
SELECT 
    fd1.company_id,
    'revenue_total' as metric_name,
    fd1.period_date,
    fd1.revenue_total as value,
    fd2.revenue_total as value_previous_period,
    fd1.revenue_total - COALESCE(fd2.revenue_total, 0) as change_absolute,
    CASE 
        WHEN fd2.revenue_total > 0 THEN ((fd1.revenue_total - fd2.revenue_total) / fd2.revenue_total) * 100
        ELSE NULL 
    END as change_percentage
FROM financial_data_enhanced fd1
LEFT JOIN financial_data_enhanced fd2 
    ON fd1.company_id = fd2.company_id 
    AND fd2.period_date = DATE_SUB(fd1.period_date, INTERVAL 1 MONTH);

-- Calculate moving averages (simplified version - full calculation would be more complex)
UPDATE time_series_metrics tsm
SET ma_3_periods = (
    SELECT AVG(value) 
    FROM (
        SELECT value 
        FROM time_series_metrics tsm2 
        WHERE tsm2.company_id = tsm.company_id 
        AND tsm2.metric_name = tsm.metric_name
        AND tsm2.period_date <= tsm.period_date
        AND tsm2.period_date > DATE_SUB(tsm.period_date, INTERVAL 3 MONTH)
    ) as last_3
)
WHERE metric_name = 'revenue_total';

-- Similar calculations for other metrics (gross_profit, ebitda, net_profit, etc.)

-- ========================================
-- STEP 5: INITIAL SEGMENT ANALYSIS
-- ========================================

-- Create initial segment based on existing data
INSERT INTO segment_analysis (
    company_id,
    period_date,
    segment_type,
    segment_name,
    revenue,
    costs,
    gross_profit,
    contribution_margin
)
SELECT 
    company_id,
    period_date,
    'product' as segment_type,
    'Main Product' as segment_name, -- Placeholder since current schema doesn't have segments
    revenue_total as revenue,
    cost_sales_total as costs,
    gross_profit,
    gross_profit as contribution_margin
FROM financial_data_enhanced;

-- ========================================
-- STEP 6: DATA QUALITY CHECK
-- ========================================

INSERT INTO data_quality_checks (
    company_id,
    table_name,
    total_records,
    null_count,
    completeness_score
)
SELECT 
    company_id,
    'financial_data_enhanced' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN revenue_total IS NULL THEN 1 ELSE 0 END) as null_count,
    (1 - (SUM(CASE WHEN revenue_total IS NULL THEN 1 ELSE 0 END) / COUNT(*))) * 100 as completeness_score
FROM financial_data_enhanced
GROUP BY company_id;

-- ========================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- ========================================

DELIMITER //

-- Function to calculate year-over-year growth
CREATE FUNCTION fn_calculate_yoy_growth(
    p_company_id INT,
    p_metric_name VARCHAR(100),
    p_period_date DATE
) RETURNS DECIMAL(10,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE current_value DECIMAL(20,4);
    DECLARE previous_year_value DECIMAL(20,4);
    DECLARE growth_rate DECIMAL(10,4);
    
    -- Get current period value
    SELECT value INTO current_value
    FROM time_series_metrics
    WHERE company_id = p_company_id
    AND metric_name = p_metric_name
    AND period_date = p_period_date;
    
    -- Get previous year value
    SELECT value INTO previous_year_value
    FROM time_series_metrics
    WHERE company_id = p_company_id
    AND metric_name = p_metric_name
    AND period_date = DATE_SUB(p_period_date, INTERVAL 1 YEAR);
    
    -- Calculate growth rate
    IF previous_year_value IS NOT NULL AND previous_year_value != 0 THEN
        SET growth_rate = ((current_value - previous_year_value) / previous_year_value) * 100;
    ELSE
        SET growth_rate = NULL;
    END IF;
    
    RETURN growth_rate;
END//

-- Function to detect outliers using IQR method
CREATE FUNCTION fn_is_outlier(
    p_value DECIMAL(20,4),
    p_q1 DECIMAL(20,4),
    p_q3 DECIMAL(20,4),
    p_multiplier DECIMAL(5,2)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE iqr DECIMAL(20,4);
    DECLARE lower_bound DECIMAL(20,4);
    DECLARE upper_bound DECIMAL(20,4);
    
    SET iqr = p_q3 - p_q1;
    SET lower_bound = p_q1 - (p_multiplier * iqr);
    SET upper_bound = p_q3 + (p_multiplier * iqr);
    
    RETURN p_value < lower_bound OR p_value > upper_bound;
END//

DELIMITER ;

-- ========================================
-- STEP 8: CREATE INDEXES FOR MIGRATION
-- ========================================

-- Create temporary indexes to speed up migration
CREATE INDEX idx_temp_migration ON financial_data(company_id, year, month);

-- ========================================
-- STEP 9: VERIFY MIGRATION
-- ========================================

-- Check record counts
SELECT 
    'Original Records' as source,
    COUNT(*) as record_count
FROM financial_data
UNION ALL
SELECT 
    'Migrated Records' as source,
    COUNT(*) as record_count
FROM financial_data_enhanced;

-- Check data integrity
SELECT 
    'Revenue Match Check' as check_type,
    COUNT(*) as mismatches
FROM (
    SELECT 
        fd.company_id,
        fd.year,
        fd.month,
        fd.ingresos as original_revenue,
        fde.revenue_total as new_revenue
    FROM financial_data fd
    JOIN financial_data_enhanced fde 
        ON fd.company_id = fde.company_id
        AND fde.period_date = CONCAT(fd.year, '-', LPAD(fd.month, 2, '0'), '-01')
    WHERE ABS(fd.ingresos - fde.revenue_total) > 0.01
) as mismatches;

-- ========================================
-- STEP 10: CLEANUP (RUN ONLY AFTER VERIFICATION)
-- ========================================

-- Drop temporary indexes
-- DROP INDEX idx_temp_migration ON financial_data;

-- Once verified, you can drop the backup tables
-- DROP TABLE financial_data_backup;
-- DROP TABLE production_data_backup;
-- DROP TABLE operational_metrics_backup;