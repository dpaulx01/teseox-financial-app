# Migración: Crear tabla raw_account_data en Google Cloud SQL

## Problema
Al subir archivos CSV de P&G en Google Cloud, aparece el error:
```
Table 'artyco_financial_rbac.raw_account_data' doesn't exist
```

## Solución
La tabla `raw_account_data` existe en desarrollo local pero no en producción en Google Cloud SQL. Necesita ser creada.

## Opciones para ejecutar la migración

### Opción 1: Usar Google Cloud Console (MÁS FÁCIL) ✅

1. Ve a [Google Cloud Console - Cloud SQL](https://console.cloud.google.com/sql/instances)
2. Selecciona la instancia: `artyco-db-instance`
3. Ve a la pestaña **"Query"** o **"Consultas"**
4. Copia y pega el siguiente SQL:

```sql
USE artyco_financial_rbac;

CREATE TABLE IF NOT EXISTS `raw_account_data` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verificación
SHOW TABLES LIKE 'raw_account_data';
```

5. Haz clic en **"Ejecutar"** o **"Run"**
6. Deberías ver el mensaje: `raw_account_data` en los resultados

### Opción 2: Usar gcloud CLI (línea de comandos)

```bash
# Conectarse a Cloud SQL (te pedirá la contraseña de root)
gcloud sql connect artyco-db-instance --user=root

# Una vez conectado, ejecutar:
USE artyco_financial_rbac;

# Pegar el script de creación de tabla (ver arriba)
```

### Opción 3: Ejecutar el archivo de migración

```bash
# Desde tu terminal local
cat migrations/add_raw_account_data_table.sql | gcloud sql connect artyco-db-instance --user=root
```

## Verificación

Después de ejecutar la migración, verifica que la tabla existe:

```sql
USE artyco_financial_rbac;
SHOW TABLES LIKE 'raw_account_data';
DESCRIBE raw_account_data;
```

Deberías ver la estructura de la tabla con 9 columnas:
- id
- company_id
- import_date
- account_code
- account_name
- period_year
- period_month
- amount
- created_at

## Prueba

Después de crear la tabla, intenta subir nuevamente el archivo CSV de P&G en la aplicación. El error debería desaparecer.

## Notas

- Esta tabla almacena los datos crudos del plan de cuentas importado desde archivos CSV
- Es usada por el módulo de P&G (Pérdidas y Ganancias)
- Los datos se procesan y transforman para generar reportes financieros

## Fecha
2025-01-06

## Autor
Claude Code - Migración automática
