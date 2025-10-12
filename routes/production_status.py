"""
Rutas para el módulo Status Producción.

Permite cargar cotizaciones en PDF, extraer sus líneas de producto y gestionar
el estado operativo (fechas, estatus, notas, pagos) de cada ítem.
"""
from __future__ import annotations

import io
import re
import unicodedata
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import List, Optional, Set, Tuple

import pdfplumber
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

try:
    import pandas as pd
except ImportError:  # pragma: no cover - optional dependency
    pd = None

from auth.dependencies import get_current_user
from config import Config
from database.connection import get_db
from models import User
from models.production import (
    ProductionPayment,
    ProductionProduct,
    ProductionQuote,
    ProductionStatusEnum,
)


router = APIRouter(prefix="/production", tags=["Status Producción"])

UPLOAD_DIR = Path(Config.UPLOAD_DIR) / "production"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATUS_CHOICES = {status.value for status in ProductionStatusEnum}

_METADATA_KEYWORDS = (
    "TIEMPO DE PRODUCCION",
    "TIEMPO ESTIMADO",
    "DIAS CALENDARIO",
    "DIAS HABILES",
    "ENTREGA ESTIMADA",
    "CONDICIONES DE PAGO",
    "CONDICIONES GENERALES",
    "OBSERVACIONES",
    "PROGRAMACION",
    "DESPACHO",
    "REFERENCIA TRANSPORTE",
)


def _is_metadata_description(descripcion: str | None, odc_value: Optional[str]) -> bool:
    normalized = _strip_accents(descripcion or "").upper()
    if not normalized:
        return False
    normalized_compact = re.sub(r"\s+", " ", normalized)
    normalized_clean = re.sub(r"[^A-Z0-9]", "", normalized)
    if odc_value:
        odc_clean = re.sub(r"[^A-Z0-9]", "", _strip_accents(odc_value).upper())
        if odc_clean and odc_clean in normalized_clean:
            return True
    if any(keyword in normalized for keyword in _METADATA_KEYWORDS):
        return True
    if "||" in (descripcion or ""):
        return True
    if re.match(r"^(?:ODC|ORDEN\s+DE\s+COMPRA)\b", normalized_compact):
        return True
    return False


# ---------------------------------------------------------------------------
# Utilidades de parsing
# ---------------------------------------------------------------------------

def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _clean_line(line: str) -> str:
    line = _strip_accents(line or "")
    return re.sub(r"\s+", " ", line).strip()


def _parse_decimal(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None

    normalized = re.sub(r"[^\d,.\-]", "", cleaned)
    if normalized in {"", "-", ".", ",", "-.", "-,"}:
        return None

    sign = ""
    if normalized.startswith("-"):
        sign = "-"
        normalized = normalized[1:]

    if not normalized:
        return None

    separator_positions = [idx for idx, ch in enumerate(normalized) if ch in {".", ","}]

    if separator_positions:
        last_sep_index = separator_positions[-1]
        int_part_raw = normalized[:last_sep_index]
        frac_part_raw = normalized[last_sep_index + 1 :]

        int_digits = re.sub(r"[^\d]", "", int_part_raw)
        frac_digits = re.sub(r"[^\d]", "", frac_part_raw)

        if frac_digits:
            candidate = f"{sign}{int_digits or '0'}.{frac_digits}"
        else:
            candidate = f"{sign}{int_digits}{frac_digits}"
    else:
        candidate = f"{sign}{normalized}"

    try:
        return Decimal(candidate)
    except InvalidOperation:
        return None


def _extract_text_from_pdf(content: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
    except Exception as exc:  # pragma: no cover - handled as HTTP error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer el PDF: {exc}",
        ) from exc

    text = "\n".join(pages).strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El PDF no contiene texto legible para el parser.",
        )
    return text


def _detect_product_lines(lines: List[str]) -> List[str]:
    header_index = next(
        (
            idx
            for idx, line in enumerate(lines)
            if ("DESCRIPCION" in line.upper() or "DESCRIPCIÓN" in line.upper())
            and ("SUBTOTAL" in line.upper() or "VALOR" in line.upper())
        ),
        -1,
    )
    if header_index == -1:
        return []

    product_lines: List[str] = []
    for line in lines[header_index + 1 :]:
        if re.match(r"^(TOTAL|SALDO|OBSERVACIONES|CONDICIONES)", line, re.IGNORECASE):
            break
        product_lines.append(line)
    return product_lines


def _chunk_items(product_lines: List[str]) -> List[str]:
    """
    Agrupa líneas de productos cuando se dividen en varias líneas.
    """
    items: List[str] = []
    current: Optional[str] = None

    for line in product_lines:
        match = re.match(r"^(\d+)\s+(.+)", line)
        if match:
            if current:
                items.append(current.strip())
            current = match.group(2)
        elif current:
            current = f"{current} {line}"

    if current:
        items.append(current.strip())

    return items


def _parse_product_line(content: str) -> Optional[dict]:
    subtotal_match = re.search(r"(\$?\s?[0-9\.,]+)\s*$", content)
    subtotal_raw = subtotal_match.group(1) if subtotal_match else None
    without_subtotal = (
        content[: subtotal_match.start()].strip() if subtotal_match else content
    )

    quantity_match = re.search(
        r"([0-9\.,]+\s*(?:m2|m3|m|kg|lb|l|lts?|unidad(?:es)?|un|u|ud|uds|pz|pzs|pieza(?:s)?|kit|box|rollo(?:s)?|set(?:s)?|bulto(?:s)?|gl|gal|pack|hrs?|horas?)?)$",
        without_subtotal,
        re.IGNORECASE,
    )

    if quantity_match:
        cantidad_raw = quantity_match.group(1)
        descripcion = without_subtotal[: quantity_match.start()].strip()
    else:
        cantidad_raw = None
        descripcion = without_subtotal.strip()

    valor_subtotal = _parse_decimal(subtotal_raw)
    if not descripcion or valor_subtotal is None:
        return None

    return {
        "descripcion": descripcion,
        "cantidad": cantidad_raw,
        "valor_subtotal": valor_subtotal,
    }


def _parse_products(lines: List[str]) -> List[dict]:
    product_lines = _detect_product_lines(lines)
    if not product_lines:
        return []
    chunks = _chunk_items(product_lines)
    products = []
    for chunk in chunks:
        parsed = _parse_product_line(chunk)
        if parsed:
            products.append(parsed)
    return products


def _parse_total(text: str) -> Optional[Decimal]:
    lines = text.splitlines()
    primary_matches: List[Decimal] = []
    fallback_matches: List[Decimal] = []

    for line in lines:
        normalized = line.strip()
        if not normalized:
            continue
        if re.match(r'^\s*(TOTAL|GRAN\s+TOTAL|SALDO)\b', normalized, re.IGNORECASE):
            value = _parse_decimal(normalized.split(':')[-1])
            if value is not None:
                primary_matches.append(value)
        elif re.search(r'TOTAL', normalized, re.IGNORECASE):
            value = _parse_decimal(normalized.split(':')[-1])
            if value is not None:
                fallback_matches.append(value)

    if primary_matches:
        return max(primary_matches)
    if fallback_matches:
        return max(fallback_matches)

    return None


def _extract_table_products(content: bytes) -> List[dict]:
    productos: List[dict] = []
    seen: Set[Tuple[str, str, Decimal]] = set()
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    if not table or len(table) < 2:
                        continue

                    header_info = None
                    for idx, raw_header in enumerate(table[:5]):
                        header_cells = [_clean_line(str(cell)) for cell in raw_header if cell is not None]
                        normalized_headers = [_strip_accents(cell).upper() for cell in header_cells]
                        if not header_cells:
                            continue
                        if any('DESCRIPCION' in cell or 'DESCRIPCIÓN' in cell for cell in normalized_headers) and any(
                            'SUBTOTAL' in cell or 'TOTAL' in cell or 'VALOR' in cell for cell in normalized_headers
                        ):
                            header_info = (idx, header_cells, normalized_headers)
                            break

                    if not header_info:
                        continue

                    header_idx, header_cells, normalized_headers = header_info

                    def _find_index(targets: List[str]) -> Optional[int]:
                        for target in targets:
                            for idx2, header in enumerate(normalized_headers):
                                if target in header:
                                    return idx2
                        return None

                    desc_idx = _find_index(['DESCRIPCION', 'DESCRIPCIÓN'])
                    qty_idx = _find_index(['CANTIDAD'])
                    unit_idx = _find_index(['UNIDAD'])
                    subtotal_idx = _find_index(['SUBTOTAL', 'TOTAL', 'VALOR'])

                    if desc_idx is None or subtotal_idx is None:
                        continue

                    for raw_row in table[header_idx + 1 :]:
                        if not raw_row:
                            continue
                        cells = [_clean_line(str(cell)) for cell in raw_row]
                        if len(cells) < len(header_cells):
                            cells.extend([''] * (len(header_cells) - len(cells)))
                        if not cells:
                            continue

                        joined_upper = " ".join(cells).upper()
                        if joined_upper.startswith('TOTAL') or joined_upper.startswith('SUBTOTAL'):
                            continue

                        descripcion = cells[desc_idx] if desc_idx < len(cells) else ''
                        if not descripcion or descripcion.upper().startswith('TOTAL'):
                            continue

                        quantity_value = cells[qty_idx] if qty_idx is not None and qty_idx < len(cells) else ''
                        unit_value = cells[unit_idx] if unit_idx is not None and unit_idx < len(cells) else ''
                        quantity_text = " ".join(filter(None, [quantity_value, unit_value])).strip()
                        quantity_text = quantity_text or None

                        subtotal_candidate = cells[subtotal_idx] if subtotal_idx < len(cells) else ''
                        subtotal = _parse_decimal(subtotal_candidate)
                        if subtotal is None:
                            for candidate in reversed(cells):
                                subtotal = _parse_decimal(candidate)
                                if subtotal is not None:
                                    break

                        if subtotal is None:
                            continue

                        key = (descripcion.lower(), (quantity_text or '').lower(), subtotal)
                        if key in seen:
                            continue
                        seen.add(key)

                        productos.append(
                            {
                                "descripcion": descripcion,
                                "cantidad": quantity_text,
                                "valor_subtotal": subtotal,
                            }
                        )
    except Exception:
        return []
    return productos


def parse_quote_pdf(content: bytes) -> dict:
    text = _extract_text_from_pdf(content)
    normalized_text = _strip_accents(text)
    lines = [_clean_line(line) for line in normalized_text.split("\n") if line.strip()]

    def _search(pattern: str) -> Optional[str]:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            return _clean_line(match.group(1))
        return None

    quote_number = _search(r"COTIZACION:\s*No\.?\s*([A-Za-z0-9\-]+)")
    if not quote_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontró el número de cotización en el PDF.",
        )

    productos = _parse_products(lines)
    if not productos:
        productos = _extract_table_products(content)
    if not productos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontraron líneas de producto en el PDF.",
        )

    valor_total = _parse_total(normalized_text)
    if valor_total is None:
        valor_total = sum(item["valor_subtotal"] for item in productos)

    return {
        "numero_cotizacion": quote_number,
        "cliente": _search(r"Cliente:\s*(.+)"),
        "contacto": _search(r"ATENCION:\s*(.+)"),
        "proyecto": _search(r"PROYECTO:\s*(.+)"),
        "odc": _search(r"Referencia:\s*ODC:\s*([A-Za-z0-9\-]+)"),
        "valor_total": valor_total,
        "productos": productos,
        "metadata_notes": [],
    }


def _read_excel(content: bytes, filename: str):
    if pd is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "El servidor no tiene instaladas las dependencias para procesar Excel. "
                "Instale pandas, openpyxl y xlrd."
            ),
        )

    buffer = io.BytesIO(content)
    extension = Path(filename or "").suffix.lower()
    engine = None
    if extension == ".xls":
        engine = "xlrd"
    elif extension == ".xlsx":
        engine = "openpyxl"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de archivo no soportado.")

    try:
        df = pd.read_excel(buffer, header=None, dtype=str, engine=engine)
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falta instalar el motor para leer Excel (openpyxl o xlrd).",
        ) from exc
    except ValueError:
        buffer.seek(0)
        df = pd.read_excel(buffer, header=None, dtype=str)

    return df.fillna("")


def parse_quote_excel(content: bytes, filename: str) -> dict:
    df = _read_excel(content, filename)
    values = df.applymap(_clean_line).values.tolist()
    flat_text = "\n".join(" ".join(row) for row in values if any(row))
    normalized_text = _strip_accents(flat_text)

    productos: List[dict] = []
    metadata_notes: List[str] = []
    seen: Set[Tuple[str, str, Decimal]] = set()

    header_idx = None
    header_map: dict[str, int] = {}

    quote_number: Optional[str] = None
    for row in values:
        for cell in row:
            if not cell:
                continue
            normalized_cell = _strip_accents(cell).upper()
            match = re.search(r"COT\s*([A-Z0-9\-\.]+)", normalized_cell)
            if match:
                candidate = match.group(1)
                candidate = re.sub(r"[^\w\-]", "", candidate)
                if candidate:
                    quote_number = candidate
                    break
        if quote_number:
            break

    for idx, row in enumerate(values[:50]):
        normalized_row = [_strip_accents(cell).upper() for cell in row]
        if not normalized_row:
            continue
        if (
            any("CANT" in cell for cell in normalized_row)
            and any("UNID" in cell for cell in normalized_row)
            and any("SUBTOTAL" in cell or "TOTAL" in cell or "VALOR" in cell for cell in normalized_row)
            and (any("BIEN" in cell for cell in normalized_row) or any("DESCRIP" in cell for cell in normalized_row))
        ):
            header_idx = idx
            for col_idx, header in enumerate(normalized_row):
                if any(token in header for token in ["CANT", "CANTIDAD"]):
                    header_map['cantidad'] = col_idx
                if any(token in header for token in ["UNID", "UND", "UNIDAD"]):
                    header_map['unidad'] = col_idx
                if any(token in header for token in ["CODIGO", "CÓDIGO", "ITEM", "PRODUCTO"]):
                    header_map['codigo'] = col_idx
                if any(token in header for token in ["BIEN", "SERVICIO", "DESCRIP"]):
                    header_map['descripcion'] = col_idx
                if any(token in header for token in ["SUBTOTAL", "TOTAL", "VALOR"]):
                    header_map['subtotal'] = col_idx
            break

    if header_idx is None or 'descripcion' not in header_map or 'subtotal' not in header_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudieron identificar las columnas principales en el Excel.",
        )

    _qty_idx = header_map.get('cantidad')
    _unidad_idx = header_map.get('unidad')
    _codigo_idx = header_map.get('codigo')
    _desc_idx = header_map['descripcion']
    _subtotal_idx = header_map['subtotal']

    for row in values[header_idx + 1 :]:
        if not row or not any(row):
            continue
        normalized_row = [_strip_accents(cell).upper() for cell in row]
        if normalized_row and (normalized_row[0].startswith('TOTAL') or normalized_row[0].startswith('SUBTOTAL')):
            break

        cells = [cell if isinstance(cell, str) else str(cell) for cell in row]
        cells = cells + [''] * max(0, _subtotal_idx + 1 - len(cells))
        if len(cells) <= _subtotal_idx:
            cells = cells + [''] * (_subtotal_idx + 1 - len(cells))

        subtotal_cell_raw = cells[_subtotal_idx].strip() if _subtotal_idx < len(cells) else ''
        normalized_subtotal_label = re.sub(
            r"[^A-Z]", "", _strip_accents(subtotal_cell_raw).upper()
        )
        if normalized_subtotal_label.startswith("SUBTOTAL") or normalized_subtotal_label.startswith("TOTAL"):
            continue

        descripcion = cells[_desc_idx].strip() if _desc_idx < len(cells) else ''
        if not descripcion or descripcion.upper().startswith('DESCRIP'):
            continue

        if _is_metadata_description(descripcion, None):
            metadata_value = descripcion.strip()
            if metadata_value:
                metadata_notes.append(metadata_value)
            continue

        subtotal_candidate = subtotal_cell_raw
        subtotal = _parse_decimal(subtotal_candidate)
        if subtotal is None:
            for cell in reversed(cells):
                subtotal = _parse_decimal(cell)
                if subtotal is not None:
                    break
        if subtotal is None:
            continue

        quantity_value = cells[_qty_idx].strip() if _qty_idx is not None and _qty_idx < len(cells) else ''
        unit_value = cells[_unidad_idx].strip() if _unidad_idx is not None and _unidad_idx < len(cells) else ''
        quantity_text = " ".join(filter(None, [quantity_value, unit_value])).strip() or None
        codigo_value = cells[_codigo_idx].strip() if _codigo_idx is not None and _codigo_idx < len(cells) else ''

        if not quantity_text and not codigo_value:
            continue

        key = (descripcion.lower(), (quantity_text or "").lower(), subtotal)
        if key in seen:
            continue
        seen.add(key)

        productos.append(
            {
                "descripcion": descripcion,
                "cantidad": quantity_text,
                "valor_subtotal": subtotal,
            }
        )

    def _search(pattern: str) -> Optional[str]:
        match = re.search(pattern, flat_text, re.IGNORECASE)
        if not match:
            match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            return _clean_line(match.group(1))
        return None

    if not quote_number:
        quote_number = _search(r"COTIZACION[:\s]*No\.?:?\s*([A-Za-z0-9\-]+)")
    if not quote_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontró el número de cotización en el archivo Excel.",
        )

    cliente_value = _search(r"Cliente[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    contacto_value = _search(r"ATENCION[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    proyecto_value = _search(r"PROYECTO[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    odc_value = _search(r"ODC[:\s]*([A-Za-z0-9\-]+)")

    filtered_products = [
        item for item in productos if not _is_metadata_description(item["descripcion"], odc_value)
    ]

    if not filtered_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudieron extraer líneas de productos del Excel.",
        )

    productos = filtered_products

    valor_total = _parse_total(normalized_text)
    if valor_total is None:
        valor_total = sum((item["valor_subtotal"] or Decimal(0) for item in productos), Decimal(0))

    metadata_notes = list(dict.fromkeys(metadata_notes))

    return {
        "numero_cotizacion": quote_number,
        "cliente": cliente_value,
        "contacto": contacto_value,
        "proyecto": proyecto_value,
        "odc": odc_value,
        "valor_total": valor_total,
        "productos": productos,
        "metadata_notes": metadata_notes,
    }


def _safe_filename(name: str) -> str:
    name = re.sub(r"[^\w\-.]", "_", name)
    return name[:120]


def product_to_dict(product: ProductionProduct) -> dict:
    quote = product.cotizacion
    pagos = [
        {
            "id": pago.id,
            "monto": float(pago.monto),
            "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
            "descripcion": pago.descripcion,
        }
        for pago in sorted(quote.pagos, key=lambda p: (p.fecha_pago or date.today(), p.id))
    ]
    total_abonado = float(sum(p["monto"] for p in pagos)) if pagos else 0.0
    if quote.valor_total is not None:
        valor_total = float(quote.valor_total)
    else:
        subtotal_sum = sum(
            float(prod.valor_subtotal) for prod in quote.productos if prod.valor_subtotal is not None
        )
        valor_total = subtotal_sum if subtotal_sum > 0 else None
    saldo_pendiente = max((valor_total or 0.0) - total_abonado, 0.0) if valor_total is not None else None

    metadata_notes: List[str] = []
    seen_notes: Set[str] = set()
    for prod in quote.productos:
        description = (prod.descripcion or "").strip()
        if not description:
            continue
        if not _is_metadata_description(description, quote.odc):
            continue
        if description in seen_notes:
            continue
        seen_notes.add(description)
        metadata_notes.append(description)

    return {
        "id": product.id,
        "cotizacionId": quote.id,
        "numeroCotizacion": quote.numero_cotizacion,
        "cliente": quote.cliente,
        "contacto": quote.contacto,
        "proyecto": quote.proyecto,
        "odc": quote.odc,
        "valorTotal": valor_total,
        "fechaIngreso": quote.fecha_ingreso.isoformat() if quote.fecha_ingreso else None,
        "fechaVencimiento": quote.fecha_vencimiento.isoformat() if quote.fecha_vencimiento else None,
        "archivoOriginal": quote.nombre_archivo_pdf,
        "producto": product.descripcion,
        "cantidad": product.cantidad,
        "valorSubtotal": float(product.valor_subtotal) if product.valor_subtotal is not None else None,
        "fechaEntrega": product.fecha_entrega.isoformat() if product.fecha_entrega else None,
        "estatus": product.estatus.value if product.estatus else None,
        "notasEstatus": product.notas_estatus,
        "factura": product.factura,
        "pagos": pagos,
        "totalAbonado": total_abonado,
        "saldoPendiente": saldo_pendiente,
        "metadataNotes": metadata_notes,
    }


# ---------------------------------------------------------------------------
# Esquemas Pydantic
# ---------------------------------------------------------------------------

class PaymentPayload(BaseModel):
    monto: Decimal
    fecha_pago: Optional[date] = None
    descripcion: Optional[str] = None


class ProductionUpdatePayload(BaseModel):
    fechaEntrega: Optional[date] = None
    estatus: Optional[str] = Field(
        default=None, description="Estatus de producción (texto exactamente igual a las opciones definidas)."
    )
    notasEstatus: Optional[str] = None
    factura: Optional[str] = None
    fechaVencimiento: Optional[date] = None
    valorTotal: Optional[Decimal] = None
    pagos: List[PaymentPayload] = Field(default_factory=list)

    @validator("estatus")
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in STATUS_CHOICES:
            raise ValueError("Estatus no válido para producción.")
        return value


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/quotes")
async def upload_quotes(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Carga múltiples cotizaciones en PDF. Extrae los productos y registra la información en MySQL.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Debe adjuntar al menos un archivo PDF."
        )

    resultados = []
    now = datetime.utcnow()

    for upload in files:
        filename = upload.filename or "cotizacion.pdf"
        extension = Path(filename).suffix.lower()
        content = await upload.read()

        if extension in {".xls", ".xlsx"}:
            parsed = parse_quote_excel(content, filename)
        else:
            if upload.content_type not in {"application/pdf", "application/octet-stream"}:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El archivo {upload.filename} no es un PDF/Excel válido.",
                )
            parsed = parse_quote_pdf(content)

        safe_name = _safe_filename(upload.filename or f"cotizacion_{parsed['numero_cotizacion']}.pdf")
        timestamped_name = f"{int(now.timestamp())}_{safe_name}"
        file_path = UPLOAD_DIR / timestamped_name
        file_path.write_bytes(content)

        quote = (
            db.query(ProductionQuote)
            .filter(ProductionQuote.numero_cotizacion == parsed["numero_cotizacion"])
            .one_or_none()
        )

        if quote is None:
            quote = ProductionQuote(
                numero_cotizacion=parsed["numero_cotizacion"],
                fecha_ingreso=now,
            )
            db.add(quote)
            db.flush()
        else:
            quote.productos.clear()
            quote.pagos.clear()
            quote.fecha_ingreso = now

        quote.cliente = parsed.get("cliente")
        quote.contacto = parsed.get("contacto")
        quote.proyecto = parsed.get("proyecto")
        quote.odc = parsed.get("odc")
        quote.valor_total = parsed.get("valor_total")
        quote.nombre_archivo_pdf = timestamped_name
        quote.updated_at = datetime.utcnow()

        for product_data in parsed["productos"]:
            product = ProductionProduct(
                descripcion=product_data["descripcion"],
                cantidad=product_data.get("cantidad"),
                valor_subtotal=product_data.get("valor_subtotal"),
                estatus=ProductionStatusEnum.EN_COLA,
            )
            quote.productos.append(product)

        for note in parsed.get("metadata_notes", []):
            clean_note = (note or "").strip()
            if not clean_note:
                continue
            quote.productos.append(
                ProductionProduct(
                    descripcion=clean_note,
                    cantidad=None,
                    valor_subtotal=None,
                    estatus=ProductionStatusEnum.EN_COLA,
                )
            )

        resultados.append(
            {
                "archivo": upload.filename,
                "cotizacion": quote.numero_cotizacion,
                "productos": len(parsed["productos"]),
            }
        )

    db.commit()

    return {
        "message": "Cotizaciones procesadas correctamente.",
        "resultados": resultados,
    }


@router.get("/items")
async def list_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve todas las líneas de producción obtenidas a partir de las cotizaciones cargadas.
    """
    products = (
        db.query(ProductionProduct)
        .join(ProductionQuote)
        .order_by(ProductionQuote.fecha_ingreso.desc(), ProductionProduct.id.desc())
        .all()
    )

    return {
        "items": [product_to_dict(product) for product in products],
        "statusOptions": sorted(list(STATUS_CHOICES)),
    }


@router.put("/items/{product_id}")
async def update_item(
    product_id: int,
    payload: ProductionUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza campos operativos de un ítem de producción.
    """
    product = db.query(ProductionProduct).filter(ProductionProduct.id == product_id).one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")

    quote = product.cotizacion

    product.fecha_entrega = payload.fechaEntrega
    product.estatus = (
        ProductionStatusEnum(payload.estatus) if payload.estatus else product.estatus
    )
    product.notas_estatus = payload.notasEstatus
    product.factura = payload.factura
    product.updated_at = datetime.utcnow()

    if payload.fechaVencimiento is not None:
        quote.fecha_vencimiento = payload.fechaVencimiento
    if payload.valorTotal is not None:
        quote.valor_total = payload.valorTotal

    # Reemplazar pagos asociados a la cotización
    quote.pagos.clear()
    for pago_payload in payload.pagos:
        quote.pagos.append(
            ProductionPayment(
                monto=pago_payload.monto,
                fecha_pago=pago_payload.fecha_pago,
                descripcion=pago_payload.descripcion,
            )
        )

    quote.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return {"item": product_to_dict(product)}


@router.delete("/quotes/{quote_id}")
async def delete_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina por completo una cotización (y sus productos/pagos asociados).
    """
    quote = db.query(ProductionQuote).filter(ProductionQuote.id == quote_id).one_or_none()

    if quote is None:
        return {
            "message": "La cotización ya no existe en el sistema.",
            "quoteId": quote_id,
        }

    numero_cotizacion = quote.numero_cotizacion
    db.delete(quote)
    db.commit()

    return {
        "message": f"Cotización {numero_cotizacion} eliminada.",
        "quoteId": quote_id,
    }
