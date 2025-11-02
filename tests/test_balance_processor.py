import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.connection import Base
from models.balance import BalanceData
from services.balance_processor import (
    build_balance_tree,
    compute_balance_core,
    calculate_ratios,
    aggregate_balance_trends,
)


def make_row(code: str, name: str, value: Decimal, year: int = 2025, month: int | None = None) -> BalanceData:
    level = code.count(".") + 1
    parent = code.rsplit(".", 1)[0] if "." in code else None
    return BalanceData(
        company_id=1,
        period_year=year,
        period_month=month,
        account_code=code,
        account_name=name,
        level=level,
        parent_code=parent,
        balance=value,
    )


@pytest.fixture(scope="function")
def session():
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_build_balance_tree_generates_hierarchy():
    rows = [
        make_row("1", "Activos", Decimal("1000")),
        make_row("1.1", "Activo Corriente", Decimal("600")),
        make_row("1.1.1", "Efectivo", Decimal("400")),
        make_row("2", "Pasivos", Decimal("400")),
        make_row("3", "Patrimonio", Decimal("600")),
    ]

    tree = build_balance_tree(rows)

    assert len(tree) == 3
    activos = next(node for node in tree if node["code"] == "1")
    assert activos["name"] == "Activos"
    assert len(activos["children"]) == 1
    assert activos["children"][0]["code"] == "1.1"
    assert activos["children"][0]["children"][0]["code"] == "1.1.1"


def test_compute_balance_core_returns_expected_metrics():
    rows = [
        make_row("1", "Activos", Decimal("1000")),
        make_row("1.1", "Activo Corriente", Decimal("700")),
        make_row("1.1.3", "Inventario", Decimal("200")),
        make_row("2", "Pasivos", Decimal("400")),
        make_row("2.1", "Pasivo Corriente", Decimal("300")),
        make_row("3", "Patrimonio", Decimal("600")),
    ]

    totals, metrics = compute_balance_core(rows)

    assert totals == {"activos": 1000.0, "pasivos": 400.0, "patrimonio": 600.0}
    assert metrics["capital_trabajo"] == pytest.approx(400.0)
    assert metrics["liquidez_corriente"] == pytest.approx(700.0 / 300.0)
    assert metrics["razon_rapida"] == pytest.approx((700.0 - 200.0) / 300.0)
    assert metrics["balance_check"] == pytest.approx(0.0)


def test_calculate_ratios_combines_balance_and_financials():
    metrics = {
        "activos": 1000.0,
        "pasivos": 400.0,
        "patrimonio": 600.0,
        "capital_trabajo": 300.0,
        "liquidez_corriente": 1.5,
        "razon_rapida": 1.2,
        "endeudamiento": 0.4,
        "deuda_capital": 0.6666666,
    }
    financials = {
        "ingresos": 2000.0,
        "utilidad_neta": 200.0,
        "utilidad_operacional": 300.0,
    }

    ratios = calculate_ratios(metrics, financials)

    assert ratios["roe"] == pytest.approx(200.0 / 600.0)
    assert ratios["roa"] == pytest.approx(200.0 / 1000.0)
    assert ratios["profit_margin"] == pytest.approx(200.0 / 2000.0)
    assert ratios["operating_margin"] == pytest.approx(300.0 / 2000.0)
    assert ratios["financials"] == financials


def test_aggregate_balance_trends_returns_annual_points(session):
    session.query(BalanceData).delete()
    rows = [
        make_row("1", "Activos", Decimal("1200"), year=2024),
        make_row("1.1", "Activo Corriente", Decimal("800"), year=2024),
        make_row("1.1.3", "Inventario", Decimal("200"), year=2024),
        make_row("2", "Pasivos", Decimal("500"), year=2024),
        make_row("2.1", "Pasivo Corriente", Decimal("300"), year=2024),
        make_row("3", "Patrimonio", Decimal("700"), year=2024),
    ]
    session.add_all(rows)
    session.commit()

    points = aggregate_balance_trends(session, company_id=1, start_year=2024, end_year=2024)

    assert len(points) == 1
    point = points[0]
    assert point["year"] == 2024
    assert point["activos"] == pytest.approx(1200.0)
    assert point["capital_trabajo"] == pytest.approx(500.0)
    assert point["balance_check"] == pytest.approx(0.0)


def test_aggregate_balance_trends_returns_monthly_points(session):
    session.query(BalanceData).delete()
    rows = []
    for month, activos, pasivos, patrimonio in [
        (1, Decimal("1000"), Decimal("400"), Decimal("600")),
        (2, Decimal("1100"), Decimal("420"), Decimal("680")),
    ]:
        rows.extend(
            [
                make_row("1", "Activos", activos, year=2025, month=month),
                make_row("1.1", "Activo Corriente", activos * Decimal("0.6"), year=2025, month=month),
                make_row("1.1.3", "Inventario", activos * Decimal("0.1"), year=2025, month=month),
                make_row("2", "Pasivos", pasivos, year=2025, month=month),
                make_row("2.1", "Pasivo Corriente", pasivos * Decimal("0.7"), year=2025, month=month),
                make_row("3", "Patrimonio", patrimonio, year=2025, month=month),
            ]
        )
    session.add_all(rows)
    session.commit()

    points = aggregate_balance_trends(
        session,
        company_id=1,
        start_year=2025,
        end_year=2025,
        granularity="monthly",
    )

    assert len(points) == 2
    first = points[0]
    assert first["year"] == 2025
    assert first["month"] == 1
    assert first["activos"] == pytest.approx(1000.0)
    assert first["capital_trabajo"] == pytest.approx(
        float(rows[1].balance) - float(rows[4].balance)
    )
    assert first["liquidez_corriente"] == pytest.approx(
        float(rows[1].balance) / float(rows[4].balance)
    )
