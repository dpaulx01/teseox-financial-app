#!/usr/bin/env python3
"""
Quick validation script to ensure tenant uploads exist on disk.
"""
from __future__ import annotations

import argparse
from database.connection import SessionLocal
from models import ProductionQuote, Company, User  # Import all related models
from models.sales import SalesTransaction  # Import explicitly for relationship resolution
from utils.file_storage import FileStorageService


def verify_production_uploads() -> dict:
    session = SessionLocal()
    storage = FileStorageService(namespace="production")
    missing = []

    try:
        quotes = session.query(
            ProductionQuote.company_id,
            ProductionQuote.numero_cotizacion,
            ProductionQuote.nombre_archivo_pdf,
        ).filter(
            ProductionQuote.nombre_archivo_pdf.isnot(None),
            ProductionQuote.nombre_archivo_pdf != ""
        ).all()

        for company_id, numero_cotizacion, filename in quotes:
            if not company_id or not filename:
                continue
            expected = storage.resolve(company_id, filename)
            if not expected.exists():
                missing.append({
                    "company_id": company_id,
                    "cotizacion": numero_cotizacion,
                    "filename": filename,
                    "expected_path": str(expected)
                })

        return {"missing": missing, "total_checked": len(quotes)}
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Verifica que los archivos por tenant existan.")
    parser.parse_args()
    result = verify_production_uploads()
    print(f"Total registros revisados: {result['total_checked']}")
    if not result["missing"]:
        print("✅ Todos los archivos asociados a cotizaciones existen en el storage segregado.")
        return

    print("⚠️ Archivos faltantes detectados:")
    for item in result["missing"]:
        print(
            f"- tenant={item['company_id']} cotizacion={item['cotizacion']} "
            f"archivo={item['filename']} esperado={item['expected_path']}"
        )


if __name__ == "__main__":
    main()
