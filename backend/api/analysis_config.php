<?php
/**
 * API para Configuración de Análisis Financieros
 * 
 * Gestiona la configuración de tipos de análisis (contable, operativo, caja)
 * y patrones de exclusión de cuentas para PyG y Punto de Equilibrio.
 * 
 * Endpoints:
 * - GET /analysis_config.php?action=types - Obtener tipos de análisis
 * - GET /analysis_config.php?action=config&company_id=1 - Obtener configuración
 * - GET /analysis_config.php?action=patterns - Obtener patrones de exclusión
 * - POST /analysis_config.php?action=update_config - Actualizar configuración
 * 
 * @author Sistema Artyco Financial
 * @date 2025-01-23
 */

/**
 * Función auxiliar para JSON encoding con UTF-8
 */
function sendJsonResponse($data) {
    // Ensure proper UTF-8 encoding for all string values
    $data = array_map_recursive(function($item) {
        if (is_string($item)) {
            // Fix common UTF-8 encoding issues
            $item = str_replace(['Ã³', 'Ã¡', 'Ã©', 'Ã­', 'Ãº', 'Ã±'], ['ó', 'á', 'é', 'í', 'ú', 'ñ'], $item);
            return mb_convert_encoding($item, 'UTF-8', 'UTF-8');
        }
        return $item;
    }, $data);
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Función auxiliar para aplicar función recursivamente a arrays
 */
function array_map_recursive($callback, $array) {
    foreach ($array as $key => $value) {
        if (is_array($value)) {
            $array[$key] = array_map_recursive($callback, $value);
        } else {
            $array[$key] = $callback($value);
        }
    }
    return $array;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';

class AnalysisConfigAPI {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Obtener todos los tipos de análisis disponibles
     */
    public function getAnalysisTypes() {
        try {
            $query = "
                SELECT 
                    id,
                    code,
                    name,
                    description,
                    calculation_method,
                    is_active,
                    sort_order
                FROM analysis_types 
                WHERE is_active = TRUE 
                ORDER BY sort_order
            ";
            
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al obtener tipos de análisis: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtener configuración completa de análisis para una empresa
     */
    public function getAnalysisConfig($companyId = null) {
        try {
            $query = "
                SELECT 
                    at.id as analysis_id,
                    at.code as analysis_code,
                    at.name as analysis_name,
                    at.description,
                    at.calculation_method,
                    atc.pattern_group,
                    atc.include_pattern,
                    avc.primary_color,
                    avc.chart_color,
                    avc.icon_emoji,
                    avc.bg_gradient
                FROM analysis_types at
                LEFT JOIN analysis_type_config atc ON at.id = atc.analysis_type_id 
                    AND (atc.company_id = :company_id OR atc.company_id IS NULL)
                LEFT JOIN analysis_visual_config avc ON at.id = avc.analysis_type_id 
                    AND (avc.company_id = :company_id OR avc.company_id IS NULL)
                WHERE at.is_active = TRUE
                ORDER BY at.sort_order, atc.pattern_group
            ";
            
            $stmt = $this->pdo->prepare($query);
            $stmt->execute(['company_id' => $companyId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Agrupar por tipo de análisis
            $grouped = [];
            foreach ($results as $row) {
                $code = $row['analysis_code'];
                if (!isset($grouped[$code])) {
                    $grouped[$code] = [
                        'id' => $row['analysis_id'],
                        'code' => $code,
                        'name' => $row['analysis_name'],
                        'description' => $row['description'],
                        'calculation_method' => $row['calculation_method'],
                        'visual' => [
                            'primary_color' => $row['primary_color'],
                            'chart_color' => $row['chart_color'],
                            'icon_emoji' => $row['icon_emoji'],
                            'bg_gradient' => $row['bg_gradient']
                        ],
                        'exclusions' => []
                    ];
                }
                
                if ($row['pattern_group']) {
                    $grouped[$code]['exclusions'][$row['pattern_group']] = [
                        'include' => (bool)$row['include_pattern']
                    ];
                }
            }
            
            return [
                'success' => true,
                'data' => $grouped
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al obtener configuración: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtener patrones de exclusión agrupados
     */
    public function getExclusionPatterns() {
        try {
            $query = "
                SELECT 
                    id,
                    pattern_group,
                    pattern_name,
                    pattern_value,
                    pattern_type
                FROM account_exclusion_patterns 
                WHERE is_active = TRUE 
                ORDER BY pattern_group, pattern_name
            ";
            
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Agrupar por pattern_group
            $grouped = [];
            foreach ($results as $row) {
                $group = $row['pattern_group'];
                if (!isset($grouped[$group])) {
                    $grouped[$group] = [];
                }
                $grouped[$group][] = [
                    'id' => (int)$row['id'],
                    'name' => $row['pattern_name'],
                    'value' => $row['pattern_value'],
                    'type' => $row['pattern_type']
                ];
            }
            
            return [
                'success' => true,
                'data' => $grouped
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al obtener patrones: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtener configuración para uso en frontend (formato optimizado)
     */
    public function getConfigForFrontend($companyId = null) {
        try {
            // Obtener configuración de análisis
            $configResult = $this->getAnalysisConfig($companyId);
            if (!$configResult['success']) {
                return $configResult;
            }
            
            // Obtener patrones de exclusión
            $patternsResult = $this->getExclusionPatterns();
            if (!$patternsResult['success']) {
                return $patternsResult;
            }
            
            // Formato compatible con el frontend existente
            $frontendConfig = [];
            $frontendPatterns = [];
            $visualConfig = [];
            
            foreach ($configResult['data'] as $code => $config) {
                // Configuración del tipo de análisis
                $frontendConfig[$code] = [
                    'includeDepreciacion' => $config['exclusions']['depreciacion']['include'] ?? true,
                    'includeIntereses' => $config['exclusions']['intereses']['include'] ?? true,
                    'description' => $config['description'],
                    'objective' => $config['description'] // Alias para compatibilidad
                ];
                
                // Configuración visual
                $visualConfig[$code] = [
                    'color' => $this->mapColorToTailwind($config['visual']['primary_color']),
                    'chartColor' => $config['visual']['chart_color'],
                    'icon' => $config['visual']['icon_emoji'],
                    'bgGradient' => $config['visual']['bg_gradient']
                ];
            }
            
            // Patrones de exclusión en formato frontend
            foreach ($patternsResult['data'] as $group => $patterns) {
                $frontendPatterns[$group] = array_column($patterns, 'value');
            }
            
            return [
                'success' => true,
                'data' => [
                    'breakEvenConfigs' => $frontendConfig,
                    'accountPatterns' => $frontendPatterns,
                    'visualConfig' => $visualConfig,
                    'lastUpdated' => date('c')
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al generar configuración frontend: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Actualizar configuración de análisis
     */
    public function updateConfig($data) {
        try {
            $this->pdo->beginTransaction();
            
            $analysisTypeId = $data['analysis_type_id'];
            $companyId = $data['company_id'] ?? null;
            $exclusions = $data['exclusions'] ?? [];
            
            // Eliminar configuración existente
            $deleteQuery = "
                DELETE FROM analysis_type_config 
                WHERE analysis_type_id = :analysis_type_id 
                AND (company_id = :company_id OR (company_id IS NULL AND :company_id IS NULL))
            ";
            $stmt = $this->pdo->prepare($deleteQuery);
            $stmt->execute([
                'analysis_type_id' => $analysisTypeId,
                'company_id' => $companyId
            ]);
            
            // Insertar nueva configuración
            $insertQuery = "
                INSERT INTO analysis_type_config (analysis_type_id, pattern_group, include_pattern, company_id)
                VALUES (:analysis_type_id, :pattern_group, :include_pattern, :company_id)
            ";
            $stmt = $this->pdo->prepare($insertQuery);
            
            foreach ($exclusions as $patternGroup => $include) {
                $stmt->execute([
                    'analysis_type_id' => $analysisTypeId,
                    'pattern_group' => $patternGroup,
                    'include_pattern' => $include ? 1 : 0,
                    'company_id' => $companyId
                ]);
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'Configuración actualizada correctamente'
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return [
                'success' => false,
                'error' => 'Error al actualizar configuración: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Mapear color hex a clase Tailwind (para compatibilidad)
     */
    private function mapColorToTailwind($hexColor) {
        $colorMap = [
            '#00F0FF' => 'primary',
            '#00FF99' => 'accent',
            '#FFB800' => 'warning'
        ];
        
        return $colorMap[$hexColor] ?? 'primary';
    }
    
    /**
     * Agregar nuevo patrón de exclusión
     */
    public function addPattern($data) {
        try {
            $patternGroup = $data['pattern_group'] ?? null;
            $patternName = $data['pattern_name'] ?? null;
            $patternValue = $data['pattern_value'] ?? null;
            $patternType = $data['pattern_type'] ?? 'contains';
            
            if (!$patternGroup || !$patternName || !$patternValue) {
                return [
                    'success' => false,
                    'error' => 'Todos los campos son requeridos'
                ];
            }
            
            $query = "
                INSERT INTO account_exclusion_patterns 
                    (pattern_group, pattern_name, pattern_value, pattern_type, is_active, created_at, updated_at)
                VALUES 
                    (:pattern_group, :pattern_name, :pattern_value, :pattern_type, TRUE, NOW(), NOW())
            ";
            
            $stmt = $this->pdo->prepare($query);
            $stmt->execute([
                'pattern_group' => $patternGroup,
                'pattern_name' => $patternName,
                'pattern_value' => $patternValue,
                'pattern_type' => $patternType
            ]);
            
            return [
                'success' => true,
                'message' => 'Patrón agregado exitosamente',
                'id' => $this->pdo->lastInsertId()
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al agregar patrón: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Actualizar patrón de exclusión existente
     */
    public function updatePattern($data) {
        try {
            $patternId = $data['pattern_id'] ?? null;
            $patternGroup = $data['pattern_group'] ?? null;
            $patternName = $data['pattern_name'] ?? null;
            $patternValue = $data['pattern_value'] ?? null;
            $patternType = $data['pattern_type'] ?? 'contains';
            
            if (!$patternId || !$patternGroup || !$patternName || !$patternValue) {
                return [
                    'success' => false,
                    'error' => 'Todos los campos son requeridos'
                ];
            }
            
            $query = "
                UPDATE account_exclusion_patterns 
                SET 
                    pattern_group = :pattern_group,
                    pattern_name = :pattern_name,
                    pattern_value = :pattern_value,
                    pattern_type = :pattern_type,
                    updated_at = NOW()
                WHERE id = :pattern_id AND is_active = TRUE
            ";
            
            $stmt = $this->pdo->prepare($query);
            $affected = $stmt->execute([
                'pattern_id' => $patternId,
                'pattern_group' => $patternGroup,
                'pattern_name' => $patternName,
                'pattern_value' => $patternValue,
                'pattern_type' => $patternType
            ]);
            
            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'error' => 'Patrón no encontrado'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Patrón actualizado exitosamente'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al actualizar patrón: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Eliminar patrón de exclusión
     */
    public function deletePattern($data) {
        try {
            $patternId = $data['pattern_id'] ?? null;
            
            if (!$patternId) {
                return [
                    'success' => false,
                    'error' => 'pattern_id es requerido'
                ];
            }
            
            // Soft delete: marcar como inactivo
            $query = "
                UPDATE account_exclusion_patterns 
                SET 
                    is_active = FALSE,
                    updated_at = NOW()
                WHERE id = :pattern_id
            ";
            
            $stmt = $this->pdo->prepare($query);
            $stmt->execute(['pattern_id' => $patternId]);
            
            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'error' => 'Patrón no encontrado'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Patrón eliminado exitosamente'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al eliminar patrón: ' . $e->getMessage()
            ];
        }
    }
}

// Inicializar API
try {
    $api = new AnalysisConfigAPI($pdo);
    $action = $_GET['action'] ?? '';
    $companyId = $_GET['company_id'] ?? null;
    
    switch ($action) {
        case 'types':
            sendJsonResponse($api->getAnalysisTypes());
            break;
            
        case 'config':
            sendJsonResponse($api->getAnalysisConfig($companyId));
            break;
            
        case 'patterns':
            sendJsonResponse($api->getExclusionPatterns());
            break;
            
        case 'frontend':
            sendJsonResponse($api->getConfigForFrontend($companyId));
            break;
            
        case 'update_config':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                sendJsonResponse($api->updateConfig($input));
            } else {
                sendJsonResponse([
                    'success' => false,
                    'error' => 'Método no permitido'
                ]);
            }
            break;
            
        case 'add_pattern':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                sendJsonResponse($api->addPattern($input));
            } else {
                sendJsonResponse([
                    'success' => false,
                    'error' => 'Método no permitido'
                ]);
            }
            break;
            
        case 'update_pattern':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                sendJsonResponse($api->updatePattern($input));
            } else {
                sendJsonResponse([
                    'success' => false,
                    'error' => 'Método no permitido'
                ]);
            }
            break;
            
        case 'delete_pattern':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                sendJsonResponse($api->deletePattern($input));
            } else {
                sendJsonResponse([
                    'success' => false,
                    'error' => 'Método no permitido'
                ]);
            }
            break;
            
        default:
            sendJsonResponse([
                'success' => false,
                'error' => 'Acción no válida',
                'available_actions' => ['types', 'config', 'patterns', 'frontend', 'update_config', 'add_pattern', 'update_pattern', 'delete_pattern']
            ]);
    }
    
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'error' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>