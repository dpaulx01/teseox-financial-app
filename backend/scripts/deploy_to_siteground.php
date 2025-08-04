<?php
/**
 * Script de verificación y configuración para SiteGround
 * Ejecutar este archivo después de subir los archivos PHP
 */

header('Content-Type: application/json');

$checks = [];
$errors = [];
$warnings = [];

// 1. Verificar configuración PHP
$checks['php_version'] = [
    'test' => 'Versión PHP >= 7.4',
    'status' => version_compare(PHP_VERSION, '7.4.0', '>='),
    'value' => PHP_VERSION
];

// 2. Verificar extensiones PHP necesarias
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'mbstring'];
foreach ($required_extensions as $ext) {
    $checks["extension_$ext"] = [
        'test' => "Extensión PHP: $ext",
        'status' => extension_loaded($ext),
        'value' => extension_loaded($ext) ? 'Disponible' : 'No disponible'
    ];
    
    if (!extension_loaded($ext)) {
        $errors[] = "Extensión PHP requerida no disponible: $ext";
    }
}

// 3. Verificar permisos de archivos
$dirs_to_check = [
    'uploads' => '../uploads/',
    'logs' => '../logs/',
    'config' => '../config/'
];

foreach ($dirs_to_check as $name => $path) {
    $full_path = __DIR__ . '/' . $path;
    $checks["permissions_$name"] = [
        'test' => "Permisos directorio: $name",
        'status' => is_writable($full_path),
        'value' => is_writable($full_path) ? 'Escribible' : 'No escribible'
    ];
    
    if (!is_writable($full_path)) {
        $warnings[] = "Directorio $name no es escribible: $full_path";
    }
}

// 4. Verificar variables de entorno
$env_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
foreach ($env_vars as $var) {
    $value = $_ENV[$var] ?? getenv($var);
    $checks["env_$var"] = [
        'test' => "Variable de entorno: $var",
        'status' => !empty($value),
        'value' => !empty($value) ? 'Configurada' : 'No configurada'
    ];
    
    if (empty($value)) {
        $warnings[] = "Variable de entorno no configurada: $var";
    }
}

// 5. Intentar conexión a base de datos
try {
    include_once '../config/database_production.php';
    $checks['database_connection'] = [
        'test' => 'Conexión a base de datos',
        'status' => isset($pdo) && $pdo instanceof PDO,
        'value' => 'Conectado'
    ];
} catch (Exception $e) {
    $checks['database_connection'] = [
        'test' => 'Conexión a base de datos',
        'status' => false,
        'value' => 'Error: ' . $e->getMessage()
    ];
    $errors[] = "Error de conexión a base de datos: " . $e->getMessage();
}

// 6. Verificar tablas de base de datos
if (isset($pdo)) {
    $required_tables = ['financial_data', 'production_data', 'mixed_costs', 'analysis_config'];
    foreach ($required_tables as $table) {
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            $exists = $stmt->rowCount() > 0;
            $checks["table_$table"] = [
                'test' => "Tabla: $table",
                'status' => $exists,
                'value' => $exists ? 'Existe' : 'No existe'
            ];
            
            if (!$exists) {
                $warnings[] = "Tabla de base de datos no encontrada: $table";
            }
        } catch (Exception $e) {
            $checks["table_$table"] = [
                'test' => "Tabla: $table",
                'status' => false,
                'value' => 'Error: ' . $e->getMessage()
            ];
        }
    }
}

// 7. Verificar configuración de servidor
$checks['memory_limit'] = [
    'test' => 'Límite de memoria PHP',
    'status' => true,
    'value' => ini_get('memory_limit')
];

$checks['max_execution_time'] = [
    'test' => 'Tiempo máximo de ejecución',
    'status' => true,
    'value' => ini_get('max_execution_time') . ' segundos'
];

$checks['upload_max_filesize'] = [
    'test' => 'Tamaño máximo de archivo',
    'status' => true,
    'value' => ini_get('upload_max_filesize')
];

// Generar reporte
$passed = 0;
$failed = 0;
foreach ($checks as $check) {
    if ($check['status']) {
        $passed++;
    } else {
        $failed++;
    }
}

$overall_status = $failed === 0 ? 'success' : ($failed <= 2 ? 'warning' : 'error');

$response = [
    'overall_status' => $overall_status,
    'summary' => [
        'total_checks' => count($checks),
        'passed' => $passed,
        'failed' => $failed
    ],
    'checks' => $checks,
    'errors' => $errors,
    'warnings' => $warnings,
    'recommendations' => [],
    'server_info' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Desconocido',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Desconocido',
        'script_path' => __FILE__
    ]
];

// Agregar recomendaciones
if ($overall_status === 'error') {
    $response['recommendations'][] = 'Hay errores críticos que deben resolverse antes del despliegue.';
}

if (!empty($warnings)) {
    $response['recommendations'][] = 'Revisar las advertencias para optimal funcionamiento.';
}

if ($overall_status === 'success') {
    $response['recommendations'][] = 'Sistema listo para producción.';
    $response['recommendations'][] = 'Recuerda configurar las variables de entorno de producción.';
    $response['recommendations'][] = 'Ejecuta el script SQL de migración si no se han creado las tablas.';
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>