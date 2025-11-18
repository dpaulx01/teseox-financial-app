"""
RBAC Override models for tenant-specific and temporal permissions
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base
from datetime import datetime


class RolePermissionOverride(Base):
    """
    Tenant-specific permission overrides for roles.

    Allows customizing role permissions per company (tenant):
    - Grant additional permissions to a role for a specific tenant
    - Revoke inherited permissions from a role for a specific tenant
    - Apply temporal constraints (valid_from, valid_until)

    Example use cases:
    - Grant "reports:export" to "viewer" role only for Company A
    - Revoke "users:delete" from "admin" role for Company B (trial tier)
    - Grant "sales:write" to "analyst" role for 30 days (consultant access)
    """
    __tablename__ = 'role_permission_overrides'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False, index=True)
    is_granted = Column(Boolean, nullable=False, default=True, comment='TRUE=grant permission, FALSE=revoke inherited permission')
    reason = Column(String(500), nullable=True, comment='Business justification for override')
    valid_from = Column(DateTime, nullable=True, comment='Optional temporal permission start')
    valid_until = Column(DateTime, nullable=True, comment='Optional temporal permission end')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    company = relationship('Company')
    role = relationship('Role')
    permission = relationship('Permission')
    creator = relationship('User', foreign_keys=[created_by])

    def is_currently_valid(self) -> bool:
        """Check if the override is currently valid based on temporal constraints"""
        now = datetime.utcnow()

        # If no temporal constraints, always valid
        if self.valid_from is None and self.valid_until is None:
            return True

        # Check if current time is within the valid range
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False

        return True

    def __repr__(self):
        action = "GRANT" if self.is_granted else "REVOKE"
        return (f"<RolePermissionOverride(company_id={self.company_id}, "
                f"role_id={self.role_id}, permission_id={self.permission_id}, "
                f"{action})>")


class UserRoleOverride(Base):
    """
    Tenant-specific permission overrides for individual users.

    Allows granting or revoking specific permissions directly to users:
    - Grant permissions not in their assigned roles (e.g., temporary admin access)
    - Revoke permissions inherited from roles (e.g., restrict specific user)
    - Apply temporal constraints for consultant/temporary access

    Example use cases:
    - Grant "production:admin" to user John for 7 days (cover for manager)
    - Revoke "financial:export" from user Jane despite being in "accountant" role
    - Grant "sales:write" to external consultant for 30 days
    """
    __tablename__ = 'user_role_overrides'

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False, index=True)
    is_granted = Column(Boolean, nullable=False, default=True, comment='TRUE=grant additional, FALSE=revoke inherited')
    reason = Column(String(500), nullable=True, comment='Business justification')
    valid_from = Column(DateTime, nullable=True, comment='Temporal permission start')
    valid_until = Column(DateTime, nullable=True, comment='Temporal permission end')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    company = relationship('Company')
    user = relationship('User', foreign_keys=[user_id])
    permission = relationship('Permission')
    creator = relationship('User', foreign_keys=[created_by])

    def is_currently_valid(self) -> bool:
        """Check if the override is currently valid based on temporal constraints"""
        now = datetime.utcnow()

        # If no temporal constraints, always valid
        if self.valid_from is None and self.valid_until is None:
            return True

        # Check if current time is within the valid range
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False

        return True

    def __repr__(self):
        action = "GRANT" if self.is_granted else "REVOKE"
        return (f"<UserRoleOverride(company_id={self.company_id}, "
                f"user_id={self.user_id}, permission_id={self.permission_id}, "
                f"{action})>")
