#!/usr/bin/env python3
"""
Script para verificar qué registros del CSV ya existen en la base de datos
"""
import csv
import pymysql
from decimal import Decimal

# Conectar a la base de datos
conn = pymysql.connect(
    host='127.0.0.1',
    port=3307,
    user='artyco_user',
    password='artyco_password123',
    database='artyco_financial_rbac'
)

cursor = conn.cursor()

# Obtener todos los pares (factura, producto) de la BD
print("Obteniendo registros existentes de la base de datos...")
cursor.execute("SELECT numero_factura, producto FROM sales_transactions WHERE company_id = 1")
existing_keys = {(row[0], row[1]) for row in cursor.fetchall()}
print(f"Total de combinaciones en BD: {len(existing_keys)}")

# Leer el CSV
csv_file = 'BD Artyco Ventas Costos.csv'
print(f"\nLeyendo archivo CSV: {csv_file}")

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    rows = list(reader)

print(f"Total de filas en CSV: {len(rows)}")

# Analizar duplicados
csv_keys = []
duplicates_in_db = 0
duplicates_in_csv = 0
new_records = 0
seen_in_csv = set()

for idx, row in enumerate(rows, start=2):
    invoice = row.get('# Factura', '').strip()
    product = row.get('Producto', '').strip()
    key = (invoice, product)

    csv_keys.append(key)

    # Verificar si ya existe en la BD
    if key in existing_keys:
        duplicates_in_db += 1
    else:
        new_records += 1
        print(f"  Línea {idx}: NUEVO - Factura: {invoice}, Producto: {product[:40]}...")

    # Verificar duplicados dentro del mismo CSV
    if key in seen_in_csv:
        duplicates_in_csv += 1
    else:
        seen_in_csv.add(key)

print(f"\n=== RESUMEN ===")
print(f"Total filas en CSV: {len(rows)}")
print(f"Combinaciones únicas en CSV: {len(seen_in_csv)}")
print(f"Duplicados DENTRO del CSV: {duplicates_in_csv}")
print(f"Registros que YA existen en BD: {duplicates_in_db}")
print(f"Registros NUEVOS (no en BD): {new_records}")

# Verificar algunas facturas específicas
print("\n=== VERIFICACIÓN DE MUESTRAS ===")
sample_invoices = ['001-001-000000910', '001-001-000000128', '001-001-000000900']
for inv in sample_invoices:
    count_csv = sum(1 for k in csv_keys if k[0] == inv)
    count_db = sum(1 for k in existing_keys if k[0] == inv)
    print(f"Factura {inv}: {count_csv} líneas en CSV, {count_db} en BD")

conn.close()
