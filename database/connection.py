"""
Database connection and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from config import Config

# Get database URL from config
DATABASE_URL = Config.get_database_url()

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False  # Set to True for debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_initial_data():
    """
    Seed initial data (roles, permissions, admin user, default company)
    """
    from models import User, Role, Permission, Company
    from auth.password import PasswordHandler

    db = SessionLocal()
    try:
        # Ensure default company exists (id=1 expected by admin user)
        default_company = db.query(Company).filter(Company.id == 1).first()
        if not default_company:
            default_company = Company(
                name="Teseo X",
                slug="teseox",
                description="Default company for initial admin",
                subscription_tier="trial",
                max_users=100,
                is_active=True,
            )
            db.add(default_company)
            db.flush()  # get id

        # Check if admin user already exists
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if admin_exists:
            print("ℹ️  Admin user already exists - verifying password...")
            try:
                # Try to verify password works
                if PasswordHandler.verify_password("admin123", admin_exists.password_hash):
                    print("✅ Admin password is valid")
                else:
                    print("⚠️  Admin password incorrect - updating...")
                    admin_exists.password_hash = PasswordHandler.hash_password("admin123")
                    db.commit()
                    print("✅ Admin password updated successfully")
                # Ensure company assignment exists
                if not admin_exists.company_id:
                    admin_exists.company_id = default_company.id
                    db.commit()
                return
            except Exception as e:
                print(f"⚠️  Admin user has corrupted password - recreating: {e}")
                # Delete corrupted admin user
                db.delete(admin_exists)
                db.commit()
                print("🗑️  Corrupted admin user deleted - proceeding with fresh creation...")

        print("📝 Creating initial roles and permissions...")

        # Create permissions
        permissions_data = [
            ("users", "read", "View users"),
            ("users", "write", "Create/update users"),
            ("users", "delete", "Delete users"),
            ("financial", "read", "View financial data"),
            ("financial", "write", "Edit financial data"),
            ("financial", "delete", "Delete financial data"),
            ("admin", "read", "View admin panel"),
            ("admin", "write", "Manage system settings"),
        ]

        permissions = {}
        for resource, action, description in permissions_data:
            perm = db.query(Permission).filter(
                Permission.resource == resource,
                Permission.action == action
            ).first()

            if not perm:
                perm = Permission(
                    resource=resource,
                    action=action,
                    description=description
                )
                db.add(perm)
                db.flush()
            permissions[f"{resource}:{action}"] = perm

        # Create roles
        roles_data = [
            ("admin", "Administrator with full access", [
                "users:read", "users:write", "users:delete",
                "financial:read", "financial:write", "financial:delete",
                "admin:read", "admin:write"
            ]),
            ("manager", "Manager with financial write access", [
                "users:read", "financial:read", "financial:write"
            ]),
            ("analyst", "Analyst with financial read access", [
                "financial:read"
            ]),
            ("viewer", "Viewer with read-only access", [
                "financial:read"
            ])
        ]

        roles = {}
        for name, description, perms in roles_data:
            role = db.query(Role).filter(Role.name == name).first()
            if not role:
                role = Role(name=name, description=description)
                db.add(role)
                db.flush()

                # Assign permissions
                for perm_key in perms:
                    if perm_key in permissions:
                        role.permissions.append(permissions[perm_key])

                roles[name] = role
            else:
                roles[name] = role

        # Create default admin user
        print("👤 Creating default admin user...")
        admin_user = User(
            username="admin",
            email="admin@artyco.com",
            password_hash=PasswordHandler.hash_password("admin123"),
            first_name="System",
            last_name="Administrator",
            is_active=True,
            is_superuser=True,
            company_id=default_company.id
        )
        db.add(admin_user)
        db.flush()

        # Assign admin role
        if "admin" in roles:
            admin_user.roles.append(roles["admin"])

        db.commit()
        print("✅ Initial data seeded successfully")
        print("   📧 Admin email: admin@artyco.com")
        print("   🔑 Admin password: admin123")
        print("   ⚠️  IMPORTANT: Change the default password after first login!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding initial data: {e}")
        raise
    finally:
        db.close()

def init_db():
    """
    Initialize database tables
    """
    # Import all models here to ensure they are registered
    from models import user, role, permission, production, financial, company  # noqa: F401

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed initial data
    seed_initial_data()
