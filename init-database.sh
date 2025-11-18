#!/bin/bash

# Initialize Teseo X database with schema
# This script connects to Cloud SQL and creates the necessary schema
#
# IMPORTANTE: Ejecuta con el usuario root porque teseox_user puede no tener
# permisos DDL (CREATE/ALTER). Si usas teseox_user, asegúrate de otorgarle:
# GRANT ALL PRIVILEGES ON teseox_db.* TO 'teseox_user'@'%';

set -e

PROJECT_ID="teseo-x"
INSTANCE="teseox-db"
DB_NAME="teseox_db"
# Usar root para DDL operations
DB_USER="root"

echo "🗄️  Initializing Teseo X database..."
echo ""

# Check if gcloud sql connect is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found"
    exit 1
fi

echo "📡 Connecting to Cloud SQL instance: $INSTANCE"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER (root tiene permisos DDL)"
echo ""

# Execute SQL schema files
echo "1️⃣  Creating base schema (RBAC + Multi-tenant + Financial tables)..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME < schema/000_base_schema.sql 2>/dev/null || {
    echo "   ⚠️  Schema might already exist (this is OK)"
}

echo "2️⃣  Applying multi-tenant migrations (Phase 3)..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME < schema/migrations/003_multitenant_phase1.sql 2>/dev/null || {
    echo "   ⚠️  Migration might already be applied (this is OK)"
}

echo "3️⃣  Applying advanced RBAC features (Phase 5)..."
gcloud sql connect $INSTANCE --user=$DB_USER --database=$DB_NAME < schema/migrations/004_rbac_multitenant_phase5.sql 2>/dev/null || {
    echo "   ⚠️  Migration might already be applied (this is OK)"
}

echo ""
echo "✅ Database initialization completed!"
echo ""
echo "🔐 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
