<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }
    
    if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al cargar el archivo');
    }
    
    $year = (int) ($_POST['year'] ?? 2025);
    $companyId = 1;
    
    // Comenzar transacción
    $pdo->beginTransaction();
    
    // Leer archivo CSV
    $csvFile = $_FILES['csv']['tmp_name'];
    $content = file_get_contents($csvFile);
    
    // Convertir encoding si es necesario
    if (!mb_check_encoding($content, 'UTF-8')) {
        $content = mb_convert_encoding($content, 'UTF-8', 'ISO-8859-1');
    }
    
    // Limpiar BOM
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
    $lines = explode("\n", $content);
    
    if (count($lines) < 2) {
        throw new Exception('El archivo CSV está vacío o mal formateado');
    }
    
    // Procesar headers (primera línea)
    $headers = str_getcsv($lines[0], ';');
    $months = [];
    for ($i = 2; $i < count($headers); $i++) {
        if (!empty(trim($headers[$i]))) {
            $months[] = trim($headers[$i]);
        }
    }
    
    if (empty($months)) {
        throw new Exception('No se encontraron meses en el CSV');
    }
    
    // Limpiar datos existentes del año
    $pdo->prepare("DELETE FROM raw_account_data WHERE company_id = ? AND period_year = ?")->execute([$companyId, $year]);
    $pdo->prepare("DELETE FROM financial_data WHERE company_id = ? AND year = ?")->execute([$companyId, $year]);
    
    // Preparar inserción en raw_account_data
    $insertStmt = $pdo->prepare("
        INSERT INTO raw_account_data (company_id, import_date, account_code, account_name, period_year, period_month, amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $totalRevenue = 0;
    $totalAccounts = 0;
    $accountCodes = [];
    
    // Procesar líneas de datos
    for ($lineNum = 1; $lineNum < count($lines); $lineNum++) {
        $line = trim($lines[$lineNum]);
        if (empty($line)) continue;
        
        $fields = str_getcsv($line, ';');
        if (count($fields) < 2) continue;
        
        $accountCode = trim($fields[0]);
        $accountCode = preg_replace('/[^\d\.]/', '', $accountCode);
        
        if (empty($accountCode)) continue;
        
        $accountName = trim($fields[1]);
        $accountCodes[$accountCode] = true;
        
        // Procesar valores por mes
        for ($monthIndex = 0; $monthIndex < count($months); $monthIndex++) {
            if (!isset($fields[$monthIndex + 2])) continue;
            
            $value = trim($fields[$monthIndex + 2]);
            if (empty($value) || $value === '0') continue;
            
            // Convertir formato europeo (1.000,50 -> 1000.50)
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
            $amount = (float) $value;
            
            if ($amount == 0) continue;
            
            $insertStmt->execute([
                $companyId,
                date('Y-m-d'),
                $accountCode,
                $accountName,
                $year,
                $monthIndex + 1,
                $amount
            ]);
            
            // Sumar ingresos (cuenta 4)
            if ($accountCode === '4') {
                $totalRevenue += $amount;
            }
        }
    }
    
    $totalAccounts = count($accountCodes);
    
    // Procesar datos financieros agregados
    $financialInsert = $pdo->prepare("
        INSERT INTO financial_data (company_id, year, month, ingresos, costo_ventas_total, costos_variables, costos_fijos, 
                                   gastos_admin_total, gastos_ventas_total, utilidad_bruta, ebitda, utilidad_neta)
        SELECT 
            ?, ?, period_month,
            SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) as ingresos,
            SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as costo_ventas_total,
            SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as costos_variables,
            SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as costos_fijos,
            SUM(CASE WHEN account_code = '5.2' AND account_name LIKE '%Adm%' THEN amount ELSE 0 END) as gastos_admin_total,
            SUM(CASE WHEN account_code = '5.2' AND account_name LIKE '%Vta%' THEN amount ELSE 0 END) as gastos_ventas_total,
            SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as utilidad_bruta,
            SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END) as ebitda,
            SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END) as utilidad_neta
        FROM raw_account_data
        WHERE company_id = ? AND period_year = ?
        GROUP BY period_month
    ");
    
    $financialInsert->execute([$companyId, $year, $companyId, $year]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'year' => $year,
        'months' => $months,
        'totalAccounts' => $totalAccounts,
        'totalRevenue' => $totalRevenue,
        'significantChanges' => [],
        'message' => 'CSV procesado exitosamente'
    ]);
    
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>