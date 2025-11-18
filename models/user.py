"""
User model for RBAC system
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

# Association table for many-to-many relationship
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE')),
    Column('assigned_at', DateTime, server_default=func.current_timestamp()),
    Column('assigned_by', Integer, ForeignKey('users.id', ondelete='SET NULL'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='RESTRICT'), nullable=False, default=1, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    roles = relationship(
        'Role', 
        secondary=user_roles, 
        back_populates='users',
        primaryjoin='User.id == user_roles.c.user_id',
        secondaryjoin='Role.id == user_roles.c.role_id'
    )
    sessions = relationship('UserSession', back_populates='user', cascade='all, delete-orphan', lazy='dynamic')
    audit_logs = relationship('AuditLog', back_populates='user', lazy='dynamic')
    financial_scenarios = relationship('FinancialScenario', back_populates='owner', cascade='all, delete-orphan', lazy='dynamic')
    company = relationship('Company', foreign_keys=[company_id], back_populates='users')
    
    def has_permission(self, resource: str, action: str, db=None) -> bool:
        """Check if user has specific permission

        Args:
            resource: Resource name (e.g., "users", "sales")
            action: Action name (e.g., "read", "write")
            db: Database session (optional, enables tenant overrides and temporal permissions)

        Returns:
            True if user has the permission
        """
        # Fast path for superusers
        if self.is_superuser:
            return True

        # Use Policy Engine if db session provided (includes overrides and temporal)
        if db is not None:
            from auth.policy_engine import PolicyEngine
            return PolicyEngine.has_permission(self, resource, action, db, self.company_id)

        # Fallback to basic role-based check (no overrides, no temporal)
        for role in self.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    return True
        return False

    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role"""
        return any(role.name == role_name for role in self.roles)

    def get_permissions(self, db=None) -> set:
        """Get all user permissions as a set of tuples (resource, action)

        Args:
            db: Database session (optional, enables tenant overrides and temporal permissions)

        Returns:
            Set of (resource, action) tuples
        """
        # Fast path for superusers
        if self.is_superuser:
            return {('*', '*')}

        # Use Policy Engine if db session provided (includes overrides and temporal)
        if db is not None:
            from auth.policy_engine import PolicyEngine
            return PolicyEngine.evaluate_user_permissions(self, db, self.company_id)

        # Fallback to basic role-based permissions (no overrides, no temporal)
        permissions = set()
        for role in self.roles:
            for permission in role.permissions:
                permissions.add((permission.resource, permission.action))
        return permissions
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
