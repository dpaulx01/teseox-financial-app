<?php
// Database configuration FINAL para SiteGround
// USAR ESTE ARCHIVO COMO database.php EN PRODUCCIÓN

// Credenciales directas para SiteGround
$host = getenv('DB_HOST') ?: 'mysql';
$port = getenv('DB_PORT') ?: '3306';
$dbname = getenv('DB_NAME') ?: 'artyco_financial';
$username = getenv('DB_USER') ?: 'artyco';
$password = getenv('DB_PASS') ?: 'artyco123';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Enable UTF-8 support
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("SET CHARACTER SET utf8mb4");
    
    // Timezone Ecuador
    $pdo->exec("SET time_zone = '-05:00'");
    
    // NO USAR NO_AUTO_CREATE_USER - incompatible con MySQL 8.0
    
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}
?>