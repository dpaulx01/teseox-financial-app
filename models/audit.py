"""
Audit log model for tracking user actions
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, default=1, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), index=True)
    resource_id = Column(String(100))
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, server_default=func.current_timestamp(), index=True)

    # Relationships
    user = relationship('User', back_populates='audit_logs')
    company = relationship('Company')
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"
    
    @classmethod
    def log_action(cls, db, user_id: int, action: str, resource: str = None,
                   resource_id: str = None, details: dict = None,
                   ip_address: str = None, user_agent: str = None,
                   company_id: int = None):
        """Create an audit log entry

        Args:
            db: Database session
            user_id: ID of the user performing the action (can be None for system actions)
            action: Action being performed
            resource: Resource being acted upon
            resource_id: ID of the resource
            details: Additional details as JSON
            ip_address: IP address of the client
            user_agent: User agent string
            company_id: Company ID (optional, will be derived from user if not provided)
        """
        # Derive company_id from user if not provided
        if company_id is None and user_id is not None:
            from models import User
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                company_id = user.company_id
            else:
                company_id = 1  # Default fallback

        # If still None (system actions without user), default to 1
        if company_id is None:
            company_id = 1

        log_entry = cls(
            user_id=user_id,
            company_id=company_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log_entry)
        return log_entry