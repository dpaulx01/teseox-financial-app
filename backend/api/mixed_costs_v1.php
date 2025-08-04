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
 * Mixed Costs API V1 - Compatible con MixedCostContext
 */

class MixedCostsV1API {
    private $pdo;
    private $companyId = 1;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getMixedCosts() {
        try {
            $sql = "
                SELECT 
                    account_code as accountCode,
                    fixed_component as fixedComponent,
                    variable_rate as variableRate,
                    variable_amount as variableAmount,
                    input_mode as inputMode,
                    base_measure as baseMeasure,
                    updated_at as lastUpdated
                FROM mixed_costs 
                WHERE company_id = :company_id
                ORDER BY account_code
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $this->companyId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $mixedCosts = [];
            foreach ($rows as $row) {
                $mixedCosts[] = [
                    'accountCode' => $row['accountCode'],
                    'fixedComponent' => (float) $row['fixedComponent'],
                    'variableRate' => (float) $row['variableRate'],
                    'variableAmount' => (float) $row['variableAmount'],
                    'inputMode' => $row['inputMode'],
                    'baseMeasure' => $row['baseMeasure'],
                    'lastUpdated' => $row['lastUpdated']
                ];
            }
            
            return [
                'mixedCosts' => $mixedCosts,
                'lastUpdated' => date('c'),
                'source' => 'mysql_v2_mixed_costs'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Error getting mixed costs: " . $e->getMessage());
        }
    }
    
    public function saveMixedCosts($data) {
        try {
            $this->pdo->beginTransaction();
            
            if (isset($data['mixedCosts'])) {
                foreach ($data['mixedCosts'] as $mixedCost) {
                    $this->saveMixedCost($mixedCost);
                }
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'Mixed costs saved successfully',
                'timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception("Error saving mixed costs: " . $e->getMessage());
        }
    }
    
    private function saveMixedCost($mixedCost) {
        $sql = "
            INSERT INTO mixed_costs (
                company_id, account_code, fixed_component, variable_rate,
                variable_amount, input_mode, base_measure
            ) VALUES (
                :company_id, :account_code, :fixed_component, :variable_rate,
                :variable_amount, :input_mode, :base_measure
            ) ON DUPLICATE KEY UPDATE
                fixed_component = VALUES(fixed_component),
                variable_rate = VALUES(variable_rate),
                variable_amount = VALUES(variable_amount),
                input_mode = VALUES(input_mode),
                base_measure = VALUES(base_measure),
                updated_at = CURRENT_TIMESTAMP
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $this->companyId,
            'account_code' => $mixedCost['accountCode'],
            'fixed_component' => $mixedCost['fixedComponent'] ?? 0,
            'variable_rate' => $mixedCost['variableRate'] ?? 0,
            'variable_amount' => $mixedCost['variableAmount'] ?? 0,
            'input_mode' => $mixedCost['inputMode'] ?? 'automatic',
            'base_measure' => $mixedCost['baseMeasure'] ?? 'revenue'
        ]);
    }
}

// Handle requests
try {
    $api = new MixedCostsV1API($pdo);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $api->getMixedCosts();
        echo json_encode($result);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data');
        }
        
        $result = $api->saveMixedCosts($input);
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