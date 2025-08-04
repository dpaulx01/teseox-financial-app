<?php
/**
 * Análisis Avanzado de Estado de Resultados (PyG)
 * Ratios de rentabilidad y análisis de tendencias multi-período
 * 
 * @author Sistema Artyco Financial
 * @endpoint GET /api/analysis_pyg_advanced.php
 * @params periodos (string separado por comas, ej: 2025-06,2025-05,2025-04)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de base de datos
require_once __DIR__ . '/../config/database.php';

try {
    
    // Validar parámetros de entrada
    $periodos_param = $_GET['periodos'] ?? '';
    
    if (empty($periodos_param)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Parámetro requerido: periodos (formato YYYY-MM,YYYY-MM,YYYY-MM)',
            'example' => '/api/analysis_pyg_advanced.php?periodos=2025-06,2025-05,2025-04'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Procesar períodos
    $periodos_array = array_map('trim', explode(',', $periodos_param));
    
    // Validar formato de fechas
    foreach ($periodos_array as $periodo) {
        if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Formato de fecha inválido en período: ' . $periodo,
                'required_format' => 'YYYY-MM'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Ordenar períodos cronológicamente (más reciente primero)
    rsort($periodos_array);
    $periodo_principal = $periodos_array[0]; // Más reciente
    
    /**
     * Obtener datos resumidos del PyG para un período
     */
    function obtenerResumenPyG($pdo, $periodo) {
        $sql = "SELECT 
                    c.tipo_cuenta,
                    COALESCE(SUM(t.monto), 0) as total_monto
                FROM catalogo_cuentas c
                LEFT JOIN transacciones t ON c.id_cuenta = t.id_cuenta 
                    AND DATE_FORMAT(t.fecha, '%Y-%m') = :periodo
                WHERE c.activa = 1
                GROUP BY c.tipo_cuenta";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':periodo', $periodo, PDO::PARAM_STR);
        $stmt->execute();
        
        $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Inicializar valores
        $resumen = [
            'ingresos_totales' => 0,
            'costos_totales' => 0,
            'gastos_totales' => 0,
            'utilidad_bruta' => 0,
            'utilidad_operativa' => 0,
            'utilidad_neta' => 0
        ];
        
        // Procesar resultados
        foreach ($resultados as $row) {
            switch ($row['tipo_cuenta']) {
                case 'ingreso':
                    $resumen['ingresos_totales'] = $row['total_monto'];
                    break;
                case 'costo':
                    $resumen['costos_totales'] = abs($row['total_monto']);
                    break;
                case 'gasto':
                    $resumen['gastos_totales'] = abs($row['total_monto']);
                    break;
            }
        }
        
        // Calcular utilidades
        $resumen['utilidad_bruta'] = $resumen['ingresos_totales'] - $resumen['costos_totales'];
        $resumen['utilidad_operativa'] = $resumen['utilidad_bruta'] - ($resumen['gastos_totales'] * 0.7); // Estimar gastos operativos como 70%
        $resumen['utilidad_neta'] = $resumen['utilidad_bruta'] - $resumen['gastos_totales'];
        
        return $resumen;
    }
    
    /**
     * Obtener análisis detallado de gastos por categoría
     */
    function obtenerAnalisisGastos($pdo, $periodo) {
        $sql = "SELECT 
                    c.nombre_cuenta,
                    COALESCE(SUM(t.monto), 0) as total_monto
                FROM catalogo_cuentas c
                LEFT JOIN transacciones t ON c.id_cuenta = t.id_cuenta 
                    AND DATE_FORMAT(t.fecha, '%Y-%m') = :periodo
                WHERE c.activa = 1 AND c.tipo_cuenta = 'gasto'
                GROUP BY c.id_cuenta, c.nombre_cuenta
                HAVING total_monto != 0
                ORDER BY ABS(total_monto) DESC
                LIMIT 10"; // Top 10 gastos
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':periodo', $periodo, PDO::PARAM_STR);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Calcular ratios de rentabilidad
     */
    function calcularRatios($datos) {
        $ingresos = $datos['ingresos_totales'];
        
        if ($ingresos == 0) {
            return [
                'margen_bruto' => 0,
                'margen_operativo' => 0,
                'margen_neto' => 0,
                'rotacion_activos' => 0, // Se necesitaría información de balance
                'roe' => 0, // Return on Equity - se necesitaría información de patrimonio
                'roa' => 0  // Return on Assets - se necesitaría información de activos
            ];
        }
        
        return [
            'margen_bruto' => round(($datos['utilidad_bruta'] / $ingresos) * 100, 2),
            'margen_operativo' => round(($datos['utilidad_operativa'] / $ingresos) * 100, 2),
            'margen_neto' => round(($datos['utilidad_neta'] / $ingresos) * 100, 2),
            'rotacion_ventas' => round($ingresos / 1000, 2), // Simplificado - necesitaría promedio de activos
            'eficiencia_costos' => round(($datos['costos_totales'] / $ingresos) * 100, 2),
            'eficiencia_gastos' => round(($datos['gastos_totales'] / $ingresos) * 100, 2)
        ];
    }
    
    /**
     * Generar datos de tendencias
     */
    function generarTendencias($datos_periodos, $periodos) {
        $tendencias = [
            'periodos' => $periodos,
            'ingresos_totales' => [],
            'utilidad_bruta' => [],
            'utilidad_operativa' => [],
            'utilidad_neta' => [],
            'margenes' => [
                'margen_bruto' => [],
                'margen_operativo' => [],
                'margen_neto' => []
            ]
        ];
        
        foreach ($periodos as $periodo) {
            $datos = $datos_periodos[$periodo];
            
            $tendencias['ingresos_totales'][] = round($datos['ingresos_totales'], 2);
            $tendencias['utilidad_bruta'][] = round($datos['utilidad_bruta'], 2);
            $tendencias['utilidad_operativa'][] = round($datos['utilidad_operativa'], 2);
            $tendencias['utilidad_neta'][] = round($datos['utilidad_neta'], 2);
            
            // Calcular márgenes para cada período
            $ingresos = $datos['ingresos_totales'];
            if ($ingresos > 0) {
                $tendencias['margenes']['margen_bruto'][] = round(($datos['utilidad_bruta'] / $ingresos) * 100, 2);
                $tendencias['margenes']['margen_operativo'][] = round(($datos['utilidad_operativa'] / $ingresos) * 100, 2);
                $tendencias['margenes']['margen_neto'][] = round(($datos['utilidad_neta'] / $ingresos) * 100, 2);
            } else {
                $tendencias['margenes']['margen_bruto'][] = 0;
                $tendencias['margenes']['margen_operativo'][] = 0;
                $tendencias['margenes']['margen_neto'][] = 0;
            }
        }
        
        return $tendencias;
    }
    
    /**
     * Calcular tasas de crecimiento
     */
    function calcularCrecimiento($tendencias) {
        $crecimiento = [];
        $metricas = ['ingresos_totales', 'utilidad_bruta', 'utilidad_operativa', 'utilidad_neta'];
        
        foreach ($metricas as $metrica) {
            $valores = $tendencias[$metrica];
            $crecimiento[$metrica] = [];
            
            for ($i = 1; $i < count($valores); $i++) {
                $actual = $valores[$i];
                $anterior = $valores[$i-1];
                
                if ($anterior != 0) {
                    $tasa = (($actual - $anterior) / abs($anterior)) * 100;
                    $crecimiento[$metrica][] = round($tasa, 2);
                } else {
                    $crecimiento[$metrica][] = 0;
                }
            }
        }
        
        return $crecimiento;
    }
    
    // Obtener datos para todos los períodos
    $datos_periodos = [];
    $analisis_gastos = [];
    
    foreach ($periodos_array as $periodo) {
        $datos_periodos[$periodo] = obtenerResumenPyG($pdo, $periodo);
        
        // Obtener análisis detallado solo para el período principal
        if ($periodo === $periodo_principal) {
            $analisis_gastos = obtenerAnalisisGastos($pdo, $periodo);
        }
    }
    
    // Calcular ratios para el período principal
    $ratios = calcularRatios($datos_periodos[$periodo_principal]);
    
    // Generar datos de tendencias
    $tendencias = generarTendencias($datos_periodos, $periodos_array);
    
    // Calcular tasas de crecimiento
    $crecimiento = calcularCrecimiento($tendencias);
    
    // Generar insights automáticos
    $insights = [];
    
    // Insight de rentabilidad
    $margen_neto = $ratios['margen_neto'];
    if ($margen_neto > 15) {
        $insights[] = "Excelente rentabilidad neta del {$margen_neto}%";
    } elseif ($margen_neto > 5) {
        $insights[] = "Rentabilidad neta saludable del {$margen_neto}%";
    } elseif ($margen_neto > 0) {
        $insights[] = "Rentabilidad neta baja del {$margen_neto}%, revisar costos";
    } else {
        $insights[] = "Pérdidas del {$margen_neto}%, requiere atención inmediata";
    }
    
    // Insight de tendencia de ingresos
    if (count($crecimiento['ingresos_totales']) > 0) {
        $ultimo_crecimiento = end($crecimiento['ingresos_totales']);
        if ($ultimo_crecimiento > 10) {
            $insights[] = "Crecimiento de ingresos acelerado: {$ultimo_crecimiento}%";
        } elseif ($ultimo_crecimiento > 0) {
            $insights[] = "Crecimiento de ingresos positivo: {$ultimo_crecimiento}%";
        } else {
            $insights[] = "Decrecimiento de ingresos: {$ultimo_crecimiento}%";
        }
    }
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'periodo_principal' => $periodo_principal,
        'periodos_analizados' => $periodos_array,
        'fecha_consulta' => date('Y-m-d H:i:s'),
        'ratios' => $ratios,
        'tendencias' => $tendencias,
        'crecimiento' => $crecimiento,
        'analisis_gastos' => array_map(function($gasto) {
            return [
                'cuenta' => $gasto['nombre_cuenta'],
                'monto' => round(abs($gasto['total_monto']), 2)
            ];
        }, $analisis_gastos),
        'insights' => $insights,
        'datos_periodo_principal' => $datos_periodos[$periodo_principal],
        'metadata' => [
            'periodos_procesados' => count($periodos_array),
            'periodo_mas_reciente' => $periodo_principal,
            'periodo_mas_antiguo' => end($periodos_array),
            'total_insights' => count($insights)
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error de base de datos',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>