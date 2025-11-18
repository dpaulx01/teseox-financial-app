-- 004_rbac_multitenant_phase5.sql
-- Fase 5: RBAC Multitenant - Sessions, Audit Logs y Permisos Avanzados
-- - Agrega company_id a user_sessions para aislamiento por tenant
-- - Agrega company_id a audit_logs para auditoría por tenant
-- - Crea tabla role_permission_overrides para permisos específicos por tenant
-- - Agrega campos para permisos temporales
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
-- Tabla: user_sessions - Agregar company_id para aislamiento
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('user_sessions', 'company_id', 'int NULL AFTER `user_id`');

-- Populate company_id from users table
UPDATE `user_sessions` us
  JOIN `users` u ON u.id = us.user_id
   SET us.company_id = COALESCE(us.company_id, u.company_id, 1)
 WHERE us.company_id IS NULL;

-- Make company_id NOT NULL
ALTER TABLE `user_sessions`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

-- Add index for performance (tenant + created_at for listing sessions)
CALL add_index_if_not_exists('user_sessions', 'idx_user_sessions_company_created', 0, '(`company_id`,`created_at`)');
CALL add_index_if_not_exists('user_sessions', 'idx_user_sessions_company_user', 0, '(`company_id`,`user_id`)');

-- Add FK to companies
CALL add_fk_if_not_exists(
    'user_sessions',
    'fk_user_sessions_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE CASCADE ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: audit_logs - Agregar company_id para auditoría por tenant
-- ---------------------------------------------------------------------------
CALL add_column_if_not_exists('audit_logs', 'company_id', 'int NULL AFTER `user_id`');

-- Populate company_id from users table
UPDATE `audit_logs` al
  JOIN `users` u ON u.id = al.user_id
   SET al.company_id = COALESCE(al.company_id, u.company_id, 1)
 WHERE al.company_id IS NULL AND al.user_id IS NOT NULL;

-- For audit logs without user_id (system actions), default to 1
UPDATE `audit_logs`
   SET company_id = 1
 WHERE company_id IS NULL;

-- Make company_id NOT NULL
ALTER TABLE `audit_logs`
    MODIFY COLUMN `company_id` int NOT NULL DEFAULT 1;

-- Add index for performance (tenant + created_at for compliance reporting)
CALL add_index_if_not_exists('audit_logs', 'idx_audit_logs_company_created', 0, '(`company_id`,`created_at`)');
CALL add_index_if_not_exists('audit_logs', 'idx_audit_logs_company_action', 0, '(`company_id`,`action`)');
CALL add_index_if_not_exists('audit_logs', 'idx_audit_logs_company_user', 0, '(`company_id`,`user_id`)');

-- Add FK to companies
CALL add_fk_if_not_exists(
    'audit_logs',
    'fk_audit_logs_company',
    'company_id',
    'companies',
    'id',
    'ON DELETE CASCADE ON UPDATE CASCADE'
);

-- ---------------------------------------------------------------------------
-- Tabla: role_permission_overrides - Permisos específicos por tenant
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permission_overrides` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `company_id` int NOT NULL,
    `role_id` int NOT NULL,
    `permission_id` int NOT NULL,
    `is_granted` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'TRUE=grant, FALSE=revoke',
    `reason` varchar(500) NULL COMMENT 'Business justification for override',
    `valid_from` datetime NULL COMMENT 'Optional temporal permission start',
    `valid_until` datetime NULL COMMENT 'Optional temporal permission end',
    `created_by` int NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_rpo_company_role` (`company_id`, `role_id`),
    INDEX `idx_rpo_company_permission` (`company_id`, `permission_id`),
    INDEX `idx_rpo_validity` (`valid_from`, `valid_until`),
    CONSTRAINT `fk_rpo_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rpo_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rpo_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rpo_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uq_rpo_company_role_permission` (`company_id`, `role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tenant-specific permission overrides for roles';

-- ---------------------------------------------------------------------------
-- Tabla: user_role_overrides - Permisos directos a usuarios por tenant
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_role_overrides` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `company_id` int NOT NULL,
    `user_id` int NOT NULL,
    `permission_id` int NOT NULL,
    `is_granted` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'TRUE=grant additional, FALSE=revoke inherited',
    `reason` varchar(500) NULL COMMENT 'Business justification',
    `valid_from` datetime NULL COMMENT 'Temporal permission start',
    `valid_until` datetime NULL COMMENT 'Temporal permission end',
    `created_by` int NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_uro_company_user` (`company_id`, `user_id`),
    INDEX `idx_uro_validity` (`valid_from`, `valid_until`),
    CONSTRAINT `fk_uro_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uro_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uro_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uro_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uq_uro_company_user_permission` (`company_id`, `user_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tenant-specific permission overrides for individual users';

-- ---------------------------------------------------------------------------
-- Limpieza de procedimientos auxiliares
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
