<?php
// Limpiar headers anteriores y configurar CORS correctamente
if (function_exists('header_remove')) {
    header_remove('Access-Control-Allow-Origin');
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

/**
 * Financial Data API V1 - Mantiene compatibilidad exacta con localStorage
 * Devuelve datos en el formato esperado por los componentes React existentes
 */

class FinancialDataV1API {
    private $pdo;
    private $companyId = 1; // Por ahora empresa única
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * GET /api/financial_data_v1.php
     * Devuelve datos en formato exacto de localStorage V1
     */
    public function getFinancialData() {
        try {
            $year = $_GET['year'] ?? date('Y');
            
            // Datos mensuales en formato V1
            $monthlyData = $this->getMonthlyDataV1($year);
            
            // Datos anuales
            $yearlyData = $this->getYearlyDataV1($year);
            
            // Datos promedio mensual (calculado desde monthly)
            $averageData = $this->getAverageDataV1($monthlyData);
            error_log("AverageData calculated: " . json_encode($averageData));
            
            // KPIs 
            $kpis = $this->getKPIsV1($year);
            
            // Raw data del CSV
            $rawData = $this->getRawDataV1($year);
            
            // Break-even data (calculado)
            $breakEvenData = $this->getBreakEvenDataV1($year);
            
            // Retornar en formato V1 exacto
            $response = [
                'monthly' => $monthlyData,
                'yearly' => $yearlyData,
                'average' => $averageData,
                'kpis' => $kpis,
                'raw' => $rawData,
                'breakEven' => $breakEvenData,
                'lastUpdated' => date('c'),
                'source' => 'mysql_v2_compatible'
            ];
            
            return $response;
            
        } catch (Exception $e) {
            throw new Exception("Error getting financial data: " . $e->getMessage());
        }
    }
    
    /**
     * POST /api/financial_data_v1.php
     * Guarda datos manteniendo estructura V1
     */
    public function saveFinancialData($data) {
        try {
            $this->pdo->beginTransaction();
            
            $year = $data['year'] ?? date('Y');
            
            // Guardar datos mensuales
            if (isset($data['monthly'])) {
                $this->saveMonthlyDataV1($data['monthly'], $year);
            }
            
            // Guardar datos anuales
            if (isset($data['yearly'])) {
                $this->saveYearlyDataV1($data['yearly'], $year);
            }
            
            // Guardar KPIs
            if (isset($data['kpis'])) {
                $this->saveKPIsV1($data['kpis'], $year);
            }
            
            // Guardar raw data
            if (isset($data['raw'])) {
                $this->saveRawDataV1($data['raw'], $year);
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'Data saved successfully',
                'timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception("Error saving financial data: " . $e->getMessage());
        }
    }
    
    /**
     * Obtener datos mensuales en formato V1
     */
    private function getMonthlyDataV1($year) {
        $sql = "
            SELECT 
                month,
                ingresos,
                costo_ventas_total as costoVentasTotal,
                gastos_admin_total as gastosAdminTotal, 
                gastos_ventas_total as gastosVentasTotal,
                utilidad_bruta as utilidadBruta,
                ebitda,
                utilidad_neta as utilidadNeta,
                costo_materia_prima as costoMateriaPrima,
                costo_produccion as costoProduccion,
                costo_operativo as costoOperativo,
                punto_equilibrio as puntoEquilibrio,
                punto_equilibrio_acumulado as puntoEquilibrioAcumulado,
                COALESCE(costos_variables, 0) as costos_variables,
                COALESCE(costos_fijos, 0) as costos_fijos,
                COALESCE(gastos_admin_total + gastos_ventas_total, 0) as gastosOperativos,
                CASE 
                    WHEN month = 1 THEN 'Enero'
                    WHEN month = 2 THEN 'Febrero'
                    WHEN month = 3 THEN 'Marzo'
                    WHEN month = 4 THEN 'Abril'
                    WHEN month = 5 THEN 'Mayo'
                    WHEN month = 6 THEN 'Junio'
                    WHEN month = 7 THEN 'Julio'
                    WHEN month = 8 THEN 'Agosto'
                    WHEN month = 9 THEN 'Septiembre'
                    WHEN month = 10 THEN 'Octubre'
                    WHEN month = 11 THEN 'Noviembre'
                    WHEN month = 12 THEN 'Diciembre'
                END as month_name
            FROM financial_data 
            WHERE company_id = :company_id AND year = :year
            ORDER BY month
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $monthlyData = [];
        foreach ($rows as $row) {
            $monthName = $row['month_name'];
            $monthlyData[$monthName] = [
                'ingresos' => (float) $row['ingresos'],
                'costosVariables' => (float) $row['costos_variables'], // Cambio de nombre de columna
                'costosFijos' => (float) $row['costos_fijos'], // Cambio de nombre de columna
                'utilidadBruta' => (float) $row['utilidadBruta'],
                'gastosOperativos' => (float) $row['gastosOperativos'],
                'ebitda' => (float) $row['ebitda'],
                'utilidadNeta' => (float) $row['utilidadNeta'],
                'depreciacion' => 0.0, // TODO: Agregar cuando esté disponible
                'costoVentasTotal' => (float) $row['costoVentasTotal'],
                'gastosAdminTotal' => (float) $row['gastosAdminTotal'],
                'gastosVentasTotal' => (float) $row['gastosVentasTotal'],
                'puntoEquilibrio' => (float) $row['puntoEquilibrio'],
                'puntoEquilibrioAcumulado' => (float) $row['puntoEquilibrioAcumulado'],
                'costoMateriaPrima' => (float) $row['costoMateriaPrima'],
                'costoProduccion' => (float) $row['costoProduccion'],
                'costoOperativo' => (float) $row['costoOperativo']
            ];
        }
        
        return $monthlyData;
    }
    
    /**
     * Obtener datos promedio mensual DESDE VISTA SQL (CORRECTO)
     */
    private function getAverageDataV1($monthlyData) {
        $year = $_GET['year'] ?? date('Y');
        
        $sql = "
            SELECT 
                ingresos_promedio as ingresos,
                costos_variables_promedio as costosVariables,
                costos_fijos_promedio as costosFijos,
                utilidad_bruta_promedio as utilidadBruta,
                utilidad_neta_promedio as utilidadNeta,
                margen_neto_promedio as margenNeto,
                0 as depreciacion,
                costos_variables_promedio as costoVentasTotal,
                0 as gastosAdminTotal,
                0 as gastosVentasTotal,
                0 as costoMateriaPrima,
                0 as costoProduccion,
                0 as costoOperativo,
                costos_fijos_promedio + costos_variables_promedio as gastosOperativos,
                utilidad_neta_promedio as ebitda
            FROM v_financial_averages 
            WHERE company_id = :company_id AND period_year = :year
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            return null;
        }
        
        // Convertir a float
        foreach ($row as $key => $value) {
            $row[$key] = (float) $value;
        }
        
        return $row;
    }
    
    /**
     * Obtener datos anuales en formato V1
     */
    private function getYearlyDataV1($year) {
        $sql = "
            SELECT 
                SUM(ingresos) as ingresos,
                SUM(costos_variables) as costosVariables,
                SUM(costos_fijos) as costosFijos,
                SUM(utilidad_bruta) as utilidadBruta,
                SUM(gastos_admin_total + gastos_ventas_total) as gastosOperativos,
                SUM(ebitda) as ebitda,
                SUM(utilidad_neta) as utilidadNeta,
                0 as depreciacion,
                SUM(costo_ventas_total) as costoVentasTotal,
                SUM(gastos_admin_total) as gastosAdminTotal,
                SUM(gastos_ventas_total) as gastosVentasTotal,
                SUM(costo_materia_prima) as costoMateriaPrima,
                SUM(costo_produccion) as costoProduccion,
                SUM(costo_operativo) as costoOperativo
            FROM financial_data 
            WHERE company_id = :company_id AND year = :year
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row || $row['ingresos'] === null) {
            return null;
        }
        
        return [
            'ingresos' => (float) $row['ingresos'],
            'costosVariables' => (float) $row['costosVariables'],
            'costosFijos' => (float) $row['costosFijos'],
            'utilidadBruta' => (float) $row['utilidadBruta'],
            'gastosOperativos' => (float) $row['gastosOperativos'],
            'ebitda' => (float) $row['ebitda'],
            'utilidadNeta' => (float) $row['utilidadNeta'],
            'depreciacion' => (float) $row['depreciacion'],
            'costoVentasTotal' => (float) $row['costoVentasTotal'],
            'gastosAdminTotal' => (float) $row['gastosAdminTotal'],
            'gastosVentasTotal' => (float) $row['gastosVentasTotal'],
            'costoMateriaPrima' => (float) $row['costoMateriaPrima'],
            'costoProduccion' => (float) $row['costoProduccion'],
            'costoOperativo' => (float) $row['costoOperativo']
        ];
    }
    
    /**
     * Obtener KPIs en formato V1
     */
    private function getKPIsV1($year) {
        // Por ahora calculamos KPIs básicos desde datos anuales
        $yearlyData = $this->getYearlyDataV1($year);
        
        if (!$yearlyData) {
            return [];
        }
        
        $kpis = [];
        
        // Calcular KPIs estándar
        if ($yearlyData['ingresos'] > 0) {
            $kpis[] = [
                'name' => 'Margen Bruto',
                'value' => round(($yearlyData['utilidadBruta'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ];
            
            $kpis[] = [
                'name' => 'Margen EBITDA',
                'value' => round(($yearlyData['ebitda'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ];
            
            $kpis[] = [
                'name' => 'Margen Neto',
                'value' => round(($yearlyData['utilidadNeta'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ];
        }
        
        return $kpis;
    }
    
    /**
     * Obtener raw data en formato V1 (desde CSV almacenado)
     */
    private function getRawDataV1($year) {
        $sql = "
            SELECT 
                account_code as cod,
                account_name as cuenta,
                period_month,
                amount
            FROM raw_account_data 
            WHERE company_id = :company_id AND period_year = :year
            ORDER BY account_code, period_month
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug temporal
        error_log("getRawDataV1: year=$year, companyId={$this->companyId}, rows=" . count($rows));
        
        // Transformar a formato esperado por el frontend
        $rawData = [];
        $monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        // Agrupar por cuenta
        $accountData = [];
        foreach ($rows as $row) {
            $accountCode = $row['cod'];
            $monthName = $monthNames[$row['period_month']];
            
            if (!isset($accountData[$accountCode])) {
                $accountData[$accountCode] = [
                    'COD.' => $accountCode,
                    'CUENTA' => $row['cuenta']
                ];
            }
            
            $accountData[$accountCode][$monthName] = (float) $row['amount'];
        }
        
        return array_values($accountData);
    }
    
    /**
     * Obtener break-even data en formato V1
     */
    private function getBreakEvenDataV1($year) {
        $yearlyData = $this->getYearlyDataV1($year);
        
        if (!$yearlyData) {
            return ['yearly' => 0];
        }
        
        // Cálculo simple de punto de equilibrio
        $margenContribucion = $yearlyData['ingresos'] - $yearlyData['costosVariables'];
        $puntoEquilibrio = 0;
        
        if ($margenContribucion > 0) {
            $margenContribucionPorc = $margenContribucion / $yearlyData['ingresos'];
            $puntoEquilibrio = $yearlyData['costosFijos'] / $margenContribucionPorc;
        }
        
        return [
            'yearly' => round($puntoEquilibrio, 2)
        ];
    }
    
    /**
     * Guardar datos mensuales desde formato V1
     */
    private function saveMonthlyDataV1($monthlyData, $year) {
        $monthMap = [
            'Enero' => 1, 'Febrero' => 2, 'Marzo' => 3, 'Abril' => 4,
            'Mayo' => 5, 'Junio' => 6, 'Julio' => 7, 'Agosto' => 8,
            'Septiembre' => 9, 'Octubre' => 10, 'Noviembre' => 11, 'Diciembre' => 12
        ];
        
        foreach ($monthlyData as $monthName => $data) {
            if (!isset($monthMap[$monthName])) {
                continue;
            }
            
            $month = $monthMap[$monthName];
            
            $sql = "
                INSERT INTO financial_data (
                    company_id, year, month, ingresos, costo_ventas_total,
                    gastos_admin_total, gastos_ventas_total, utilidad_bruta,
                    ebitda, utilidad_neta, costo_materia_prima, costo_produccion,
                    costo_operativo, punto_equilibrio, punto_equilibrio_acumulado
                ) VALUES (
                    :company_id, :year, :month, :ingresos, :costo_ventas_total,
                    :gastos_admin_total, :gastos_ventas_total, :utilidad_bruta,
                    :ebitda, :utilidad_neta, :costo_materia_prima, :costo_produccion,
                    :costo_operativo, :punto_equilibrio, :punto_equilibrio_acumulado
                ) ON DUPLICATE KEY UPDATE
                    ingresos = VALUES(ingresos),
                    costo_ventas_total = VALUES(costo_ventas_total),
                    gastos_admin_total = VALUES(gastos_admin_total),
                    gastos_ventas_total = VALUES(gastos_ventas_total),
                    utilidad_bruta = VALUES(utilidad_bruta),
                    ebitda = VALUES(ebitda),
                    utilidad_neta = VALUES(utilidad_neta),
                    costo_materia_prima = VALUES(costo_materia_prima),
                    costo_produccion = VALUES(costo_produccion),
                    costo_operativo = VALUES(costo_operativo),
                    punto_equilibrio = VALUES(punto_equilibrio),
                    punto_equilibrio_acumulado = VALUES(punto_equilibrio_acumulado),
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'company_id' => $this->companyId,
                'year' => $year,
                'month' => $month,
                'ingresos' => $data['ingresos'] ?? 0,
                'costo_ventas_total' => $data['costoVentasTotal'] ?? 0,
                'gastos_admin_total' => $data['gastosAdminTotal'] ?? 0,
                'gastos_ventas_total' => $data['gastosVentasTotal'] ?? 0,
                'utilidad_bruta' => $data['utilidadBruta'] ?? 0,
                'ebitda' => $data['ebitda'] ?? 0,
                'utilidad_neta' => $data['utilidadNeta'] ?? 0,
                'costo_materia_prima' => $data['costoMateriaPrima'] ?? 0,
                'costo_produccion' => $data['costoProduccion'] ?? 0,
                'costo_operativo' => $data['costoOperativo'] ?? 0,
                'punto_equilibrio' => $data['puntoEquilibrio'] ?? 0,
                'punto_equilibrio_acumulado' => $data['puntoEquilibrioAcumulado'] ?? 0
            ]);
        }
    }
    
    /**
     * Guardar datos anuales (calculados automáticamente)
     */
    private function saveYearlyDataV1($yearlyData, $year) {
        // Los datos anuales se calculan automáticamente desde los mensuales
        // No necesitamos guardarlos por separado por ahora
    }
    
    /**
     * Guardar KPIs
     */
    private function saveKPIsV1($kpis, $year) {
        // TODO: Implementar cuando sea necesario
        // Por ahora los KPIs se calculan dinámicamente
    }
    
    /**
     * Guardar raw data 
     */
    private function saveRawDataV1($rawData, $year) {
        // TODO: Implementar tabla para raw CSV data
    }
}

// Handle requests
try {
    $api = new FinancialDataV1API($pdo);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $api->getFinancialData();
        echo json_encode($result);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data');
        }
        
        $result = $api->saveFinancialData($input);
        echo json_encode($result);
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>