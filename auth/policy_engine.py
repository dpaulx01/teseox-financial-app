"""
Policy Engine for evaluating user permissions with tenant and temporal constraints.

This module implements a flexible RBAC+ system that supports:
- Base role-based permissions
- Tenant-specific permission overrides
- User-specific permission overrides
- Temporal permissions (valid_from/valid_until)
- Superuser bypass

Permission evaluation order:
1. If user is superuser → grant all permissions
2. Get base permissions from user's roles
3. Apply role-level overrides for the tenant (RolePermissionOverride)
4. Apply user-level overrides for the tenant (UserRoleOverride)
5. Filter out expired temporal permissions
"""
from typing import Set, Tuple, Optional
from sqlalchemy.orm import Session
from datetime import datetime


class PolicyEngine:
    """
    Centralized policy evaluation engine for RBAC permissions.

    Handles permission resolution considering:
    - User roles and their base permissions
    - Tenant-specific role overrides
    - User-specific permission overrides
    - Temporal constraints
    """

    @staticmethod
    def evaluate_user_permissions(
        user,
        db: Session,
        company_id: Optional[int] = None
    ) -> Set[Tuple[str, str]]:
        """
        Evaluate all effective permissions for a user within a tenant.

        Args:
            user: User model instance
            db: Database session
            company_id: Company ID to scope permissions to (defaults to user's company)

        Returns:
            Set of tuples (resource, action) representing granted permissions
        """
        # Superusers get all permissions
        if user.is_superuser:
            return {('*', '*')}

        # Use user's company if not specified
        if company_id is None:
            company_id = user.company_id

        # Start with base permissions from roles
        permissions = PolicyEngine._get_base_role_permissions(user)

        # Apply tenant-specific role overrides
        permissions = PolicyEngine._apply_role_overrides(
            user, permissions, company_id, db
        )

        # Apply user-specific overrides
        permissions = PolicyEngine._apply_user_overrides(
            user, permissions, company_id, db
        )

        return permissions

    @staticmethod
    def _get_base_role_permissions(user) -> Set[Tuple[str, str]]:
        """
        Get base permissions from all user's roles.

        Args:
            user: User model instance

        Returns:
            Set of (resource, action) tuples from role permissions
        """
        permissions = set()
        for role in user.roles:
            for permission in role.permissions:
                permissions.add((permission.resource, permission.action))
        return permissions

    @staticmethod
    def _apply_role_overrides(
        user,
        base_permissions: Set[Tuple[str, str]],
        company_id: int,
        db: Session
    ) -> Set[Tuple[str, str]]:
        """
        Apply tenant-specific role permission overrides.

        Modifies base permissions by:
        - Adding permissions with is_granted=True
        - Removing permissions with is_granted=False
        - Filtering expired temporal permissions

        Args:
            user: User model instance
            base_permissions: Current permission set
            company_id: Company ID for scoping
            db: Database session

        Returns:
            Modified permission set
        """
        from models import RolePermissionOverride

        permissions = base_permissions.copy()
        user_role_ids = [role.id for role in user.roles]

        # Get all role overrides for this tenant and user's roles
        overrides = db.query(RolePermissionOverride).filter(
            RolePermissionOverride.company_id == company_id,
            RolePermissionOverride.role_id.in_(user_role_ids)
        ).all()

        for override in overrides:
            # Skip expired temporal permissions
            if not override.is_currently_valid():
                continue

            perm_tuple = (override.permission.resource, override.permission.action)

            if override.is_granted:
                # Grant additional permission
                permissions.add(perm_tuple)
            else:
                # Revoke inherited permission
                permissions.discard(perm_tuple)

        return permissions

    @staticmethod
    def _apply_user_overrides(
        user,
        base_permissions: Set[Tuple[str, str]],
        company_id: int,
        db: Session
    ) -> Set[Tuple[str, str]]:
        """
        Apply user-specific permission overrides.

        User overrides take precedence over role overrides.

        Args:
            user: User model instance
            base_permissions: Current permission set
            company_id: Company ID for scoping
            db: Database session

        Returns:
            Modified permission set
        """
        from models import UserRoleOverride

        permissions = base_permissions.copy()

        # Get all user overrides for this tenant and user
        overrides = db.query(UserRoleOverride).filter(
            UserRoleOverride.company_id == company_id,
            UserRoleOverride.user_id == user.id
        ).all()

        for override in overrides:
            # Skip expired temporal permissions
            if not override.is_currently_valid():
                continue

            perm_tuple = (override.permission.resource, override.permission.action)

            if override.is_granted:
                # Grant direct permission
                permissions.add(perm_tuple)
            else:
                # Revoke permission (even if granted by role)
                permissions.discard(perm_tuple)

        return permissions

    @staticmethod
    def has_permission(
        user,
        resource: str,
        action: str,
        db: Session,
        company_id: Optional[int] = None
    ) -> bool:
        """
        Check if a user has a specific permission within a tenant.

        Args:
            user: User model instance
            resource: Resource name (e.g., "users", "sales", "production")
            action: Action name (e.g., "read", "write", "delete", "admin")
            db: Database session
            company_id: Company ID to scope check to (defaults to user's company)

        Returns:
            True if user has the permission, False otherwise
        """
        permissions = PolicyEngine.evaluate_user_permissions(user, db, company_id)

        # Check for exact match or wildcard
        return (
            (resource, action) in permissions or
            ('*', '*') in permissions or
            (resource, '*') in permissions or
            ('*', action) in permissions
        )

    @staticmethod
    def check_multiple_permissions(
        user,
        required_permissions: list[Tuple[str, str]],
        db: Session,
        require_all: bool = True,
        company_id: Optional[int] = None
    ) -> bool:
        """
        Check if user has multiple permissions.

        Args:
            user: User model instance
            required_permissions: List of (resource, action) tuples
            db: Database session
            require_all: If True, user must have ALL permissions; if False, ANY permission
            company_id: Company ID to scope check to

        Returns:
            True if permission check passes, False otherwise
        """
        user_permissions = PolicyEngine.evaluate_user_permissions(user, db, company_id)

        if require_all:
            # User must have all required permissions
            return all(
                PolicyEngine._matches_permission(perm, user_permissions)
                for perm in required_permissions
            )
        else:
            # User must have at least one required permission
            return any(
                PolicyEngine._matches_permission(perm, user_permissions)
                for perm in required_permissions
            )

    @staticmethod
    def _matches_permission(
        required: Tuple[str, str],
        user_permissions: Set[Tuple[str, str]]
    ) -> bool:
        """Check if a required permission matches any in the user's permission set."""
        resource, action = required

        return (
            (resource, action) in user_permissions or
            ('*', '*') in user_permissions or
            (resource, '*') in user_permissions or
            ('*', action) in user_permissions
        )


# Convenience function for backward compatibility
def evaluate_permissions(user, db: Session, company_id: Optional[int] = None) -> Set[Tuple[str, str]]:
    """
    Evaluate user permissions (backward compatible wrapper).

    Args:
        user: User model instance
        db: Database session
        company_id: Company ID to scope to

    Returns:
        Set of (resource, action) permission tuples
    """
    return PolicyEngine.evaluate_user_permissions(user, db, company_id)
