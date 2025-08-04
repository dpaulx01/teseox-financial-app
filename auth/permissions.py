"""
Permission checking utilities
"""
from typing import List, Set, Tuple
from functools import wraps
from fastapi import HTTPException, status

class PermissionChecker:
    """Utility class for checking permissions"""
    
    @staticmethod
    def has_permission(user_permissions: Set[Tuple[str, str]], 
                      required_resource: str, 
                      required_action: str) -> bool:
        """Check if user has specific permission"""
        # Superuser has all permissions
        if ('*', '*') in user_permissions:
            return True
        
        # Check exact permission
        if (required_resource, required_action) in user_permissions:
            return True
        
        # Check wildcard permissions
        if (required_resource, '*') in user_permissions:
            return True
        
        if ('*', required_action) in user_permissions:
            return True
        
        return False
    
    @staticmethod
    def check_multiple_permissions(user_permissions: Set[Tuple[str, str]], 
                                 required_permissions: List[Tuple[str, str]],
                                 require_all: bool = True) -> bool:
        """Check multiple permissions"""
        if require_all:
            return all(
                PermissionChecker.has_permission(user_permissions, resource, action)
                for resource, action in required_permissions
            )
        else:
            return any(
                PermissionChecker.has_permission(user_permissions, resource, action)
                for resource, action in required_permissions
            )

def require_permission(resource: str, action: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This will be implemented in dependencies.py
            # For now, just pass through
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role_name: str):
    """Decorator to require specific role"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This will be implemented in dependencies.py
            # For now, just pass through
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_superuser():
    """Decorator to require superuser status"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This will be implemented in dependencies.py
            # For now, just pass through
            return await func(*args, **kwargs)
        return wrapper
    return decorator