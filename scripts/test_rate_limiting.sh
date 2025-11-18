#!/bin/bash

# Script para probar rate limiting de superadmin (100 req/min)
# Debe retornar 429 después de 100 requests

echo "🧪 Probando rate limiting de superadmin..."
echo "   Límite: 100 requests/min"
echo ""

# Login como admin para obtener token
echo "1️⃣  Autenticando como admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Error: No se pudo obtener token"
  echo "Respuesta: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."
echo ""

# Hacer 105 requests rápidas
echo "2️⃣  Enviando 105 requests a /api/superadmin/companies..."
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in {1..105}; do
  RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "http://localhost:8001/api/superadmin/companies?limit=10" \
    -H "Authorization: Bearer $TOKEN")

  if [ "$RESPONSE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$RESPONSE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    if [ $RATE_LIMITED_COUNT -eq 1 ]; then
      echo "⚠️  Request #$i: RATE LIMITED (HTTP 429) - ¡Funciona!"
    fi
  else
    echo "❌ Request #$i: Unexpected response code $RESPONSE"
  fi

  # Progress indicator
  if [ $((i % 20)) -eq 0 ]; then
    echo "   Progress: $i/105 requests..."
  fi
done

echo ""
echo "📊 RESULTADOS:"
echo "   ✅ Exitosos (HTTP 200): $SUCCESS_COUNT"
echo "   ⚠️  Rate limited (HTTP 429): $RATE_LIMITED_COUNT"
echo ""

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo "✅ RATE LIMITING FUNCIONA CORRECTAMENTE"
  echo "   Se bloquearon $RATE_LIMITED_COUNT requests después de ~100"
  exit 0
else
  echo "❌ RATE LIMITING NO FUNCIONÓ"
  echo "   Se esperaba al menos 5 requests bloqueados"
  exit 1
fi
