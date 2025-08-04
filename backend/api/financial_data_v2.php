<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

/**
 * Financial Data API V2 - Usa vistas SQL optimizadas
 * Datos calculados COMPLETAMENTE en base de datos
 */

class FinancialDataV2API {
    private $pdo;
    private $companyId = 1;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getFinancialData() {
        try {
            $year = $_GET['year'] ?? date('Y');
            
            // Datos mensuales desde vista SQL
            $monthlyData = $this->getMonthlyFromView($year);
            
            // Datos anuales desde vista SQL  
            $yearlyData = $this->getYearlyFromView($year);
            
            // Datos promedio desde vista SQL
            $averageData = $this->getAverageFromView($year);
            
            // Raw data (solo para IA classifier)
            $rawData = $this->getRawDataV1($year);
            
            $response = [
                'monthly' => $monthlyData,
                'yearly' => $yearlyData,
                'average' => $averageData,
                'raw' => $rawData,
                'breakEven' => [
                    'yearly' => $yearlyData['punto_equilibrio'] ?? 0,
                    'average' => $averageData['punto_equilibrio'] ?? 0
                ],
                'kpis' => $this->calculateKPIs($yearlyData),
                'lastUpdated' => date('c'),
                'source' => 'mysql_views_v2'
            ];
            
            return $response;
            
        } catch (Exception $e) {
            throw new Exception("Error getting financial data: " . $e->getMessage());
        }
    }
    
    private function getMonthlyFromView($year) {
        $sql = "
            SELECT 
                period_month,
                ingresos,
                costos_variables as costosVariables,
                costos_fijos as costosFijos,
                utilidad_bruta as utilidadBruta,
                utilidad_neta as utilidadNeta,
                margen_neto_pct as margenNeto,
                0 as depreciacion,
                costos_variables as costoVentasTotal,
                0 as gastosAdminTotal,
                0 as gastosVentasTotal,
                0 as puntoEquilibrio,
                0 as puntoEquilibrioAcumulado,
                0 as costoMateriaPrima,
                0 as costoProduccion,
                0 as costoOperativo,
                costos_fijos + costos_variables as gastosOperativos,
                utilidad_neta as ebitda
            FROM v_financial_metrics 
            WHERE company_id = :company_id AND period_year = :year
            ORDER BY period_month
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $monthlyData = [];
        $monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        foreach ($rows as $row) {
            $monthName = $monthNames[$row['period_month']];
            unset($row['period_month']);
            
            // Convertir a float
            foreach ($row as $key => $value) {
                $row[$key] = (float) $value;
            }
            
            $monthlyData[$monthName] = $row;
        }
        
        return $monthlyData;
    }
    
    private function getYearlyFromView($year) {
        $sql = "
            SELECT 
                ingresos_total as ingresos,
                costos_variables_total as costosVariables,
                costos_fijos_total as costosFijos,
                utilidad_bruta_total as utilidadBruta,
                utilidad_neta_total as utilidadNeta,
                margen_neto_anual as margenNeto,
                0 as depreciacion,
                costos_variables_total as costoVentasTotal,
                0 as gastosAdminTotal,
                0 as gastosVentasTotal,
                0 as costoMateriaPrima,
                0 as costoProduccion,
                0 as costoOperativo,
                costos_fijos_total + costos_variables_total as gastosOperativos,
                utilidad_neta_total as ebitda,
                CASE 
                    WHEN utilidad_bruta_total > 0 AND ingresos_total > 0
                    THEN ROUND(costos_fijos_total / (utilidad_bruta_total / ingresos_total), 2)
                    ELSE 0 
                END as punto_equilibrio
            FROM v_financial_totals 
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
    
    private function getAverageFromView($year) {
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
                utilidad_neta_promedio as ebitda,
                CASE 
                    WHEN utilidad_bruta_promedio > 0 AND ingresos_promedio > 0
                    THEN ROUND(costos_fijos_promedio / (utilidad_bruta_promedio / ingresos_promedio), 2)
                    ELSE 0 
                END as punto_equilibrio
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
    
    private function getRawDataV1($year) {
        $sql = "
            SELECT 
                account_code as 'COD.',
                account_name as 'CUENTA',
                period_month,
                amount
            FROM raw_account_data 
            WHERE company_id = :company_id AND period_year = :year
            ORDER BY account_code, period_month
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        $accountData = [];
        foreach ($rows as $row) {
            $accountCode = $row['COD.'];
            $monthName = $monthNames[$row['period_month']];
            
            if (!isset($accountData[$accountCode])) {
                $accountData[$accountCode] = [
                    'COD.' => $accountCode,
                    'CUENTA' => $row['CUENTA']
                ];
            }
            
            $accountData[$accountCode][$monthName] = (float) $row['amount'];
        }
        
        return array_values($accountData);
    }
    
    private function calculateKPIs($yearlyData) {
        if (!$yearlyData || $yearlyData['ingresos'] <= 0) {
            return [];
        }
        
        return [
            [
                'name' => 'Margen Bruto',
                'value' => round(($yearlyData['utilidadBruta'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ],
            [
                'name' => 'Margen EBITDA',
                'value' => round(($yearlyData['ebitda'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ],
            [
                'name' => 'Margen Neto',
                'value' => round(($yearlyData['utilidadNeta'] / $yearlyData['ingresos']) * 100, 2),
                'unit' => '%'
            ]
        ];
    }
}

// Handle requests
try {
    $api = new FinancialDataV2API($pdo);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $api->getFinancialData();
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