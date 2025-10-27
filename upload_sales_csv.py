#!/usr/bin/env python3
"""
Script para cargar el CSV de ventas al módulo BI
"""
import requests
import sys
from pathlib import Path

API_BASE = "http://localhost:8001"
CSV_FILE = "BD Artyco Ventas Costos.csv"

def main():
    print("🔐 Iniciando sesión...")

    # Login
    try:
        login_response = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        login_response.raise_for_status()
        token = login_response.json()["access_token"]
        print("✓ Login exitoso")
    except Exception as e:
        print(f"✗ Error en login: {e}")
        return 1

    # Upload CSV
    print(f"\n📤 Subiendo archivo: {CSV_FILE}")
    csv_path = Path(CSV_FILE)

    if not csv_path.exists():
        print(f"✗ Archivo no encontrado: {CSV_FILE}")
        return 1

    try:
        with open(csv_path, 'rb') as f:
            files = {'file': (csv_path.name, f, 'text/csv')}
            headers = {'Authorization': f'Bearer {token}'}

            response = requests.post(
                f"{API_BASE}/api/sales-bi/upload/csv",
                files=files,
                headers=headers,
                timeout=120
            )

            print(f"\n📊 Respuesta del servidor (Status {response.status_code}):")

            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("✓ Carga exitosa!")
                    print(f"  • Registros procesados: {data.get('records_processed', 0)}")
                    print(f"  • Registros insertados: {data.get('records_inserted', 0)}")
                    if data.get('errors'):
                        print(f"  ⚠ Errores: {len(data['errors'])}")
                else:
                    print(f"✗ Error: {data.get('message', 'Unknown error')}")
                    return 1
            else:
                print(f"✗ Error HTTP: {response.status_code}")
                print(response.text)
                return 1

    except Exception as e:
        print(f"✗ Error al cargar CSV: {e}")
        return 1

    print("\n✅ Proceso completado. Ahora puedes ver los datos en el dashboard BI.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
