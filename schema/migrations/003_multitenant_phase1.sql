-- 003_multitenant_phase1.sql
-- Fase 1: ajustes de esquema para habilitar aislamiento multitenant
-- - Extiende tabla companies con campos SaaS
-- - Agrega company_id a tablas críticas
-- - Normaliza valores existentes y crea índices
-- - Agrega llaves foráneas hacia companies
-- El script es idempotente y puede ejecutarse múltiples veces sin efectos secundarios.

DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

DELIMITER $$

CREATE PROCEDURE add_fk_if_not_exists(
    IN in_table VARCHAR(64),
    IN in_constraint VARCHAR(64),
    IN in_column VARCHAR(64),
    IN ref_table VARCHAR(64),
    IN ref_column VARCHAR(64),
    IN action_clause VARCHAR(255)
)
BEGIN
    DECLARE constraint_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO constraint_exists
      FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = in_table
       AND CONSTRAINT_NAME = in_constraint;

    IF constraint_exists = 0 THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', in_table, '` ADD CONSTRAINT `', in_constraint,
            '` FOREIGN KEY (`', in_column, '`) REFERENCES `', ref_table, '`(`', ref_column, '`) ',
            action_clause
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE add_index_if_not_exists(
    IN in_table VARCHAR(64),
    IN in_index VARCHAR(64),
    IN is_unique BOOLEAN,
    IN in_definition TEXT
)
BEGIN
    DECLARE idx_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO idx_exists
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = in_table
       AND INDEX_NAME = in_index;

    IF idx_exists = 0 THEN
        SET @ddl = CONCAT(
            'CREATE ',
            IF(is_unique, 'UNIQUE ', ''),
            'INDEX `', in_index, '` ON `', in_table, '` ',
            in_definition
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE add_column_if_not_exists(
    IN in_table VARCHAR(64),
    IN in_column VARCHAR(64),
    IN in_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO column_exists
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = in_table
       AND COLUMN_NAME = in_column;

    IF column_exists = 0 THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', in_table, '` ADD COLUMN `', in_column, '` ', in_definition
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- Extender tabla companies con campos SaaS claves
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('companies', 'slug', 'varchar(255) NULL AFTER `name`');
CALL add_column_if_not_exists('companies', 'is_active', 'tinyint(1) NOT NULL DEFAULT 1 AFTER `slug`');
CALL add_column_if_not_exists('companies', 'subscription_tier', 'varchar(50) NOT NULL DEFAULT ''trial'' AFTER `is_active`');
CALL add_column_if_not_exists('companies', 'subscription_expires_at', 'datetime NULL AFTER `subscription_tier`');
CALL add_column_if_not_exists('companies', 'max_users', 'int NOT NULL DEFAULT 5 AFTER `subscription_expires_at`');

UPDATE `companies`
   SET `slug` = IFNULL(`slug`, REPLACE(LOWER(`name`), ' ', '-'))
 WHERE `slug` IS NULL;

CALL add_index_if_not_exists('companies', 'idx_companies_slug', 1, '(`slug`)');
CALL add_index_if_not_exists('companies', 'idx_companies_is_active', 0, '(`is_active`)');
CALL add_index_if_not_exists('companies', 'idx_companies_subscription_tier', 0, '(`subscription_tier`)');

-- ---------------------------------------------------------------------------
-- Tabla: cotizaciones
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('cotizaciones', 'company_id', 'int NULL AFTER `id`');

UPDATE `cotizaciones`
   SET `company_id` = COALESCE(`company_id`, 1);

ALTER TABLE `cotizaciones`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('cotizaciones', 'idx_cotizaciones_company_fecha', 0, '(`company_id`,`fecha_ingreso`)');
CALL add_index_if_not_exists('cotizaciones', 'idx_cotizaciones_company_cliente', 0, '(`company_id`,`cliente`)');
CALL add_index_if_not_exists('cotizaciones', 'idx_cotizaciones_company_estado', 0, '(`company_id`,`tipo_produccion`)');

CALL add_fk_if_not_exists(
    'cotizaciones',
    'fk_cotizaciones_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: productos
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('productos', 'company_id', 'int NULL AFTER `id`');

UPDATE `productos` p
JOIN `cotizaciones` c ON c.id = p.cotizacion_id
   SET p.company_id = COALESCE(p.company_id, c.company_id, 1);

ALTER TABLE `productos`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('productos', 'idx_productos_company_cotizacion', 0, '(`company_id`,`cotizacion_id`)');
CALL add_index_if_not_exists('productos', 'idx_productos_company_status', 0, '(`company_id`,`estatus`)');

CALL add_fk_if_not_exists(
    'productos',
    'fk_productos_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: plan_diario_produccion
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('plan_diario_produccion', 'company_id', 'int NULL AFTER `id`');

UPDATE `plan_diario_produccion` p
JOIN `productos` prod ON prod.id = p.producto_id
   SET p.company_id = COALESCE(p.company_id, prod.company_id, 1);

ALTER TABLE `plan_diario_produccion`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('plan_diario_produccion', 'idx_plan_diario_company_fecha', 0, '(`company_id`,`fecha`)');

CALL add_fk_if_not_exists(
    'plan_diario_produccion',
    'fk_plan_diario_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: pagos
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('pagos', 'company_id', 'int NULL AFTER `cotizacion_id`');

UPDATE `pagos` p
JOIN `cotizaciones` c ON c.id = p.cotizacion_id
   SET p.company_id = COALESCE(p.company_id, c.company_id, 1);

ALTER TABLE `pagos`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('pagos', 'idx_pagos_company_fecha', 0, '(`company_id`,`fecha_pago`)');

CALL add_fk_if_not_exists(
    'pagos',
    'fk_pagos_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: financial_scenarios
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('financial_scenarios', 'company_id', 'int NULL AFTER `id`');

UPDATE `financial_scenarios`
   SET `company_id` = COALESCE(`company_id`, 1);

ALTER TABLE `financial_scenarios`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('financial_scenarios', 'idx_financial_scenarios_company', 0, '(`company_id`)');

CALL add_fk_if_not_exists(
    'financial_scenarios',
    'fk_financial_scenarios_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: dashboard_configs
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('dashboard_configs', 'company_id', 'int NULL AFTER `id`');

UPDATE `dashboard_configs` d
LEFT JOIN `users` u ON u.id = d.user_id
   SET d.company_id = COALESCE(d.company_id, u.company_id, 1);

ALTER TABLE `dashboard_configs`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_index_if_not_exists('dashboard_configs', 'idx_dashboard_configs_company_user', 0, '(`company_id`,`user_id`)');

CALL add_fk_if_not_exists(
    'dashboard_configs',
    'fk_dashboard_configs_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Normalizar columnas e índices existentes (users + tablas con company_id)
-- ---------------------------------------------------------------------------
ALTER TABLE `users`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

CALL add_fk_if_not_exists(
    'users',
    'fk_users_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'balance_config',
    'fk_balance_config_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'balance_data',
    'fk_balance_data_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'raw_account_data',
    'fk_raw_account_data_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'raw_balance_data',
    'fk_raw_balance_data_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'sales_alerts',
    'fk_sales_alerts_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'sales_kpis_cache',
    'fk_sales_kpis_cache_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'sales_saved_filters',
    'fk_sales_saved_filters_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'sales_transactions',
    'fk_sales_transactions_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'production_config',
    'fk_production_config_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

CALL add_fk_if_not_exists(
    'production_combined_data',
    'fk_production_combined_data_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE RESTRICT ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Índices de performance adicionales
-- ---------------------------------------------------------------------------
CALL add_index_if_not_exists('sales_transactions', 'idx_sales_company_date', 0, '(`company_id`,`fecha_emision`)');
CALL add_index_if_not_exists('sales_transactions', 'idx_sales_company_year_month', 0, '(`company_id`,`year`,`month`)');
CALL add_index_if_not_exists('sales_transactions', 'idx_sales_company_cliente', 0, '(`company_id`,`razon_social`)');
CALL add_index_if_not_exists('sales_transactions', 'idx_sales_company_producto', 0, '(`company_id`,`producto`)');
CALL add_index_if_not_exists('sales_transactions', 'idx_sales_company_vendedor', 0, '(`company_id`,`vendedor`)');

CALL add_index_if_not_exists('productos', 'idx_productos_company_created', 0, '(`company_id`,`created_at`)');
CALL add_index_if_not_exists('plan_diario_produccion', 'idx_plan_diario_company_producto', 0, '(`company_id`,`producto_id`)');
CALL add_index_if_not_exists('pagos', 'idx_pagos_company_cotizacion', 0, '(`company_id`,`cotizacion_id`)');
CALL add_index_if_not_exists('financial_scenarios', 'idx_financial_scenarios_company_owner', 0, '(`company_id`,`owner_id`)');
CALL add_index_if_not_exists('dashboard_configs', 'idx_dashboard_configs_company_default', 0, '(`company_id`,`is_default`)');

-- ---------------------------------------------------------------------------
-- Limpieza de procedimientos auxiliares
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
