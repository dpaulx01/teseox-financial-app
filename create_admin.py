#!/usr/bin/env python3
"""
Script temporal para crear usuario admin si no existe o está corrupto
"""
import sys
from database.connection import SessionLocal
from models import User, Role, Permission
from auth.password import PasswordHandler

def create_admin():
    """Crear o recrear usuario admin"""
    db = SessionLocal()
    try:
        # Buscar usuario admin existente
        admin_user = db.query(User).filter(User.username == "admin").first()

        if admin_user:
            print("👤 Usuario admin encontrado - actualizando contraseña...")
            # Actualizar contraseña
            admin_user.password_hash = PasswordHandler.hash_password("admin123")
            admin_user.is_active = True
            admin_user.is_superuser = True
        else:
            print("👤 Creando nuevo usuario admin...")
            # Crear permisos si no existen
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

            # Crear rol admin si no existe
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if not admin_role:
                admin_role = Role(name="admin", description="Administrator with full access")
                db.add(admin_role)
                db.flush()

                # Asignar todos los permisos al rol admin
                all_perms = db.query(Permission).all()
                for perm in all_perms:
                    admin_role.permissions.append(perm)

            # Crear usuario admin
            admin_user = User(
                username="admin",
                email="admin@artyco.com",
                password_hash=PasswordHandler.hash_password("admin123"),
                first_name="System",
                last_name="Administrator",
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            db.flush()

            # Asignar rol admin al usuario
            admin_user.roles.append(admin_role)

        db.commit()
        print("✅ Usuario admin creado/actualizado exitosamente")
        print("   📧 Email: admin@artyco.com")
        print("   👤 Username: admin")
        print("   🔑 Password: admin123")
        print("   ⚠️  IMPORTANTE: Cambiar la contraseña después del primer login!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_admin()
    sys.exit(0 if success else 1)
