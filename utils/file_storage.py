"""
Utilities for managing tenant-aware file storage.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional, Union

from config import Config


_INVALID_SEGMENT_CHARS = re.compile(r"[^A-Za-z0-9._-]")


def sanitize_filename(name: str, max_length: int = 150) -> str:
    """
    Normalize file names to prevent path traversal and invalid characters.
    """
    if not name:
        return "file"
    # Drop directory components and normalize separators
    candidate = name.strip().replace("\\", "/").split("/")[-1]
    candidate = candidate.replace("..", "")
    candidate = _INVALID_SEGMENT_CHARS.sub("_", candidate)
    candidate = candidate or "file"
    if len(candidate) > max_length:
        return candidate[:max_length]
    return candidate


class FileStorageService:
    """
    Provides helper methods to save/read files under per-tenant directories.
    """

    def __init__(
        self,
        namespace: Optional[str] = None,
        base_dir: Optional[Union[str, Path]] = None,
    ):
        base_path = Path(base_dir or Config.UPLOAD_DIR)
        self._base_path = base_path.resolve()
        self._namespace = sanitize_filename(namespace, max_length=40) if namespace else None

    def _company_root(self, company_id: int, ensure: bool = True) -> Path:
        if not company_id:
            raise ValueError("company_id must be provided for tenant-scoped storage")
        root = self._base_path / f"company_{int(company_id)}"
        if self._namespace:
            root = root / self._namespace
        if ensure:
            root.mkdir(parents=True, exist_ok=True)
        return root

    def build_path(
        self,
        company_id: int,
        filename: str,
        *,
        ensure_parent: bool = False,
    ) -> Path:
        safe_name = sanitize_filename(filename)
        root = self._company_root(company_id, ensure=ensure_parent)
        path = root / safe_name
        if ensure_parent:
            path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def save_bytes(self, company_id: int, filename: str, content: bytes) -> Path:
        """
        Persist bytes into the tenant directory and return the absolute path.
        """
        target = self.build_path(company_id, filename, ensure_parent=True)
        target.write_bytes(content)
        return target

    def read_bytes(self, company_id: int, filename: str) -> bytes:
        """
        Read raw bytes for a tenant file. Raises FileNotFoundError if missing.
        """
        path = self.resolve(company_id, filename)
        return path.read_bytes()

    def exists(self, company_id: int, filename: str) -> bool:
        """
        Check if a tenant-specific file exists.
        """
        path = self.resolve(company_id, filename)
        return path.exists()

    def delete_file(self, company_id: int, filename: str) -> None:
        """
        Delete a tenant file if present.
        """
        path = self.resolve(company_id, filename)
        if path.exists():
            path.unlink()

    def list_files(self, company_id: int, pattern: str = "*") -> list[Path]:
        """
        List files inside a tenant namespace using glob patterns.
        """
        root = self._company_root(company_id, ensure=False)
        if not root.exists():
            return []
        return sorted(root.glob(pattern))

    def resolve(self, company_id: int, filename: str) -> Path:
        """
        Return the absolute path for the given tenant file without touching disk.
        """
        return self.build_path(company_id, filename, ensure_parent=False)

    def read_bytes(self, company_id: int, filename: str) -> bytes:
        """
        Read file content from tenant directory.
        Raises FileNotFoundError if file doesn't exist.
        """
        path = self.resolve(company_id, filename)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {filename} (company {company_id})")
        return path.read_bytes()

    def exists(self, company_id: int, filename: str) -> bool:
        """
        Check if file exists in tenant directory.
        """
        return self.resolve(company_id, filename).exists()

    def delete_file(self, company_id: int, filename: str) -> bool:
        """
        Delete file from tenant directory.
        Returns True if file was deleted, False if it didn't exist.
        """
        path = self.resolve(company_id, filename)
        if path.exists():
            path.unlink()
            return True
        return False

    def list_files(self, company_id: int, pattern: str = "*") -> list[Path]:
        """
        List files in tenant directory matching pattern.
        Returns list of Path objects relative to company root.
        """
        root = self._company_root(company_id, ensure=False)
        if not root.exists():
            return []
        return sorted(root.glob(pattern))
