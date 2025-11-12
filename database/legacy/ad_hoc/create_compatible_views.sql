-- ==============================================
-- VISTAS COMPATIBLES PARA PROYECTO RBAC
-- Basadas en el proyecto original pero adaptadas 
-- a la estructura de tabla financial_data
-- ==============================================

-- Vista principal: Métricas financieras usando tabla financial_data
CREATE OR REPLACE VIEW v_financial_metrics AS
SELECT 
    company_id,
    year as period_year,
    month as period_month,
    
    -- ======================
    -- DATOS BASE
    -- ======================
    ingresos,
    (costo_ventas_total + gastos_admin_total + gastos_ventas_total) as costos_variables,
    0 as costos_fijos,  -- No tenemos separación en la tabla actual
    
    -- ======================
    -- UTILIDADES
    -- ======================
    utilidad_bruta,
    utilidad_neta,
    
    -- ======================
    -- MÁRGENES
    -- ======================
    CASE 
        WHEN ingresos > 0 
        THEN ROUND((utilidad_bruta / ingresos) * 100, 2)
        ELSE 0 
    END as margen_bruto_pct,
    
    CASE 
        WHEN ingresos > 0 
        THEN ROUND((utilidad_neta / ingresos) * 100, 2)
        ELSE 0 
    END as margen_neto_pct,
    
    -- ======================
    -- PUNTO DE EQUILIBRIO
    -- ======================
    CASE 
        WHEN utilidad_bruta > 0 AND ingresos > 0
        THEN ROUND((costo_ventas_total + gastos_admin_total + gastos_ventas_total) / (utilidad_bruta / ingresos), 2)
        ELSE 0 
    END as punto_equilibrio_contable,
    
    -- Fecha de última actualización
    updated_at as ultima_actualizacion
    
FROM financial_data;

-- ==============================================
-- Vista de promedios mensuales
-- ==============================================
CREATE OR REPLACE VIEW v_financial_averages AS
SELECT 
    company_id,
    year as period_year,
    'PROMEDIO' as period_type,
    
    ROUND(AVG(ingresos), 2) as ingresos_promedio,
    ROUND(AVG(costo_ventas_total + gastos_admin_total + gastos_ventas_total), 2) as costos_variables_promedio,
    ROUND(AVG(0), 2) as costos_fijos_promedio,
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
    ROUND(AVG(
        CASE 
            WHEN utilidad_bruta > 0 AND ingresos > 0
            THEN (costo_ventas_total + gastos_admin_total + gastos_ventas_total) / (utilidad_bruta / ingresos)
            ELSE 0 
        END
    ), 2) as punto_equilibrio_promedio,
    
    COUNT(month) as meses_con_datos,
    MAX(updated_at) as ultima_actualizacion
    
FROM financial_data 
GROUP BY company_id, year;

-- ==============================================
-- Vista de totales anuales
-- ==============================================
CREATE OR REPLACE VIEW v_financial_totals AS
SELECT 
    company_id,
    year as period_year,
    'ANUAL' as period_type,
    
    SUM(ingresos) as ingresos_total,
    SUM(costo_ventas_total + gastos_admin_total + gastos_ventas_total) as costos_variables_total,
    SUM(0) as costos_fijos_total,
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
        THEN ROUND(SUM(costo_ventas_total + gastos_admin_total + gastos_ventas_total) / (SUM(utilidad_bruta) / SUM(ingresos)), 2)
        ELSE 0 
    END as punto_equilibrio_anual,
    
    COUNT(month) as meses_con_datos,
    MAX(updated_at) as ultima_actualizacion
    
FROM financial_data 
GROUP BY company_id, year;