from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth.policy_engine import PolicyEngine
from database.connection import Base
from models.company import Company
from models.permission import Permission
from models.role import Role, role_permissions
from models.rbac_overrides import RolePermissionOverride, UserRoleOverride
from models.user import User, user_roles
# Import models referenced via string relationships to register them with SQLAlchemy
from models.sales import SalesTransaction  # noqa: F401
from models.production import ProductionQuote  # noqa: F401


@pytest.fixture()
def rbac_context():
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)

    tables = [
        Company.__table__,
        User.__table__,
        Role.__table__,
        Permission.__table__,
        role_permissions,
        user_roles,
        RolePermissionOverride.__table__,
        UserRoleOverride.__table__,
    ]

    Base.metadata.create_all(engine, tables=tables)

    session = Session()

    company = Company(name="Tenant A", slug="tenant-a")
    session.add(company)
    session.flush()

    role = Role(name="analyst", description="Analyst role")
    session.add(role)
    session.flush()

    permissions = {
        "sales_read": Permission(resource="sales", action="read"),
        "sales_export": Permission(resource="sales", action="export"),
        "reports_download": Permission(resource="reports", action="download"),
        "sales_delete": Permission(resource="sales", action="delete"),
    }
    session.add_all(permissions.values())
    session.flush()

    role.permissions.append(permissions["sales_read"])

    user = User(
        email="user@example.com",
        username="analyst_user",
        password_hash="fake-hash",
        company_id=company.id,
        is_active=True,
        is_superuser=False,
    )
    user.roles.append(role)
    session.add(user)
    session.commit()

    yield {
        "session": session,
        "company": company,
        "user": user,
        "role": role,
        "permissions": permissions,
        "engine": engine,
    }

    session.close()
    Base.metadata.drop_all(engine, tables=tables)
    engine.dispose()


def test_policy_engine_base_permissions(rbac_context):
    session = rbac_context["session"]
    company = rbac_context["company"]
    user = rbac_context["user"]

    permissions = PolicyEngine.evaluate_user_permissions(user, session, company.id)

    assert ("sales", "read") in permissions
    assert ("sales", "export") not in permissions


def test_policy_engine_role_overrides_grant_and_revoke(rbac_context):
    session = rbac_context["session"]
    company = rbac_context["company"]
    user = rbac_context["user"]
    role = rbac_context["role"]
    perms = rbac_context["permissions"]

    revoke_override = RolePermissionOverride(
        company_id=company.id,
        role_id=role.id,
        permission_id=perms["sales_read"].id,
        is_granted=False,
    )
    grant_override = RolePermissionOverride(
        company_id=company.id,
        role_id=role.id,
        permission_id=perms["sales_export"].id,
        is_granted=True,
    )
    session.add_all([revoke_override, grant_override])
    session.commit()

    permissions = PolicyEngine.evaluate_user_permissions(user, session, company.id)

    assert ("sales", "read") not in permissions  # revoked
    assert ("sales", "export") in permissions  # granted


def test_policy_engine_user_overrides_and_temporal_constraints(rbac_context):
    session = rbac_context["session"]
    company = rbac_context["company"]
    user = rbac_context["user"]
    perms = rbac_context["permissions"]

    now = datetime.utcnow()
    valid_override = UserRoleOverride(
        company_id=company.id,
        user_id=user.id,
        permission_id=perms["reports_download"].id,
        is_granted=True,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=1),
    )
    expired_override = UserRoleOverride(
        company_id=company.id,
        user_id=user.id,
        permission_id=perms["sales_delete"].id,
        is_granted=True,
        valid_from=now - timedelta(days=5),
        valid_until=now - timedelta(days=1),
    )
    session.add_all([valid_override, expired_override])
    session.commit()

    assert PolicyEngine.has_permission(
        user, "reports", "download", session, company.id
    )
    assert not PolicyEngine.has_permission(
        user, "sales", "delete", session, company.id
    )
