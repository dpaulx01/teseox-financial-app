-- Ensure composite indexes exist for frequent temporal filters in Sales BI
SET @index_exists := (
    SELECT COUNT(1)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_transactions'
      AND INDEX_NAME = 'idx_sales_transactions_year_month'
);

SET @sql := IF(
    @index_exists > 0,
    'SELECT "idx_sales_transactions_year_month already exists" AS info',
    'CREATE INDEX idx_sales_transactions_year_month ON sales_transactions (year, month)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @index_exists_company := (
    SELECT COUNT(1)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_transactions'
      AND INDEX_NAME = 'idx_sales_transactions_company_year_month'
);

SET @sql_company := IF(
    @index_exists_company > 0,
    'SELECT "idx_sales_transactions_company_year_month already exists" AS info',
    'CREATE INDEX idx_sales_transactions_company_year_month ON sales_transactions (company_id, year, month)'
);
PREPARE stmt_company FROM @sql_company;
EXECUTE stmt_company;
DEALLOCATE PREPARE stmt_company;
