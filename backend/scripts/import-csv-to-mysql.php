<?php
/**
 * Script de importación CSV → MySQL
 * Este script procesa el CSV ReportePyG y lo importa directamente a MySQL
 * Punto de partida: CSV es la fuente de verdad
 */

require_once __DIR__ . '/../config/database.php';

class CSVImporter {
    private $pdo;
    private $companyId = 1;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Importar CSV principal a MySQL
     */
    public function importMainCSV($csvPath) {
        echo "🔄 Iniciando importación CSV → MySQL...\n";
        
        if (!file_exists($csvPath)) {
            throw new Exception("Archivo CSV no encontrado: $csvPath");
        }
        
        // Crear todas las tablas primero
        echo "🏗️ Creando tablas necesarias...\n";
        $this->createAllTables();
        
        // Limpiar datos existentes
        $this->clearExistingData();
        
        // Procesar CSV
        $data = $this->parseCSV($csvPath);
        echo "📊 Encontradas " . count($data) . " filas de datos\n";
        
        // Importar a tablas MySQL
        $this->importRawData($data);
        $this->processFinancialData($data);
        
        echo "✅ Importación completada exitosamente\n";
        
        return [
            'success' => true,
            'rows_imported' => count($data),
            'timestamp' => date('c')
        ];
    }
    
    /**
     * Crear todas las tablas necesarias
     */
    private function createAllTables() {
        // Crear tabla raw_account_data
        $this->createRawDataTable();
        
        // Crear tabla financial_data si no existe
        $this->createFinancialDataTable();
        
        // Crear otras tablas
        $this->createProductionTables();
        $this->createMixedCostsTables();
        $this->createOperationalTables();
        $this->createEnhancedTables();
        
        echo "  ✅ Todas las tablas creadas\n";
    }
    
    /**
     * Crear tabla raw_account_data
     */
    private function createRawDataTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS raw_account_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                import_date DATE NOT NULL,
                account_code VARCHAR(20) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                period_year INT NOT NULL,
                period_month INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_account_period (company_id, account_code, period_year, period_month),
                INDEX idx_company_year (company_id, period_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
    }
    
    /**
     * Crear tabla financial_data
     */
    private function createFinancialDataTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS financial_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                ingresos DECIMAL(15,2) DEFAULT 0,
                costo_ventas_total DECIMAL(15,2) DEFAULT 0,
                gastos_admin_total DECIMAL(15,2) DEFAULT 0,
                gastos_ventas_total DECIMAL(15,2) DEFAULT 0,
                utilidad_bruta DECIMAL(15,2) DEFAULT 0,
                ebitda DECIMAL(15,2) DEFAULT 0,
                utilidad_neta DECIMAL(15,2) DEFAULT 0,
                costo_materia_prima DECIMAL(15,2) DEFAULT 0,
                costo_produccion DECIMAL(15,2) DEFAULT 0,
                costo_operativo DECIMAL(15,2) DEFAULT 0,
                punto_equilibrio DECIMAL(15,2) DEFAULT 0,
                punto_equilibrio_acumulado DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_financial (company_id, year, month),
                INDEX idx_company_year (company_id, year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
    }
    
    /**
     * Limpiar datos existentes de la empresa
     */
    private function clearExistingData() {
        echo "🧹 Limpiando datos existentes...\n";
        
        $tables = [
            'raw_account_data', 
            'financial_data', 
            'financial_data_enhanced',
            'production_data',
            'mixed_costs',
            'operational_metrics'
        ];
        
        foreach ($tables as $table) {
            try {
                $sql = "DELETE FROM $table WHERE company_id = :company_id";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute(['company_id' => $this->companyId]);
                echo "  - Tabla $table limpiada\n";
            } catch (PDOException $e) {
                echo "  - Tabla $table no existe o error: " . $e->getMessage() . "\n";
            }
        }
    }
    
    /**
     * Parsear CSV con formato europeo (; separador, , decimal)
     */
    private function parseCSV($csvPath) {
        $data = [];
        $year = 2025; // Año actual
        
        $handle = fopen($csvPath, 'r');
        if (!$handle) {
            throw new Exception("No se puede abrir el archivo CSV");
        }
        
        // Detectar encoding
        $content = file_get_contents($csvPath);
        if (!mb_check_encoding($content, 'UTF-8')) {
            $content = mb_convert_encoding($content, 'UTF-8', 'ISO-8859-1');
        }
        
        $lines = explode("\n", $content);
        
        foreach ($lines as $lineNumber => $line) {
            if (empty(trim($line))) continue;
            
            // Parsear línea CSV con ; como separador
            $fields = str_getcsv($line, ';');
            
            if (count($fields) < 8) {
                echo "⚠️ Línea $lineNumber incompleta, saltando...\n";
                continue;
            }
            
            // Limpiar BOM y caracteres extraños del código de cuenta
            $accountCode = trim($fields[0]);
            $accountCode = ltrim($accountCode, "\xEF\xBB\xBF"); // Remover BOM UTF-8
            $accountCode = preg_replace('/[^\d\.]/', '', $accountCode); // Solo números y puntos
            
            $accountName = trim($fields[1]);
            
            // Procesar valores mensuales (columnas 2-7 = Enero-Junio)
            $months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
            
            for ($i = 0; $i < 6; $i++) {
                if (isset($fields[$i + 2])) {
                    $value = $this->parseEuropeanNumber($fields[$i + 2]);
                    
                    if ($value != 0) { // Solo guardar valores no cero
                        $data[] = [
                            'account_code' => $accountCode,
                            'account_name' => $accountName,
                            'month' => $i + 1, // 1-6 para Enero-Junio
                            'month_name' => $months[$i],
                            'year' => $year,
                            'amount' => $value
                        ];
                    }
                }
            }
        }
        
        fclose($handle);
        return $data;
    }
    
    /**
     * Convertir número europeo (1.234,56) a decimal (1234.56)
     */
    private function parseEuropeanNumber($value) {
        $value = trim($value);
        if (empty($value) || $value === '0') return 0;
        
        // Limpiar caracteres extraños
        $value = preg_replace('/[^\d.,-]/', '', $value);
        
        // Si contiene tanto punto como coma
        if (strpos($value, '.') !== false && strpos($value, ',') !== false) {
            // Formato europeo: 1.234,56
            // Remover separadores de miles (.)
            $value = str_replace('.', '', $value);
            // Convertir separador decimal (,) a punto
            $value = str_replace(',', '.', $value);
        } elseif (strpos($value, ',') !== false) {
            // Solo coma: 1234,56
            $value = str_replace(',', '.', $value);
        }
        // Si solo tiene punto, asumimos que es decimal americano: 1234.56
        
        $result = (float) $value;
        
        // Debug para verificar conversión
        if ($result > 1000) {
            echo "    🔍 Convertido: '$value' → $result\n";
        }
        
        return $result;
    }
    
    /**
     * Importar datos raw a MySQL
     */
    private function importRawData($data) {
        echo "📤 Importando datos raw...\n";
        
        $sql = "
            INSERT INTO raw_account_data (
                company_id, import_date, account_code, account_name,
                period_year, period_month, amount
            ) VALUES (
                :company_id, :import_date, :account_code, :account_name,
                :period_year, :period_month, :amount
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $importDate = date('Y-m-d');
        
        foreach ($data as $row) {
            $stmt->execute([
                'company_id' => $this->companyId,
                'import_date' => $importDate,
                'account_code' => $row['account_code'],
                'account_name' => $row['account_name'],
                'period_year' => $row['year'],
                'period_month' => $row['month'],
                'amount' => $row['amount']
            ]);
        }
        
        echo "  ✅ " . count($data) . " registros raw importados\n";
    }
    
    /**
     * Procesar y clasificar datos para TODOS los módulos
     */
    private function processFinancialData($data) {
        echo "⚙️ Procesando datos para TODOS los módulos...\n";
        
        // Agrupar por mes con datos completos
        $monthlyData = [];
        $productionData = [];
        $mixedCosts = [];
        
        foreach ($data as $row) {
            $month = $row['month'];
            if (!isset($monthlyData[$month])) {
                $monthlyData[$month] = [
                    'ingresos' => 0,
                    'costo_ventas_total' => 0,
                    'gastos_admin_total' => 0,
                    'gastos_ventas_total' => 0,
                    'costo_materia_prima' => 0,
                    'costo_produccion' => 0,
                    'costo_operativo' => 0,
                    'depreciacion' => 0,
                    'gastos_financieros' => 0,
                    'month' => $month,
                    'year' => $row['year']
                ];
                
                // Inicializar datos de producción
                $productionData[$month] = [
                    'metros_producidos' => 0,
                    'metros_vendidos' => 0,
                    'costo_metro_producido' => 0
                ];
            }
            
            $amount = $row['amount'];
            $code = $row['account_code'];
            $name = $row['account_name'];
            
            // 🎯 LÓGICA EXACTA DE TYPESCRIPT - Solo cuentas principales + cuentas hoja para detalle
            
            // 💰 INGRESOS - Solo cuenta principal "4" (según TypeScript línea 103)
            if ($code === '4') {
                $monthlyData[$month]['ingresos'] += $amount;
                echo "    ✅ Ingresos: $code ($name) = $amount\n";
                
            // 🏭 COSTO DE VENTAS - Solo cuenta principal "5.1" (según TypeScript línea 108)
            } elseif ($code === '5.1') {
                $monthlyData[$month]['costo_ventas_total'] += $amount;
                echo "    ✅ Costo Ventas: $code ($name) = $amount\n";
                
            // 🛒 GASTOS DE VENTAS - Solo cuenta principal "5.2" (según TypeScript línea 112)
            } elseif ($code === '5.2') {
                $monthlyData[$month]['gastos_ventas_total'] += $amount;
                echo "    ✅ Gastos Ventas: $code ($name) = $amount\n";
                
            // 🏢 GASTOS ADMINISTRATIVOS - Solo cuenta principal "5.3" (según TypeScript línea 118)
            } elseif ($code === '5.3') {
                $monthlyData[$month]['gastos_admin_total'] += $amount;
                echo "    ✅ Gastos Admin: $code ($name) = $amount\n";
                
            } else {
                // SEGMENTACIÓN DETALLADA - Solo cuentas hoja (según TypeScript línea 141)
                $isLeafAccount = $this->isLeafAccount($code, $data);
                
                if ($isLeafAccount) {
                    echo "    🔍 Analizando cuenta hoja: $code ($name) = $amount\n";
                    
                    // Materia Prima - cuenta específica 5.1.1.6 y productos terminados
                    if ($code === '5.1.1.6' || 
                        strpos(strtolower($name), 'productos terminados') !== false || 
                        strpos(strtolower($name), 'materia prima') !== false ||
                        strpos(strtolower($name), 'materiales directos') !== false) {
                        $monthlyData[$month]['costo_materia_prima'] += $amount;
                        echo "      📦 Materia Prima: +$amount\n";
                    }
                    
                    // Costo de Producción - cuentas 5.1.x (excluyendo materia prima)
                    if (strpos($code, '5.1.') === 0 && $code !== '5.1.1.6') {
                        $monthlyData[$month]['costo_produccion'] += $amount;
                        echo "      👷 Producción: +$amount\n";
                        $this->classifyMixedCost($mixedCosts, $code, $name, $amount, 'produccion');
                    }
                    
                    // Costo Operativo - cuentas 5.2.x y 5.3.x
                    if (strpos($code, '5.2.') === 0 || strpos($code, '5.3.') === 0) {
                        $monthlyData[$month]['costo_operativo'] += $amount;
                        echo "      ⚙️ Operativo: +$amount\n";
                        
                        if (strpos($code, '5.2.') === 0) {
                            $this->classifyMixedCost($mixedCosts, $code, $name, $amount, 'ventas');
                        } else {
                            $this->classifyMixedCost($mixedCosts, $code, $name, $amount, 'administrativo');
                        }
                    }
                    
                    // Depreciación
                    if (strpos(strtolower($name), 'depreciaci') !== false) {
                        $monthlyData[$month]['depreciacion'] += $amount;
                        echo "      📉 Depreciación: +$amount\n";
                    }
                    
                    // Gastos Financieros - cuentas 5.4.x o que contengan "interes", "financier"
                    if (strpos($code, '5.4.') === 0 || 
                        strpos(strtolower($name), 'interes') !== false ||
                        strpos(strtolower($name), 'financier') !== false) {
                        $monthlyData[$month]['gastos_financieros'] += $amount;
                        echo "      💸 Financieros: +$amount\n";
                    }
                    
                    // Estimación de metros vendidos desde ventas reales
                    if (strpos($code, '4.1.1') === 0 && 
                        (strpos($name, 'Venta de Bienes') !== false || strpos($name, 'Venta de Producto') !== false)) {
                        $precioEstimado = 96.14;
                        $metrosEstimados = $amount / $precioEstimado;
                        $productionData[$month]['metros_vendidos'] += $metrosEstimados;
                        echo "      🏭 Metros vendidos estimados: +$metrosEstimados\n";
                    }
                } else {
                    echo "    🚫 Saltando cuenta padre: $code ($name)\n";
                }
            }
        }
        
        // Calcular datos de producción estimados
        $this->calculateProductionMetrics($monthlyData, $productionData);
        
        // Procesar datos para todos los módulos
        $this->insertFinancialData($monthlyData);
        $this->insertProductionData($productionData);
        $this->insertMixedCosts($mixedCosts);
        $this->insertOperationalMetrics($monthlyData, $productionData);
        $this->insertEnhancedFinancialData($monthlyData);
    }
    
    /**
     * Verificar si una cuenta es hoja (no tiene subcuentas) - LÓGICA ANTI-DOBLE CONTEO
     */
    private function isLeafAccount($accountCode, $allData) {
        // Buscar si existe alguna cuenta que empiece con este código + '.'
        foreach ($allData as $row) {
            $otherCode = $row['account_code'];
            if ($otherCode !== $accountCode && 
                strpos($otherCode, $accountCode . '.') === 0) {
                // Esta cuenta tiene subcuentas, no es hoja
                return false;
            }
        }
        
        // No se encontraron subcuentas, es cuenta hoja
        return true;
    }
    
    /**
     * Clasificar costo mixto automáticamente
     */
    private function classifyMixedCost(&$mixedCosts, $code, $name, $amount, $category) {
        $key = $code;
        
        if (!isset($mixedCosts[$key])) {
            // Determinar comportamiento del costo basado en patrones
            $fixedComponent = 0;
            $variableRate = 0;
            
            // Heurísticas para clasificación automática
            if (strpos(strtolower($name), 'sueldo') !== false || 
                strpos(strtolower($name), 'salario') !== false) {
                // Sueldos: principalmente fijos con componente variable
                $fixedComponent = $amount * 0.7;
                $variableRate = $amount * 0.3;
            } elseif (strpos(strtolower($name), 'materia') !== false || 
                      strpos(strtolower($name), 'material') !== false) {
                // Materiales: principalmente variables
                $fixedComponent = $amount * 0.1;
                $variableRate = $amount * 0.9;
            } elseif (strpos(strtolower($name), 'energia') !== false || 
                      strpos(strtolower($name), 'electricidad') !== false) {
                // Energía: mixto 50/50
                $fixedComponent = $amount * 0.5;
                $variableRate = $amount * 0.5;
            } else {
                // Por defecto: 60% fijo, 40% variable
                $fixedComponent = $amount * 0.6;
                $variableRate = $amount * 0.4;
            }
            
            $mixedCosts[$key] = [
                'account_code' => $code,
                'account_name' => $name,
                'category' => $category,
                'fixed_component' => $fixedComponent,
                'variable_rate' => $variableRate,
                'total_amount' => $amount,
                'base_measure' => 'revenue'
            ];
        } else {
            // Acumular si ya existe
            $mixedCosts[$key]['total_amount'] += $amount;
        }
    }
    
    /**
     * Calcular métricas de producción estimadas
     */
    private function calculateProductionMetrics($monthlyData, &$productionData) {
        echo "📏 Calculando métricas de producción...\n";
        
        foreach ($productionData as $month => &$prodData) {
            if (isset($monthlyData[$month])) {
                $financial = $monthlyData[$month];
                
                // Estimar metros producidos basado en costos de producción
                $costoTotalProduccion = $financial['costo_materia_prima'] + $financial['costo_produccion'];
                $costoEstimadoPorMetro = 49.125; // Costo estimado por metro
                
                if ($costoEstimadoPorMetro > 0) {
                    $prodData['metros_producidos'] = $costoTotalProduccion / $costoEstimadoPorMetro;
                }
                
                // Si no tenemos metros vendidos estimados, usar 85% de producidos
                if ($prodData['metros_vendidos'] == 0) {
                    $prodData['metros_vendidos'] = $prodData['metros_producidos'] * 0.85;
                }
                
                // Calcular costo por metro
                if ($prodData['metros_producidos'] > 0) {
                    $prodData['costo_metro_producido'] = $costoTotalProduccion / $prodData['metros_producidos'];
                }
            }
        }
    }
    
    /**
     * Insertar datos financieros procesados (COMPLETOS)
     */
    private function insertFinancialData($monthlyData) {
        echo "💾 Guardando datos financieros completos...\n";
        
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
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $acumuladoPuntoEquilibrio = 0;
        
        foreach ($monthlyData as $month => $data) {
            $ingresos = $data['ingresos'];
            $costoVentas = $data['costo_ventas_total'];
            $gastosAdmin = $data['gastos_admin_total'];
            $gastosVentas = $data['gastos_ventas_total'];
            
            // Calcular métricas avanzadas
            $utilidadBruta = $ingresos - $costoVentas;
            $ebitda = $utilidadBruta - $gastosAdmin - $gastosVentas;
            $utilidadNeta = $ebitda - ($data['depreciacion'] ?? 0) - ($data['gastos_financieros'] ?? 0);
            
            // Calcular punto de equilibrio
            $costosFijos = $gastosAdmin + $gastosVentas;
            $margenContribucion = $ingresos - $costoVentas;
            $puntoEquilibrio = 0;
            
            if ($margenContribucion > 0) {
                $margenContribucionPorc = $margenContribucion / $ingresos;
                $puntoEquilibrio = $costosFijos / $margenContribucionPorc;
            }
            
            $acumuladoPuntoEquilibrio += $puntoEquilibrio;
            
            $stmt->execute([
                'company_id' => $this->companyId,
                'year' => $data['year'],
                'month' => $month,
                'ingresos' => $ingresos,
                'costo_ventas_total' => $costoVentas,
                'gastos_admin_total' => $gastosAdmin,
                'gastos_ventas_total' => $gastosVentas,
                'utilidad_bruta' => $utilidadBruta,
                'ebitda' => $ebitda,
                'utilidad_neta' => $utilidadNeta,
                'costo_materia_prima' => $data['costo_materia_prima'],
                'costo_produccion' => $data['costo_produccion'],
                'costo_operativo' => $data['costo_operativo'],
                'punto_equilibrio' => $puntoEquilibrio,
                'punto_equilibrio_acumulado' => $acumuladoPuntoEquilibrio
            ]);
            
            echo "  ✅ Mes $month: Ingresos \$" . number_format($ingresos, 2) . 
                 ", EBITDA \$" . number_format($ebitda, 2) . 
                 ", P.Equilibrio \$" . number_format($puntoEquilibrio, 2) . "\n";
        }
    }
    
    /**
     * Insertar datos de producción
     */
    private function insertProductionData($productionData) {
        echo "🏭 Guardando datos de producción...\n";
        
        $sql = "
            INSERT INTO production_data (
                company_id, year, month, metros_producidos, metros_vendidos,
                costo_por_metro, fecha_registro
            ) VALUES (
                :company_id, :year, :month, :metros_producidos, :metros_vendidos,
                :costo_por_metro, :fecha_registro
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($productionData as $month => $data) {
            $stmt->execute([
                'company_id' => $this->companyId,
                'year' => 2025,
                'month' => $month,
                'metros_producidos' => $data['metros_producidos'],
                'metros_vendidos' => $data['metros_vendidos'],
                'costo_por_metro' => $data['costo_metro_producido'],
                'fecha_registro' => date('Y-m-d')
            ]);
            
            echo "  ✅ Mes $month: " . number_format($data['metros_producidos'], 2) . " metros producidos\n";
        }
    }
    
    /**
     * Insertar costos mixtos clasificados
     */
    private function insertMixedCosts($mixedCosts) {
        echo "🔄 Guardando costos mixtos...\n";
        
        $sql = "
            INSERT INTO mixed_costs (
                company_id, account_code, account_name, category,
                fixed_component, variable_rate, total_amount, base_measure,
                is_active, created_at
            ) VALUES (
                :company_id, :account_code, :account_name, :category,
                :fixed_component, :variable_rate, :total_amount, :base_measure,
                1, NOW()
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($mixedCosts as $cost) {
            $stmt->execute([
                'company_id' => $this->companyId,
                'account_code' => $cost['account_code'],
                'account_name' => $cost['account_name'],
                'category' => $cost['category'],
                'fixed_component' => $cost['fixed_component'],
                'variable_rate' => $cost['variable_rate'],
                'total_amount' => $cost['total_amount'],
                'base_measure' => $cost['base_measure']
            ]);
            
            echo "  ✅ Costo mixto: {$cost['account_name']} (F: \$" . 
                 number_format($cost['fixed_component'], 2) . ", V: \$" . 
                 number_format($cost['variable_rate'], 2) . ")\n";
        }
    }
    
    /**
     * Insertar métricas operacionales
     */
    private function insertOperationalMetrics($monthlyData, $productionData) {
        echo "📊 Guardando métricas operacionales...\n";
        
        $sql = "
            INSERT INTO operational_metrics (
                company_id, year, month, costo_produccion_por_metro,
                costo_variable_por_metro, precio_venta_por_metro,
                margen_por_metro, productividad, eficiencia_ventas
            ) VALUES (
                :company_id, :year, :month, :costo_produccion_por_metro,
                :costo_variable_por_metro, :precio_venta_por_metro,
                :margen_por_metro, :productividad, :eficiencia_ventas
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($monthlyData as $month => $financial) {
            if (isset($productionData[$month])) {
                $production = $productionData[$month];
                
                $costoProduccionPorMetro = $production['metros_producidos'] > 0 ? 
                    ($financial['costo_materia_prima'] + $financial['costo_produccion']) / $production['metros_producidos'] : 0;
                
                $costoVariablePorMetro = $production['metros_producidos'] > 0 ? 
                    $financial['costo_ventas_total'] / $production['metros_producidos'] : 0;
                
                $precioVentaPorMetro = $production['metros_vendidos'] > 0 ? 
                    $financial['ingresos'] / $production['metros_vendidos'] : 0;
                
                $margenPorMetro = $precioVentaPorMetro - $costoVariablePorMetro;
                
                $productividad = $production['metros_producidos'] > 0 ? 
                    ($production['metros_producidos'] / 1000) * 100 : 0; // Asumiendo capacidad de 1000
                
                $eficienciaVentas = $production['metros_producidos'] > 0 ? 
                    ($production['metros_vendidos'] / $production['metros_producidos']) * 100 : 0;
                
                $stmt->execute([
                    'company_id' => $this->companyId,
                    'year' => $financial['year'],
                    'month' => $month,
                    'costo_produccion_por_metro' => $costoProduccionPorMetro,
                    'costo_variable_por_metro' => $costoVariablePorMetro,
                    'precio_venta_por_metro' => $precioVentaPorMetro,
                    'margen_por_metro' => $margenPorMetro,
                    'productividad' => $productividad,
                    'eficiencia_ventas' => $eficienciaVentas
                ]);
                
                echo "  ✅ Mes $month: Precio \$" . number_format($precioVentaPorMetro, 2) . 
                     "/metro, Eficiencia " . number_format($eficienciaVentas, 1) . "%\n";
            }
        }
    }
    
    /**
     * Insertar datos financieros mejorados
     */
    private function insertEnhancedFinancialData($monthlyData) {
        echo "🚀 Guardando datos financieros mejorados...\n";
        
        $sql = "
            INSERT INTO financial_data_enhanced (
                company_id, year, month, ingresos_ventas, ingresos_servicios,
                costo_materia_prima, costo_mano_obra_directa, costo_overhead,
                gastos_admin, gastos_ventas, gastos_rd, utilidad_bruta,
                ebitda, utilidad_neta, roi, margen_ebitda
            ) VALUES (
                :company_id, :year, :month, :ingresos_ventas, :ingresos_servicios,
                :costo_materia_prima, :costo_mano_obra_directa, :costo_overhead,
                :gastos_admin, :gastos_ventas, :gastos_rd, :utilidad_bruta,
                :ebitda, :utilidad_neta, :roi, :margen_ebitda
            )
        ";
        
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($monthlyData as $month => $data) {
            $utilidadBruta = $data['ingresos'] - $data['costo_ventas_total'];
            $ebitda = $utilidadBruta - $data['gastos_admin_total'] - $data['gastos_ventas_total'];
            $utilidadNeta = $ebitda - ($data['depreciacion'] ?? 0);
            
            $roi = $data['ingresos'] > 0 ? ($utilidadNeta / $data['ingresos']) * 100 : 0;
            $margenEbitda = $data['ingresos'] > 0 ? ($ebitda / $data['ingresos']) * 100 : 0;
            
            $stmt->execute([
                'company_id' => $this->companyId,
                'year' => $data['year'],
                'month' => $month,
                'ingresos_ventas' => $data['ingresos'] * 0.9, // 90% ventas
                'ingresos_servicios' => $data['ingresos'] * 0.1, // 10% servicios
                'costo_materia_prima' => $data['costo_materia_prima'],
                'costo_mano_obra_directa' => $data['costo_produccion'],
                'costo_overhead' => $data['costo_operativo'],
                'gastos_admin' => $data['gastos_admin_total'],
                'gastos_ventas' => $data['gastos_ventas_total'],
                'gastos_rd' => $data['gastos_admin_total'] * 0.1, // 10% de admin para R&D
                'utilidad_bruta' => $utilidadBruta,
                'ebitda' => $ebitda,
                'utilidad_neta' => $utilidadNeta,
                'roi' => $roi,
                'margen_ebitda' => $margenEbitda
            ]);
        }
        
        echo "  ✅ Datos financieros mejorados guardados\n";
    }
    
    /**
     * Crear tablas de producción si no existen
     */
    private function createProductionTables() {
        // Primero verificar si la tabla existe y si le falta la columna
        $sql = "
            CREATE TABLE IF NOT EXISTS production_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL DEFAULT 1,
                year INT NOT NULL,
                month INT NOT NULL,
                metros_producidos DECIMAL(12,2) DEFAULT 0,
                metros_vendidos DECIMAL(12,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_production (company_id, year, month),
                INDEX idx_company_year (company_id, year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
        
        // Agregar columna costo_por_metro si no existe
        try {
            $this->pdo->exec("ALTER TABLE production_data ADD COLUMN costo_por_metro DECIMAL(10,4) DEFAULT 0");
        } catch (PDOException $e) {
            // La columna ya existe, ignorar error
        }
        
        // Agregar columna fecha_registro si no existe
        try {
            $this->pdo->exec("ALTER TABLE production_data ADD COLUMN fecha_registro DATE");
        } catch (PDOException $e) {
            // La columna ya existe, ignorar error
        }
    }
    
    /**
     * Crear tablas de costos mixtos si no existen
     */
    private function createMixedCostsTables() {
        $sql = "
            CREATE TABLE IF NOT EXISTS mixed_costs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                account_code VARCHAR(20) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                category ENUM('produccion', 'operativo', 'administrativo', 'ventas') NOT NULL,
                fixed_component DECIMAL(15,2) DEFAULT 0,
                variable_rate DECIMAL(15,2) DEFAULT 0,
                total_amount DECIMAL(15,2) DEFAULT 0,
                base_measure ENUM('units', 'revenue', 'labor_hours') DEFAULT 'revenue',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_mixed_cost (company_id, account_code),
                INDEX idx_company_category (company_id, category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
    }
    
    /**
     * Crear tablas de métricas operacionales si no existen
     */
    private function createOperationalTables() {
        $sql = "
            CREATE TABLE IF NOT EXISTS operational_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_operational (company_id, year, month),
                INDEX idx_company_year (company_id, year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
        
        // Agregar columnas una por una para evitar errores
        $columns = [
            'costo_produccion_por_metro DECIMAL(10,4) DEFAULT 0',
            'costo_variable_por_metro DECIMAL(10,4) DEFAULT 0',
            'precio_venta_por_metro DECIMAL(10,4) DEFAULT 0',
            'margen_por_metro DECIMAL(10,4) DEFAULT 0',
            'productividad DECIMAL(8,2) DEFAULT 0',
            'eficiencia_ventas DECIMAL(8,2) DEFAULT 0'
        ];
        
        foreach ($columns as $column) {
            try {
                $this->pdo->exec("ALTER TABLE operational_metrics ADD COLUMN $column");
            } catch (PDOException $e) {
                // La columna ya existe, ignorar error
            }
        }
    }
    
    /**
     * Crear tablas financieras mejoradas si no existen
     */
    private function createEnhancedTables() {
        $sql = "
            CREATE TABLE IF NOT EXISTS financial_data_enhanced (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                ingresos_ventas DECIMAL(15,2) DEFAULT 0,
                ingresos_servicios DECIMAL(15,2) DEFAULT 0,
                costo_materia_prima DECIMAL(15,2) DEFAULT 0,
                costo_mano_obra_directa DECIMAL(15,2) DEFAULT 0,
                costo_overhead DECIMAL(15,2) DEFAULT 0,
                gastos_admin DECIMAL(15,2) DEFAULT 0,
                gastos_ventas DECIMAL(15,2) DEFAULT 0,
                gastos_rd DECIMAL(15,2) DEFAULT 0,
                utilidad_bruta DECIMAL(15,2) DEFAULT 0,
                ebitda DECIMAL(15,2) DEFAULT 0,
                utilidad_neta DECIMAL(15,2) DEFAULT 0,
                roi DECIMAL(8,4) DEFAULT 0,
                margen_ebitda DECIMAL(8,4) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_enhanced (company_id, year, month),
                INDEX idx_company_year (company_id, year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
    }
}

// Ejecutar importación si se llama directamente
if (php_sapi_name() === 'cli') {
    try {
        // Buscar el CSV en varias ubicaciones posibles
        $possiblePaths = [
            __DIR__ . '/../../ReportePyG junOK.csv',
            '/var/www/html/data/ReportePyG junOK.csv',
            '/var/www/html/ReportePyG junOK.csv',
            __DIR__ . '/../data/ReportePyG junOK.csv'
        ];
        
        $csvPath = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $csvPath = $path;
                echo "📊 CSV encontrado en: $csvPath\n";
                break;
            }
        }
        
        if (!$csvPath) {
            echo "❌ ERROR: Archivo CSV no encontrado en ninguna ubicación.\n";
            echo "Rutas verificadas:\n";
            foreach ($possiblePaths as $path) {
                echo "  - $path\n";
            }
            exit(1);
        }
        
        $importer = new CSVImporter($pdo);
        $result = $importer->importMainCSV($csvPath);
        
        echo "\n🎉 IMPORTACIÓN COMPLETADA:\n";
        echo "   - Filas procesadas: " . $result['rows_imported'] . "\n";
        echo "   - Timestamp: " . $result['timestamp'] . "\n";
        
    } catch (Exception $e) {
        echo "❌ ERROR: " . $e->getMessage() . "\n";
        exit(1);
    }
}
?>