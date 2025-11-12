# Guía de Base de Datos - Artyco Financial

**Última actualización:** 2025-11-12

Esta guía explica cómo configurar la base de datos del sistema Artyco Financial en una nueva máquina o entorno.

---

## 📋 Tabla de Contenidos

- [Instalación Nueva](#instalación-nueva)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Migraciones](#migraciones)
- [Mantenimiento](#mantenimiento)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Instalación Nueva

### Requisitos Previos

- MySQL 8.0 o superior
- Usuario con privilegios de creación de bases de datos
- Cliente `mysql` instalado

### Pasos para Configuración Inicial

#### 1. Crear Base de Datos

```bash
mysql -u root -p -e "CREATE DATABASE artyco_financial_rbac DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 2. Aplicar Schema Base

El archivo `schema/000_base_schema.sql` contiene **toda la estructura completa** de la base de datos, incluyendo:
- 33 tablas con todas sus columnas
- Índices y claves foráneas
- Sistema RBAC (roles, permisos, usuarios)
- Datos iniciales de configuración

```bash
mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
```

**Tiempo estimado:** 10-30 segundos

#### 3. Crear Vistas de Cálculo Automático

Las vistas proporcionan cálculos financieros automáticos basados en los datos crudos:

```bash
mysql -u root -p artyco_financial_rbac < database/init/02-create-views.sql
```

#### 4. (OPCIONAL) Cargar Datos de Prueba

Solo para entornos de desarrollo:

```bash
mysql -u root -p artyco_financial_rbac < database/init/03-sample-data.sql
```

**NOTA:** Los datos de prueba usan la base de datos `artyco_financial` (sin sufijo `_rbac`). Si necesitas usarlos, edita primero la línea 2 del archivo.

### Script de Instalación Rápida

```bash
#!/bin/bash
# install_db.sh

DB_NAME="artyco_financial_rbac"
DB_USER="root"

echo "Creando base de datos..."
mysql -u $DB_USER -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Aplicando schema base..."
mysql -u $DB_USER -p $DB_NAME < schema/000_base_schema.sql

echo "Creando vistas..."
mysql -u $DB_USER -p $DB_NAME < database/init/02-create-views.sql

echo "✅ Base de datos configurada correctamente"
```

---

## 📁 Estructura de Carpetas

```
schema/                                 # ⭐ Fuente de verdad (fuera de database/)
├── 000_base_schema.sql
└── migrations/
    └── README.md

database/
├── init/                               # Scripts de inicialización
│   ├── 01-create-database.sql         # [DEPRECADO] Usa el schema base en su lugar
│   ├── 02-create-views.sql            # ✅ Vistas de cálculo financiero
│   ├── 02-enhanced-schema.sql         # [DEPRECADO] Redundante con el schema base
│   └── 03-sample-data.sql             # ⚠️ Datos de prueba (editar DB antes de usar)
│
├── migrations/                         # Migraciones idempotentes opcionales
│   ├── 20250115_add_sales_transactions_indexes.sql
│   ├── 20250217_align_production_metrics.sql
│   ├── 20251024_add_production_rbac.sql
│   └── utf8_fix.sql
│
├── legacy/                             # Scripts históricos (solo referencia)
│   ├── old_migrations/                # Migraciones ya aplicadas al schema base
│   ├── ad_hoc/                        # Scripts de desarrollo ad-hoc
│   └── sql/                           # Scripts SQL anteriores a la reorganización
│
├── backups/                            # Respaldos de la base de datos
│   └── safe/                          # Respaldos críticos
│
└── README.md                           # 📖 Este archivo
```

### Archivos Clave

| Archivo | Propósito | Cuándo Usar |
|---------|-----------|-------------|
| `schema/000_base_schema.sql` | Schema completo y actualizado | **SIEMPRE** en instalación nueva |
| `database/init/02-create-views.sql` | Vistas de cálculo financiero | Después del schema base |
| `database/migrations/*.sql` | Optimizaciones opcionales | Si necesitas índices/ajustes específicos |
| `database/legacy/` | Referencia histórica | Solo para consulta, NO ejecutar |

---

## 🔄 Migraciones

### Estado Actual

✅ **Todas las migraciones están aplicadas en el schema base**

El archivo `schema/000_base_schema.sql` ya incluye:
- Todas las tablas con sus columnas actualizadas
- Índices de rendimiento
- Sistema RBAC completo
- Permisos de producción y ventas

### Migraciones Opcionales Disponibles

Las siguientes migraciones en `database/migrations/` son **idempotentes** (pueden ejecutarse múltiples veces sin problemas):

1. **20250115_add_sales_transactions_indexes.sql**
   - Agrega índices de rendimiento para Sales BI
   - Seguro de ejecutar en cualquier momento

2. **20250217_align_production_metrics.sql**
   - Agrega columnas a `production_data` si no existen
   - Probablemente ya aplicado en schema base

3. **20251024_add_production_rbac.sql**
   - Agrega permisos de módulo de producción
   - Usa `ON DUPLICATE KEY UPDATE`

4. **utf8_fix.sql**
   - Convierte tablas de análisis a UTF8
   - Solo si tienes problemas de encoding

**Recomendación:** NO es necesario ejecutar estas migraciones si instalas desde el schema base actual.

### Crear una Nueva Migración

Si necesitas modificar la estructura de la base de datos:

1. **Crea el archivo de migración:**

```bash
# Formato: NNN_descripcion_corta.sql
touch schema/migrations/003_add_customer_notes.sql
```

2. **Haz la migración idempotente:**

```sql
-- 003_add_customer_notes.sql
-- Migración: Agregar campo de notas de cliente

-- Verificar si la columna existe antes de agregarla
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'artyco_financial_rbac'
      AND TABLE_NAME = 'cotizaciones'
      AND COLUMN_NAME = 'notas_cliente'
);

SET @sql := IF(
    @col_exists > 0,
    'SELECT "Column already exists" AS info',
    'ALTER TABLE cotizaciones ADD COLUMN notas_cliente TEXT NULL'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

3. **Aplica en desarrollo:**

```bash
mysql -u root -p artyco_financial_rbac < schema/migrations/003_add_customer_notes.sql
```

4. **Prueba que funciona** y que puede ejecutarse múltiples veces

5. **Regenera el schema base** cuando esté estable:

```bash
./scripts/regenerate_base_schema.sh
```

6. **Mueve la migración a legacy:**

```bash
mv schema/migrations/003_add_customer_notes.sql database/legacy/old_migrations/
```

---

## 🛠️ Mantenimiento

### Regenerar Schema Base

Cuando hagas cambios significativos en la base de datos y quieras actualizar el schema base:

```bash
mysqldump -h 127.0.0.1 -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --no-data \
  artyco_financial_rbac > schema/000_base_schema.sql
```

**IMPORTANTE:** Usa `--no-data` para exportar solo la estructura. Los datos se cargan por separado.

### Crear Backup

```bash
# Backup completo (estructura + datos)
mysqldump -h 127.0.0.1 -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  artyco_financial_rbac > database/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup solo de datos
mysqldump -h 127.0.0.1 -u root -p \
  --no-create-info \
  --skip-triggers \
  artyco_financial_rbac > database/backups/data_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar desde Backup

```bash
mysql -u root -p artyco_financial_rbac < database/backups/backup_20251112_195300.sql
```

---

## 🐛 Troubleshooting

### Error: "Table doesn't exist"

**Problema:** Una tabla no existe después de aplicar el schema base.

**Solución:**
```bash
# Verificar qué tablas existen
mysql -u root -p artyco_financial_rbac -e "SHOW TABLES;"

# Aplicar schema base nuevamente (es seguro)
mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
```

### Error: "Unknown database 'artyco_financial_rbac'"

**Problema:** La base de datos no fue creada.

**Solución:**
```bash
mysql -u root -p -e "CREATE DATABASE artyco_financial_rbac DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Error de Encoding (caracteres especiales)

**Problema:** Los caracteres con acentos se ven mal (ej: "gestiÃ³n" en lugar de "gestión").

**Solución:**
```bash
# Aplicar fix de UTF8
mysql -u root -p artyco_financial_rbac < database/migrations/utf8_fix.sql
```

### Diferencias entre Ambientes

**Problema:** La base de datos funciona en una máquina pero no en otra.

**Solución:**
1. Verifica que ambas usan el mismo schema base:
   ```bash
   mysql -u root -p artyco_financial_rbac -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='artyco_financial_rbac';"
   ```
   Debe mostrar: **33 tablas**

2. Compara las versiones de MySQL:
   ```bash
   mysql --version
   ```

3. Regenera el schema desde la máquina que funciona y aplícalo en la otra

### Permisos de Usuario

**Problema:** No puedes crear la base de datos.

**Solución:**
```bash
# Conectar como root
mysql -u root -p

# Crear usuario y dar permisos
CREATE USER 'artyco_user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON artyco_financial_rbac.* TO 'artyco_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 📚 Recursos Adicionales

- **Análisis Detallado:** Ver `MIGRACIONES_ANALISIS.md` en la raíz del proyecto
- **Scripts Legacy:** Consultar `database/legacy/` solo para referencia
- **Documentación MySQL:** https://dev.mysql.com/doc/

---

## 🔗 Sincronización con OneDrive

Este proyecto se sincroniza automáticamente entre máquinas via OneDrive. Para asegurar consistencia:

1. **Siempre usa el schema base actualizado** (`schema/000_base_schema.sql`)
2. **NO apliques scripts legacy** en nuevas instalaciones
3. **Documenta cambios importantes** en este README
4. **Haz backups antes de cambios grandes**

---

## ✅ Checklist de Instalación

- [ ] Instalar MySQL 8.0+
- [ ] Crear base de datos `artyco_financial_rbac`
- [ ] Aplicar `schema/000_base_schema.sql`
- [ ] Aplicar `database/init/02-create-views.sql`
- [ ] (Opcional) Aplicar datos de prueba
- [ ] Verificar 33 tablas creadas
- [ ] Verificar usuario admin existe
- [ ] Probar conexión desde la aplicación

---

**Mantenido por:** Equipo Artyco Financial
**Última revisión de migraciones:** 2025-11-12
