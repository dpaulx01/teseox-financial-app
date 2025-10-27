#!/usr/bin/env python3
"""
Script para importar CSV de ventas al módulo BI
Uso: python3 scripts/import_sales_csv.py "BD Artyco Ventas Costos.csv"
"""
import sys
import requests
from pathlib import Path

def import_sales_csv(csv_path: str, api_base: str = 'http://localhost:8001'):
    """Importar CSV de ventas via API"""

    # Login primero
    print("🔐 Autenticando...")
    login_response = requests.post(
        f'{api_base}/api/auth/login',
        json={'username': 'admin', 'password': 'admin123'}
    )

    if login_response.status_code != 200:
        print("❌ Error de autenticación")
        return False

    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Subir CSV
    print(f"📤 Subiendo archivo: {csv_path}")
    csv_file = Path(csv_path)

    if not csv_file.exists():
        print(f"❌ Archivo no encontrado: {csv_path}")
        return False

    with open(csv_file, 'rb') as f:
        files = {'file': (csv_file.name, f, 'text/csv')}

        response = requests.post(
            f'{api_base}/api/sales-bi/upload/csv',
            headers=headers,
            files=files
        )

    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}")
        print(f"   Total cargado: {result['total_uploaded']} transacciones")
        if result.get('errors_count', 0) > 0:
            print(f"   Errores: {result['errors_count']}")
        return True
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python3 scripts/import_sales_csv.py <archivo.csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    success = import_sales_csv(csv_path)
    sys.exit(0 if success else 1)
