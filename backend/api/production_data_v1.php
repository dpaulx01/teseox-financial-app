<?php
// Limpiar headers anteriores y configurar CORS correctamente
if (function_exists('header_remove')) {
    header_remove('Access-Control-Allow-Origin');
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database_final.php';

/**
 * Production Data API V1 - Compatible con localStorage
 */

class ProductionDataV1API {
    private $pdo;
    private $companyId = 1;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getProductionData() {
        try {
            $action = $_GET['action'] ?? 'data';
            
            if ($action === 'years') {
                return $this->getAvailableYears();
            }
            
            $year = $_GET['year'] ?? date('Y');
            
            // Datos de producción
            $productionData = $this->getProductionDataV1($year);
            
            // Configuración de producción
            $productionConfig = $this->getProductionConfigV1();
            
            // Datos combinados (calculado)
            $combinedData = $this->getCombinedDataV1($year);
            
            return [
                'productionData' => $productionData,
                'productionConfig' => $productionConfig,
                'combinedData' => $combinedData,
                'lastUpdated' => date('c'),
                'source' => 'mysql_v2_production',
                'year' => $year
            ];
            
        } catch (Exception $e) {
            throw new Exception("Error getting production data: " . $e->getMessage());
        }
    }
    
    public function saveProductionData($data) {
        try {
            $this->pdo->beginTransaction();
            
            $year = $data['year'] ?? date('Y');
            
            // Guardar datos de producción mensual
            if (isset($data['productionData'])) {
                $this->saveProductionDataV1($data['productionData'], $year);
            }
            
            // Guardar configuración
            if (isset($data['productionConfig'])) {
                $this->saveProductionConfigV1($data['productionConfig']);
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'Production data saved successfully',
                'timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception("Error saving production data: " . $e->getMessage());
        }
    }
    
    public function deleteProductionData($year = null) {
        try {
            $this->pdo->beginTransaction();
            
            $currentYear = $year ?: date('Y');
            
            // Borrar datos de producción del año especificado
            $sql = "DELETE FROM production_data WHERE company_id = :company_id AND year = :year";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $this->companyId, 'year' => $currentYear]);
            $deletedRows = $stmt->rowCount();
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => "Production data deleted successfully for year $currentYear",
                'deletedRows' => $deletedRows,
                'year' => $currentYear,
                'timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception("Error deleting production data: " . $e->getMessage());
        }
    }
    
    public function getAvailableYears() {
        try {
            $sql = "
                SELECT DISTINCT year 
                FROM production_data 
                WHERE company_id = :company_id 
                ORDER BY year DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $this->companyId]);
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $years = array_map('intval', $rows);
            
            // Si no hay años, incluir el año actual
            if (empty($years)) {
                $years = [intval(date('Y'))];
            }
            
            return [
                'years' => $years,
                'currentYear' => intval(date('Y')),
                'timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            throw new Exception("Error getting available years: " . $e->getMessage());
        }
    }
    
    private function getProductionDataV1($year) {
        $sql = "
            SELECT 
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
                END as month,
                metros_producidos as metrosProducidos,
                metros_vendidos as metrosVendidos,
                created_at as fechaRegistro
            FROM production_data 
            WHERE company_id = :company_id AND year = :year
            ORDER BY month
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId, 'year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $productionData = [];
        foreach ($rows as $row) {
            $productionData[] = [
                'month' => $row['month'],
                'metrosProducidos' => (float) $row['metrosProducidos'],
                'metrosVendidos' => (float) $row['metrosVendidos'],
                'fechaRegistro' => $row['fechaRegistro']
            ];
        }
        
        return $productionData;
    }
    
    private function getProductionConfigV1() {
        $sql = "
            SELECT 
                capacidad_maxima_mensual as capacidadMaximaMensual,
                costo_fijo_mensual as costoFijoProduccion,
                precio_objetivo as metaPrecioPromedio,
                margen_objetivo as metaMargenMinimo
            FROM production_config 
            WHERE company_id = :company_id
            LIMIT 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $this->companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            return [
                'capacidadMaximaMensual' => 0,
                'costoFijoProduccion' => 0,
                'metaPrecioPromedio' => 0,
                'metaMargenMinimo' => 0
            ];
        }
        
        return [
            'capacidadMaximaMensual' => (float) $row['capacidadMaximaMensual'],
            'costoFijoProduccion' => (float) $row['costoFijoProduccion'],
            'metaPrecioPromedio' => (float) $row['metaPrecioPromedio'],
            'metaMargenMinimo' => (float) $row['metaMargenMinimo']
        ];
    }
    
    private function getCombinedDataV1($year) {
        // TODO: Implementar datos combinados cuando sea necesario
        return [
            'lastUpdated' => date('c'),
            'hasFinancialData' => true,
            'hasProductionData' => true
        ];
    }
    
    private function saveProductionDataV1($productionData, $year) {
        $monthMap = [
            'Enero' => 1, 'Febrero' => 2, 'Marzo' => 3, 'Abril' => 4,
            'Mayo' => 5, 'Junio' => 6, 'Julio' => 7, 'Agosto' => 8,
            'Septiembre' => 9, 'Octubre' => 10, 'Noviembre' => 11, 'Diciembre' => 12
        ];
        
        foreach ($productionData as $data) {
            $month = isset($monthMap[$data['month']]) ? $monthMap[$data['month']] : null;
            
            if (!$month) continue;
            
            $sql = "
                INSERT INTO production_data (
                    company_id, year, month, metros_producidos, metros_vendidos
                ) VALUES (
                    :company_id, :year, :month, :metros_producidos, :metros_vendidos
                ) ON DUPLICATE KEY UPDATE
                    metros_producidos = VALUES(metros_producidos),
                    metros_vendidos = VALUES(metros_vendidos),
                    updated_at = CURRENT_TIMESTAMP
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
            'company_id' => $this->companyId,
                'year' => $year,
                'month' => $month,
                'metros_producidos' => $data['metrosProducidos'] ?? 0,
                'metros_vendidos' => $data['metrosVendidos'] ?? 0
            ]);
        }
    }
    
    private function saveProductionConfigV1($config) {
        $sql = "
            INSERT INTO production_config (
                company_id, capacidad_maxima_mensual, costo_fijo_mensual, 
                precio_objetivo, margen_objetivo
            ) VALUES (
                :company_id, :capacidad_maxima_mensual, :costo_fijo_mensual,
                :precio_objetivo, :margen_objetivo
            ) ON DUPLICATE KEY UPDATE
                capacidad_maxima_mensual = VALUES(capacidad_maxima_mensual),
                costo_fijo_mensual = VALUES(costo_fijo_mensual),
                precio_objetivo = VALUES(precio_objetivo),
                margen_objetivo = VALUES(margen_objetivo),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'capacidad_maxima_mensual' => $config['capacidadMaximaMensual'] ?? 0,
            'costo_fijo_mensual' => $config['costoFijoProduccion'] ?? 0,
            'precio_objetivo' => $config['metaPrecioPromedio'] ?? 0,
            'margen_objetivo' => $config['metaMargenMinimo'] ?? 0
        ]);
    }
}

// Handle requests
try {
    $api = new ProductionDataV1API($pdo);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $api->getProductionData();
        echo json_encode($result);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data');
        }
        
        $result = $api->saveProductionData($input);
        echo json_encode($result);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $year = $_GET['year'] ?? null;
        $result = $api->deleteProductionData($year);
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