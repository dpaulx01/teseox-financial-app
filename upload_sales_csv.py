#!/usr/bin/env python3
"""
Script para cargar el CSV de ventas al módulo BI
"""
import argparse
import requests
import sys
from pathlib import Path

API_BASE = "http://localhost:8001"
CSV_FILE = "BD Artyco Ventas Costos.csv"

def parse_args():
    parser = argparse.ArgumentParser(description="Subir CSV de ventas al módulo BI.")
    parser.add_argument(
        "--file",
        default=CSV_FILE,
        help="Ruta del archivo CSV (por defecto: 'BD Artyco Ventas Costos.csv')."
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Elimina los registros existentes antes de importar."
    )
    return parser.parse_args()


def main():
    args = parse_args()

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
    print(f"\n📤 Subiendo archivo: {args.file}")
    csv_path = Path(args.file)

    if not csv_path.exists():
        print(f"✗ Archivo no encontrado: {CSV_FILE}")
        return 1

    try:
        with open(csv_path, 'rb') as f:
            files = {'file': (csv_path.name, f, 'text/csv')}
            headers = {'Authorization': f'Bearer {token}'}
            data = {'overwrite': 'true' if args.overwrite else 'false'}

            response = requests.post(
                f"{API_BASE}/api/sales-bi/upload/csv",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )

            print(f"\n📊 Respuesta del servidor (Status {response.status_code}):")

            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("✓ Carga exitosa!")
                    print(f"  • Registros agregados: {data.get('total_uploaded', 0)}")
                    if data.get('deleted_previous') is not None:
                        print(f"  • Registros eliminados antes de importar: {data['deleted_previous']}")
                    if data.get('duplicates_skipped_count'):
                        print(f"  • Duplicados omitidos: {data['duplicates_skipped_count']}")
                    if data.get('errors'):
                        print(f"  ⚠ Errores: {len(data['errors'])}")
                    if data.get('warnings'):
                        for warning in data['warnings']:
                            print(f"  ⚠ Aviso: {warning}")
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
