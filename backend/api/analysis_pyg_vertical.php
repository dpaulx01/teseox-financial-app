<?php
/**
 * Análisis Vertical de Estado de Resultados (PyG)
 * Calcula porcentajes sobre ingresos totales para un período
 * 
 * @author Sistema Artyco Financial
 * @endpoint GET /api/analysis_pyg_vertical.php
 * @params periodo (formato YYYY-MM)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de base de datos
require_once __DIR__ . '/../config/database.php';

try {
    // Validar parámetros de entrada
    $periodo = $_GET['periodo'] ?? '';
    
    if (empty($periodo)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'El parámetro periodo es requerido'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Validar formato de fecha
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato de fecha inválido. Use YYYY-MM',
            'received' => $periodo
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    list($year, $month) = explode('-', $periodo);
    
    // Obtener datos financieros del período
    $sql = "SELECT * FROM financial_data 
            WHERE year = :year AND month = :month 
            ORDER BY company_id LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':year', $year, PDO::PARAM_INT);
    $stmt->bindParam(':month', $month, PDO::PARAM_INT);
    $stmt->execute();
    
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$data) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'No se encontraron datos para el período especificado',
            'periodo' => $periodo
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Calcular estructura del PyG
    $ingresos_totales = (float)$data['ingresos'];
    
    if ($ingresos_totales == 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No hay ingresos registrados para calcular porcentajes',
            'periodo' => $periodo
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Estructura del PyG con porcentajes
    $pyg_data = [
        [
            'id_cuenta' => 1,
            'cuenta' => 'Ingresos Totales',
            'tipo_cuenta' => 'ingreso',
            'monto' => $ingresos_totales,
            'porcentaje_sobre_ingresos' => 100.0,
            'porcentaje_absoluto' => 100.0
        ],
        [
            'id_cuenta' => 2,
            'cuenta' => 'Costo de Ventas Total',
            'tipo_cuenta' => 'costo',
            'monto' => (float)$data['costo_ventas_total'],
            'porcentaje_sobre_ingresos' => ((float)$data['costo_ventas_total'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['costo_ventas_total'] / $ingresos_totales) * 100)
        ],
        [
            'id_cuenta' => 3,
            'cuenta' => 'Utilidad Bruta',
            'tipo_cuenta' => 'utilidad',
            'monto' => (float)$data['utilidad_bruta'],
            'porcentaje_sobre_ingresos' => ((float)$data['utilidad_bruta'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['utilidad_bruta'] / $ingresos_totales) * 100)
        ],
        [
            'id_cuenta' => 4,
            'cuenta' => 'Gastos Administrativos',
            'tipo_cuenta' => 'gasto',
            'monto' => (float)$data['gastos_admin_total'],
            'porcentaje_sobre_ingresos' => ((float)$data['gastos_admin_total'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['gastos_admin_total'] / $ingresos_totales) * 100)
        ],
        [
            'id_cuenta' => 5,
            'cuenta' => 'Gastos de Ventas',
            'tipo_cuenta' => 'gasto',
            'monto' => (float)$data['gastos_ventas_total'],
            'porcentaje_sobre_ingresos' => ((float)$data['gastos_ventas_total'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['gastos_ventas_total'] / $ingresos_totales) * 100)
        ],
        [
            'id_cuenta' => 6,
            'cuenta' => 'EBITDA',
            'tipo_cuenta' => 'utilidad',
            'monto' => (float)$data['ebitda'],
            'porcentaje_sobre_ingresos' => ((float)$data['ebitda'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['ebitda'] / $ingresos_totales) * 100)
        ],
        [
            'id_cuenta' => 7,
            'cuenta' => 'Utilidad Neta',
            'tipo_cuenta' => 'utilidad',
            'monto' => (float)$data['utilidad_neta'],
            'porcentaje_sobre_ingresos' => ((float)$data['utilidad_neta'] / $ingresos_totales) * 100,
            'porcentaje_absoluto' => abs(((float)$data['utilidad_neta'] / $ingresos_totales) * 100)
        ]
    ];
    
    // Calcular summary
    $utilidad_bruta = (float)$data['utilidad_bruta'];
    $utilidad_operativa = $utilidad_bruta - (float)$data['gastos_admin_total'] - (float)$data['gastos_ventas_total'];
    $utilidad_neta = (float)$data['utilidad_neta'];
    
    $summary = [
        'ingresos_totales' => [
            'monto' => $ingresos_totales,
            'porcentaje_sobre_ingresos' => 100.0
        ],
        'utilidad_bruta' => [
            'monto' => $utilidad_bruta,
            'porcentaje_sobre_ingresos' => ($utilidad_bruta / $ingresos_totales) * 100
        ],
        'utilidad_operativa' => [
            'monto' => $utilidad_operativa,
            'porcentaje_sobre_ingresos' => ($utilidad_operativa / $ingresos_totales) * 100
        ],
        'utilidad_neta' => [
            'monto' => $utilidad_neta,
            'porcentaje_sobre_ingresos' => ($utilidad_neta / $ingresos_totales) * 100
        ]
    ];
    
    // Datos para gráficos - composición de gastos
    $gastos_admin = (float)$data['gastos_admin_total'];
    $gastos_ventas = (float)$data['gastos_ventas_total'];
    $costo_ventas = (float)$data['costo_ventas_total'];
    
    $composicion_gastos = [];
    if ($gastos_admin > 0) {
        $composicion_gastos[] = [
            'name' => 'Gastos Administrativos',
            'value' => $gastos_admin,
            'percentage' => ($gastos_admin / $ingresos_totales) * 100
        ];
    }
    if ($gastos_ventas > 0) {
        $composicion_gastos[] = [
            'name' => 'Gastos de Ventas',
            'value' => $gastos_ventas,
            'percentage' => ($gastos_ventas / $ingresos_totales) * 100
        ];
    }
    if ($costo_ventas > 0) {
        $composicion_gastos[] = [
            'name' => 'Costo de Ventas',
            'value' => $costo_ventas,
            'percentage' => ($costo_ventas / $ingresos_totales) * 100
        ];
    }
    
    // Estructura del PyG para gráfico
    $estructura_pyg = [
        [
            'concepto' => 'Ingresos',
            'monto' => $ingresos_totales,
            'porcentaje' => 100.0,
            'tipo' => 'ingreso'
        ],
        [
            'concepto' => 'Costos',
            'monto' => $costo_ventas,
            'porcentaje' => ($costo_ventas / $ingresos_totales) * 100,
            'tipo' => 'costo'
        ],
        [
            'concepto' => 'Gastos',
            'monto' => $gastos_admin + $gastos_ventas,
            'porcentaje' => (($gastos_admin + $gastos_ventas) / $ingresos_totales) * 100,
            'tipo' => 'gasto'
        ],
        [
            'concepto' => 'Utilidad Neta',
            'monto' => $utilidad_neta,
            'porcentaje' => ($utilidad_neta / $ingresos_totales) * 100,
            'tipo' => 'utilidad'
        ]
    ];
    
    // Calcular ratios de rentabilidad
    $margen_bruto = ($utilidad_bruta / $ingresos_totales) * 100;
    $margen_operativo = ($utilidad_operativa / $ingresos_totales) * 100;
    $margen_neto = ($utilidad_neta / $ingresos_totales) * 100;
    
    // Respuesta final
    echo json_encode([
        'success' => true,
        'periodo' => $periodo,
        'ingreso_total' => $ingresos_totales,
        'pyg_data' => $pyg_data,
        'summary' => $summary,
        'graficos' => [
            'composicion_gastos' => $composicion_gastos,
            'estructura_pyg' => $estructura_pyg
        ],
        'metadata' => [
            'rentabilidad' => [
                'margen_bruto' => round($margen_bruto, 2),
                'margen_operativo' => round($margen_operativo, 2),
                'margen_neto' => round($margen_neto, 2)
            ]
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
}
?>