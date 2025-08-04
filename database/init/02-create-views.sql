-- =====================================================
-- VISTAS SQL AUTOMÁTICAS PARA CÁLCULOS FINANCIEROS
-- =====================================================

-- Vista principal: Métricas financieras automáticas
CREATE OR REPLACE VIEW v_financial_metrics AS
SELECT 
    company_id,
    period_year,
    period_month,
    
    -- ======================
    -- DATOS BASE AUTOMÁTICOS
    -- ======================
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) as ingresos,
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as costos_variables,
    SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as costos_fijos,
    
    -- ======================
    -- UTILIDADES AUTOMÁTICAS
    -- ======================
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as utilidad_bruta,
    
    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) -
    SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as utilidad_neta,
    
    -- ======================
    -- MÁRGENES AUTOMÁTICOS
    -- ======================
    CASE 
        WHEN SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) > 0 
        THEN ROUND(
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)) * 100, 2
        )
        ELSE 0 
    END as margen_bruto_pct,
    
    CASE 
        WHEN SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) > 0 
        THEN ROUND(
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) -
              SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)) * 100, 2
        )
        ELSE 0 
    END as margen_neto_pct,
    
    -- ======================
    -- PUNTO DE EQUILIBRIO AUTOMÁTICO
    -- ======================
    CASE 
        WHEN (SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) > 0 
        THEN ROUND(
            SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) / 
            ((SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
              SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END)) / 
             SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END)), 2
        )
        ELSE 0 
    END as punto_equilibrio_contable,
    
    -- Fecha de última actualización
    MAX(import_date) as ultima_actualizacion
    
FROM raw_account_data 
GROUP BY company_id, period_year, period_month;

-- ==============================================
-- Vista de promedios mensuales automáticos
-- ==============================================
CREATE OR REPLACE VIEW v_financial_averages AS
SELECT 
    company_id,
    period_year,
    'PROMEDIO' as period_type,
    
    ROUND(AVG(ingresos), 2) as ingresos_promedio,
    ROUND(AVG(costos_variables), 2) as costos_variables_promedio,
    ROUND(AVG(costos_fijos), 2) as costos_fijos_promedio,
    ROUND(AVG(utilidad_bruta), 2) as utilidad_bruta_promedio,
    ROUND(AVG(utilidad_neta), 2) as utilidad_neta_promedio,
    ROUND(
        CASE 
            WHEN AVG(ingresos) > 0 
            THEN (AVG(utilidad_bruta) / AVG(ingresos)) * 100
            ELSE 0 
        END, 2
    ) as margen_bruto_promedio,
    ROUND(
        CASE 
            WHEN AVG(ingresos) > 0 
            THEN (AVG(utilidad_neta) / AVG(ingresos)) * 100
            ELSE 0 
        END, 2
    ) as margen_neto_promedio,
    ROUND(AVG(punto_equilibrio_contable), 2) as punto_equilibrio_promedio,
    
    COUNT(period_month) as meses_con_datos,
    MAX(ultima_actualizacion) as ultima_actualizacion
    
FROM v_financial_metrics 
GROUP BY company_id, period_year;

-- ==============================================
-- Vista de totales anuales automáticos  
-- ==============================================
CREATE OR REPLACE VIEW v_financial_totals AS
SELECT 
    company_id,
    period_year,
    'ANUAL' as period_type,
    
    SUM(ingresos) as ingresos_total,
    SUM(costos_variables) as costos_variables_total,
    SUM(costos_fijos) as costos_fijos_total,
    SUM(utilidad_bruta) as utilidad_bruta_total,
    SUM(utilidad_neta) as utilidad_neta_total,
    
    -- Márgenes calculados sobre totales anuales
    CASE 
        WHEN SUM(ingresos) > 0 
        THEN ROUND((SUM(utilidad_bruta) / SUM(ingresos)) * 100, 2)
        ELSE 0 
    END as margen_bruto_anual,
    
    CASE 
        WHEN SUM(ingresos) > 0 
        THEN ROUND((SUM(utilidad_neta) / SUM(ingresos)) * 100, 2)
        ELSE 0 
    END as margen_neto_anual,
    
    -- Punto de equilibrio anual
    CASE 
        WHEN SUM(utilidad_bruta) > 0 AND SUM(ingresos) > 0
        THEN ROUND(SUM(costos_fijos) / (SUM(utilidad_bruta) / SUM(ingresos)), 2)
        ELSE 0 
    END as punto_equilibrio_anual,
    
    COUNT(period_month) as meses_con_datos,
    MAX(ultima_actualizacion) as ultima_actualizacion
    
FROM v_financial_metrics 
GROUP BY company_id, period_year;

-- ==============================================
-- Vista unificada para API
-- ==============================================
CREATE OR REPLACE VIEW v_financial_unified AS
SELECT 
    company_id,
    period_year,
    period_month,
    'MENSUAL' as data_type,
    ingresos,
    costos_variables,
    costos_fijos,
    utilidad_bruta,
    utilidad_neta,
    margen_bruto_pct as margen_bruto,
    margen_neto_pct as margen_neto,
    punto_equilibrio_contable as punto_equilibrio,
    ultima_actualizacion
FROM v_financial_metrics

UNION ALL

SELECT 
    company_id,
    period_year,
    0 as period_month,
    'PROMEDIO' as data_type,
    ingresos_promedio as ingresos,
    costos_variables_promedio as costos_variables,
    costos_fijos_promedio as costos_fijos,
    utilidad_bruta_promedio as utilidad_bruta,
    utilidad_neta_promedio as utilidad_neta,
    margen_bruto_promedio as margen_bruto,
    margen_neto_promedio as margen_neto,
    punto_equilibrio_promedio as punto_equilibrio,
    ultima_actualizacion
FROM v_financial_averages

UNION ALL

SELECT 
    company_id,
    period_year,
    0 as period_month,
    'ANUAL' as data_type,
    ingresos_total as ingresos,
    costos_variables_total as costos_variables,
    costos_fijos_total as costos_fijos,
    utilidad_bruta_total as utilidad_bruta,
    utilidad_neta_total as utilidad_neta,
    margen_bruto_anual as margen_bruto,
    margen_neto_anual as margen_neto,
    punto_equilibrio_anual as punto_equilibrio,
    ultima_actualizacion
FROM v_financial_totals;