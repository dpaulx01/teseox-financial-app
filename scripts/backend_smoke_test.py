#!/usr/bin/env python3
"""
Quick backend smoke test that hits live endpoints using the production dataset.
Runs entirely in-process via FastAPI's TestClient so we don't need to spawn uvicorn.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from api_server_rbac import app


def _assert_ok(response, label: str) -> dict:
    """Raise a helpful error if an endpoint fails."""
    if response.status_code != 200:
        raise RuntimeError(f"{label} failed with {response.status_code}: {response.text}")
    return response.json()


def main() -> None:
    """Execute the smoke test sequence."""
    with TestClient(app) as client:
        print("🏥  /health")
        health = _assert_ok(client.get("/health"), "health")
        print(f"    status={health.get('status')} database={health.get('database')}")

        print("🔐  /api/auth/login")
        login = _assert_ok(
            client.post(
                "/api/auth/login",
                json={"username": "admin", "password": "admin123"},
            ),
            "login",
        )
        access_token = login["access_token"]
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        print(f"    user={login['user']['username']} tenant={login['user'].get('company_id')}")

        print("👤  /api/auth/me")
        me = _assert_ok(client.get("/api/auth/me", headers=auth_headers), "me")
        print(f"    permissions={len(me.get('permissions', []))}")

        print("👥  /api/users/")
        users = _assert_ok(client.get("/api/users/", headers=auth_headers), "users list")
        print(f"    users_returned={len(users)}")

        print("📊  /api/admin/stats")
        stats = _assert_ok(client.get("/api/admin/stats", headers=auth_headers), "admin stats")
        print(
            f"    totals -> users={stats['users']['total']} roles={stats['roles']['total']} "
            f"sessions={stats['sessions'].get('active', 0)}"
        )

        print("✅ Backend smoke test finished successfully.")


if __name__ == "__main__":
    main()
