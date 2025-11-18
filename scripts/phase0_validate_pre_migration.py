#!/usr/bin/env python3
"""
FASE 0: Validación Pre-Migración Multitenant
Fecha: 2025-11-14
Propósito: Verificar estado actual de la base de datos ANTES de migraciones
"""

import sys
import pymysql
from datetime import datetime
from collections import defaultdict

# Configuración de conexión (local Docker)
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3307,
    'user': 'artyco_user',
    'password': 'artyco_password123',
    'database': 'artyco_financial_rbac',
    'charset': 'utf8mb4'
}

# Colores para terminal
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    MAGENTA = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{Colors.CYAN}{'=' * 80}{Colors.NC}")
    print(f"{Colors.WHITE}{text.center(80)}{Colors.NC}")
    print(f"{Colors.CYAN}{'=' * 80}{Colors.NC}\n")

def print_section(text):
    print(f"\n{Colors.BLUE}{'─' * 80}{Colors.NC}")
    print(f"{Colors.YELLOW}{text}{Colors.NC}")
    print(f"{Colors.BLUE}{'─' * 80}{Colors.NC}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.NC}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.NC}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.NC}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.NC}")

def connect_db():
    """Conectar a la base de datos"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        print_success(f"Conectado a {DB_CONFIG['database']} en {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        return conn
    except Exception as e:
        print_error(f"Error de conexión: {e}")
        sys.exit(1)

def check_tables_exist(cursor, required_tables):
    """Verificar que las tablas críticas existen"""
    print_section("1. VERIFICACIÓN DE TABLAS CRÍTICAS")

    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s
        AND table_type = 'BASE TABLE'
    """, (DB_CONFIG['database'],))

    existing_tables = {row[0] for row in cursor.fetchall()}

    missing_tables = []
    for table in required_tables:
        if table in existing_tables:
            print_success(f"Tabla '{table}' existe")
        else:
            print_error(f"Tabla '{table}' NO EXISTE")
            missing_tables.append(table)

    if missing_tables:
        print_error(f"\nFaltan {len(missing_tables)} tablas críticas")
        return False
    else:
        print_success(f"\nTodas las {len(required_tables)} tablas críticas existen")
        return True

def check_company_id_columns(cursor):
    """Verificar qué tablas tienen company_id y cuáles no"""
    print_section("2. ANÁLISIS DE COLUMNA company_id")

    critical_tables = [
        'users', 'cotizaciones', 'productos', 'pagos',
        'plan_diario_produccion', 'financial_scenarios',
        'sales_transactions', 'financial_data', 'balance_data',
        'raw_account_data', 'sales_alerts', 'sales_kpis_cache'
    ]

    tables_with_company_id = []
    tables_without_company_id = []

    for table in critical_tables:
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = %s
            AND table_name = %s
            AND column_name = 'company_id'
        """, (DB_CONFIG['database'], table))

        has_column = cursor.fetchone()[0] > 0

        if has_column:
            tables_with_company_id.append(table)
            print_success(f"'{table}' tiene company_id")
        else:
            tables_without_company_id.append(table)
            print_error(f"'{table}' NO tiene company_id")

    print(f"\n{Colors.WHITE}Resumen:{Colors.NC}")
    print(f"  ✅ Con company_id: {len(tables_with_company_id)}/{len(critical_tables)} ({len(tables_with_company_id)*100//len(critical_tables)}%)")
    print(f"  ❌ Sin company_id: {len(tables_without_company_id)}/{len(critical_tables)} ({len(tables_without_company_id)*100//len(critical_tables)}%)")

    return tables_without_company_id

def check_foreign_keys(cursor, tables_with_company_id):
    """Verificar qué tablas tienen FK a companies"""
    print_section("3. VERIFICACIÓN DE FOREIGN KEYS")

    tables_with_fk = []
    tables_without_fk = []

    for table in tables_with_company_id:
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.key_column_usage
            WHERE table_schema = %s
            AND table_name = %s
            AND column_name = 'company_id'
            AND referenced_table_name = 'companies'
        """, (DB_CONFIG['database'], table))

        has_fk = cursor.fetchone()[0] > 0

        if has_fk:
            tables_with_fk.append(table)
            print_success(f"'{table}' tiene FK a companies")
        else:
            tables_without_fk.append(table)
            print_warning(f"'{table}' NO tiene FK a companies")

    print(f"\n{Colors.WHITE}Resumen:{Colors.NC}")
    print(f"  ✅ Con FK: {len(tables_with_fk)}/{len(tables_with_company_id)} ({len(tables_with_fk)*100//len(tables_with_company_id) if tables_with_company_id else 0}%)")
    print(f"  ⚠️  Sin FK: {len(tables_without_fk)}/{len(tables_with_company_id)}")

    return tables_without_fk

def check_orphaned_records(cursor, tables_with_company_id):
    """Verificar registros con company_id inválidos (huérfanos)"""
    print_section("4. VERIFICACIÓN DE REGISTROS HUÉRFANOS")

    orphaned_found = False

    for table in tables_with_company_id:
        try:
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM {table}
                WHERE company_id IS NULL
                OR company_id NOT IN (SELECT id FROM companies)
            """)

            orphaned_count = cursor.fetchone()[0]

            if orphaned_count > 0:
                print_error(f"'{table}': {orphaned_count} registros huérfanos")
                orphaned_found = True
            else:
                print_success(f"'{table}': Sin registros huérfanos")
        except Exception as e:
            print_warning(f"'{table}': Error al verificar - {e}")

    if not orphaned_found:
        print_success("\nNingún registro huérfano encontrado")
    else:
        print_error("\n⚠️  CRÍTICO: Hay registros huérfanos que fallarán al agregar FK")

    return orphaned_found

def check_data_counts(cursor):
    """Contar registros en tablas críticas"""
    print_section("5. CONTEO DE DATOS ACTUALES")

    tables_to_count = [
        'companies', 'users', 'cotizaciones', 'productos', 'pagos',
        'plan_diario_produccion', 'sales_transactions', 'financial_data'
    ]

    data_summary = {}

    for table in tables_to_count:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            data_summary[table] = count

            if count > 0:
                print_info(f"'{table}': {count} registros")
            else:
                print_warning(f"'{table}': Tabla vacía")
        except Exception as e:
            print_error(f"'{table}': Error - {e}")
            data_summary[table] = 0

    return data_summary

def check_companies_table(cursor):
    """Verificar estado de la tabla companies"""
    print_section("6. ANÁLISIS DE TABLA COMPANIES")

    # Verificar si existe
    cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = %s AND table_name = 'companies'
    """, (DB_CONFIG['database'],))

    if cursor.fetchone()[0] == 0:
        print_error("Tabla 'companies' NO EXISTE")
        return False

    print_success("Tabla 'companies' existe")

    # Verificar columnas SaaS
    required_saas_columns = ['slug', 'is_active', 'subscription_tier', 'subscription_expires_at', 'max_users']

    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = 'companies'
    """, (DB_CONFIG['database'],))

    existing_columns = {row[0] for row in cursor.fetchall()}

    print(f"\n{Colors.WHITE}Columnas SaaS:{Colors.NC}")
    for col in required_saas_columns:
        if col in existing_columns:
            print_success(f"Columna '{col}' existe")
        else:
            print_warning(f"Columna '{col}' NO existe (se agregará)")

    # Contar empresas
    cursor.execute("SELECT COUNT(*) FROM companies")
    count = cursor.fetchone()[0]
    print(f"\n{Colors.WHITE}Total empresas:{Colors.NC} {count}")

    if count == 0:
        print_warning("No hay empresas registradas (se creará empresa por defecto)")
        return False

    # Verificar si existe empresa id=1
    cursor.execute("SELECT COUNT(*) FROM companies WHERE id = 1")
    has_default = cursor.fetchone()[0] > 0

    if has_default:
        print_success("Empresa por defecto (id=1) existe")
        return True
    else:
        print_warning("Empresa por defecto (id=1) NO existe (se creará)")
        return False

def generate_report(results):
    """Generar reporte final de validación"""
    print_header("REPORTE DE VALIDACIÓN PRE-MIGRACIÓN")

    errors = results.get('errors', [])
    warnings = results.get('warnings', [])

    print(f"{Colors.WHITE}Estado General:{Colors.NC}")
    print(f"  • Tablas verificadas: {results.get('tables_verified', 0)}")
    print(f"  • Tablas con company_id: {results.get('tables_with_company_id', 0)}")
    print(f"  • Tablas sin company_id: {results.get('tables_without_company_id', 0)}")
    print(f"  • Tablas con FK: {results.get('tables_with_fk', 0)}")
    print(f"  • Tablas sin FK: {results.get('tables_without_fk', 0)}")
    print(f"  • Registros huérfanos: {'SÍ' if results.get('has_orphans') else 'NO'}")
    print(f"  • Empresa por defecto: {'SÍ' if results.get('has_default_company') else 'NO'}")

    print(f"\n{Colors.WHITE}Datos Actuales:{Colors.NC}")
    for table, count in results.get('data_counts', {}).items():
        print(f"  • {table}: {count} registros")

    if errors:
        print(f"\n{Colors.RED}❌ ERRORES CRÍTICOS ({len(errors)}):{Colors.NC}")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")

    if warnings:
        print(f"\n{Colors.YELLOW}⚠️  ADVERTENCIAS ({len(warnings)}):{Colors.NC}")
        for i, warning in enumerate(warnings, 1):
            print(f"  {i}. {warning}")

    if not errors and not warnings:
        print_success("\n🎉 ¡Sistema listo para migración!")
        return True
    elif errors:
        print_error("\n🚫 Sistema NO está listo para migración. Corregir errores primero.")
        return False
    else:
        print_warning("\n⚠️  Sistema puede migrarse pero con precauciones.")
        return True

def main():
    """Función principal"""
    print_header(f"VALIDACIÓN PRE-MIGRACIÓN MULTITENANT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Conectar a BD
    conn = connect_db()
    cursor = conn.cursor()

    results = {
        'errors': [],
        'warnings': [],
        'data_counts': {}
    }

    # 1. Verificar tablas críticas
    critical_tables = [
        'companies', 'users', 'cotizaciones', 'productos', 'pagos',
        'plan_diario_produccion', 'financial_scenarios', 'sales_transactions',
        'financial_data', 'balance_data', 'raw_account_data'
    ]

    if not check_tables_exist(cursor, critical_tables):
        results['errors'].append("Faltan tablas críticas")
    results['tables_verified'] = len(critical_tables)

    # 2. Verificar company_id
    tables_without_company_id = check_company_id_columns(cursor)
    results['tables_without_company_id'] = len(tables_without_company_id)
    results['tables_with_company_id'] = len(critical_tables) - len(tables_without_company_id)

    if tables_without_company_id:
        results['warnings'].append(f"{len(tables_without_company_id)} tablas necesitan columna company_id")

    # 3. Verificar FKs
    tables_with_company_id = [t for t in critical_tables if t not in tables_without_company_id]
    tables_without_fk = check_foreign_keys(cursor, tables_with_company_id)
    results['tables_without_fk'] = len(tables_without_fk)
    results['tables_with_fk'] = len(tables_with_company_id) - len(tables_without_fk)

    if tables_without_fk:
        results['warnings'].append(f"{len(tables_without_fk)} tablas necesitan FK a companies")

    # 4. Verificar registros huérfanos
    has_orphans = check_orphaned_records(cursor, tables_with_company_id)
    results['has_orphans'] = has_orphans

    if has_orphans:
        results['errors'].append("Existen registros huérfanos que impedirán agregar FKs")

    # 5. Contar datos
    results['data_counts'] = check_data_counts(cursor)

    # 6. Verificar companies
    has_default_company = check_companies_table(cursor)
    results['has_default_company'] = has_default_company

    if not has_default_company:
        results['warnings'].append("Necesita crear empresa por defecto (id=1)")

    # Cerrar conexión
    cursor.close()
    conn.close()

    # Generar reporte
    success = generate_report(results)

    # Guardar reporte en archivo
    report_file = f"database/backups/multitenant/validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    import os
    os.makedirs(os.path.dirname(report_file), exist_ok=True)

    with open(report_file, 'w') as f:
        f.write(f"REPORTE DE VALIDACIÓN PRE-MIGRACIÓN\n")
        f.write(f"{'=' * 80}\n")
        f.write(f"Fecha: {datetime.now()}\n\n")
        f.write(f"Estado: {'LISTO' if success else 'NO LISTO'}\n")
        f.write(f"Errores: {len(results['errors'])}\n")
        f.write(f"Advertencias: {len(results['warnings'])}\n")
        f.write(f"\nResultados:\n")
        for key, value in results.items():
            f.write(f"  {key}: {value}\n")

    print_info(f"\nReporte guardado en: {report_file}")

    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
