# Migraciones de Schema

Esta carpeta contiene migraciones **pendientes** que aún no han sido incorporadas al schema base.

## Estado Actual

✅ **No hay migraciones pendientes**

Todas las migraciones existentes ya están aplicadas en `schema/000_base_schema.sql`.

## Cómo Crear una Nueva Migración

### 1. Crear Archivo

```bash
# Formato: NNN_descripcion_corta.sql
# NNN = número secuencial (001, 002, 003, ...)
touch schema/migrations/003_add_new_field.sql
```

### 2. Escribir Migración Idempotente

Las migraciones DEBEN ser idempotentes (ejecutables múltiples veces sin errores):

```sql
-- 003_add_new_field.sql
-- Descripción: Agregar campo de notas adicionales a cotizaciones

-- Verificar si la columna ya existe
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'artyco_financial_rbac'
      AND TABLE_NAME = 'cotizaciones'
      AND COLUMN_NAME = 'notas_adicionales'
);

-- Solo crear si no existe
SET @sql := IF(
    @col_exists > 0,
    'SELECT "Column notas_adicionales already exists" AS info',
    'ALTER TABLE cotizaciones ADD COLUMN notas_adicionales TEXT NULL COMMENT "Notas adicionales del proyecto"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### 3. Probar la Migración

```bash
# Aplicar
mysql -u root -p artyco_financial_rbac < schema/migrations/003_add_new_field.sql

# Verificar que funciona
mysql -u root -p artyco_financial_rbac -e "DESCRIBE cotizaciones;"

# Probar idempotencia (ejecutar de nuevo)
mysql -u root -p artyco_financial_rbac < schema/migrations/003_add_new_field.sql
```

Debe ejecutarse sin errores ambas veces.

### 4. Aplicar en Producción

```bash
# Google Cloud SQL
gcloud sql connect artyco-db-instance --user=root < schema/migrations/003_add_new_field.sql

# O via Cloud Console
# Copiar y pegar el contenido en el Query Editor
```

### 5. Regenerar Schema Base

Una vez que la migración esté estable en todos los ambientes:

```bash
# Regenerar schema base con los cambios
./scripts/regenerate_base_schema.sh
```

### 6. Archivar la Migración

```bash
# Mover a legacy (ya está en el schema base)
mv schema/migrations/003_add_new_field.sql database/legacy/old_migrations/
```

## Plantillas de Migraciones Comunes

### Agregar Columna

```sql
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'nombre_tabla'
      AND COLUMN_NAME = 'nueva_columna'
);

SET @sql := IF(
    @col_exists > 0,
    'SELECT "Column already exists" AS info',
    'ALTER TABLE nombre_tabla ADD COLUMN nueva_columna VARCHAR(255) NULL'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### Crear Índice

```sql
SET @index_exists := (
    SELECT COUNT(1)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'nombre_tabla'
      AND INDEX_NAME = 'idx_nombre'
);

SET @sql := IF(
    @index_exists > 0,
    'SELECT "Index already exists" AS info',
    'CREATE INDEX idx_nombre ON nombre_tabla (columna1, columna2)'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### Crear Tabla

```sql
CREATE TABLE IF NOT EXISTS nombre_tabla (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campo1 VARCHAR(255) NOT NULL,
    campo2 TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Insertar Datos de Configuración

```sql
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('nueva_config', 'valor_default', 'Descripción de la configuración')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);
```

## Buenas Prácticas

1. ✅ **SIEMPRE haz migraciones idempotentes**
2. ✅ **Prueba en desarrollo antes de aplicar en producción**
3. ✅ **Documenta el propósito con comentarios**
4. ✅ **Usa nombres descriptivos**
5. ✅ **Una migración = un cambio lógico**
6. ✅ **Haz backup antes de aplicar en producción**
7. ❌ **NO modifiques migraciones ya aplicadas**
8. ❌ **NO hagas DROP TABLE o DELETE sin condiciones**

## Troubleshooting

### Error: "Prepared statement needs to be re-prepared"

Ejecuta de nuevo la migración. Este error es temporal.

### Error: "Table doesn't exist"

Verifica que el schema base esté aplicado primero:

```bash
mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
```

### La migración no hace cambios

Probablemente el cambio ya está aplicado. Verifica el schema actual:

```bash
mysql -u root -p artyco_financial_rbac -e "SHOW CREATE TABLE nombre_tabla\G"
```

## Ver También

- [Guía de Base de Datos](../../database/README.md)
- [Análisis de Migraciones](../../MIGRACIONES_ANALISIS.md)
