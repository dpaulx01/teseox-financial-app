# 🚀 Deployment Guide - Google Cloud Run

Complete guide to deploy **Artyco Financial App** to Google Cloud Run with Cloud SQL MySQL.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Google Cloud account with billing enabled
- ✅ Google Cloud SDK (`gcloud`) installed locally
- ✅ Docker installed and running
- ✅ GitHub repository set up (already done ✓)
- ✅ Basic knowledge of command line

### Install Google Cloud SDK

**Windows:**
```powershell
# Download and install from:
https://cloud.google.com/sdk/docs/install-sdk#windows

# Or using Chocolatey:
choco install gcloudsdk
```

**Mac/Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

---

## 🏗️ PART 1: Google Cloud Project Setup

### Step 1: Create Google Cloud Project

```bash
# Set your project ID (must be unique globally)
export PROJECT_ID="artyco-financial-app"
export REGION="us-central1"

# Create the project
gcloud projects create $PROJECT_ID --name="Artyco Financial App"

# Set as default project
gcloud config set project $PROJECT_ID

# Enable billing (required - do this via console)
echo "⚠️  Enable billing at: https://console.cloud.google.com/billing/projects"
```

### Step 2: Enable Required APIs

```bash
# Enable necessary Google Cloud APIs
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    cloudresourcemanager.googleapis.com
```

---

## 🗄️ PART 2: Cloud SQL Setup

### Step 3: Create Cloud SQL MySQL Instance

```bash
# Create MySQL 8.0 instance
gcloud sql instances create artyco-mysql \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password="CHOOSE_SECURE_PASSWORD" \
    --storage-size=10GB \
    --storage-type=SSD \
    --storage-auto-increase

# This takes 5-10 minutes...
```

**💰 Cost:** db-f1-micro (~$7-15/month)

**For production, consider:**
- `db-n1-standard-1` (more CPU/RAM)
- Enable automatic backups
- Enable high availability

### Step 4: Create Database and User

```bash
# Create database
gcloud sql databases create artyco_financial_rbac \
    --instance=artyco-mysql

# Create user
gcloud sql users create artyco_user \
    --instance=artyco-mysql \
    --password="CHOOSE_SECURE_PASSWORD"

# Get connection name (you'll need this later)
gcloud sql instances describe artyco-mysql \
    --format="value(connectionName)"
# Output: PROJECT_ID:REGION:artyco-mysql
```

### Step 5: Initialize Database Schema

```bash
# Connect to Cloud SQL via proxy
gcloud sql connect artyco-mysql --user=root

# In MySQL prompt, run your SQL files:
mysql> source sql/01-create-financial-tables.sql;
mysql> source sql/02-create-raw-table.sql;
mysql> source sql/03-rbac-schema.sql;
mysql> source sql/04-align-production-metrics.sql;
mysql> source sql/05-add-production-rbac.sql;
mysql> source sql/06-create-production-config.sql;
mysql> source sql/07-create-sales-bi-module.sql;
mysql> exit;
```

---

## 🔐 PART 3: Secrets Management

### Step 6: Store Secrets in Secret Manager

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create secrets
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret-key \
    --replication-policy="automatic" \
    --data-file=-

echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password \
    --replication-policy="automatic" \
    --data-file=-

echo -n "YOUR_ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key \
    --replication-policy="automatic" \
    --data-file=-
```

---

## 🐳 PART 4: Build and Deploy

### Step 7: Build Docker Image

**Option A: Using Cloud Build (Recommended)**

```bash
# Submit build to Google Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/artyco-financial-app
```

**Option B: Build locally and push**

```bash
# Build locally
docker build -t gcr.io/$PROJECT_ID/artyco-financial-app:latest .

# Configure Docker to use gcloud
gcloud auth configure-docker

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/artyco-financial-app:latest
```

### Step 8: Deploy to Cloud Run

```bash
# Get Cloud SQL connection name
CLOUD_SQL_CONNECTION=$(gcloud sql instances describe artyco-mysql \
    --format="value(connectionName)")

# Deploy to Cloud Run
gcloud run deploy artyco-financial-app \
    --image gcr.io/$PROJECT_ID/artyco-financial-app:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8080 \
    --set-env-vars "ENVIRONMENT=production" \
    --set-env-vars "DB_HOST=/cloudsql/$CLOUD_SQL_CONNECTION" \
    --set-env-vars "DB_NAME=artyco_financial_rbac" \
    --set-env-vars "DB_USER=artyco_user" \
    --set-secrets "JWT_SECRET_KEY=jwt-secret-key:latest" \
    --set-secrets "DB_PASSWORD=db-password:latest" \
    --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest" \
    --add-cloudsql-instances $CLOUD_SQL_CONNECTION
```

**This will output your service URL:**
```
Service [artyco-financial-app] revision [artyco-financial-app-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://artyco-financial-app-xxxxx-uc.a.run.app
```

---

## 🌐 PART 5: Custom Domain (Optional)

### Step 9: Map Custom Domain

```bash
# Add your domain
gcloud run domain-mappings create --service artyco-financial-app \
    --domain cfg.artycoec.com \
    --region $REGION

# Follow the DNS instructions to add records
```

---

## 🔄 PART 6: CI/CD with GitHub Actions

### Step 10: Setup GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main, master ]

env:
  PROJECT_ID: your-project-id
  REGION: us-central1
  SERVICE_NAME: artyco-financial-app

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Google Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ env.PROJECT_ID }}

    - name: Authorize Docker push
      run: gcloud auth configure-docker

    - name: Build Docker image
      run: docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA .

    - name: Push Docker image
      run: docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE_NAME \
          --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated
```

**Setup Service Account:**

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Add to GitHub Secrets:
# - Go to GitHub repo → Settings → Secrets → Actions
# - Add new secret: GCP_SA_KEY
# - Paste contents of key.json
```

---

## 📊 PART 7: Monitoring & Logs

### View Logs

```bash
# Stream logs
gcloud run services logs tail artyco-financial-app \
    --region $REGION \
    --follow

# View in Cloud Console
https://console.cloud.google.com/run/detail/$REGION/artyco-financial-app/logs
```

### View Metrics

```bash
# Open Cloud Console Monitoring
https://console.cloud.google.com/run/detail/$REGION/artyco-financial-app/metrics
```

---

## 💰 Cost Estimation

**Monthly costs (low traffic, 100-500 users):**

| Service | Tier | Cost |
|---------|------|------|
| Cloud Run | Free tier (2M requests/month) | $0-5 |
| Cloud SQL | db-f1-micro | $7-15 |
| Cloud Storage | Container images | $1-2 |
| Cloud Build | Free tier (120 builds/day) | $0 |
| **Total** | | **$8-22/month** |

**For production scale (1000+ users):**
- Cloud Run: $20-50
- Cloud SQL: db-n1-standard-1: $25-50
- **Total: $45-100/month**

---

## 🔧 Troubleshooting

### Issue: "Cloud SQL connection failed"

```bash
# Check Cloud SQL instance status
gcloud sql instances describe artyco-mysql

# Verify connection string in env vars
gcloud run services describe artyco-financial-app --region $REGION
```

### Issue: "Container failed to start"

```bash
# Check logs
gcloud run services logs read artyco-financial-app --region $REGION --limit 50

# Test container locally
docker run -p 8080:8080 gcr.io/$PROJECT_ID/artyco-financial-app:latest
```

### Issue: "Out of memory"

```bash
# Increase memory
gcloud run services update artyco-financial-app \
    --memory 1Gi \
    --region $REGION
```

---

## 🎯 Next Steps

1. ✅ Setup monitoring alerts
2. ✅ Configure automatic backups
3. ✅ Add custom domain
4. ✅ Setup staging environment
5. ✅ Configure rate limiting
6. ✅ Add security headers

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cost Calculator](https://cloud.google.com/products/calculator)

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
