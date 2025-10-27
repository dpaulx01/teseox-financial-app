-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: artyco_financial_rbac
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
-- Dumping data for table `account_transactions`
--

LOCK TABLES `account_transactions` WRITE;
/*!40000 ALTER TABLE `account_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:10:26'),(2,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:10:30'),(3,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:10:40'),(4,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:11:38'),(5,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:11:49'),(6,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:11:57'),(7,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:16:18'),(8,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:16:23'),(9,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:16:36'),(10,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:16:45'),(11,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 19:18:49'),(12,1,'login_failed',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 20:05:21'),(13,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 20:05:26'),(14,1,'login_failed',NULL,NULL,'{\"username\": \"admin@artyco.com\"}','127.0.0.1','Python-urllib/3.12','2025-10-21 20:43:08'),(15,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1','Python-urllib/3.12','2025-10-21 20:46:22'),(16,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 20:50:53'),(17,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 20:53:04'),(18,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 20:56:43'),(19,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 21:00:58'),(20,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 21:01:05'),(21,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 21:03:00'),(22,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 21:05:34'),(23,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 21:11:02'),(24,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 21:13:54'),(25,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','127.0.0.1',NULL,'2025-10-21 21:16:19'),(26,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 21:16:42'),(27,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 22:13:21'),(28,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 23:21:40'),(29,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 01:38:12'),(30,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 02:03:26'),(31,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','testclient','testclient','2025-10-22 02:21:03'),(32,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','testclient','testclient','2025-10-22 02:23:20'),(33,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','testclient','testclient','2025-10-22 02:23:45'),(34,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','testclient','testclient','2025-10-22 02:48:27'),(35,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 17:58:22'),(36,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','curl/8.5.0','2025-10-22 18:10:44'),(37,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','curl/8.5.0','2025-10-22 18:13:45'),(38,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 18:14:17'),(39,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 18:14:44'),(40,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 18:16:21'),(41,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 18:16:58'),(42,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:15:25'),(43,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:16:30'),(44,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:16:57'),(45,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:17:38'),(46,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:18:04'),(47,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:41:29'),(48,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:42:27'),(49,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 22:43:02'),(50,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 23:17:53'),(51,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 23:18:44'),(52,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 23:19:16'),(53,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','python-requests/2.31.0','2025-10-22 23:19:35'),(54,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-23 00:22:42'),(55,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-23 17:30:46'),(56,1,'login_success',NULL,NULL,'{\"username\": \"admin\"}','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-24 17:03:32');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `breakeven_data`
--

LOCK TABLES `breakeven_data` WRITE;
/*!40000 ALTER TABLE `breakeven_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `breakeven_data` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chart_of_accounts`
--

LOCK TABLES `chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `chart_of_accounts` DISABLE KEYS */;
INSERT INTO `chart_of_accounts` VALUES (1,1,'4100','Ingresos por Ventas','ingreso','operacional',0,0,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(2,1,'4200','Ingresos No Operacionales','ingreso','no_operacional',0,0,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(3,1,'5100','Costo de Ventas','costo','directo',0,1,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(4,1,'5200','Costos de ProducciÃ³n','costo','produccion',0,1,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(5,1,'6100','Gastos Administrativos','gasto','administrativo',1,0,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(6,1,'6200','Gastos de Ventas','gasto','comercial',0,1,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31'),(7,1,'6300','Gastos Financieros','gasto','financiero',1,0,0,NULL,NULL,1,1,'2025-10-21 19:42:31','2025-10-21 19:42:31');
/*!40000 ALTER TABLE `chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'Artyco Financial','Empresa principal para anÃ¡lisis financiero','ConsultorÃ­a Financiera','USD',1,'2025-10-21 19:42:31','2025-10-21 19:42:31');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_cotizacion` varchar(64) NOT NULL,
  `tipo_produccion` enum('CLIENTE','STOCK') NOT NULL,
  `numero_pedido_stock` varchar(50) DEFAULT NULL,
  `cliente` varchar(255) DEFAULT NULL,
  `bodega` varchar(100) DEFAULT NULL,
  `responsable` varchar(100) DEFAULT NULL,
  `contacto` varchar(255) DEFAULT NULL,
  `proyecto` varchar(255) DEFAULT NULL,
  `odc` varchar(128) DEFAULT NULL,
  `valor_total` decimal(12,2) DEFAULT NULL,
  `fecha_ingreso` datetime NOT NULL,
  `fecha_inicio_periodo` date DEFAULT NULL,
  `fecha_fin_periodo` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `nombre_archivo_pdf` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_cotizaciones_numero_cotizacion` (`numero_cotizacion`),
  KEY `ix_cotizaciones_numero_pedido_stock` (`numero_pedido_stock`),
  KEY `ix_cotizaciones_tipo_produccion` (`tipo_produccion`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizaciones`
--

LOCK TABLES `cotizaciones` WRITE;
/*!40000 ALTER TABLE `cotizaciones` DISABLE KEYS */;
INSERT INTO `cotizaciones` VALUES (16,'202510000376','CLIENTE',NULL,'ACABADOS BRIKO SA',NULL,NULL,NULL,NULL,'3-158',111.09,'2025-10-16 00:00:00',NULL,NULL,'2025-10-30','1761241756_Proforma_COT_202510000376.xls','2025-10-23 17:49:16','2025-10-24 17:22:49'),(17,'202509000328','CLIENTE',NULL,'JARAMILLO POZO DIEGO PATRICIO',NULL,NULL,NULL,NULL,NULL,4482.38,'2025-10-20 00:00:00',NULL,NULL,'2025-10-31','1761242168_Proforma_COT_202509000328.xls','2025-10-23 17:56:08','2025-10-24 18:07:17');
/*!40000 ALTER TABLE `cotizaciones` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `dashboard_configs`
--

LOCK TABLES `dashboard_configs` WRITE;
/*!40000 ALTER TABLE `dashboard_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `dashboard_configs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `data_audit_log`
--

LOCK TABLES `data_audit_log` WRITE;
/*!40000 ALTER TABLE `data_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `data_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `file_uploads`
--

LOCK TABLES `file_uploads` WRITE;
/*!40000 ALTER TABLE `file_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_data`
--

DROP TABLE IF EXISTS `financial_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
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
  CONSTRAINT `financial_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `financial_data_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_data`
--

LOCK TABLES `financial_data` WRITE;
/*!40000 ALTER TABLE `financial_data` DISABLE KEYS */;
INSERT INTO `financial_data` VALUES (81,1,'monthly',2025,1,1,8341.12,0.00,0.00,9395.19,0.00,0.00,0.00,1877.38,0.00,-1054.07,0.00,-2931.45,-2931.45,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35'),(82,1,'monthly',2025,2,1,4175.78,0.00,0.00,7156.45,0.00,0.00,0.00,5132.13,0.00,-2980.67,0.00,-8112.80,-8112.80,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35'),(83,1,'monthly',2025,3,1,24761.14,0.00,0.00,10428.93,0.00,0.00,0.00,2743.97,0.00,14332.21,0.00,11588.24,11588.24,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35'),(84,1,'monthly',2025,4,2,14274.80,0.00,0.00,10081.41,0.00,0.00,0.00,3585.20,0.00,4193.39,0.00,608.19,608.19,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35'),(85,1,'monthly',2025,5,2,12399.10,0.00,0.00,8446.69,0.00,0.00,0.00,5807.07,0.00,3952.41,0.00,-1854.66,-1854.66,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35'),(86,1,'monthly',2025,6,2,32190.48,0.00,0.00,12746.57,0.00,0.00,0.00,8895.00,0.00,19443.91,0.00,10548.91,10548.91,'manual',NULL,'2025-10-21 21:05:35','2025-10-21 21:05:35');
/*!40000 ALTER TABLE `financial_data` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_scenarios`
--

LOCK TABLES `financial_scenarios` WRITE;
/*!40000 ALTER TABLE `financial_scenarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_scenarios` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos`
--

LOCK TABLES `pagos` WRITE;
/*!40000 ALTER TABLE `pagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resource` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission` (`resource`,`action`),
  KEY `idx_resource` (`resource`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'financial_data','read','View financial data and reports','2025-10-21 19:08:33'),(2,'financial_data','write','Create and modify financial data','2025-10-21 19:08:33'),(3,'financial_data','delete','Delete financial data','2025-10-21 19:08:33'),(4,'financial_data','export','Export financial data','2025-10-21 19:08:33'),(5,'pyg_analysis','read','View PyG analysis','2025-10-21 19:08:33'),(6,'pyg_analysis','execute','Execute PyG analysis','2025-10-21 19:08:33'),(7,'pyg_analysis','configure','Configure PyG analysis parameters','2025-10-21 19:08:33'),(8,'brain_system','query','Query the AI Brain system','2025-10-21 19:08:33'),(9,'brain_system','train','Train the AI Brain system','2025-10-21 19:08:33'),(10,'brain_system','configure','Configure Brain system settings','2025-10-21 19:08:33'),(11,'portfolio','read','View portfolio data','2025-10-21 19:08:33'),(12,'portfolio','analyze','Analyze portfolio performance','2025-10-21 19:08:33'),(13,'portfolio','manage','Manage portfolio investments','2025-10-21 19:08:33'),(14,'risk_analysis','read','View risk analysis','2025-10-21 19:08:33'),(15,'risk_analysis','execute','Execute risk calculations','2025-10-21 19:08:33'),(16,'transactions','read','View transactions','2025-10-21 19:08:33'),(17,'transactions','analyze','Analyze transaction patterns','2025-10-21 19:08:33'),(18,'users','read','View user accounts','2025-10-21 19:08:33'),(19,'users','write','Create and modify user accounts','2025-10-21 19:08:33'),(20,'users','delete','Delete user accounts','2025-10-21 19:08:33'),(21,'roles','read','View roles and permissions','2025-10-21 19:08:33'),(22,'roles','write','Create and modify roles','2025-10-21 19:08:33'),(23,'roles','assign','Assign roles to users','2025-10-21 19:08:33'),(24,'system','admin','Full system administration','2025-10-21 19:08:33'),(25,'system','audit','View audit logs','2025-10-21 19:08:33'),(26,'production','read','Ver datos de producciÃ³n y dashboard','2025-10-24 20:44:44'),(27,'production','write','Crear y modificar Ã³rdenes de producciÃ³n','2025-10-24 20:44:44'),(28,'production','delete','Eliminar cotizaciones de producciÃ³n','2025-10-24 20:44:44'),(29,'production','plan','Gestionar planes diarios de producciÃ³n','2025-10-24 20:44:44'),(30,'production','export','Exportar reportes de producciÃ³n a PDF','2025-10-24 20:44:44'),(31,'production','upload','Subir cotizaciones y pedidos de stock','2025-10-24 20:44:44'),(32,'settings','read','Ver configuraciÃ³n del sistema','2025-10-24 20:44:44'),(33,'settings','write','Modificar configuraciÃ³n del sistema','2025-10-24 20:44:44');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
  `cantidad_sugerida` decimal(12,2) DEFAULT NULL,
  `notas` text,
  `is_manually_edited` tinyint(1) NOT NULL,
  `completado` tinyint(1) NOT NULL,
  `fecha_completado` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plan_diario_producto_fecha` (`producto_id`,`fecha`),
  KEY `ix_plan_diario_produccion_producto_id` (`producto_id`),
  CONSTRAINT `plan_diario_produccion_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_diario_produccion`
--

LOCK TABLES `plan_diario_produccion` WRITE;
/*!40000 ALTER TABLE `plan_diario_produccion` DISABLE KEYS */;
/*!40000 ALTER TABLE `plan_diario_produccion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_data`
--

DROP TABLE IF EXISTS `production_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `year` int DEFAULT NULL COMMENT 'Alias opcional para period_year',
  `month` int DEFAULT NULL COMMENT 'Alias opcional para period_month',
  `period_year` int NOT NULL,
  `period_month` int NOT NULL,
  `metros_producidos` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Metros producidos en el periodo',
  `metros_vendidos` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Metros vendidos en el periodo',
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
  CONSTRAINT `production_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `production_data_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_data`
--

LOCK TABLES `production_data` WRITE;
/*!40000 ALTER TABLE `production_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_data` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (96,16,'Listones Apparente 10 X 50','5.6 m2',105.80,'2025-10-30','EN_PRODUCCION',NULL,'900','2025-10-23 17:49:16','2025-10-24 17:22:49'),(97,16,'ODC 3-158 SHERLY MATERIAL EN STOCK',NULL,NULL,NULL,'EN_COLA',NULL,NULL,'2025-10-23 17:49:16','2025-10-23 17:49:16'),(98,17,'Galeras Gris Piedra Multiformato','54 m2',1075.84,'2025-11-05','EN_PRODUCCION',NULL,'899','2025-10-23 17:56:08','2025-10-24 17:22:39'),(99,17,'Esquinero Galera Gris Multiformato','22 Unid.',491.20,'2025-11-05','EN_PRODUCCION',NULL,'899','2025-10-23 17:56:08','2025-10-24 17:22:40'),(100,17,'Galeras Blanco Arenado Piedra Multiformato','55 m2',1228.01,'2025-11-07','EN_PRODUCCION',NULL,'899','2025-10-23 17:56:08','2025-10-24 17:22:40'),(101,17,'Esquinero Piedra Galeras Blanco Arenado','5 Unid.',111.64,'2025-10-28','EN_PRODUCCION',NULL,'899','2025-10-23 17:56:08','2025-10-24 17:22:39'),(102,17,'Longbrick Ladrillo Ladrillo 4 X 60','18 m2',401.90,'2025-10-31','EN_PRODUCCION',NULL,'899','2025-10-23 17:56:08','2025-10-24 17:22:39'),(103,17,'Pizarra Ladrillo Rombo 17 x 17 (30 Altura)','38 m2',960.34,'2025-10-24','ENTREGADO',NULL,'899','2025-10-23 17:56:08','2025-10-24 18:07:17'),(104,17,'Galeras Gris Piedra Multiformato','20 m2',0.00,'2025-10-24','LISTO_PARA_RETIRO',NULL,'899','2025-10-23 17:56:08','2025-10-24 18:07:12'),(105,17,'*Servicio Logistico','3 Unid.',0.00,NULL,'EN_COLA',NULL,NULL,'2025-10-23 17:56:08','2025-10-23 17:56:08'),(106,17,'PROGRAMACION DESPACHOS: GALERAS 50% OCTUBRE 20 | GALERAS 50% OCTUBRE 30 || LONGBRICK 100% OCTUBRE 30 || PISO PIZARRA 100% OCTUBRE 7 (40 PIEZAS x M2: COLOR VERDE 216 PIEZAS - COLOR LADRILLO 1224 PIEZAS) || REFERENCIA TRANSPORTE: CUMBAYA',NULL,NULL,NULL,'EN_COLA',NULL,NULL,'2025-10-23 17:56:08','2025-10-23 17:56:08');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=4580 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `raw_account_data`
--

LOCK TABLES `raw_account_data` WRITE;
/*!40000 ALTER TABLE `raw_account_data` DISABLE KEYS */;
INSERT INTO `raw_account_data` VALUES (4199,1,'2025-10-21','4','Ingresos',2025,1,8341.12,'2025-10-21 21:05:34'),(4200,1,'2025-10-21','4','Ingresos',2025,2,4175.78,'2025-10-21 21:05:34'),(4201,1,'2025-10-21','4','Ingresos',2025,3,24761.14,'2025-10-21 21:05:34'),(4202,1,'2025-10-21','4','Ingresos',2025,4,14274.80,'2025-10-21 21:05:34'),(4203,1,'2025-10-21','4','Ingresos',2025,5,12399.10,'2025-10-21 21:05:34'),(4204,1,'2025-10-21','4','Ingresos',2025,6,32190.48,'2025-10-21 21:05:34'),(4205,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,1,7951.08,'2025-10-21 21:05:34'),(4206,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,2,4165.74,'2025-10-21 21:05:34'),(4207,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,3,24493.49,'2025-10-21 21:05:34'),(4208,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,4,14164.80,'2025-10-21 21:05:34'),(4209,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,5,11821.46,'2025-10-21 21:05:34'),(4210,1,'2025-10-21','4.1','Ingresos de Actividades Ordinarias',2025,6,30246.66,'2025-10-21 21:05:34'),(4211,1,'2025-10-21','4.1.1','Venta de Bienes',2025,1,11923.00,'2025-10-21 21:05:34'),(4212,1,'2025-10-21','4.1.1','Venta de Bienes',2025,2,6959.15,'2025-10-21 21:05:34'),(4213,1,'2025-10-21','4.1.1','Venta de Bienes',2025,3,34334.58,'2025-10-21 21:05:34'),(4214,1,'2025-10-21','4.1.1','Venta de Bienes',2025,4,21965.39,'2025-10-21 21:05:34'),(4215,1,'2025-10-21','4.1.1','Venta de Bienes',2025,5,18390.66,'2025-10-21 21:05:34'),(4216,1,'2025-10-21','4.1.1','Venta de Bienes',2025,6,46343.23,'2025-10-21 21:05:34'),(4217,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,1,11923.00,'2025-10-21 21:05:34'),(4218,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,2,6959.15,'2025-10-21 21:05:34'),(4219,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,3,33318.78,'2025-10-21 21:05:34'),(4220,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,4,21909.39,'2025-10-21 21:05:34'),(4221,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,5,17945.66,'2025-10-21 21:05:34'),(4222,1,'2025-10-21','4.1.1.1','Venta de Producto Terminado',2025,6,45246.83,'2025-10-21 21:05:34'),(4223,1,'2025-10-21','4.1.1.2','Venta de Mercaderia',2025,3,1015.80,'2025-10-21 21:05:34'),(4224,1,'2025-10-21','4.1.1.2','Venta de Mercaderia',2025,4,56.00,'2025-10-21 21:05:34'),(4225,1,'2025-10-21','4.1.1.2','Venta de Mercaderia',2025,5,445.00,'2025-10-21 21:05:34'),(4226,1,'2025-10-21','4.1.1.2','Venta de Mercaderia',2025,6,1096.40,'2025-10-21 21:05:34'),(4227,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,1,-3971.92,'2025-10-21 21:05:34'),(4228,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,2,-2793.41,'2025-10-21 21:05:34'),(4229,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,3,-9841.09,'2025-10-21 21:05:34'),(4230,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,4,-7800.59,'2025-10-21 21:05:34'),(4231,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,5,-6569.20,'2025-10-21 21:05:34'),(4232,1,'2025-10-21','4.1.4','Rebaja y/o Descuentos sobre Ventas',2025,6,-16096.57,'2025-10-21 21:05:34'),(4233,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,1,390.00,'2025-10-21 21:05:34'),(4234,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,2,10.00,'2025-10-21 21:05:34'),(4235,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,3,267.64,'2025-10-21 21:05:34'),(4236,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,4,110.00,'2025-10-21 21:05:34'),(4237,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,5,577.64,'2025-10-21 21:05:34'),(4238,1,'2025-10-21','4.2','Otros Ingresos de Actividades Ordinarias',2025,6,1943.82,'2025-10-21 21:05:34'),(4239,1,'2025-10-21','4.2.1','Servicio Logistico',2025,1,390.00,'2025-10-21 21:05:34'),(4240,1,'2025-10-21','4.2.1','Servicio Logistico',2025,2,10.00,'2025-10-21 21:05:34'),(4241,1,'2025-10-21','4.2.1','Servicio Logistico',2025,3,200.00,'2025-10-21 21:05:34'),(4242,1,'2025-10-21','4.2.1','Servicio Logistico',2025,4,110.00,'2025-10-21 21:05:34'),(4243,1,'2025-10-21','4.2.1','Servicio Logistico',2025,5,510.00,'2025-10-21 21:05:34'),(4244,1,'2025-10-21','4.2.1','Servicio Logistico',2025,6,1910.00,'2025-10-21 21:05:34'),(4245,1,'2025-10-21','4.2.7','Descuentos en Compras',2025,3,67.64,'2025-10-21 21:05:34'),(4246,1,'2025-10-21','4.2.7','Descuentos en Compras',2025,5,67.64,'2025-10-21 21:05:34'),(4247,1,'2025-10-21','4.2.7','Descuentos en Compras',2025,6,33.82,'2025-10-21 21:05:34'),(4248,1,'2025-10-21','4.3','Otros Ingresos Financieros',2025,1,0.04,'2025-10-21 21:05:34'),(4249,1,'2025-10-21','4.3','Otros Ingresos Financieros',2025,2,0.04,'2025-10-21 21:05:34'),(4250,1,'2025-10-21','4.3','Otros Ingresos Financieros',2025,3,0.01,'2025-10-21 21:05:34'),(4251,1,'2025-10-21','4.3.2','Intereses Financieros',2025,1,0.04,'2025-10-21 21:05:34'),(4252,1,'2025-10-21','4.3.2','Intereses Financieros',2025,2,0.04,'2025-10-21 21:05:34'),(4253,1,'2025-10-21','4.3.2','Intereses Financieros',2025,3,0.01,'2025-10-21 21:05:34'),(4254,1,'2025-10-21','5','Costos y Gastos',2025,1,11272.57,'2025-10-21 21:05:34'),(4255,1,'2025-10-21','5','Costos y Gastos',2025,2,12288.58,'2025-10-21 21:05:34'),(4256,1,'2025-10-21','5','Costos y Gastos',2025,3,13172.90,'2025-10-21 21:05:34'),(4257,1,'2025-10-21','5','Costos y Gastos',2025,4,13666.61,'2025-10-21 21:05:34'),(4258,1,'2025-10-21','5','Costos y Gastos',2025,5,14253.76,'2025-10-21 21:05:34'),(4259,1,'2025-10-21','5','Costos y Gastos',2025,6,21641.57,'2025-10-21 21:05:34'),(4260,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,1,9395.19,'2025-10-21 21:05:34'),(4261,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,2,7156.45,'2025-10-21 21:05:34'),(4262,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,3,10428.93,'2025-10-21 21:05:34'),(4263,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,4,10081.41,'2025-10-21 21:05:34'),(4264,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,5,8446.69,'2025-10-21 21:05:34'),(4265,1,'2025-10-21','5.1','Costos de Venta y Producción',2025,6,12746.57,'2025-10-21 21:05:34'),(4266,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,1,1406.82,'2025-10-21 21:05:34'),(4267,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,2,894.95,'2025-10-21 21:05:34'),(4268,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,3,3953.83,'2025-10-21 21:05:34'),(4269,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,4,3012.30,'2025-10-21 21:05:34'),(4270,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,5,2808.87,'2025-10-21 21:05:34'),(4271,1,'2025-10-21','5.1.1','Materiales Utilizados o Productos Vendidos',2025,6,5398.52,'2025-10-21 21:05:34'),(4272,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,1,1320.92,'2025-10-21 21:05:34'),(4273,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,2,733.97,'2025-10-21 21:05:34'),(4274,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,3,3584.40,'2025-10-21 21:05:34'),(4275,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,4,2791.68,'2025-10-21 21:05:34'),(4276,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,5,2187.71,'2025-10-21 21:05:34'),(4277,1,'2025-10-21','5.1.1.6','Productos Terminados C',2025,6,5108.45,'2025-10-21 21:05:34'),(4278,1,'2025-10-21','5.1.1.7','Costo Mercadería',2025,3,280.35,'2025-10-21 21:05:34'),(4279,1,'2025-10-21','5.1.1.7','Costo Mercadería',2025,4,16.02,'2025-10-21 21:05:34'),(4280,1,'2025-10-21','5.1.1.7','Costo Mercadería',2025,5,491.73,'2025-10-21 21:05:34'),(4281,1,'2025-10-21','5.1.1.7','Costo Mercadería',2025,6,184.42,'2025-10-21 21:05:34'),(4282,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,1,85.90,'2025-10-21 21:05:34'),(4283,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,2,160.98,'2025-10-21 21:05:34'),(4284,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,3,89.08,'2025-10-21 21:05:34'),(4285,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,4,204.60,'2025-10-21 21:05:34'),(4286,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,5,129.43,'2025-10-21 21:05:34'),(4287,1,'2025-10-21','5.1.1.8','Desperdicios, Mermas, Desecho',2025,6,105.65,'2025-10-21 21:05:34'),(4288,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,1,3378.67,'2025-10-21 21:05:34'),(4289,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,2,3893.06,'2025-10-21 21:05:34'),(4290,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,3,3893.06,'2025-10-21 21:05:34'),(4291,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,4,3989.29,'2025-10-21 21:05:34'),(4292,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,5,3869.29,'2025-10-21 21:05:34'),(4293,1,'2025-10-21','5.1.2','Mano de Obra Directa',2025,6,3520.33,'2025-10-21 21:05:34'),(4294,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,1,2117.55,'2025-10-21 21:05:34'),(4295,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,2,2780.28,'2025-10-21 21:05:34'),(4296,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,3,2780.28,'2025-10-21 21:05:34'),(4297,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,4,2783.33,'2025-10-21 21:05:34'),(4298,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,5,2750.00,'2025-10-21 21:05:34'),(4299,1,'2025-10-21','5.1.2.1','Sueldos Mano de Obra Directa',2025,6,2516.67,'2025-10-21 21:05:34'),(4300,1,'2025-10-21','5.1.2.2','Sobretiempos Mano de Obra Directa',2025,4,16.67,'2025-10-21 21:05:34'),(4301,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,1,261.93,'2025-10-21 21:05:34'),(4302,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,2,231.70,'2025-10-21 21:05:34'),(4303,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,3,231.70,'2025-10-21 21:05:34'),(4304,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,4,233.35,'2025-10-21 21:05:34'),(4305,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,5,233.35,'2025-10-21 21:05:34'),(4306,1,'2025-10-21','5.1.2.3','Décimo Tercer Sueldo Mano de Obra Directa',2025,6,209.74,'2025-10-21 21:05:34'),(4307,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,1,224.57,'2025-10-21 21:05:34'),(4308,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,2,195.85,'2025-10-21 21:05:34'),(4309,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,3,195.85,'2025-10-21 21:05:34'),(4310,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,4,195.85,'2025-10-21 21:05:34'),(4311,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,5,195.85,'2025-10-21 21:05:34'),(4312,1,'2025-10-21','5.1.2.4','Decimo Cuarto Sueldo Mano de Obra Directa',2025,6,173.65,'2025-10-21 21:05:34'),(4313,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,1,130.94,'2025-10-21 21:05:34'),(4314,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,2,115.83,'2025-10-21 21:05:34'),(4315,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,3,115.83,'2025-10-21 21:05:34'),(4316,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,4,116.65,'2025-10-21 21:05:34'),(4317,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,5,116.65,'2025-10-21 21:05:34'),(4318,1,'2025-10-21','5.1.2.5','Vacaciones Mano de Obra Directa',2025,6,104.85,'2025-10-21 21:05:34'),(4319,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,1,350.44,'2025-10-21 21:05:34'),(4320,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,2,310.00,'2025-10-21 21:05:34'),(4321,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,3,310.00,'2025-10-21 21:05:34'),(4322,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,4,312.20,'2025-10-21 21:05:34'),(4323,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,5,312.20,'2025-10-21 21:05:34'),(4324,1,'2025-10-21','5.1.2.6','Aportes Patronales al I.E.S.S. Mano de Obra Directa',2025,6,280.61,'2025-10-21 21:05:34'),(4325,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,1,31.43,'2025-10-21 21:05:34'),(4326,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,2,27.80,'2025-10-21 21:05:34'),(4327,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,3,27.80,'2025-10-21 21:05:34'),(4328,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,4,28.00,'2025-10-21 21:05:34'),(4329,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,5,28.00,'2025-10-21 21:05:34'),(4330,1,'2025-10-21','5.1.2.7','Secap - Iece Mano de Obra Directa',2025,6,25.17,'2025-10-21 21:05:34'),(4331,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,1,261.81,'2025-10-21 21:05:34'),(4332,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,2,231.60,'2025-10-21 21:05:34'),(4333,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,3,231.60,'2025-10-21 21:05:34'),(4334,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,4,233.24,'2025-10-21 21:05:34'),(4335,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,5,233.24,'2025-10-21 21:05:34'),(4336,1,'2025-10-21','5.1.2.8','Fondos de Reserva Mano de Obra Directa',2025,6,209.64,'2025-10-21 21:05:34'),(4337,1,'2025-10-21','5.1.2.11','Bonificaciones Mano de Obra Directa',2025,4,70.00,'2025-10-21 21:05:34'),(4338,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,1,4609.70,'2025-10-21 21:05:34'),(4339,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,2,2368.44,'2025-10-21 21:05:34'),(4340,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,3,2582.04,'2025-10-21 21:05:34'),(4341,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,4,3079.82,'2025-10-21 21:05:34'),(4342,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,5,1768.53,'2025-10-21 21:05:34'),(4343,1,'2025-10-21','5.1.4','Costos Indirectos de Fabricación',2025,6,3827.72,'2025-10-21 21:05:34'),(4344,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,1,1029.25,'2025-10-21 21:05:34'),(4345,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,2,1029.25,'2025-10-21 21:05:34'),(4346,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,3,1029.25,'2025-10-21 21:05:34'),(4347,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,4,1029.25,'2025-10-21 21:05:34'),(4348,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,5,1029.25,'2025-10-21 21:05:34'),(4349,1,'2025-10-21','5.1.4.1','Depreciación Propiedades, Plantas y Equipos',2025,6,1030.09,'2025-10-21 21:05:34'),(4350,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,1,22.32,'2025-10-21 21:05:34'),(4351,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,2,83.50,'2025-10-21 21:05:34'),(4352,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,3,160.85,'2025-10-21 21:05:34'),(4353,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,4,150.89,'2025-10-21 21:05:34'),(4354,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,5,25.00,'2025-10-21 21:05:34'),(4355,1,'2025-10-21','5.1.4.7','Suministros, Materiales y Repuestos Costos',2025,6,275.12,'2025-10-21 21:05:34'),(4356,1,'2025-10-21','5.1.4.8','Herramientas Menores',2025,4,8.50,'2025-10-21 21:05:34'),(4357,1,'2025-10-21','5.1.4.8','Herramientas Menores',2025,5,23.11,'2025-10-21 21:05:34'),(4358,1,'2025-10-21','5.1.4.8','Herramientas Menores',2025,6,129.51,'2025-10-21 21:05:34'),(4359,1,'2025-10-21','5.1.4.9','Mantenimiento Moldes',2025,5,11.55,'2025-10-21 21:05:34'),(4360,1,'2025-10-21','5.1.4.9','Mantenimiento Moldes',2025,6,512.29,'2025-10-21 21:05:34'),(4361,1,'2025-10-21','5.1.4.10','Equipos y Materiales de Seguridad',2025,2,26.00,'2025-10-21 21:05:34'),(4362,1,'2025-10-21','5.1.4.10','Equipos y Materiales de Seguridad',2025,4,93.51,'2025-10-21 21:05:34'),(4363,1,'2025-10-21','5.1.4.10','Equipos y Materiales de Seguridad',2025,6,249.32,'2025-10-21 21:05:34'),(4364,1,'2025-10-21','5.1.4.11','Pallets',2025,3,162.50,'2025-10-21 21:05:34'),(4365,1,'2025-10-21','5.1.4.11','Pallets',2025,4,570.00,'2025-10-21 21:05:34'),(4366,1,'2025-10-21','5.1.4.11','Pallets',2025,6,169.00,'2025-10-21 21:05:34'),(4367,1,'2025-10-21','5.1.4.12','Empaque y Embalaje',2025,3,282.01,'2025-10-21 21:05:34'),(4368,1,'2025-10-21','5.1.4.12','Empaque y Embalaje',2025,4,248.83,'2025-10-21 21:05:34'),(4369,1,'2025-10-21','5.1.4.12','Empaque y Embalaje',2025,6,272.27,'2025-10-21 21:05:34'),(4370,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,1,21.93,'2025-10-21 21:05:34'),(4371,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,2,373.94,'2025-10-21 21:05:34'),(4372,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,3,242.05,'2025-10-21 21:05:34'),(4373,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,4,200.69,'2025-10-21 21:05:34'),(4374,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,5,302.98,'2025-10-21 21:05:34'),(4375,1,'2025-10-21','5.1.4.13','Energía Eléctrica Planta',2025,6,287.93,'2025-10-21 21:05:34'),(4376,1,'2025-10-21','5.1.4.14','Mejoras En Nueva Planta',2025,6,180.00,'2025-10-21 21:05:34'),(4377,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,1,738.99,'2025-10-21 21:05:34'),(4378,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,2,498.11,'2025-10-21 21:05:34'),(4379,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,3,256.00,'2025-10-21 21:05:34'),(4380,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,4,420.51,'2025-10-21 21:05:34'),(4381,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,5,19.00,'2025-10-21 21:05:34'),(4382,1,'2025-10-21','5.1.4.15','Fletes y Transporte Producción',2025,6,156.85,'2025-10-21 21:05:34'),(4383,1,'2025-10-21','5.1.4.16','Arriendo Planta',2025,1,2347.83,'2025-10-21 21:05:34'),(4384,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,1,100.87,'2025-10-21 21:05:34'),(4385,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,2,9.13,'2025-10-21 21:05:34'),(4386,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,3,100.87,'2025-10-21 21:05:34'),(4387,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,4,9.13,'2025-10-21 21:05:34'),(4388,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,5,9.13,'2025-10-21 21:05:34'),(4389,1,'2025-10-21','5.1.4.17','Combustibles Planta',2025,6,100.87,'2025-10-21 21:05:34'),(4390,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,1,348.51,'2025-10-21 21:05:34'),(4391,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,2,348.51,'2025-10-21 21:05:34'),(4392,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,3,348.51,'2025-10-21 21:05:34'),(4393,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,4,348.51,'2025-10-21 21:05:34'),(4394,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,5,348.51,'2025-10-21 21:05:34'),(4395,1,'2025-10-21','5.1.4.18','Amortización Adecuaciones y mejoras en bienes arrendados',2025,6,348.51,'2025-10-21 21:05:34'),(4396,1,'2025-10-21','5.1.4.19','Terminados y Acabados',2025,6,115.96,'2025-10-21 21:05:34'),(4397,1,'2025-10-21','5.2','Gastos',2025,1,1877.38,'2025-10-21 21:05:34'),(4398,1,'2025-10-21','5.2','Gastos',2025,2,5132.13,'2025-10-21 21:05:34'),(4399,1,'2025-10-21','5.2','Gastos',2025,3,2743.97,'2025-10-21 21:05:34'),(4400,1,'2025-10-21','5.2','Gastos',2025,4,3585.20,'2025-10-21 21:05:34'),(4401,1,'2025-10-21','5.2','Gastos',2025,5,5807.07,'2025-10-21 21:05:34'),(4402,1,'2025-10-21','5.2','Gastos',2025,6,8895.00,'2025-10-21 21:05:34'),(4403,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,1,1630.50,'2025-10-21 21:05:34'),(4404,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,2,4786.52,'2025-10-21 21:05:34'),(4405,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,3,2196.28,'2025-10-21 21:05:34'),(4406,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,4,3380.42,'2025-10-21 21:05:34'),(4407,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,5,5540.95,'2025-10-21 21:05:34'),(4408,1,'2025-10-21','5.2.1','Gastos de Actividades Ordinarias',2025,6,8082.77,'2025-10-21 21:05:34'),(4409,1,'2025-10-21','5.2.1.1','Ventas',2025,1,363.25,'2025-10-21 21:05:34'),(4410,1,'2025-10-21','5.2.1.1','Ventas',2025,2,955.44,'2025-10-21 21:05:34'),(4411,1,'2025-10-21','5.2.1.1','Ventas',2025,3,514.34,'2025-10-21 21:05:34'),(4412,1,'2025-10-21','5.2.1.1','Ventas',2025,4,1807.37,'2025-10-21 21:05:34'),(4413,1,'2025-10-21','5.2.1.1','Ventas',2025,5,784.74,'2025-10-21 21:05:34'),(4414,1,'2025-10-21','5.2.1.1','Ventas',2025,6,1075.75,'2025-10-21 21:05:34'),(4415,1,'2025-10-21','5.2.1.1.18','Reparaciones, adecuaciones a clientes',2025,2,27.28,'2025-10-21 21:05:34'),(4416,1,'2025-10-21','5.2.1.1.18','Reparaciones, adecuaciones a clientes',2025,4,86.32,'2025-10-21 21:05:34'),(4417,1,'2025-10-21','5.2.1.1.18','Reparaciones, adecuaciones a clientes',2025,6,20.70,'2025-10-21 21:05:34'),(4418,1,'2025-10-21','5.2.1.1.21','Publicidad y Promoción Vtas.',2025,1,242.00,'2025-10-21 21:05:34'),(4419,1,'2025-10-21','5.2.1.1.21','Publicidad y Promoción Vtas.',2025,4,45.00,'2025-10-21 21:05:34'),(4420,1,'2025-10-21','5.2.1.1.21','Publicidad y Promoción Vtas.',2025,5,27.75,'2025-10-21 21:05:34'),(4421,1,'2025-10-21','5.2.1.1.21','Publicidad y Promoción Vtas.',2025,6,31.00,'2025-10-21 21:05:34'),(4422,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,1,17.00,'2025-10-21 21:05:34'),(4423,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,2,730.00,'2025-10-21 21:05:34'),(4424,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,3,471.25,'2025-10-21 21:05:34'),(4425,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,4,1589.82,'2025-10-21 21:05:34'),(4426,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,5,686.19,'2025-10-21 21:05:34'),(4427,1,'2025-10-21','5.2.1.1.28','Fletes Vtas.',2025,6,984.31,'2025-10-21 21:05:34'),(4428,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,1,35.23,'2025-10-21 21:05:34'),(4429,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,2,51.98,'2025-10-21 21:05:34'),(4430,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,3,43.09,'2025-10-21 21:05:34'),(4431,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,4,58.90,'2025-10-21 21:05:34'),(4432,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,5,44.01,'2025-10-21 21:05:34'),(4433,1,'2025-10-21','5.2.1.1.33','Energía Eléctrica Vtas.',2025,6,39.74,'2025-10-21 21:05:34'),(4434,1,'2025-10-21','5.2.1.1.36','Internet Vtas.',2025,1,69.02,'2025-10-21 21:05:34'),(4435,1,'2025-10-21','5.2.1.1.36','Internet Vtas.',2025,2,146.18,'2025-10-21 21:05:34'),(4436,1,'2025-10-21','5.2.1.1.36','Internet Vtas.',2025,4,27.33,'2025-10-21 21:05:34'),(4437,1,'2025-10-21','5.2.1.1.36','Internet Vtas.',2025,5,26.79,'2025-10-21 21:05:34'),(4438,1,'2025-10-21','5.2.1.2','Administrativos',2025,1,1267.25,'2025-10-21 21:05:34'),(4439,1,'2025-10-21','5.2.1.2','Administrativos',2025,2,3831.08,'2025-10-21 21:05:34'),(4440,1,'2025-10-21','5.2.1.2','Administrativos',2025,3,1459.18,'2025-10-21 21:05:34'),(4441,1,'2025-10-21','5.2.1.2','Administrativos',2025,4,1573.05,'2025-10-21 21:05:34'),(4442,1,'2025-10-21','5.2.1.2','Administrativos',2025,5,4756.21,'2025-10-21 21:05:34'),(4443,1,'2025-10-21','5.2.1.2','Administrativos',2025,6,5396.31,'2025-10-21 21:05:34'),(4444,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,1,493.07,'2025-10-21 21:05:34'),(4445,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,2,765.61,'2025-10-21 21:05:34'),(4446,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,3,748.28,'2025-10-21 21:05:34'),(4447,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,4,765.61,'2025-10-21 21:05:34'),(4448,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,5,765.61,'2025-10-21 21:05:34'),(4449,1,'2025-10-21','5.2.1.2.1','Sueldos Unificados Adm.',2025,6,765.61,'2025-10-21 21:05:34'),(4450,1,'2025-10-21','5.2.1.2.4','Alimentación Adm.',2025,2,10.34,'2025-10-21 21:05:34'),(4451,1,'2025-10-21','5.2.1.2.4','Alimentación Adm.',2025,4,59.60,'2025-10-21 21:05:34'),(4452,1,'2025-10-21','5.2.1.2.4','Alimentación Adm.',2025,5,0.51,'2025-10-21 21:05:34'),(4453,1,'2025-10-21','5.2.1.2.4','Alimentación Adm.',2025,6,58.42,'2025-10-21 21:05:34'),(4454,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,1,85.37,'2025-10-21 21:05:34'),(4455,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,2,85.37,'2025-10-21 21:05:34'),(4456,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,3,85.37,'2025-10-21 21:05:34'),(4457,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,4,85.37,'2025-10-21 21:05:34'),(4458,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,5,85.37,'2025-10-21 21:05:34'),(4459,1,'2025-10-21','5.2.1.2.5','Aportes Patronales al IESS Adm.',2025,6,85.37,'2025-10-21 21:05:34'),(4460,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,1,7.66,'2025-10-21 21:05:34'),(4461,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,2,7.66,'2025-10-21 21:05:34'),(4462,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,3,7.66,'2025-10-21 21:05:34'),(4463,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,4,7.66,'2025-10-21 21:05:34'),(4464,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,5,7.66,'2025-10-21 21:05:34'),(4465,1,'2025-10-21','5.2.1.2.6','Secap - Iece Adm.',2025,6,7.66,'2025-10-21 21:05:34'),(4466,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,1,21.66,'2025-10-21 21:05:34'),(4467,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,2,43.32,'2025-10-21 21:05:34'),(4468,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,3,43.32,'2025-10-21 21:05:34'),(4469,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,4,43.32,'2025-10-21 21:05:34'),(4470,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,5,43.32,'2025-10-21 21:05:34'),(4471,1,'2025-10-21','5.2.1.2.7','Fondos de Reserva Adm.',2025,6,43.32,'2025-10-21 21:05:34'),(4472,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,1,63.80,'2025-10-21 21:05:34'),(4473,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,2,63.80,'2025-10-21 21:05:34'),(4474,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,3,63.80,'2025-10-21 21:05:34'),(4475,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,4,63.80,'2025-10-21 21:05:34'),(4476,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,5,63.80,'2025-10-21 21:05:34'),(4477,1,'2025-10-21','5.2.1.2.8','Décimo Tercer Sueldo Adm.',2025,6,63.80,'2025-10-21 21:05:34'),(4478,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,1,58.75,'2025-10-21 21:05:34'),(4479,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,2,58.75,'2025-10-21 21:05:34'),(4480,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,3,58.75,'2025-10-21 21:05:34'),(4481,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,4,58.75,'2025-10-21 21:05:34'),(4482,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,5,58.75,'2025-10-21 21:05:34'),(4483,1,'2025-10-21','5.2.1.2.9','Décimo Cuarto Sueldo Adm.',2025,6,58.75,'2025-10-21 21:05:34'),(4484,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,1,31.90,'2025-10-21 21:05:34'),(4485,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,2,31.90,'2025-10-21 21:05:34'),(4486,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,3,31.90,'2025-10-21 21:05:34'),(4487,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,4,31.90,'2025-10-21 21:05:34'),(4488,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,5,31.90,'2025-10-21 21:05:34'),(4489,1,'2025-10-21','5.2.1.2.10','Vacaciones Adm.',2025,6,31.90,'2025-10-21 21:05:34'),(4490,1,'2025-10-21','5.2.1.2.13','Honorarios Profesionales Adm.',2025,5,3000.00,'2025-10-21 21:05:34'),(4491,1,'2025-10-21','5.2.1.2.13','Honorarios Profesionales Adm.',2025,6,3000.00,'2025-10-21 21:05:34'),(4492,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,1,64.24,'2025-10-21 21:05:34'),(4493,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,2,64.24,'2025-10-21 21:05:34'),(4494,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,3,64.24,'2025-10-21 21:05:34'),(4495,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,4,64.24,'2025-10-21 21:05:34'),(4496,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,5,346.92,'2025-10-21 21:05:34'),(4497,1,'2025-10-21','5.2.1.2.14','Servicios Contratados Adm.',2025,6,505.86,'2025-10-21 21:05:34'),(4498,1,'2025-10-21','5.2.1.2.19','Arriendos Adm.',2025,2,2300.00,'2025-10-21 21:05:34'),(4499,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,1,108.69,'2025-10-21 21:05:34'),(4500,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,2,78.29,'2025-10-21 21:05:34'),(4501,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,3,38.28,'2025-10-21 21:05:34'),(4502,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,4,43.49,'2025-10-21 21:05:34'),(4503,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,5,34.79,'2025-10-21 21:05:34'),(4504,1,'2025-10-21','5.2.1.2.23','Combustible Adm.',2025,6,104.38,'2025-10-21 21:05:34'),(4505,1,'2025-10-21','5.2.1.2.29','Gastos de Gestión Adm.',2025,4,16.00,'2025-10-21 21:05:34'),(4506,1,'2025-10-21','5.2.1.2.29','Gastos de Gestión Adm.',2025,6,7.74,'2025-10-21 21:05:34'),(4507,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,1,107.04,'2025-10-21 21:05:34'),(4508,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,2,105.99,'2025-10-21 21:05:34'),(4509,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,3,105.99,'2025-10-21 21:05:34'),(4510,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,4,108.99,'2025-10-21 21:05:34'),(4511,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,5,105.99,'2025-10-21 21:05:34'),(4512,1,'2025-10-21','5.2.1.2.35','Celulares Adm.',2025,6,105.99,'2025-10-21 21:05:34'),(4513,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,1,31.50,'2025-10-21 21:05:34'),(4514,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,2,31.50,'2025-10-21 21:05:34'),(4515,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,3,31.50,'2025-10-21 21:05:34'),(4516,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,4,31.50,'2025-10-21 21:05:34'),(4517,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,5,31.50,'2025-10-21 21:05:34'),(4518,1,'2025-10-21','5.2.1.2.36','Internet Adm.',2025,6,58.29,'2025-10-21 21:05:34'),(4519,1,'2025-10-21','5.2.1.2.37','Agua Adm.',2025,1,13.48,'2025-10-21 21:05:34'),(4520,1,'2025-10-21','5.2.1.2.37','Agua Adm.',2025,2,4.22,'2025-10-21 21:05:34'),(4521,1,'2025-10-21','5.2.1.2.37','Agua Adm.',2025,4,12.73,'2025-10-21 21:05:34'),(4522,1,'2025-10-21','5.2.1.2.37','Agua Adm.',2025,6,14.32,'2025-10-21 21:05:34'),(4523,1,'2025-10-21','5.2.1.2.44','Contribuciones a Superintendencia de Compañías Adm.',2025,6,304.81,'2025-10-21 21:05:34'),(4524,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,1,180.09,'2025-10-21 21:05:34'),(4525,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,2,180.09,'2025-10-21 21:05:34'),(4526,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,3,180.09,'2025-10-21 21:05:34'),(4527,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,4,180.09,'2025-10-21 21:05:34'),(4528,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,5,180.09,'2025-10-21 21:05:34'),(4529,1,'2025-10-21','5.2.1.2.48','Amortizaciones Intangibles Adm.',2025,6,180.09,'2025-10-21 21:05:34'),(4530,1,'2025-10-21','5.2.1.3','Gastos Financieros',2025,3,222.76,'2025-10-21 21:05:34'),(4531,1,'2025-10-21','5.2.1.3','Gastos Financieros',2025,6,1610.71,'2025-10-21 21:05:34'),(4532,1,'2025-10-21','5.2.1.3.1','Intereses PL',2025,3,222.40,'2025-10-21 21:05:34'),(4533,1,'2025-10-21','5.2.1.3.1','Intereses PL',2025,6,1456.14,'2025-10-21 21:05:34'),(4534,1,'2025-10-21','5.2.1.3.2','Comisiones Bancarias y Financieras',2025,3,0.36,'2025-10-21 21:05:34'),(4535,1,'2025-10-21','5.2.1.3.2','Comisiones Bancarias y Financieras',2025,6,3.27,'2025-10-21 21:05:34'),(4536,1,'2025-10-21','5.2.1.3.5','Otros Gastos Financieros',2025,6,151.30,'2025-10-21 21:05:34'),(4537,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,1,246.88,'2025-10-21 21:05:34'),(4538,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,2,345.61,'2025-10-21 21:05:34'),(4539,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,3,547.69,'2025-10-21 21:05:34'),(4540,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,4,204.78,'2025-10-21 21:05:34'),(4541,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,5,266.12,'2025-10-21 21:05:34'),(4542,1,'2025-10-21','5.2.2','Gastos No Operacionales',2025,6,812.23,'2025-10-21 21:05:34'),(4543,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,1,246.88,'2025-10-21 21:05:34'),(4544,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,2,345.61,'2025-10-21 21:05:34'),(4545,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,3,547.69,'2025-10-21 21:05:34'),(4546,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,4,204.78,'2025-10-21 21:05:34'),(4547,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,5,266.12,'2025-10-21 21:05:34'),(4548,1,'2025-10-21','5.2.2.1','Otros Gastos',2025,6,812.23,'2025-10-21 21:05:35'),(4549,1,'2025-10-21','5.2.2.1.4','Multas Superintendencia de Compañías',2025,6,501.00,'2025-10-21 21:05:35'),(4550,1,'2025-10-21','5.2.2.1.6','Faltantes de Caja',2025,1,7.89,'2025-10-21 21:05:35'),(4551,1,'2025-10-21','5.2.2.1.9','Gastos de Gestión y Credito',2025,3,106.96,'2025-10-21 21:05:35'),(4552,1,'2025-10-21','5.2.2.1.13','Fletes y Transporte No Deducibles',2025,2,41.10,'2025-10-21 21:05:35'),(4553,1,'2025-10-21','5.2.2.1.13','Fletes y Transporte No Deducibles',2025,6,49.13,'2025-10-21 21:05:35'),(4554,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,1,4.00,'2025-10-21 21:05:35'),(4555,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,2,177.90,'2025-10-21 21:05:35'),(4556,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,3,78.00,'2025-10-21 21:05:35'),(4557,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,4,102.80,'2025-10-21 21:05:35'),(4558,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,5,95.89,'2025-10-21 21:05:35'),(4559,1,'2025-10-21','5.2.2.1.14','Misceláneos No Deducibles',2025,6,146.50,'2025-10-21 21:05:35'),(4560,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,1,20.22,'2025-10-21 21:05:35'),(4561,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,2,34.61,'2025-10-21 21:05:35'),(4562,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,3,40.98,'2025-10-21 21:05:35'),(4563,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,4,4.33,'2025-10-21 21:05:35'),(4564,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,5,66.01,'2025-10-21 21:05:35'),(4565,1,'2025-10-21','5.2.2.1.15','Comisiones Bancarias',2025,6,34.18,'2025-10-21 21:05:35'),(4566,1,'2025-10-21','5.2.2.1.17','Comisiones, Convenios y multas IESS',2025,4,4.15,'2025-10-21 21:05:35'),(4567,1,'2025-10-21','5.2.2.1.17','Comisiones, Convenios y multas IESS',2025,5,4.22,'2025-10-21 21:05:35'),(4568,1,'2025-10-21','5.2.2.1.17','Comisiones, Convenios y multas IESS',2025,6,6.42,'2025-10-21 21:05:35'),(4569,1,'2025-10-21','5.2.2.1.18','Costos Indirectos No Deducibles',2025,1,214.77,'2025-10-21 21:05:35'),(4570,1,'2025-10-21','5.2.2.1.18','Costos Indirectos No Deducibles',2025,2,7.00,'2025-10-21 21:05:35'),(4571,1,'2025-10-21','5.2.2.1.18','Costos Indirectos No Deducibles',2025,3,246.75,'2025-10-21 21:05:35'),(4572,1,'2025-10-21','5.2.2.1.18','Costos Indirectos No Deducibles',2025,4,48.50,'2025-10-21 21:05:35'),(4573,1,'2025-10-21','5.2.2.1.19','Reparaciones y Adecuaciones No Deducibles',2025,2,40.00,'2025-10-21 21:05:35'),(4574,1,'2025-10-21','5.2.2.1.19','Reparaciones y Adecuaciones No Deducibles',2025,5,30.00,'2025-10-21 21:05:35'),(4575,1,'2025-10-21','5.2.2.1.20','Limpieza y aseo no deducible',2025,2,45.00,'2025-10-21 21:05:35'),(4576,1,'2025-10-21','5.2.2.1.20','Limpieza y aseo no deducible',2025,3,75.00,'2025-10-21 21:05:35'),(4577,1,'2025-10-21','5.2.2.1.20','Limpieza y aseo no deducible',2025,4,45.00,'2025-10-21 21:05:35'),(4578,1,'2025-10-21','5.2.2.1.20','Limpieza y aseo no deducible',2025,5,70.00,'2025-10-21 21:05:35'),(4579,1,'2025-10-21','5.2.2.1.20','Limpieza y aseo no deducible',2025,6,75.00,'2025-10-21 21:05:35');
/*!40000 ALTER TABLE `raw_account_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` int DEFAULT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `granted_by` (`granted_by`),
  KEY `idx_role` (`role_id`),
  KEY `idx_permission` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,'2025-10-24 20:44:44',NULL),(1,2,'2025-10-24 20:44:44',NULL),(1,3,'2025-10-24 20:44:44',NULL),(1,4,'2025-10-24 20:44:44',NULL),(1,5,'2025-10-24 20:44:44',NULL),(1,6,'2025-10-24 20:44:44',NULL),(1,7,'2025-10-24 20:44:44',NULL),(1,8,'2025-10-24 20:44:44',NULL),(1,9,'2025-10-24 20:44:44',NULL),(1,10,'2025-10-24 20:44:44',NULL),(1,11,'2025-10-24 20:44:44',NULL),(1,12,'2025-10-24 20:44:44',NULL),(1,13,'2025-10-24 20:44:44',NULL),(1,14,'2025-10-24 20:44:44',NULL),(1,15,'2025-10-24 20:44:44',NULL),(1,16,'2025-10-24 20:44:44',NULL),(1,17,'2025-10-24 20:44:44',NULL),(1,18,'2025-10-24 20:44:44',NULL),(1,19,'2025-10-24 20:44:44',NULL),(1,20,'2025-10-24 20:44:44',NULL),(1,21,'2025-10-24 20:44:44',NULL),(1,22,'2025-10-24 20:44:44',NULL),(1,23,'2025-10-24 20:44:44',NULL),(1,24,'2025-10-24 20:44:44',NULL),(1,25,'2025-10-24 20:44:44',NULL),(1,26,'2025-10-24 20:44:44',NULL),(1,27,'2025-10-24 20:44:44',NULL),(1,28,'2025-10-24 20:44:44',NULL),(1,29,'2025-10-24 20:44:44',NULL),(1,30,'2025-10-24 20:44:44',NULL),(1,31,'2025-10-24 20:44:44',NULL),(1,32,'2025-10-24 20:44:44',NULL),(1,33,'2025-10-24 20:44:44',NULL),(2,1,'2025-10-21 19:08:33',NULL),(2,2,'2025-10-21 19:08:33',NULL),(2,4,'2025-10-21 19:08:33',NULL),(2,5,'2025-10-21 19:08:33',NULL),(2,6,'2025-10-21 19:08:33',NULL),(2,7,'2025-10-21 19:08:33',NULL),(2,8,'2025-10-21 19:08:33',NULL),(2,11,'2025-10-21 19:08:33',NULL),(2,12,'2025-10-21 19:08:33',NULL),(2,13,'2025-10-21 19:08:33',NULL),(2,14,'2025-10-21 19:08:33',NULL),(2,15,'2025-10-21 19:08:33',NULL),(2,16,'2025-10-21 19:08:33',NULL),(2,17,'2025-10-21 19:08:33',NULL),(3,1,'2025-10-21 19:08:33',NULL),(3,5,'2025-10-21 19:08:33',NULL),(3,6,'2025-10-21 19:08:33',NULL),(3,8,'2025-10-21 19:08:33',NULL),(3,11,'2025-10-21 19:08:33',NULL),(3,12,'2025-10-21 19:08:33',NULL),(3,14,'2025-10-21 19:08:33',NULL),(3,15,'2025-10-21 19:08:33',NULL),(3,16,'2025-10-21 19:08:33',NULL),(3,17,'2025-10-21 19:08:33',NULL),(4,1,'2025-10-21 19:08:33',NULL),(4,5,'2025-10-21 19:08:33',NULL),(4,11,'2025-10-21 19:08:33',NULL),(4,14,'2025-10-21 19:08:33',NULL),(4,16,'2025-10-21 19:08:33',NULL),(5,26,'2025-10-24 20:44:45',NULL),(5,27,'2025-10-24 20:44:45',NULL),(5,28,'2025-10-24 20:44:45',NULL),(5,29,'2025-10-24 20:44:45',NULL),(5,30,'2025-10-24 20:44:45',NULL),(5,31,'2025-10-24 20:44:45',NULL),(6,1,'2025-10-24 20:44:45',NULL),(6,2,'2025-10-24 20:44:45',NULL),(6,3,'2025-10-24 20:44:45',NULL),(6,4,'2025-10-24 20:44:45',NULL),(6,5,'2025-10-24 20:44:45',NULL),(6,6,'2025-10-24 20:44:45',NULL),(6,7,'2025-10-24 20:44:45',NULL),(6,8,'2025-10-24 20:44:45',NULL),(6,9,'2025-10-24 20:44:45',NULL),(6,10,'2025-10-24 20:44:45',NULL),(6,11,'2025-10-24 20:44:45',NULL),(6,12,'2025-10-24 20:44:45',NULL),(6,13,'2025-10-24 20:44:45',NULL),(6,14,'2025-10-24 20:44:45',NULL),(6,15,'2025-10-24 20:44:45',NULL),(6,16,'2025-10-24 20:44:45',NULL),(6,17,'2025-10-24 20:44:45',NULL);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_system_role` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Full system access',1,'2025-10-21 19:08:33','2025-10-21 19:08:33'),(2,'manager','Financial data management and analysis',1,'2025-10-21 19:08:33','2025-10-21 19:08:33'),(3,'analyst','Read-only access to financial data and reports',1,'2025-10-21 19:08:33','2025-10-21 19:08:33'),(4,'viewer','Basic read-only access',1,'2025-10-21 19:08:33','2025-10-21 19:08:33'),(5,'produccion','Control total del mÃ³dulo de Status ProducciÃ³n',1,'2025-10-24 20:44:45','2025-10-24 20:44:45'),(6,'financiero','Control total de mÃ³dulos financieros (excepto producciÃ³n, configuraciÃ³n y RBAC)',1,'2025-10-24 20:44:45','2025-10-24 20:44:45');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `user_configurations`
--

LOCK TABLES `user_configurations` WRITE;
/*!40000 ALTER TABLE `user_configurations` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_configurations` ENABLE KEYS */;
UNLOCK TABLES;

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
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int DEFAULT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_role` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,'2025-10-24 20:44:45',NULL),(2,5,'2025-10-24 20:44:45',NULL),(3,6,'2025-10-24 20:44:45',NULL);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user` (`user_id`),
  KEY `idx_token` (`token_hash`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES (1,1,'4221ad0d2d7c0e6866fb6520033a17639b51f5efedf5921ad2ab2a0c1aff3109','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 00:00:00','2025-10-21 19:18:49',NULL),(2,1,'0e896be3351aa552d70c90aa7da897bac58756bfc066caef082b4224d7621397','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 00:00:00','2025-10-21 20:05:26',NULL),(3,1,'f4ece9b5980773817d68c661a459c12a3372b703f6de8db134deccecda2acb0a','127.0.0.1','Python-urllib/3.12','2025-10-21 23:59:59','2025-10-21 20:46:22',NULL),(4,1,'e2ab378e500b80be57bfa8b1196e542c9913074587952484e4090e10b8d4e201','127.0.0.1',NULL,'2025-10-22 00:00:00','2025-10-21 20:50:53',NULL),(5,1,'ee106f32b5f0f32a45a22c36b647eeae52ef4b143d532d76160a951f0ee3752c','127.0.0.1',NULL,'2025-10-21 23:59:59','2025-10-21 20:53:04',NULL),(6,1,'b88db64092d7d18c7b94ce3b5a7abe6712d03ae2b7507e364dd977ebc3d551fd','127.0.0.1',NULL,'2025-10-21 23:59:59','2025-10-21 20:56:43',NULL),(7,1,'a5ca60f8e92b6fce4f8aaa791cc4e8615d978f8f7d9f12e0b0d84f7d8dbe39a0','127.0.0.1',NULL,'2025-10-22 00:00:00','2025-10-21 21:00:58',NULL),(8,1,'b4d71bd0e5e5a9d2420b01db2429f3289e9f25793a1211da2c69123429cda4b6','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 00:00:00','2025-10-21 21:01:05',NULL),(9,1,'df3385ebe3e745e726b8de641a52ead89382f619f8942f87658b503f32be8526','127.0.0.1',NULL,'2025-10-22 00:00:00','2025-10-21 21:03:00',NULL),(10,1,'3fd573bec2e0f2cff86a84a881163761140b9acb08f7dc6d2507a4949217551b','127.0.0.1',NULL,'2025-10-22 00:00:00','2025-10-21 21:05:34',NULL),(11,1,'6854f1c7c6c32b39420d54c2282d46732761020a2df0b07a1022b98b629b20a5','127.0.0.1',NULL,'2025-10-22 00:00:00','2025-10-21 21:11:02',NULL),(12,1,'3c490c48a196a195e8002c2a9f0471f13748229d4ec3cd04e102ce393373f741','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 23:59:59','2025-10-21 21:13:54',NULL),(13,1,'c3c23873b2361cdac3ef3ff13d29c9970d1ea57360e3da7fd892201879555109','127.0.0.1',NULL,'2025-10-21 23:59:59','2025-10-21 21:16:19',NULL),(14,1,'6608b7e4a608b04dde0cfbfe9bddcdac1aab5aeb7bc8deeb48eb2c400150742f','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 00:00:00','2025-10-21 21:16:42',NULL),(15,1,'c2e2df5e6cabe936604b4712d61c77e3cf6882347a70ad0ac254aea1591381d5','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 23:59:59','2025-10-21 22:13:21',NULL),(16,1,'0a0fb7f57825cbdc3ea7b6043a344123a986d55c900b1b5098a5cf0deb1dacad','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-21 23:59:59','2025-10-21 23:21:40',NULL),(17,1,'aa69b6675e4c326b208da3f2c0b7d8f999b03e1df9c5adf706e9ff422dc0222c','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-23 00:00:00','2025-10-22 01:38:12',NULL),(18,1,'9bdcf611e54de01b4e80f2554ffe17da0368c537639fad4647b5d67b8ef34d15','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-23 00:00:00','2025-10-22 02:03:26',NULL),(19,1,'2c9620d4db48130ebe3a255321d6bb54841c030eb85d1d54ca5e27a360942cb2','testclient','testclient','2025-10-22 23:59:59','2025-10-22 02:21:03',NULL),(20,1,'afd67dc0e901ed1778ac44e2d451f03741b8686674de5ea3ea822f4171605ee5','testclient','testclient','2025-10-22 23:59:59','2025-10-22 02:23:20',NULL),(21,1,'cad042937b179cb3cd3660f47dae428188b6b064176ca104a7c284ac59e5aebd','testclient','testclient','2025-10-23 00:00:00','2025-10-22 02:23:45',NULL),(22,1,'a9c49984becdf8b578a2e088fffd0bc31ee15afa7af0f91c9c1209d9b2886013','testclient','testclient','2025-10-22 23:59:59','2025-10-22 02:48:27',NULL),(23,1,'475d5cc6d4f61fcee3a41ff2b3aff14cbd1998c7b225ba10cd4d89a87026de3b','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-22 23:59:59','2025-10-22 17:58:22',NULL),(24,1,'a7aa3d610bf8f13c12298b9c5a6603fbd3fb89d4d60d6adae2c8fa836c92ebb1','172.18.0.1','curl/8.5.0','2025-10-23 00:00:00','2025-10-22 18:10:44',NULL),(25,1,'ba34d4dd0c8fc73a0e22c002d00a81544df4dc2e2d6d3ccc326077e9f77c9ea0','172.18.0.1','curl/8.5.0','2025-10-22 23:59:59','2025-10-22 18:13:45',NULL),(26,1,'cd1b59aba289a35ec7fe861cc0dee9825e262285c7640c5b1e26f917a9490e9e','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 18:14:17',NULL),(27,1,'019e74925850922015316cba7d703ae7d7ad0f6b9e5a842206824d7f96b77abe','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 18:14:44',NULL),(28,1,'00616c1d628cb6d73f205c3601f8a52f008efe7251278b542c01d45c0cb9f5a3','172.18.0.1','python-requests/2.31.0','2025-10-22 23:59:59','2025-10-22 18:16:21',NULL),(29,1,'30c8c141558e160566c503d56df9cfffc648cdf0710f80586729204f9120f7ab','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 18:16:58',NULL),(30,1,'520037dcce1778e4f66fc61f3fdea60c92fe6cc21bfeec6ecdb1a6b837d9deec','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 22:15:25',NULL),(31,1,'fb1ed864957a00671ed27715c1a39f446bed21f1115cef68e13644e0536861c4','172.18.0.1','python-requests/2.31.0','2025-10-22 23:59:59','2025-10-22 22:16:30',NULL),(32,1,'abd737bbe2e771745530b1020d1c8aeab019b5fc6335172f38ff94f9422abeed','172.18.0.1','python-requests/2.31.0','2025-10-22 23:59:59','2025-10-22 22:16:57',NULL),(33,1,'4ced09f55a943600eacc0d620411937cd283f43eb564a1ae406824ac2cdf585e','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 22:17:38',NULL),(34,1,'b2fc2d13c15b0ec2f6049a7981eee10a1dd9c894f21d8e64a267b26890084c75','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 22:18:04',NULL),(35,1,'86f3a9a5bbdc8bfc04b74c6a5711f6475a1d9d7dd14b5d5ee2bc949b4aa382d4','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 22:41:29',NULL),(36,1,'d21f8a0d30b802bceee7d995138d9c8204262c5a226203c0cbd95608db4ae73e','172.18.0.1','python-requests/2.31.0','2025-10-22 23:59:59','2025-10-22 22:42:27',NULL),(37,1,'27b9795f85fa600ba45008560c2f4a7e3f1bdcc9e4b249c8d023f19f8f592427','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 22:43:02',NULL),(38,1,'ce5e9ecbc264fe5ac7926ce4f6b4d4b1396434d36efcff04cd105764e15ec7f1','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 23:17:53',NULL),(39,1,'8f7eac4e03f25f977c94451862b5acfde99535c67690c12568fa42d48945c9c0','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 23:18:44',NULL),(40,1,'fdd7c4715c50c4d18d963b1911688cb8fadc64970aab39a737fee8c894e346e0','172.18.0.1','python-requests/2.31.0','2025-10-22 23:59:59','2025-10-22 23:19:16',NULL),(41,1,'f31191a10b1774d66371f2bbb2587b49e64dcb6891fcc40813a0139feba8bd85','172.18.0.1','python-requests/2.31.0','2025-10-23 00:00:00','2025-10-22 23:19:35',NULL),(42,1,'8345502f46314c3c642dede646757b66e421580e253c7e4322b1759f289e26eb','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-24 00:00:00','2025-10-23 00:22:42',NULL),(43,1,'0523d951c829449ad01a5b4f47d2eb34f16041b902e712f7423669bd1f77a1bf','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-24 00:00:00','2025-10-23 17:30:46',NULL),(44,1,'facefc103e6d39e2eb20704fdd4cf08e9adf3aa6258c187bbf5151091088f28c','172.18.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0','2025-10-25 00:00:00','2025-10-24 17:03:32',NULL);
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_superuser` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@artyco.com','admin','$2b$12$FHojywY0.DGnbpFDBr5W.OJJfwi95RQKEHaxF0NkzOs4lIR9Z8Yf6','System','Administrator',1,1,'2025-10-21 19:08:33','2025-10-24 17:03:32','2025-10-24 17:03:33'),(2,'produccion@artyco.com','produccion','$2b$12$b7QqT/2OHD2Bp8PkL9I4buSjkmtIg4Q8wgg7UxVNhkS2AlgPW9YnO','Usuario','ProducciÃ³n',1,0,'2025-10-24 20:44:45','2025-10-24 20:44:45',NULL),(3,'financiero@artyco.com','financiero','$2b$12$UMkuKgrA.lC/Y8XoQkrf7.mm/di3UzTmAjq6/kvq5QUFWt9yOi2Ca','Usuario','Financiero',1,0,'2025-10-24 20:44:45','2025-10-24 20:44:45',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
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
/*!50013 DEFINER=`artyco_user`@`%` SQL SECURITY DEFINER */
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
/*!50013 DEFINER=`artyco_user`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_production_summary` AS select `c`.`name` AS `company_name`,`pd`.`period_year` AS `period_year`,`pd`.`period_month` AS `period_month`,`pd`.`unidades_producidas` AS `unidades_producidas`,`pd`.`unidades_vendidas` AS `unidades_vendidas`,`pd`.`capacidad_instalada` AS `capacidad_instalada`,`pd`.`utilizacion_capacidad` AS `utilizacion_capacidad`,`pd`.`costo_unitario` AS `costo_unitario`,`pd`.`eficiencia_oee` AS `eficiencia_oee`,`pd`.`empleados_produccion` AS `empleados_produccion`,round((`pd`.`horas_trabajadas` / nullif(`pd`.`empleados_produccion`,0)),2) AS `horas_promedio_empleado` from (`production_data` `pd` join `companies` `c` on((`pd`.`company_id` = `c`.`id`))) */;
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

-- Dump completed on 2025-10-27  2:29:45
