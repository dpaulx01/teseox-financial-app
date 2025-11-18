#!/usr/bin/env python3
"""
Move legacy production uploads into the new /uploads/company_{id}/production structure.
"""
from __future__ import annotations

import argparse
import shutil
from collections import defaultdict
from pathlib import Path

from database.connection import SessionLocal
from models import ProductionQuote, Company, User  # Import all related models to resolve relationships
from models.sales import SalesTransaction  # Import explicitly for relationship resolution
from utils.file_storage import FileStorageService
from config import Config


def migrate_production_uploads(dry_run: bool = False) -> dict:
    session = SessionLocal()
    legacy_root = Path(Config.UPLOAD_DIR) / "production"
    storage = FileStorageService(namespace="production")
    summary = defaultdict(int)
    moved_files = []

    try:
        quotes = session.query(
            ProductionQuote.company_id,
            ProductionQuote.nombre_archivo_pdf,
            ProductionQuote.numero_cotizacion,
        ).filter(
            ProductionQuote.nombre_archivo_pdf.isnot(None),
            ProductionQuote.nombre_archivo_pdf != ""
        ).all()

        for company_id, filename, numero_cotizacion in quotes:
            if not company_id or not filename:
                summary["skipped_missing"] += 1
                continue

            legacy_path = legacy_root / filename
            target_path = storage.build_path(company_id, filename, ensure_parent=True)

            if target_path.exists():
                if legacy_path.exists():
                    if not dry_run:
                        legacy_path.unlink()
                summary["already_migrated"] += 1
                continue

            if not legacy_path.exists():
                summary["missing_legacy"] += 1
                continue

            summary["candidates"] += 1
            moved_files.append((legacy_path, target_path, company_id, numero_cotizacion))

        if dry_run:
            return {
                "dry_run": True,
                "summary": dict(summary),
                "moves": [(str(src), str(dst), cid, quote) for src, dst, cid, quote in moved_files],
            }

        for src, dst, cid, quote in moved_files:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            summary["migrated"] += 1

        summary["dry_run"] = False
        return dict(summary)
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Migrar archivos legacy a carpetas por tenant.")
    parser.add_argument("--dry-run", action="store_true", help="Mostrar movimientos sin ejecutar cambios.")
    args = parser.parse_args()

    result = migrate_production_uploads(dry_run=args.dry_run)
    if args.dry_run:
        print("=== DRY RUN - MIGRACIÓN PROPUESTA ===")
        for move in result.get("moves", []):
            src, dst, cid, quote = move
            print(f"[company {cid}] {src} -> {dst} (cotización {quote})")
    print("=== RESUMEN ===")
    for key, value in result.items():
        if key == "moves":
            continue
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
