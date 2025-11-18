#!/bin/bash

# Deploy script for Teseo X to Cloud Run
# This script deploys both API and Frontend services

set -e

PROJECT_ID="teseo-x"
REGION="us-central1"
DB_INSTANCE="teseox-db"
DB_NAME="teseox_db"
DB_USER="teseox_user"

echo "🚀 Deploying Teseo X to Cloud Run..."
echo ""

# Get Cloud SQL connection name
SQL_CONNECTION=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")
echo "✅ Cloud SQL Connection: $SQL_CONNECTION"

# Secret names (Cloud Run format: SECRET_NAME:VERSION)
DB_PASSWORD_SECRET="db-password:latest"
JWT_SECRET="jwt-secret:latest"

# Deploy Frontend service FIRST (to get its URL for CORS)
echo ""
echo "🎨 Deploying Frontend service..."
gcloud run deploy teseox-frontend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --port 80

# Get Frontend URL
FRONTEND_URL=$(gcloud run services describe teseox-frontend --region $REGION --format="value(status.url)")
echo "✅ Frontend deployed at: $FRONTEND_URL"

# Deploy API service with CORS configuration
echo ""
echo "📦 Deploying API service with CORS enabled for frontend..."
# Create env vars file to avoid gcloud escaping issues with URLs
cat > api-env.yaml <<EOF
DB_HOST: "/cloudsql/$SQL_CONNECTION"
DB_NAME: "$DB_NAME"
DB_USER: "$DB_USER"
DB_PORT: "3306"
ENVIRONMENT: "production"
CORS_ORIGINS: "$FRONTEND_URL,http://localhost:5173,http://localhost:3001"
EOF

gcloud run deploy teseox-api \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/teseox-repo/teseox-api:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --env-vars-file=api-env.yaml \
  --set-secrets="DB_PASSWORD=$DB_PASSWORD_SECRET,JWT_SECRET=$JWT_SECRET" \
  --add-cloudsql-instances $SQL_CONNECTION \
  --port 8000

rm -f api-env.yaml

# Get API URL
API_URL=$(gcloud run services describe teseox-api --region $REGION --format="value(status.url)")
echo "✅ API deployed at: $API_URL"

# Update Frontend with API URL
echo ""
echo "🔄 Updating Frontend with API URL..."
gcloud run services update teseox-frontend \
  --region $REGION \
  --set-env-vars="VITE_API_BASE_URL=$API_URL"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service URLs:"
echo "   API:      $API_URL"
echo "   Frontend: $FRONTEND_URL"
echo ""
echo "🔗 Next steps:"
echo "   1. Initialize database with schema"
echo "   2. Create admin user"
echo "   3. Test login at $FRONTEND_URL"
