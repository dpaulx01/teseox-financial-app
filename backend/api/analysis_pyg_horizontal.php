<?php
/**
 * Análisis Horizontal de Estado de Resultados (PyG)
 * Compara dos períodos para análisis de variaciones
 * 
 * @author Sistema Artyco Financial
 * @endpoint GET /api/analysis_pyg_horizontal.php
 * @params periodo_actual, periodo_anterior (formato YYYY-MM)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de base de datos
require_once __DIR__ . '/../config/database.php';

try {
    // Validar parámetros de entrada
    $periodo_actual = $_GET['periodo_actual'] ?? '';
    $periodo_anterior = $_GET['periodo_anterior'] ?? '';
    
    if (empty($periodo_actual) || empty($periodo_anterior)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Parámetros requeridos: periodo_actual y periodo_anterior (formato YYYY-MM)',
            'example' => '/api/analysis_pyg_horizontal.php?periodo_actual=2025-06&periodo_anterior=2025-05'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Validar formato de fechas
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo_actual) || !preg_match('/^\d{4}-\d{2}$/', $periodo_anterior)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Formato de fecha inválido. Use YYYY-MM',
            'received' => ['actual' => $periodo_actual, 'anterior' => $periodo_anterior]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Obtener datos del PyG para un período específico usando la estructura real
     */
    function obtenerDatosPyG($pdo, $periodo) {
        $year = substr($periodo, 0, 4);
        $month = intval(substr($periodo, 5, 2));
        
        $sql = "SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Ingresos por Ventas' as nombre_cuenta,
                    'ingreso' as tipo_cuenta,
                    1 as id_cuenta,
                    revenue_sales as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Ingresos por Servicios' as nombre_cuenta,
                    'ingreso' as tipo_cuenta,
                    2 as id_cuenta,
                    revenue_services as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Otros Ingresos' as nombre_cuenta,
                    'ingreso' as tipo_cuenta,
                    3 as id_cuenta,
                    revenue_other as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Costo de Materias Primas' as nombre_cuenta,
                    'costo' as tipo_cuenta,
                    4 as id_cuenta,
                    cost_raw_materials as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Costo de Mano de Obra Directa' as nombre_cuenta,
                    'costo' as tipo_cuenta,
                    5 as id_cuenta,
                    cost_direct_labor as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Gastos de Fabricación' as nombre_cuenta,
                    'costo' as tipo_cuenta,
                    6 as id_cuenta,
                    cost_manufacturing_overhead as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Sueldos Administrativos' as nombre_cuenta,
                    'gasto' as tipo_cuenta,
                    7 as id_cuenta,
                    expense_admin_salaries as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Gastos Administrativos' as nombre_cuenta,
                    'gasto' as tipo_cuenta,
                    8 as id_cuenta,
                    expense_admin_other as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Gastos de Marketing' as nombre_cuenta,
                    'gasto' as tipo_cuenta,
                    9 as id_cuenta,
                    expense_sales_marketing as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Comisiones de Ventas' as nombre_cuenta,
                    'gasto' as tipo_cuenta,
                    10 as id_cuenta,
                    expense_sales_commissions as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month
                
                UNION ALL
                
                SELECT 
                    CONCAT(YEAR(period_date), '-', LPAD(MONTH(period_date), 2, '0')) as periodo,
                    'Depreciación' as nombre_cuenta,
                    'gasto' as tipo_cuenta,
                    11 as id_cuenta,
                    expense_depreciation as total_monto
                FROM financial_data_enhanced
                WHERE company_id = 1 
                    AND YEAR(period_date) = :year 
                    AND MONTH(period_date) = :month";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':year', $year, PDO::PARAM_INT);
        $stmt->bindParam(':month', $month, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Calcular subtotales del PyG
     */
    function calcularSubtotales($datos) {
        $ingresos = 0;
        $costos = 0;
        $gastos = 0;
        
        foreach ($datos as $cuenta) {
            switch ($cuenta['tipo_cuenta']) {
                case 'ingreso':
                    $ingresos += $cuenta['total_monto'];
                    break;
                case 'costo':
                    $costos += $cuenta['total_monto'];
                    break;
                case 'gasto':
                    $gastos += $cuenta['total_monto'];
                    break;
            }
        }
        
        $utilidad_bruta = $ingresos - $costos;
        $utilidad_operativa = $utilidad_bruta - $gastos;
        $utilidad_neta = $utilidad_operativa; // Simplificado para este ejemplo
        
        return [
            'ingresos_totales' => $ingresos,
            'costos_totales' => $costos,
            'gastos_totales' => $gastos,
            'utilidad_bruta' => $utilidad_bruta,
            'utilidad_operativa' => $utilidad_operativa,
            'utilidad_neta' => $utilidad_neta
        ];
    }
    
    /**
     * Calcular variaciones entre períodos
     */
    function calcularVariacion($actual, $anterior) {
        $variacion_absoluta = $actual - $anterior;
        $variacion_porcentual = ($anterior != 0) ? ($variacion_absoluta / abs($anterior)) * 100 : 
                               ($actual != 0 ? 100 : 0);
        
        return [
            'variacion_absoluta' => round($variacion_absoluta, 2),
            'variacion_porcentual' => round($variacion_porcentual, 2)
        ];
    }
    
    // Obtener datos para ambos períodos
    $datos_actual = obtenerDatosPyG($pdo, $periodo_actual);
    $datos_anterior = obtenerDatosPyG($pdo, $periodo_anterior);
    
    // Crear mapas indexados por id_cuenta para facilitar comparación
    $map_actual = [];
    $map_anterior = [];
    
    foreach ($datos_actual as $cuenta) {
        $map_actual[$cuenta['id_cuenta']] = $cuenta;
    }
    
    foreach ($datos_anterior as $cuenta) {
        $map_anterior[$cuenta['id_cuenta']] = $cuenta;
    }
    
    // Combinar datos y calcular variaciones
    $pyg_data = [];
    $todas_cuentas = array_unique(array_merge(array_keys($map_actual), array_keys($map_anterior)));
    sort($todas_cuentas); // Ordenar por ID
    
    foreach ($todas_cuentas as $id_cuenta) {
        $cuenta_actual = $map_actual[$id_cuenta] ?? null;
        $cuenta_anterior = $map_anterior[$id_cuenta] ?? null;
        
        // Usar datos de la cuenta que esté disponible
        $info_cuenta = $cuenta_actual ?? $cuenta_anterior;
        
        $monto_actual = $cuenta_actual ? floatval($cuenta_actual['total_monto']) : 0;
        $monto_anterior = $cuenta_anterior ? floatval($cuenta_anterior['total_monto']) : 0;
        
        // Solo incluir cuentas con movimiento en alguno de los períodos
        if ($monto_actual != 0 || $monto_anterior != 0) {
            $variacion = calcularVariacion($monto_actual, $monto_anterior);
            
            $pyg_data[] = [
                'id_cuenta' => intval($info_cuenta['id_cuenta']),
                'cuenta' => $info_cuenta['nombre_cuenta'],
                'tipo_cuenta' => $info_cuenta['tipo_cuenta'],
                'monto_anterior' => round($monto_anterior, 2),
                'monto_actual' => round($monto_actual, 2),
                'variacion_absoluta' => $variacion['variacion_absoluta'],
                'variacion_porcentual' => $variacion['variacion_porcentual']
            ];
        }
    }
    
    // Calcular subtotales para ambos períodos
    $subtotales_actual = calcularSubtotales($datos_actual);
    $subtotales_anterior = calcularSubtotales($datos_anterior);
    
    // Calcular variaciones de los subtotales
    $summary = [];
    foreach ($subtotales_actual as $concepto => $valor_actual) {
        $valor_anterior = $subtotales_anterior[$concepto];
        $variacion = calcularVariacion($valor_actual, $valor_anterior);
        
        $summary[$concepto] = [
            'monto_anterior' => round($valor_anterior, 2),
            'monto_actual' => round($valor_actual, 2),
            'variacion_absoluta' => $variacion['variacion_absoluta'],
            'variacion_porcentual' => $variacion['variacion_porcentual']
        ];
    }
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'periodo_actual' => $periodo_actual,
        'periodo_anterior' => $periodo_anterior,
        'pyg_data' => $pyg_data,
        'summary' => $summary
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de base de datos',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>