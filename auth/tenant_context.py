"""
Tenant context utilities to keep track of the active company per request.
"""
from __future__ import annotations

from contextlib import AbstractContextManager
from contextvars import ContextVar
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from auth.jwt_handler import JWTHandler

_current_tenant_id: ContextVar[Optional[int]] = ContextVar("current_tenant_id", default=None)


def set_current_tenant(tenant_id: Optional[int]) -> None:
    """Store the current tenant/company id for the active context."""
    _current_tenant_id.set(tenant_id)


def get_current_tenant() -> Optional[int]:
    """Return the tenant/company id tied to the active context."""
    return _current_tenant_id.get()


def clear_current_tenant() -> None:
    """Clear the tenant context to avoid leaking ids across requests."""
    _current_tenant_id.set(None)


class TenantContext(AbstractContextManager):
    """Helper context manager for manual tenant scoping (e.g., scripts or tests)."""

    def __init__(self, tenant_id: Optional[int]):
        self.tenant_id = tenant_id
        self._token = None

    def __enter__(self):
        self._token = _current_tenant_id.set(self.tenant_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token is not None:
            _current_tenant_id.reset(self._token)
        else:
            clear_current_tenant()
        return False


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts company_id from the JWT (if available) and
    exposes it through the tenant context helpers for downstream code.
    """

    async def dispatch(self, request: Request, call_next):
        clear_current_tenant()
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.lower().startswith("bearer "):
                token = auth_header.split(" ", 1)[1]
                payload = JWTHandler.verify_token(token)
                if payload:
                    company_id = payload.get("company_id")
                    if company_id is not None:
                        set_current_tenant(int(company_id))
            response = await call_next(request)
            return response
        finally:
            clear_current_tenant()
