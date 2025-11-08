-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: artyco_financial_rbac
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_transactions`
--

DROP TABLE IF EXISTS `account_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `description` text,
  `debit` decimal(15,2) DEFAULT '0.00',
  `credit` decimal(15,2) DEFAULT '0.00',
  `balance` decimal(15,2) DEFAULT '0.00',
  `reference_number` varchar(50) DEFAULT NULL,
  `source_document` varchar(100) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_company_account_date` (`company_id`,`account_id`,`transaction_date`),
  CONSTRAINT `account_transactions_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `account_transactions_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`),
  CONSTRAINT `account_transactions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource` varchar(100) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_audit_logs_created_at` (`created_at`),
  KEY `ix_audit_logs_id` (`id`),
  KEY `ix_audit_logs_resource` (`resource`),
  KEY `ix_audit_logs_action` (`action`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `balance_config`
--

DROP TABLE IF EXISTS `balance_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `balance_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `year` int NOT NULL,
  `working_capital_target` decimal(15,2) DEFAULT NULL,
  `liquidity_target` decimal(7,2) DEFAULT NULL,
  `leverage_target` decimal(7,2) DEFAULT NULL,
  `notes` varchar(1024) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_balance_config_year` (`year`),
  KEY `ix_balance_config_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `balance_data`
--

DROP TABLE IF EXISTS `balance_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `balance_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `period_year` int NOT NULL,
  `period_month` int DEFAULT NULL,
  `account_code` varchar(50) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `level` smallint NOT NULL,
  `parent_code` varchar(50) DEFAULT NULL,
  `balance` decimal(15,2) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_balance_data_period_month` (`period_month`),
  KEY `ix_balance_data_account_code` (`account_code`),
  KEY `ix_balance_data_period_year` (`period_year`),
  KEY `ix_balance_data_company_id` (`company_id`),
  KEY `ix_balance_data_parent_code` (`parent_code`)
) ENGINE=InnoDB AUTO_INCREMENT=694 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `breakeven_data`
--

DROP TABLE IF EXISTS `breakeven_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `breakeven_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `period_year` int NOT NULL,
  `period_month` int DEFAULT NULL,
  `costos_fijos` decimal(15,2) DEFAULT '0.00',
  `costos_variables` decimal(15,2) DEFAULT '0.00',
  `costos_mixtos` decimal(15,2) DEFAULT '0.00',
  `precio_venta_unitario` decimal(10,4) DEFAULT '0.0000',
  `costo_variable_unitario` decimal(10,4) DEFAULT '0.0000',
  `margen_contribucion` decimal(10,4) DEFAULT '0.0000',
  `punto_equilibrio_unidades` int DEFAULT '0',
  `punto_equilibrio_ventas` decimal(15,2) DEFAULT '0.00',
  `margen_seguridad` decimal(15,2) DEFAULT '0.00',
  `margen_seguridad_porcentaje` decimal(5,2) DEFAULT '0.00',
  `elasticidad_precio` decimal(8,4) DEFAULT '0.0000',
  `apalancamiento_operativo` decimal(8,4) DEFAULT '0.0000',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_breakeven_period` (`company_id`,`period_year`,`period_month`),
  KEY `created_by` (`created_by`),
  KEY `idx_company_breakeven_period` (`company_id`,`period_year`,`period_month`),
  CONSTRAINT `breakeven_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `breakeven_data_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chart_of_accounts`
--

DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `account_code` varchar(20) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_type` enum('activo','pasivo','patrimonio','ingreso','costo','gasto') NOT NULL,
  `account_subtype` varchar(100) DEFAULT NULL,
  `is_fixed_cost` tinyint(1) DEFAULT '0',
  `is_variable_cost` tinyint(1) DEFAULT '0',
  `is_mixed_cost` tinyint(1) DEFAULT '0',
  `cost_behavior` varchar(50) DEFAULT NULL,
  `parent_account_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_code` (`company_id`,`account_code`),
  KEY `parent_account_id` (`parent_account_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `chart_of_accounts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `chart_of_accounts_ibfk_2` FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts` (`id`),
  CONSTRAINT `chart_of_accounts_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `industry` varchar(100) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `companies_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_cotizacion` varchar(64) NOT NULL,
  `numero_pedido_stock` varchar(50) DEFAULT NULL COMMENT 'NÃºmero de pedido de stock desde Contifico (ej: PDI 202409000006)',
  `tipo_produccion` enum('CLIENTE','STOCK') NOT NULL DEFAULT 'CLIENTE' COMMENT 'Tipo de producciÃ³n: cliente (cotizaciÃ³n) o stock (inventario)',
  `cliente` varchar(255) DEFAULT NULL,
  `bodega` varchar(100) DEFAULT NULL COMMENT 'Bodega destino para pedidos de stock',
  `responsable` varchar(100) DEFAULT NULL COMMENT 'Responsable del pedido de stock',
  `contacto` varchar(255) DEFAULT NULL,
  `proyecto` varchar(255) DEFAULT NULL,
  `odc` varchar(128) DEFAULT NULL,
  `valor_total` decimal(12,2) DEFAULT NULL,
  `fecha_ingreso` datetime NOT NULL,
  `fecha_inicio_periodo` date DEFAULT NULL COMMENT 'Fecha de inicio del perÃ­odo de producciÃ³n (para stock)',
  `fecha_fin_periodo` date DEFAULT NULL COMMENT 'Fecha de fin del perÃ­odo de producciÃ³n (para stock)',
  `fecha_vencimiento` date DEFAULT NULL,
  `nombre_archivo_pdf` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_cotizaciones_numero_cotizacion` (`numero_cotizacion`),
  KEY `idx_cotizaciones_tipo` (`tipo_produccion`),
  KEY `idx_cotizaciones_pedido_stock` (`numero_pedido_stock`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dashboard_configs`
--

DROP TABLE IF EXISTS `dashboard_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `dashboard_name` varchar(100) NOT NULL,
  `layout_config` json DEFAULT NULL,
  `widgets_config` json DEFAULT NULL,
  `filters_config` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_shared` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `dashboard_configs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `data_audit_log`
--

DROP TABLE IF EXISTS `data_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `data_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int DEFAULT NULL,
  `action` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  PRIMARY KEY (`id`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_user_timestamp` (`user_id`,`timestamp`),
  CONSTRAINT `data_audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_uploads`
--

DROP TABLE IF EXISTS `file_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `upload_type` enum('financial_data','production_data','chart_of_accounts','transactions') NOT NULL,
  `status` enum('processing','completed','failed') DEFAULT 'processing',
  `records_processed` int DEFAULT '0',
  `errors_count` int DEFAULT '0',
  `error_details` json DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `file_uploads_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `file_uploads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `financial_data`
--

DROP TABLE IF EXISTS `financial_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `year` int DEFAULT NULL,
  `month` int DEFAULT NULL,
  `data_type` enum('monthly','yearly','quarterly') DEFAULT 'monthly',
  `period_year` int NOT NULL,
  `period_month` int DEFAULT NULL,
  `period_quarter` int DEFAULT NULL,
  `ingresos` decimal(15,2) DEFAULT '0.00',
  `ingresos_operacionales` decimal(15,2) DEFAULT '0.00',
  `ingresos_no_operacionales` decimal(15,2) DEFAULT '0.00',
  `costo_ventas` decimal(15,2) DEFAULT '0.00',
  `costos_directos` decimal(15,2) DEFAULT '0.00',
  `costos_indirectos` decimal(15,2) DEFAULT '0.00',
  `gastos_administrativos` decimal(15,2) DEFAULT '0.00',
  `gastos_ventas` decimal(15,2) DEFAULT '0.00',
  `gastos_financieros` decimal(15,2) DEFAULT '0.00',
  `utilidad_bruta` decimal(15,2) DEFAULT '0.00',
  `utilidad_operacional` decimal(15,2) DEFAULT '0.00',
  `utilidad_neta` decimal(15,2) DEFAULT '0.00',
  `ebitda` decimal(15,2) DEFAULT '0.00',
  `upload_source` varchar(100) DEFAULT 'manual',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_period` (`company_id`,`data_type`,`period_year`,`period_month`,`period_quarter`),
  KEY `created_by` (`created_by`),
  KEY `idx_company_period` (`company_id`,`period_year`,`period_month`),
  KEY `idx_fin_company_year_month` (`company_id`,`year`,`month`),
  CONSTRAINT `financial_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `financial_data_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=196 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `financial_scenarios`
--

DROP TABLE IF EXISTS `financial_scenarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_scenarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `base_year` int NOT NULL,
  `financial_data` json NOT NULL,
  `is_template` tinyint(1) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `owner_id` int NOT NULL,
  `is_shared` tinyint(1) DEFAULT NULL,
  `shared_with` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_accessed` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `ix_financial_scenarios_id` (`id`),
  KEY `ix_financial_scenarios_name` (`name`),
  CONSTRAINT `financial_scenarios_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha_pago` date DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pagos_cotizacion_id` (`cotizacion_id`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=156 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resource` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_permissions_action` (`action`),
  KEY `ix_permissions_resource` (`resource`),
  KEY `ix_permissions_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plan_diario_produccion`
--

DROP TABLE IF EXISTS `plan_diario_produccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_diario_produccion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `fecha` date NOT NULL,
  `metros` decimal(12,2) NOT NULL,
  `unidades` decimal(12,2) NOT NULL,
  `cantidad_sugerida` decimal(10,2) DEFAULT NULL COMMENT 'Cantidad sugerida del Excel de Contifico (columna Sugerencia)',
  `notas` text,
  `is_manually_edited` tinyint(1) NOT NULL,
  `completado` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indica si la producciÃ³n fue completada e ingresada a bodega',
  `fecha_completado` timestamp NULL DEFAULT NULL COMMENT 'Fecha y hora en que se completÃ³ la producciÃ³n',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plan_diario_producto_fecha` (`producto_id`,`fecha`),
  KEY `ix_plan_diario_produccion_producto_id` (`producto_id`),
  CONSTRAINT `plan_diario_produccion_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_combined_data`
--

DROP TABLE IF EXISTS `production_combined_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_combined_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `year` int NOT NULL,
  `data` json NOT NULL,
  `last_updated` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prod_combined_company_year` (`company_id`,`year`),
  KEY `ix_production_combined_data_year` (`year`),
  KEY `ix_production_combined_data_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_config`
--

DROP TABLE IF EXISTS `production_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `year` int NOT NULL,
  `capacidad_maxima_mensual` decimal(15,2) NOT NULL,
  `costo_fijo_produccion` decimal(15,2) NOT NULL,
  `meta_precio_promedio` decimal(15,2) NOT NULL,
  `meta_margen_minimo` decimal(5,2) NOT NULL,
  `last_updated` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_production_config_company_year` (`company_id`,`year`),
  KEY `ix_production_config_year` (`year`),
  KEY `ix_production_config_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_data`
--

DROP TABLE IF EXISTS `production_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `metros_producidos` int DEFAULT '0',
  `metros_vendidos` int DEFAULT '0',
  `period_year` int NOT NULL,
  `period_month` int NOT NULL,
  `unidades_producidas` int DEFAULT '0',
  `unidades_vendidas` int DEFAULT '0',
  `capacidad_instalada` int DEFAULT '0',
  `utilizacion_capacidad` decimal(5,2) DEFAULT '0.00',
  `costo_materiales` decimal(15,2) DEFAULT '0.00',
  `costo_mano_obra` decimal(15,2) DEFAULT '0.00',
  `costo_overhead` decimal(15,2) DEFAULT '0.00',
  `costo_unitario` decimal(10,4) DEFAULT '0.0000',
  `tiempo_ciclo` decimal(8,2) DEFAULT '0.00',
  `eficiencia_oee` decimal(5,2) DEFAULT '0.00',
  `defectos_ppm` int DEFAULT '0',
  `empleados_produccion` int DEFAULT '0',
  `horas_trabajadas` decimal(10,2) DEFAULT '0.00',
  `horas_extra` decimal(10,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_production_period` (`company_id`,`period_year`,`period_month`),
  UNIQUE KEY `uq_production_year_month` (`company_id`,`year`,`month`),
  KEY `created_by` (`created_by`),
  KEY `idx_company_production_period` (`company_id`,`period_year`,`period_month`),
  KEY `idx_prod_company_year_month` (`company_id`,`year`,`month`),
  CONSTRAINT `production_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `production_data_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `descripcion` text NOT NULL,
  `cantidad` varchar(128) DEFAULT NULL,
  `valor_subtotal` decimal(12,2) DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `estatus` enum('EN_COLA','EN_PRODUCCION','PRODUCCION_PARCIAL','LISTO_PARA_RETIRO','EN_BODEGA','ENTREGADO') DEFAULT NULL,
  `notas_estatus` text,
  `factura` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_productos_cotizacion_id` (`cotizacion_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=246 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `raw_account_data`
--

DROP TABLE IF EXISTS `raw_account_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `raw_account_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `import_date` date NOT NULL,
  `account_code` varchar(20) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `period_year` int NOT NULL,
  `period_month` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_period` (`company_id`,`account_code`,`period_year`,`period_month`),
  KEY `idx_company_year` (`company_id`,`period_year`)
) ENGINE=InnoDB AUTO_INCREMENT=19953 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `raw_balance_data`
--

DROP TABLE IF EXISTS `raw_balance_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `raw_balance_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `period_year` int NOT NULL,
  `period_month` int DEFAULT NULL,
  `row_index` int NOT NULL,
  `account_code` varchar(50) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `balance` decimal(15,2) DEFAULT NULL,
  `extra` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_raw_balance_data_period_year` (`period_year`),
  KEY `ix_raw_balance_data_company_id` (`company_id`),
  KEY `ix_raw_balance_data_period_month` (`period_month`)
) ENGINE=InnoDB AUTO_INCREMENT=694 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int DEFAULT NULL,
  `permission_id` int DEFAULT NULL,
  `granted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `granted_by` int DEFAULT NULL,
  KEY `role_id` (`role_id`),
  KEY `permission_id` (`permission_id`),
  KEY `granted_by` (`granted_by`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_system_role` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_roles_name` (`name`),
  KEY `ix_roles_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_alerts`
--

DROP TABLE IF EXISTS `sales_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alert_type` enum('descuento_alto','margen_bajo','caida_ventas','cliente_inactivo','producto_lento') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('info','warning','critical') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `dimension_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dimension_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metric_value` decimal(12,2) DEFAULT NULL,
  `threshold_value` decimal(12,2) DEFAULT NULL,
  `status` enum('active','acknowledged','resolved') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `company_id` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`alert_type`),
  KEY `idx_company` (`company_id`),
  KEY `acknowledged_by` (`acknowledged_by`),
  CONSTRAINT `sales_alerts_ibfk_1` FOREIGN KEY (`acknowledged_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_kpis_cache`
--

DROP TABLE IF EXISTS `sales_kpis_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_kpis_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `month` int DEFAULT NULL,
  `dimension_type` enum('global','categoria','cliente','producto','canal','vendedor') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dimension_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venta_bruta` decimal(12,2) DEFAULT '0.00',
  `venta_neta` decimal(12,2) DEFAULT '0.00',
  `descuento` decimal(12,2) DEFAULT '0.00',
  `cantidad_transacciones` int DEFAULT '0',
  `cantidad_unidades` decimal(12,2) DEFAULT '0.00',
  `ticket_promedio` decimal(12,2) DEFAULT '0.00',
  `porcentaje_descuento` decimal(5,2) DEFAULT '0.00',
  `costo_venta` decimal(12,2) DEFAULT '0.00',
  `rentabilidad` decimal(12,2) DEFAULT '0.00',
  `margen_porcentaje` decimal(5,2) DEFAULT '0.00',
  `ratio_costo_venta` decimal(5,2) DEFAULT '0.00',
  `company_id` int DEFAULT '1',
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_kpi` (`year`,`month`,`dimension_type`,`dimension_value`,`company_id`),
  KEY `idx_year_month` (`year`,`month`),
  KEY `idx_dimension` (`dimension_type`,`dimension_value`),
  KEY `idx_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_saved_filters`
--

DROP TABLE IF EXISTS `sales_saved_filters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_saved_filters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `company_id` int DEFAULT '1',
  `filter_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filter_type` enum('comercial','financiero') COLLATE utf8mb4_unicode_ci NOT NULL,
  `filter_config` json NOT NULL,
  `is_favorite` tinyint(1) DEFAULT '0',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`filter_type`),
  KEY `idx_company` (`company_id`),
  CONSTRAINT `sales_saved_filters_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_transactions`
--

DROP TABLE IF EXISTS `sales_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha_emision` date NOT NULL,
  `year` int GENERATED ALWAYS AS (year(`fecha_emision`)) STORED,
  `month` int GENERATED ALWAYS AS (month(`fecha_emision`)) STORED,
  `quarter` int GENERATED ALWAYS AS (quarter(`fecha_emision`)) STORED,
  `categoria_producto` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendedor` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_factura` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `canal_comercial` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `razon_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `producto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_facturada` decimal(12,2) NOT NULL DEFAULT '0.00',
  `factor_conversion` decimal(10,4) DEFAULT '1.0000',
  `m2` decimal(12,2) DEFAULT '0.00',
  `venta_bruta` decimal(12,2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(12,2) NOT NULL DEFAULT '0.00',
  `venta_neta` decimal(12,2) NOT NULL DEFAULT '0.00',
  `costo_venta` decimal(12,2) DEFAULT '0.00',
  `costo_unitario` decimal(12,4) DEFAULT '0.0000',
  `rentabilidad` decimal(12,2) DEFAULT '0.00',
  `company_id` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha_emision`),
  KEY `idx_year_month` (`year`,`month`),
  KEY `idx_categoria` (`categoria_producto`),
  KEY `idx_cliente` (`razon_social`),
  KEY `idx_producto` (`producto`),
  KEY `idx_canal` (`canal_comercial`),
  KEY `idx_vendedor` (`vendedor`),
  KEY `idx_factura` (`numero_factura`),
  KEY `idx_company` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7360 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_configurations`
--

DROP TABLE IF EXISTS `user_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` json DEFAULT NULL,
  `config_type` enum('dashboard','analysis','general','ui') DEFAULT 'general',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_config` (`user_id`,`config_key`),
  CONSTRAINT `user_configurations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `user_permissions_view`
--

DROP TABLE IF EXISTS `user_permissions_view`;
/*!50001 DROP VIEW IF EXISTS `user_permissions_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `user_permissions_view` AS SELECT 
 1 AS `user_id`,
 1 AS `username`,
 1 AS `email`,
 1 AS `resource`,
 1 AS `action`,
 1 AS `description`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` int DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int DEFAULT NULL,
  KEY `user_id` (`user_id`),
  KEY `role_id` (`role_id`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_user_sessions_token_hash` (`token_hash`),
  KEY `user_id` (`user_id`),
  KEY `ix_user_sessions_expires_at` (`expires_at`),
  KEY `ix_user_sessions_id` (`id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `company_id` int DEFAULT '1',
  `is_active` tinyint(1) DEFAULT NULL,
  `is_superuser` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`),
  UNIQUE KEY `ix_users_email` (`email`),
  KEY `ix_users_id` (`id`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_financial_summary`
--

DROP TABLE IF EXISTS `v_financial_summary`;
/*!50001 DROP VIEW IF EXISTS `v_financial_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_financial_summary` AS SELECT 
 1 AS `company_name`,
 1 AS `period_year`,
 1 AS `period_month`,
 1 AS `ingresos`,
 1 AS `costo_ventas`,
 1 AS `utilidad_bruta`,
 1 AS `total_gastos`,
 1 AS `utilidad_operacional`,
 1 AS `utilidad_neta`,
 1 AS `ebitda`,
 1 AS `margen_bruto_pct`,
 1 AS `margen_operacional_pct`,
 1 AS `margen_neto_pct`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_production_summary`
--

DROP TABLE IF EXISTS `v_production_summary`;
/*!50001 DROP VIEW IF EXISTS `v_production_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_production_summary` AS SELECT 
 1 AS `company_name`,
 1 AS `period_year`,
 1 AS `period_month`,
 1 AS `unidades_producidas`,
 1 AS `unidades_vendidas`,
 1 AS `capacidad_instalada`,
 1 AS `utilizacion_capacidad`,
 1 AS `costo_unitario`,
 1 AS `eficiencia_oee`,
 1 AS `empleados_produccion`,
 1 AS `horas_promedio_empleado`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_sales_summary`
--

DROP TABLE IF EXISTS `v_sales_summary`;
/*!50001 DROP VIEW IF EXISTS `v_sales_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_sales_summary` AS SELECT 
 1 AS `year`,
 1 AS `month`,
 1 AS `categoria_producto`,
 1 AS `canal_comercial`,
 1 AS `vendedor`,
 1 AS `num_facturas`,
 1 AS `num_clientes`,
 1 AS `total_unidades`,
 1 AS `total_venta_bruta`,
 1 AS `total_descuento`,
 1 AS `total_venta_neta`,
 1 AS `total_costo_venta`,
 1 AS `total_rentabilidad`,
 1 AS `margen_porcentaje`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'artyco_financial_rbac'
--
/*!50003 DROP PROCEDURE IF EXISTS `check_user_permission` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = latin1 */ ;
/*!50003 SET character_set_results = latin1 */ ;
/*!50003 SET collation_connection  = latin1_swedish_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=CURRENT_USER PROCEDURE `check_user_permission`(
    IN p_user_id INT,
    IN p_resource VARCHAR(100),
    IN p_action VARCHAR(50),
    OUT has_permission BOOLEAN
)
BEGIN
    SELECT COUNT(*) > 0 INTO has_permission
    FROM user_permissions_view
    WHERE user_id = p_user_id 
    AND resource = p_resource 
    AND action = p_action;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `user_permissions_view`
--

/*!50001 DROP VIEW IF EXISTS `user_permissions_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=CURRENT_USER SQL SECURITY DEFINER */
/*!50001 VIEW `user_permissions_view` AS select distinct `u`.`id` AS `user_id`,`u`.`username` AS `username`,`u`.`email` AS `email`,`p`.`resource` AS `resource`,`p`.`action` AS `action`,`p`.`description` AS `description` from (((`users` `u` join `user_roles` `ur` on((`u`.`id` = `ur`.`user_id`))) join `role_permissions` `rp` on((`ur`.`role_id` = `rp`.`role_id`))) join `permissions` `p` on((`rp`.`permission_id` = `p`.`id`))) where (`u`.`is_active` = true) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_financial_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_financial_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=CURRENT_USER SQL SECURITY DEFINER */
/*!50001 VIEW `v_financial_summary` AS select `c`.`name` AS `company_name`,`fd`.`period_year` AS `period_year`,`fd`.`period_month` AS `period_month`,`fd`.`ingresos` AS `ingresos`,`fd`.`costo_ventas` AS `costo_ventas`,`fd`.`utilidad_bruta` AS `utilidad_bruta`,((`fd`.`gastos_administrativos` + `fd`.`gastos_ventas`) + `fd`.`gastos_financieros`) AS `total_gastos`,`fd`.`utilidad_operacional` AS `utilidad_operacional`,`fd`.`utilidad_neta` AS `utilidad_neta`,`fd`.`ebitda` AS `ebitda`,round(((`fd`.`utilidad_bruta` / nullif(`fd`.`ingresos`,0)) * 100),2) AS `margen_bruto_pct`,round(((`fd`.`utilidad_operacional` / nullif(`fd`.`ingresos`,0)) * 100),2) AS `margen_operacional_pct`,round(((`fd`.`utilidad_neta` / nullif(`fd`.`ingresos`,0)) * 100),2) AS `margen_neto_pct` from (`financial_data` `fd` join `companies` `c` on((`fd`.`company_id` = `c`.`id`))) where (`fd`.`data_type` = 'monthly') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_production_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_production_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=CURRENT_USER SQL SECURITY DEFINER */
/*!50001 VIEW `v_production_summary` AS select `c`.`name` AS `company_name`,`pd`.`period_year` AS `period_year`,`pd`.`period_month` AS `period_month`,`pd`.`unidades_producidas` AS `unidades_producidas`,`pd`.`unidades_vendidas` AS `unidades_vendidas`,`pd`.`capacidad_instalada` AS `capacidad_instalada`,`pd`.`utilizacion_capacidad` AS `utilizacion_capacidad`,`pd`.`costo_unitario` AS `costo_unitario`,`pd`.`eficiencia_oee` AS `eficiencia_oee`,`pd`.`empleados_produccion` AS `empleados_produccion`,round((`pd`.`horas_trabajadas` / nullif(`pd`.`empleados_produccion`,0)),2) AS `horas_promedio_empleado` from (`production_data` `pd` join `companies` `c` on((`pd`.`company_id` = `c`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_sales_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_sales_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=CURRENT_USER SQL SECURITY DEFINER */
/*!50001 VIEW `v_sales_summary` AS select `sales_transactions`.`year` AS `year`,`sales_transactions`.`month` AS `month`,`sales_transactions`.`categoria_producto` AS `categoria_producto`,`sales_transactions`.`canal_comercial` AS `canal_comercial`,`sales_transactions`.`vendedor` AS `vendedor`,count(distinct `sales_transactions`.`numero_factura`) AS `num_facturas`,count(distinct `sales_transactions`.`razon_social`) AS `num_clientes`,sum(`sales_transactions`.`cantidad_facturada`) AS `total_unidades`,sum(`sales_transactions`.`venta_bruta`) AS `total_venta_bruta`,sum(`sales_transactions`.`descuento`) AS `total_descuento`,sum(`sales_transactions`.`venta_neta`) AS `total_venta_neta`,sum(`sales_transactions`.`costo_venta`) AS `total_costo_venta`,sum(`sales_transactions`.`rentabilidad`) AS `total_rentabilidad`,(case when (sum(`sales_transactions`.`venta_neta`) > 0) then ((sum(`sales_transactions`.`rentabilidad`) / sum(`sales_transactions`.`venta_neta`)) * 100) else 0 end) AS `margen_porcentaje` from `sales_transactions` where (`sales_transactions`.`company_id` = 1) group by `sales_transactions`.`year`,`sales_transactions`.`month`,`sales_transactions`.`categoria_producto`,`sales_transactions`.`canal_comercial`,`sales_transactions`.`vendedor` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-08 14:43:59
