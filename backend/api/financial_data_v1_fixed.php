<?php
// VERSIÓN CORREGIDA - Desactiva prepend.php de SiteGround
ini_set('auto_prepend_file', '');

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Incluir database.php
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
     * GET: Obtener datos financieros
     * Compatible con formato localStorage exacto
     */
    public function getFinancialData($year = null) {
        try {
            $currentYear = $year ?: date('Y');
            
            $sql = "SELECT 
                    year,
                    month,
                    ingresos,
                    costo_ventas_total AS costoVentasTotal,
                    utilidad_bruta AS utilidadBruta,
                    gastos_operativos AS gastosOperativos,
                    utilidad_operacional AS utilidadOperacional,
                    gastos_financieros AS gastosFinancieros,
                    utilidad_antes_impuestos AS utilidadAntesImpuestos,
                    impuestos,
                    utilidad_neta AS utilidadNeta,
                    ebitda
                FROM financial_data 
                WHERE company_id = :company_id 
                AND year = :year
                ORDER BY 
                    FIELD(month, 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':company_id' => $this->companyId,
                ':year' => $currentYear
            ]);
            
            $data = $stmt->fetchAll();
            
            // Convertir valores string a números
            foreach ($data as &$row) {
                foreach ($row as $key => &$value) {
                    if ($key !== 'month' && $key !== 'year') {
                        $value = floatval($value);
                    }
                }
            }
            
            return [
                'success' => true,
                'data' => $data,
                'year' => intval($currentYear)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

// Procesar request
try {
    $api = new FinancialDataV1API($pdo);
    
    // Por defecto GET
    $result = $api->getFinancialData($_GET['year'] ?? null);
    
    echo json_encode($result);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>