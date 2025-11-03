#!/bin/bash
# Script para monitorear costos de Google Cloud
# Uso: ./scripts/check-costs.sh

echo "💰 REPORTE DE COSTOS - Artyco Financial App"
echo "==========================================="
echo ""

# Cloud Run
echo "📦 CLOUD RUN"
echo "------------"
gcloud run services describe artyco-financial-app \
  --region us-central1 \
  --format="table[box](
    status.url,
    spec.template.spec.containers[0].resources.limits.memory,
    spec.template.spec.containers[0].resources.limits.cpu,
    spec.template.metadata.annotations['autoscaling.knative.dev/minScale'],
    spec.template.metadata.annotations['autoscaling.knative.dev/maxScale']
  )"

echo ""
echo "Últimas métricas (últimas 24h):"
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/billable_instance_time"' \
  --format="table(metric.labels.service_name, points[0].value)" 2>/dev/null || echo "  (Requiere habilitar Cloud Monitoring)"

echo ""

# Cloud SQL
echo "🗄️  CLOUD SQL"
echo "------------"
gcloud sql instances describe artyco-db-instance \
  --format="table[box](
    name,
    settings.tier,
    settings.activationPolicy,
    state
  )"

echo ""
echo "Tamaño de BD:"
gcloud sql instances describe artyco-db-instance \
  --format="value(settings.dataDiskSizeGb)" | \
  awk '{print "  Disco: " $1 " GB (~$" $1*0.17 "/mes)"}'

echo ""

# Container Registry
echo "📦 CONTAINER REGISTRY"
echo "---------------------"
TOTAL_SIZE=$(gcloud container images list-tags gcr.io/artyco-financial-app/artyco-app \
  --format="get(timestamp.datetime,tags)" | wc -l)

echo "  Imágenes almacenadas: $TOTAL_SIZE"
echo "  Costo estimado: ~\$$(echo "scale=2; $TOTAL_SIZE * 0.026" | bc)/mes"

echo ""

# Estimación total
echo "💵 ESTIMACIÓN MENSUAL TOTAL"
echo "---------------------------"
echo "  Cloud Run:     \$2-5    (FREE tier cubre la mayoría)"
echo "  Cloud SQL:     \$7.67   (db-f1-micro siempre encendido)"
echo "  Storage:       \$0.50   (10GB)"
echo "  Registry:      \$0.26   (imágenes)"
echo "  Cloud Build:   \$0.00   (FREE tier 120min/día)"
echo "  ----------------------------"
echo "  TOTAL:         ~\$10-15/mes"
echo ""
echo "💡 TIPS PARA REDUCIR COSTOS:"
echo "  1. Activar auto-pause en Cloud SQL: ahorra ~50-70%"
echo "  2. Eliminar imágenes antiguas regularmente"
echo "  3. Usar SQLite para desarrollo/testing"
echo "  4. Monitorear en: https://console.cloud.google.com/billing"
echo ""
