-- Sample data for testing
USE artyco_financial;

-- Insert sample financial data for the last 24 months
INSERT INTO financial_data (company_id, year, month, ingresos, costo_ventas_total, gastos_admin_total, gastos_ventas_total, 
                           utilidad_bruta, ebitda, utilidad_neta, costo_materia_prima, costo_produccion, costo_operativo) VALUES
(1, 2023, 1, 125000, 75000, 15000, 12000, 50000, 38000, 23000, 45000, 20000, 10000),
(1, 2023, 2, 135000, 80000, 16000, 13000, 55000, 42000, 26000, 48000, 22000, 10000),
(1, 2023, 3, 145000, 85000, 17000, 14000, 60000, 46000, 29000, 51000, 24000, 10000),
(1, 2023, 4, 155000, 90000, 18000, 15000, 65000, 50000, 32000, 54000, 26000, 10000),
(1, 2023, 5, 165000, 95000, 19000, 16000, 70000, 54000, 35000, 57000, 28000, 10000),
(1, 2023, 6, 175000, 100000, 20000, 17000, 75000, 58000, 38000, 60000, 30000, 10000),
(1, 2023, 7, 185000, 105000, 21000, 18000, 80000, 62000, 41000, 63000, 32000, 10000),
(1, 2023, 8, 195000, 110000, 22000, 19000, 85000, 66000, 44000, 66000, 34000, 10000),
(1, 2023, 9, 205000, 115000, 23000, 20000, 90000, 70000, 47000, 69000, 36000, 10000),
(1, 2023, 10, 215000, 120000, 24000, 21000, 95000, 74000, 50000, 72000, 38000, 10000),
(1, 2023, 11, 225000, 125000, 25000, 22000, 100000, 78000, 53000, 75000, 40000, 10000),
(1, 2023, 12, 235000, 130000, 26000, 23000, 105000, 82000, 56000, 78000, 42000, 10000),
(1, 2024, 1, 245000, 135000, 27000, 24000, 110000, 86000, 59000, 81000, 44000, 10000),
(1, 2024, 2, 255000, 140000, 28000, 25000, 115000, 90000, 62000, 84000, 46000, 10000),
(1, 2024, 3, 265000, 145000, 29000, 26000, 120000, 94000, 65000, 87000, 48000, 10000),
(1, 2024, 4, 275000, 150000, 30000, 27000, 125000, 98000, 68000, 90000, 50000, 10000),
(1, 2024, 5, 285000, 155000, 31000, 28000, 130000, 102000, 71000, 93000, 52000, 10000),
(1, 2024, 6, 295000, 160000, 32000, 29000, 135000, 106000, 74000, 96000, 54000, 10000),
(1, 2024, 7, 305000, 165000, 33000, 30000, 140000, 110000, 77000, 99000, 56000, 10000),
(1, 2024, 8, 315000, 170000, 34000, 31000, 145000, 114000, 80000, 102000, 58000, 10000),
(1, 2024, 9, 325000, 175000, 35000, 32000, 150000, 118000, 83000, 105000, 60000, 10000),
(1, 2024, 10, 335000, 180000, 36000, 33000, 155000, 122000, 86000, 108000, 62000, 10000),
(1, 2024, 11, 345000, 185000, 37000, 34000, 160000, 126000, 89000, 111000, 64000, 10000),
(1, 2024, 12, 355000, 190000, 38000, 35000, 165000, 130000, 92000, 114000, 66000, 10000)
ON DUPLICATE KEY UPDATE ingresos = VALUES(ingresos);

-- Insert sample production data
INSERT INTO production_data (company_id, year, month, metros_producidos, metros_vendidos) VALUES
(1, 2023, 1, 5000, 4800),
(1, 2023, 2, 5200, 5000),
(1, 2023, 3, 5400, 5200),
(1, 2023, 4, 5600, 5400),
(1, 2023, 5, 5800, 5600),
(1, 2023, 6, 6000, 5800),
(1, 2023, 7, 6200, 6000),
(1, 2023, 8, 6400, 6200),
(1, 2023, 9, 6600, 6400),
(1, 2023, 10, 6800, 6600),
(1, 2023, 11, 7000, 6800),
(1, 2023, 12, 7200, 7000),
(1, 2024, 1, 7400, 7200),
(1, 2024, 2, 7600, 7400),
(1, 2024, 3, 7800, 7600),
(1, 2024, 4, 8000, 7800),
(1, 2024, 5, 8200, 8000),
(1, 2024, 6, 8400, 8200),
(1, 2024, 7, 8600, 8400),
(1, 2024, 8, 8800, 8600),
(1, 2024, 9, 9000, 8800),
(1, 2024, 10, 9200, 9000),
(1, 2024, 11, 9400, 9200),
(1, 2024, 12, 9600, 9400)
ON DUPLICATE KEY UPDATE metros_producidos = VALUES(metros_producidos);

-- Calculate and insert operational metrics
INSERT INTO operational_metrics (company_id, year, month, precio_promedio_metro, costo_produccion_metro, 
                                margen_bruto_porcentaje, margen_operativo_porcentaje, margen_ebitda_porcentaje, margen_neto_porcentaje,
                                productividad_porcentaje, eficiencia_ventas_porcentaje)
SELECT 
    f.company_id,
    f.year,
    f.month,
    ROUND(f.ingresos / NULLIF(p.metros_vendidos, 0), 2) as precio_promedio_metro,
    ROUND(f.costo_produccion / NULLIF(p.metros_producidos, 0), 2) as costo_produccion_metro,
    ROUND((f.utilidad_bruta / NULLIF(f.ingresos, 0)) * 100, 2) as margen_bruto_porcentaje,
    ROUND(((f.utilidad_bruta - f.gastos_admin_total - f.gastos_ventas_total) / NULLIF(f.ingresos, 0)) * 100, 2) as margen_operativo_porcentaje,
    ROUND((f.ebitda / NULLIF(f.ingresos, 0)) * 100, 2) as margen_ebitda_porcentaje,
    ROUND((f.utilidad_neta / NULLIF(f.ingresos, 0)) * 100, 2) as margen_neto_porcentaje,
    ROUND((p.metros_producidos / NULLIF(pc.capacidad_maxima_mensual, 0)) * 100, 2) as productividad_porcentaje,
    ROUND((p.metros_vendidos / NULLIF(p.metros_producidos, 0)) * 100, 2) as eficiencia_ventas_porcentaje
FROM financial_data f
JOIN production_data p ON f.company_id = p.company_id AND f.year = p.year AND f.month = p.month
JOIN production_config pc ON f.company_id = pc.company_id
WHERE f.company_id = 1
ON DUPLICATE KEY UPDATE 
    precio_promedio_metro = VALUES(precio_promedio_metro),
    costo_produccion_metro = VALUES(costo_produccion_metro),
    margen_bruto_porcentaje = VALUES(margen_bruto_porcentaje),
    margen_operativo_porcentaje = VALUES(margen_operativo_porcentaje),
    margen_ebitda_porcentaje = VALUES(margen_ebitda_porcentaje),
    margen_neto_porcentaje = VALUES(margen_neto_porcentaje),
    productividad_porcentaje = VALUES(productividad_porcentaje),
    eficiencia_ventas_porcentaje = VALUES(eficiencia_ventas_porcentaje);