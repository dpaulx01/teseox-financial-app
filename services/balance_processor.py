"""Utility functions for Balance General processing."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from models.balance import BalanceData


@dataclass
class TreeNode:
    code: str
    name: str
    value: float
    level: int
    children: List["TreeNode"]

    def to_dict(self) -> Dict[str, object]:
        return {
            "code": self.code,
            "name": self.name,
            "value": self.value,
            "level": self.level,
            "children": [child.to_dict() for child in self.children],
        }


def _split_code(code: str) -> Tuple:
    parts: List[object] = []
    for part in code.split('.'):
        part = part.strip()
        if part.isdigit():
            parts.append(int(part))
        else:
            parts.append(part)
    return tuple(parts)


def _parent_code(code: str) -> Optional[str]:
    if '.' not in code:
        return None
    return code.rsplit('.', 1)[0]


def build_balance_tree(rows: List[BalanceData]) -> List[Dict[str, object]]:
    nodes: Dict[str, TreeNode] = {}
    children_map: Dict[str, List[TreeNode]] = {}

    sorted_rows = sorted(rows, key=lambda r: (_split_code(r.account_code), r.level))

    for row in sorted_rows:
        node = TreeNode(
            code=row.account_code,
            name=row.account_name,
            value=float(row.balance or 0),
            level=row.level,
            children=[],
        )
        nodes[row.account_code] = node
        parent = row.parent_code
        if parent:
            children_map.setdefault(parent, []).append(node)

    for code, node in nodes.items():
        node.children = children_map.get(code, [])

    roots = [node.to_dict() for code, node in nodes.items() if _parent_code(code) is None]
    roots.sort(key=lambda item: _split_code(item["code"]))
    return roots


def compute_balance_core(rows: List[BalanceData]) -> Tuple[Dict[str, float], Dict[str, float]]:
    balances: Dict[str, float] = {
        row.account_code: float(row.balance or 0) for row in rows
    }

    activos = balances.get('1', 0.0)
    pasivos = balances.get('2', 0.0)
    patrimonio = balances.get('3', 0.0)
    activo_corriente = balances.get('1.1', 0.0)
    pasivo_corriente = balances.get('2.1', 0.0)
    inventario = balances.get('1.1.3', 0.0)

    capital_trabajo = activo_corriente - pasivo_corriente
    liquidez_corriente = (activo_corriente / pasivo_corriente) if pasivo_corriente else None
    razon_rapida = (
        (activo_corriente - inventario) / pasivo_corriente
        if pasivo_corriente and pasivo_corriente != 0
        else None
    )
    endeudamiento = (
        pasivos / (pasivos + patrimonio) if (pasivos + patrimonio) else None
    )
    deuda_capital = (pasivos / patrimonio) if patrimonio else None
    balance_check = activos - (pasivos + patrimonio)

    totals = {
        "activos": activos,
        "pasivos": pasivos,
        "patrimonio": patrimonio,
    }

    metrics = {
        **totals,
        "capital_trabajo": capital_trabajo,
        "liquidez_corriente": liquidez_corriente,
        "razon_rapida": razon_rapida,
        "endeudamiento": endeudamiento,
        "deuda_capital": deuda_capital,
        "balance_check": balance_check,
        "activo_corriente": activo_corriente,
        "pasivo_corriente": pasivo_corriente,
        "inventario": inventario,
    }

    return totals, metrics


def calculate_ratios(metrics: Dict[str, float], financials: Dict[str, float]) -> Dict[str, Optional[float]]:
    activos = metrics.get('activos', 0.0)
    patrimonio = metrics.get('patrimonio', 0.0)
    pasivos = metrics.get('pasivos', 0.0)

    ingresos = financials.get('ingresos', 0.0)
    utilidad_neta = financials.get('utilidad_neta', 0.0)
    utilidad_operacional = financials.get('utilidad_operacional', 0.0)

    roe = (utilidad_neta / patrimonio) if patrimonio else None
    roa = (utilidad_neta / activos) if activos else None
    operating_margin = (utilidad_operacional / ingresos) if ingresos else None
    profit_margin = (utilidad_neta / ingresos) if ingresos else None
    assets_to_equity = (activos / patrimonio) if patrimonio else None
    debt_to_equity = (pasivos / patrimonio) if patrimonio else None

    ratios = {
        "activos": activos,
        "pasivos": pasivos,
        "patrimonio": patrimonio,
        "capital_trabajo": metrics.get('capital_trabajo'),
        "liquidez_corriente": metrics.get('liquidez_corriente'),
        "razon_rapida": metrics.get('razon_rapida'),
        "endeudamiento": metrics.get('endeudamiento'),
        "deuda_capital": metrics.get('deuda_capital'),
        "roe": roe,
        "roa": roa,
        "operating_margin": operating_margin,
        "profit_margin": profit_margin,
        "assets_to_equity": assets_to_equity,
        "debt_to_equity": debt_to_equity,
        "financials": financials,
    }

    return ratios


def fetch_financial_summary(db: Session, company_id: int, year: int) -> Dict[str, float]:
    columns = {
        "ingresos": "ingresos",
        "utilidad_neta": "utilidad_neta",
        "utilidad_operacional": "utilidad_operacional",
    }

    try:
        present: Dict[str, str] = {}
        for key, col in columns.items():
            result = db.execute(text("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'financial_data' AND column_name = :col"), {"col": col})
            exists = bool(result.scalar())
            if exists:
                present[key] = col

        select_parts = []
        for key, col in present.items():
            select_parts.append(f"COALESCE(SUM({col}), 0) AS {key}")

        if not select_parts:
            return {"ingresos": 0.0, "utilidad_neta": 0.0, "utilidad_operacional": 0.0}

        query = f"SELECT {', '.join(select_parts)} FROM financial_data WHERE company_id = :company_id AND period_year = :year"
        row = db.execute(text(query), {"company_id": company_id, "year": year}).fetchone()

        summary = {"ingresos": 0.0, "utilidad_neta": 0.0, "utilidad_operacional": 0.0}
        if row:
            mapping = getattr(row, "_mapping", row)
            for key in summary.keys():
                summary[key] = float(mapping.get(key, 0) or 0)
        return summary
    except Exception:
        return {"ingresos": 0.0, "utilidad_neta": 0.0, "utilidad_operacional": 0.0}


def aggregate_balance_trends(
    db: Session,
    company_id: int,
    start_year: int,
    end_year: int,
    granularity: str = "annual",
) -> List[Dict[str, Optional[float]]]:
    if end_year < start_year:
        start_year, end_year = end_year, start_year

    query = (
        db.query(BalanceData)
        .filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year >= start_year,
            BalanceData.period_year <= end_year,
        )
        .order_by(
            BalanceData.period_year.asc(),
            BalanceData.period_month.asc(),
            BalanceData.level.asc(),
            BalanceData.account_code.asc(),
        )
    )

    rows: List[BalanceData] = query.all()
    if not rows:
        return []

    buckets: Dict[Tuple[int, Optional[int]], List[BalanceData]] = defaultdict(list)

    for row in rows:
        if granularity == "monthly":
            if row.period_month is None:
                continue
            key = (row.period_year, row.period_month)
        else:
            key = (row.period_year, None)
        buckets[key].append(row)

    if not buckets:
        return []

    sorted_keys = sorted(
        buckets.keys(),
        key=lambda item: (item[0], item[1] if item[1] is not None else 0),
    )

    points: List[Dict[str, Optional[float]]] = []
    for year, month in sorted_keys:
        bucket_rows = buckets[(year, month)]
        totals, metrics = compute_balance_core(bucket_rows)
        points.append(
            {
                "year": year,
                "month": month if granularity == "monthly" else None,
                "activos": totals.get("activos", 0.0),
                "pasivos": totals.get("pasivos", 0.0),
                "patrimonio": totals.get("patrimonio", 0.0),
                "capital_trabajo": metrics.get("capital_trabajo", 0.0),
                "liquidez_corriente": metrics.get("liquidez_corriente"),
                "razon_rapida": metrics.get("razon_rapida"),
                "balance_check": metrics.get("balance_check", 0.0),
            }
        )

    return points
