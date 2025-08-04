<?php
// CORS headers are handled by Apache configuration
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

/**
 * Advanced Financial Analysis API
 * Provides sophisticated financial, statistical, and econometric analysis
 */

class AdvancedFinancialAnalysis {
    private $pdo;
    private $companyId;
    
    public function __construct($pdo, $companyId = 1) {
        $this->pdo = $pdo;
        $this->companyId = $companyId;
    }
    
    /**
     * Get comprehensive financial analysis
     */
    public function getComprehensiveAnalysis($startDate = null, $endDate = null) {
        if (!$startDate) $startDate = date('Y-m-d', strtotime('-24 months'));
        if (!$endDate) $endDate = date('Y-m-d');
        
        return [
            'summary' => $this->getFinancialSummary($startDate, $endDate),
            'trends' => $this->getTrendAnalysis($startDate, $endDate),
            'ratios' => $this->getRatioAnalysis($startDate, $endDate),
            'statistics' => $this->getStatisticalAnalysis($startDate, $endDate),
            'forecast' => $this->getForecastAnalysis($endDate),
            'segments' => $this->getSegmentAnalysis($startDate, $endDate),
            'correlations' => $this->getCorrelationAnalysis(),
            'anomalies' => $this->getAnomalyDetection($startDate, $endDate)
        ];
    }
    
    /**
     * Financial Summary with YoY comparisons
     */
    private function getFinancialSummary($startDate, $endDate) {
        $sql = "
            WITH monthly_data AS (
                SELECT 
                    DATE_FORMAT(period_date, '%Y-%m') as period,
                    period_date,
                    revenue_total,
                    gross_profit,
                    operating_profit,
                    ebitda,
                    net_profit
                FROM financial_data_enhanced
                WHERE company_id = :company_id
                AND period_date BETWEEN :start_date AND :end_date
            ),
            yoy_comparison AS (
                SELECT 
                    m1.period,
                    m1.revenue_total,
                    m2.revenue_total as revenue_prev_year,
                    CASE 
                        WHEN m2.revenue_total > 0 
                        THEN ((m1.revenue_total - m2.revenue_total) / m2.revenue_total) * 100
                        ELSE NULL 
                    END as revenue_yoy_growth,
                    m1.net_profit,
                    m2.net_profit as net_profit_prev_year,
                    CASE 
                        WHEN m2.net_profit > 0 
                        THEN ((m1.net_profit - m2.net_profit) / m2.net_profit) * 100
                        ELSE NULL 
                    END as net_profit_yoy_growth
                FROM monthly_data m1
                LEFT JOIN monthly_data m2 ON m2.period_date = DATE_SUB(m1.period_date, INTERVAL 1 YEAR)
            )
            SELECT 
                period,
                revenue_total,
                revenue_yoy_growth,
                net_profit,
                net_profit_yoy_growth,
                AVG(revenue_yoy_growth) OVER (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as revenue_growth_ma3,
                AVG(net_profit_yoy_growth) OVER (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as profit_growth_ma3
            FROM yoy_comparison
            ORDER BY period DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Trend Analysis with statistical measures
     */
    private function getTrendAnalysis($startDate, $endDate) {
        $sql = "
            SELECT 
                metric_name,
                COUNT(*) as data_points,
                MIN(value) as min_value,
                MAX(value) as max_value,
                AVG(value) as avg_value,
                STDDEV(value) as std_dev,
                STDDEV(value) / AVG(value) as coefficient_variation,
                AVG(change_percentage) as avg_growth_rate,
                MAX(change_percentage) as max_growth,
                MIN(change_percentage) as min_growth,
                -- Linear regression slope (simplified)
                (COUNT(*) * SUM(UNIX_TIMESTAMP(period_date) * value) - SUM(UNIX_TIMESTAMP(period_date)) * SUM(value)) /
                (COUNT(*) * SUM(POW(UNIX_TIMESTAMP(period_date), 2)) - POW(SUM(UNIX_TIMESTAMP(period_date)), 2)) as trend_slope
            FROM time_series_metrics
            WHERE company_id = :company_id
            AND period_date BETWEEN :start_date AND :end_date
            AND metric_name IN ('revenue_total', 'gross_profit', 'operating_profit', 'ebitda', 'net_profit')
            GROUP BY metric_name
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Ratio Analysis with benchmarks
     */
    private function getRatioAnalysis($startDate, $endDate) {
        $sql = "
            WITH ratio_stats AS (
                SELECT 
                    DATE_FORMAT(period_date, '%Y-%m') as period,
                    gross_margin,
                    operating_margin,
                    net_margin,
                    AVG(gross_margin) OVER (ORDER BY period_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) as gross_margin_ma12,
                    AVG(operating_margin) OVER (ORDER BY period_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) as operating_margin_ma12,
                    AVG(net_margin) OVER (ORDER BY period_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) as net_margin_ma12
                FROM financial_ratios
                WHERE company_id = :company_id
                AND period_date BETWEEN :start_date AND :end_date
            ),
            benchmarks AS (
                SELECT 
                    AVG(gross_margin) as avg_gross_margin,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY gross_margin) as q1_gross_margin,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY gross_margin) as q3_gross_margin,
                    AVG(net_margin) as avg_net_margin,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY net_margin) as q1_net_margin,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY net_margin) as q3_net_margin
                FROM financial_ratios
                WHERE company_id = :company_id2
            )
            SELECT 
                r.*,
                b.avg_gross_margin as benchmark_gross_margin,
                b.avg_net_margin as benchmark_net_margin,
                CASE 
                    WHEN r.gross_margin > b.q3_gross_margin THEN 'Above Average'
                    WHEN r.gross_margin < b.q1_gross_margin THEN 'Below Average'
                    ELSE 'Average'
                END as gross_margin_performance,
                CASE 
                    WHEN r.net_margin > b.q3_net_margin THEN 'Above Average'
                    WHEN r.net_margin < b.q1_net_margin THEN 'Below Average'
                    ELSE 'Average'
                END as net_margin_performance
            FROM ratio_stats r
            CROSS JOIN benchmarks b
            ORDER BY r.period DESC
        ";
        
        // Note: PERCENTILE_CONT might need to be replaced with a different method
        // depending on MySQL version
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'company_id2' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Statistical Analysis
     */
    private function getStatisticalAnalysis($startDate, $endDate) {
        $results = [];
        
        // 1. Distribution Analysis
        $results['distribution'] = $this->getDistributionAnalysis($startDate, $endDate);
        
        // 2. Seasonality Analysis
        $results['seasonality'] = $this->getSeasonalityAnalysis($startDate, $endDate);
        
        // 3. Volatility Analysis
        $results['volatility'] = $this->getVolatilityAnalysis($startDate, $endDate);
        
        // 4. Autocorrelation Analysis
        $results['autocorrelation'] = $this->getAutocorrelationAnalysis($startDate, $endDate);
        
        return $results;
    }
    
    /**
     * Distribution Analysis
     */
    private function getDistributionAnalysis($startDate, $endDate) {
        $sql = "
            WITH revenue_distribution AS (
                SELECT 
                    revenue_total as value,
                    NTILE(10) OVER (ORDER BY revenue_total) as decile
                FROM financial_data_enhanced
                WHERE company_id = :company_id
                AND period_date BETWEEN :start_date AND :end_date
            )
            SELECT 
                decile,
                MIN(value) as min_value,
                MAX(value) as max_value,
                AVG(value) as avg_value,
                COUNT(*) as count
            FROM revenue_distribution
            GROUP BY decile
            ORDER BY decile
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Seasonality Analysis
     */
    private function getSeasonalityAnalysis($startDate, $endDate) {
        $sql = "
            WITH monthly_averages AS (
                SELECT 
                    MONTH(period_date) as month_num,
                    MONTHNAME(period_date) as month_name,
                    AVG(revenue_total) as avg_revenue,
                    AVG(gross_profit) as avg_gross_profit,
                    AVG(net_profit) as avg_net_profit,
                    COUNT(*) as years_count
                FROM financial_data_enhanced
                WHERE company_id = :company_id
                AND period_date BETWEEN :start_date AND :end_date
                GROUP BY MONTH(period_date), MONTHNAME(period_date)
            ),
            overall_avg AS (
                SELECT 
                    AVG(revenue_total) as avg_revenue,
                    AVG(gross_profit) as avg_gross_profit,
                    AVG(net_profit) as avg_net_profit
                FROM financial_data_enhanced
                WHERE company_id = :company_id2
                AND period_date BETWEEN :start_date2 AND :end_date2
            )
            SELECT 
                m.month_num,
                m.month_name,
                m.avg_revenue,
                (m.avg_revenue / o.avg_revenue - 1) * 100 as revenue_seasonal_index,
                m.avg_gross_profit,
                (m.avg_gross_profit / o.avg_gross_profit - 1) * 100 as gross_profit_seasonal_index,
                m.avg_net_profit,
                (m.avg_net_profit / o.avg_net_profit - 1) * 100 as net_profit_seasonal_index,
                m.years_count
            FROM monthly_averages m
            CROSS JOIN overall_avg o
            ORDER BY m.month_num
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'company_id2' => $this->companyId,
            'start_date' => $startDate,
            'start_date2' => $startDate,
            'end_date' => $endDate,
            'end_date2' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Volatility Analysis
     */
    private function getVolatilityAnalysis($startDate, $endDate) {
        $sql = "
            SELECT 
                metric_name,
                AVG(std_dev_12_periods) as avg_volatility,
                MIN(std_dev_12_periods) as min_volatility,
                MAX(std_dev_12_periods) as max_volatility,
                AVG(coefficient_variation) as avg_cv,
                -- Trend in volatility
                CASE 
                    WHEN AVG(CASE WHEN period_date >= DATE_SUB(:end_date, INTERVAL 6 MONTH) THEN std_dev_12_periods END) >
                         AVG(CASE WHEN period_date < DATE_SUB(:end_date2, INTERVAL 6 MONTH) THEN std_dev_12_periods END)
                    THEN 'Increasing'
                    ELSE 'Decreasing'
                END as volatility_trend
            FROM time_series_metrics
            WHERE company_id = :company_id
            AND period_date BETWEEN :start_date AND :end_date3
            AND metric_name IN ('revenue_total', 'gross_profit', 'net_profit')
            AND std_dev_12_periods IS NOT NULL
            GROUP BY metric_name
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'end_date2' => $endDate,
            'end_date3' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Autocorrelation Analysis (simplified)
     */
    private function getAutocorrelationAnalysis($startDate, $endDate) {
        $sql = "
            WITH lag_data AS (
                SELECT 
                    t1.period_date,
                    t1.value as current_value,
                    t2.value as lag1_value,
                    t3.value as lag3_value,
                    t6.value as lag6_value,
                    t12.value as lag12_value
                FROM time_series_metrics t1
                LEFT JOIN time_series_metrics t2 ON t2.company_id = t1.company_id 
                    AND t2.metric_name = t1.metric_name 
                    AND t2.period_date = DATE_SUB(t1.period_date, INTERVAL 1 MONTH)
                LEFT JOIN time_series_metrics t3 ON t3.company_id = t1.company_id 
                    AND t3.metric_name = t1.metric_name 
                    AND t3.period_date = DATE_SUB(t1.period_date, INTERVAL 3 MONTH)
                LEFT JOIN time_series_metrics t6 ON t6.company_id = t1.company_id 
                    AND t6.metric_name = t1.metric_name 
                    AND t6.period_date = DATE_SUB(t1.period_date, INTERVAL 6 MONTH)
                LEFT JOIN time_series_metrics t12 ON t12.company_id = t1.company_id 
                    AND t12.metric_name = t1.metric_name 
                    AND t12.period_date = DATE_SUB(t1.period_date, INTERVAL 12 MONTH)
                WHERE t1.company_id = :company_id
                AND t1.metric_name = 'revenue_total'
                AND t1.period_date BETWEEN :start_date AND :end_date
            )
            SELECT 
                'Lag 1 Month' as lag_period,
                COUNT(*) as observations,
                -- Simplified correlation calculation
                (COUNT(*) * SUM(current_value * lag1_value) - SUM(current_value) * SUM(lag1_value)) /
                SQRT((COUNT(*) * SUM(POW(current_value, 2)) - POW(SUM(current_value), 2)) *
                     (COUNT(*) * SUM(POW(lag1_value, 2)) - POW(SUM(lag1_value), 2))) as correlation
            FROM lag_data
            WHERE lag1_value IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Lag 3 Months' as lag_period,
                COUNT(*) as observations,
                (COUNT(*) * SUM(current_value * lag3_value) - SUM(current_value) * SUM(lag3_value)) /
                SQRT((COUNT(*) * SUM(POW(current_value, 2)) - POW(SUM(current_value), 2)) *
                     (COUNT(*) * SUM(POW(lag3_value, 2)) - POW(SUM(lag3_value), 2))) as correlation
            FROM lag_data
            WHERE lag3_value IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Lag 12 Months' as lag_period,
                COUNT(*) as observations,
                (COUNT(*) * SUM(current_value * lag12_value) - SUM(current_value) * SUM(lag12_value)) /
                SQRT((COUNT(*) * SUM(POW(current_value, 2)) - POW(SUM(current_value), 2)) *
                     (COUNT(*) * SUM(POW(lag12_value, 2)) - POW(SUM(lag12_value), 2))) as correlation
            FROM lag_data
            WHERE lag12_value IS NOT NULL
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Forecast Analysis
     */
    private function getForecastAnalysis($baseDate) {
        // Simple linear trend forecast
        $sql = "
            WITH historical_data AS (
                SELECT 
                    period_date,
                    revenue_total,
                    @row_number := @row_number + 1 as period_number
                FROM financial_data_enhanced
                CROSS JOIN (SELECT @row_number := 0) r
                WHERE company_id = :company_id
                AND period_date <= :base_date
                ORDER BY period_date
                LIMIT 24
            ),
            regression AS (
                SELECT 
                    COUNT(*) as n,
                    SUM(period_number) as sum_x,
                    SUM(revenue_total) as sum_y,
                    SUM(period_number * revenue_total) as sum_xy,
                    SUM(POW(period_number, 2)) as sum_x2,
                    (COUNT(*) * SUM(period_number * revenue_total) - SUM(period_number) * SUM(revenue_total)) /
                    (COUNT(*) * SUM(POW(period_number, 2)) - POW(SUM(period_number), 2)) as slope,
                    AVG(revenue_total) - 
                    ((COUNT(*) * SUM(period_number * revenue_total) - SUM(period_number) * SUM(revenue_total)) /
                    (COUNT(*) * SUM(POW(period_number, 2)) - POW(SUM(period_number), 2))) * AVG(period_number) as intercept
                FROM historical_data
            )
            SELECT 
                DATE_ADD(:base_date2, INTERVAL months MONTH) as forecast_date,
                (r.slope * (24 + months) + r.intercept) as forecast_value,
                'Linear Trend' as method,
                -- Simple confidence interval (would be more sophisticated in production)
                (r.slope * (24 + months) + r.intercept) * 0.9 as lower_bound,
                (r.slope * (24 + months) + r.intercept) * 1.1 as upper_bound
            FROM regression r
            CROSS JOIN (
                SELECT 1 as months UNION SELECT 2 UNION SELECT 3 
                UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
            ) as future_periods
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'base_date' => $baseDate,
            'base_date2' => $baseDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Segment Analysis
     */
    private function getSegmentAnalysis($startDate, $endDate) {
        // Since we don't have actual segments, we'll analyze by time periods
        $sql = "
            WITH quarterly_data AS (
                SELECT 
                    YEAR(period_date) as year,
                    QUARTER(period_date) as quarter,
                    SUM(revenue_total) as revenue,
                    SUM(gross_profit) as gross_profit,
                    SUM(net_profit) as net_profit,
                    AVG(gross_margin) as avg_gross_margin,
                    AVG(net_margin) as avg_net_margin
                FROM financial_data_enhanced f
                LEFT JOIN financial_ratios r ON f.company_id = r.company_id AND f.period_date = r.period_date
                WHERE f.company_id = :company_id
                AND f.period_date BETWEEN :start_date AND :end_date
                GROUP BY YEAR(period_date), QUARTER(period_date)
            ),
            total_revenue AS (
                SELECT SUM(revenue) as total_revenue
                FROM quarterly_data
            )
            SELECT 
                q.*,
                (q.revenue / t.total_revenue) * 100 as revenue_share,
                RANK() OVER (ORDER BY q.revenue DESC) as revenue_rank,
                CASE 
                    WHEN (q.revenue / t.total_revenue) * 100 > 10 THEN 'A'
                    WHEN (q.revenue / t.total_revenue) * 100 > 5 THEN 'B'
                    ELSE 'C'
                END as abc_classification
            FROM quarterly_data q
            CROSS JOIN total_revenue t
            ORDER BY year DESC, quarter DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Correlation Analysis
     */
    private function getCorrelationAnalysis() {
        $sql = "
            SELECT 
                variable1,
                variable2,
                pearson_correlation,
                sample_size,
                CASE 
                    WHEN ABS(pearson_correlation) > 0.8 THEN 'Very Strong'
                    WHEN ABS(pearson_correlation) > 0.6 THEN 'Strong'
                    WHEN ABS(pearson_correlation) > 0.4 THEN 'Moderate'
                    WHEN ABS(pearson_correlation) > 0.2 THEN 'Weak'
                    ELSE 'Very Weak'
                END as correlation_strength,
                CASE 
                    WHEN pearson_correlation > 0 THEN 'Positive'
                    WHEN pearson_correlation < 0 THEN 'Negative'
                    ELSE 'None'
                END as correlation_direction
            FROM correlation_matrix
            WHERE company_id = :company_id
            AND calculation_date = (
                SELECT MAX(calculation_date) 
                FROM correlation_matrix 
                WHERE company_id = :company_id2
            )
            ORDER BY ABS(pearson_correlation) DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'company_id2' => $this->companyId
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Anomaly Detection
     */
    private function getAnomalyDetection($startDate, $endDate) {
        $sql = "
            WITH stats AS (
                SELECT 
                    AVG(revenue_total) as mean_revenue,
                    STDDEV(revenue_total) as stddev_revenue,
                    AVG(change_percentage) as mean_growth,
                    STDDEV(change_percentage) as stddev_growth
                FROM financial_data_enhanced f
                LEFT JOIN time_series_metrics t ON f.company_id = t.company_id 
                    AND f.period_date = t.period_date 
                    AND t.metric_name = 'revenue_total'
                WHERE f.company_id = :company_id
                AND f.period_date BETWEEN :start_date AND :end_date
            )
            SELECT 
                f.period_date,
                f.revenue_total,
                t.change_percentage as growth_rate,
                CASE 
                    WHEN ABS(f.revenue_total - s.mean_revenue) > 2 * s.stddev_revenue THEN 'Revenue Anomaly'
                    WHEN ABS(t.change_percentage - s.mean_growth) > 2 * s.stddev_growth THEN 'Growth Anomaly'
                    ELSE 'Normal'
                END as anomaly_type,
                (f.revenue_total - s.mean_revenue) / s.stddev_revenue as revenue_z_score,
                (t.change_percentage - s.mean_growth) / NULLIF(s.stddev_growth, 0) as growth_z_score
            FROM financial_data_enhanced f
            LEFT JOIN time_series_metrics t ON f.company_id = t.company_id 
                AND f.period_date = t.period_date 
                AND t.metric_name = 'revenue_total'
            CROSS JOIN stats s
            WHERE f.company_id = :company_id2
            AND f.period_date BETWEEN :start_date2 AND :end_date2
            AND (
                ABS(f.revenue_total - s.mean_revenue) > 2 * s.stddev_revenue
                OR ABS(t.change_percentage - s.mean_growth) > 2 * s.stddev_growth
            )
            ORDER BY f.period_date DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'company_id2' => $this->companyId,
            'start_date' => $startDate,
            'start_date2' => $startDate,
            'end_date' => $endDate,
            'end_date2' => $endDate
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $companyId = $_GET['company_id'] ?? 1;
        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-24 months'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        $analysisType = $_GET['type'] ?? 'comprehensive';
        
        $analysis = new AdvancedFinancialAnalysis($pdo, $companyId);
        
        switch($analysisType) {
            case 'comprehensive':
                $result = $analysis->getComprehensiveAnalysis($startDate, $endDate);
                break;
            case 'summary':
                $result = ['summary' => $analysis->getFinancialSummary($startDate, $endDate)];
                break;
            case 'trends':
                $result = ['trends' => $analysis->getTrendAnalysis($startDate, $endDate)];
                break;
            case 'statistics':
                $result = ['statistics' => $analysis->getStatisticalAnalysis($startDate, $endDate)];
                break;
            default:
                $result = $analysis->getComprehensiveAnalysis($startDate, $endDate);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $result,
            'parameters' => [
                'company_id' => $companyId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'analysis_type' => $analysisType
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use GET.'
    ]);
}
?>