<?php
/**
 * Servidor PHP integrado para desarrollo local
 * 
 * Este script inicia un servidor PHP en el puerto 8001
 * para servir la API del backend
 * 
 * Uso: php start-server.php
 */

$host = 'localhost';
$port = 8001;
$docRoot = __DIR__;

echo "========================================\n";
echo "🚀 Iniciando servidor PHP para API\n";
echo "========================================\n\n";
echo "📍 URL Base: http://{$host}:{$port}\n";
echo "📂 Directorio: {$docRoot}\n";
echo "🔗 API Endpoint: http://{$host}:{$port}/api/\n\n";
echo "Endpoints disponibles:\n";
echo "  - /api/analysis_config.php\n";
echo "  - /api/financial_data_v2.php\n";
echo "  - /api/mixed_costs_v1.php\n";
echo "  - /api/production_data_v1.php\n";
echo "  - /api/csv_upload.php\n\n";
echo "✅ Servidor listo. Presiona Ctrl+C para detener.\n";
echo "========================================\n\n";

// Comando para iniciar el servidor
$command = sprintf(
    'php -S %s:%d -t %s',
    $host,
    $port,
    escapeshellarg($docRoot)
);

// Ejecutar el servidor
passthru($command);