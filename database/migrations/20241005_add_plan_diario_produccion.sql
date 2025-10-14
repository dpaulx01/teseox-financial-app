-- Migration: create manual daily production plan table
-- Run this against your artyco_financial_rbac database

CREATE TABLE IF NOT EXISTS plan_diario_produccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    fecha DATE NOT NULL,
    metros DECIMAL(12,2) NOT NULL DEFAULT 0,
    unidades DECIMAL(12,2) NOT NULL DEFAULT 0,
    notas TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_plan_diario_producto_fecha UNIQUE (producto_id, fecha),
    CONSTRAINT fk_plan_diario_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional helper to ensure consistent character set on existing deployments
ALTER TABLE plan_diario_produccion
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
