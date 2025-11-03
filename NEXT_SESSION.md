# 🚀 Próxima Sesión - Pasos Inmediatos

**Última actualización:** 2025-11-03 23:42 UTC

---

## ✅ ESTADO ACTUAL

### Build Completado
- **Build ID:** `35869f6f-0334-4bdd-b673-a9c3dbafc5b8`
- **Estado:** ✅ SUCCESS
- **Imagen lista:** `gcr.io/artyco-financial-app/artyco-app:latest`

### Lo que incluye esta imagen:
- ✅ Fix de CORS (URLs centralizadas)
- ✅ Fix de bcrypt dependency
- ✅ Database seeding automático (crea usuario admin)

---

## 📋 PASOS PARA PRÓXIMA SESIÓN

### Paso 1️⃣: Hacer Deployment (5 minutos)

Abrir terminal WSL y ejecutar:

```bash
cd /mnt/c/Users/dpaul/OneDrive/Escritorio/artyco-financial-app-rbac

gcloud run deploy artyco-financial-app \
    --image gcr.io/artyco-financial-app/artyco-app:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8080 \
    --timeout=300 \
    --set-env-vars "ENVIRONMENT=production" \
    --set-env-vars "DATABASE_URL=mysql+pymysql://artycofinancial:Artyco2025Financial!@/artyco_financial_rbac?unix_socket=/cloudsql/artyco-financial-app:us-central1:artyco-db-instance" \
    --set-env-vars "JWT_SECRET_KEY=$(openssl rand -hex 32)" \
    --add-cloudsql-instances artyco-financial-app:us-central1:artyco-db-instance
```

**Tiempo estimado:** 3-5 minutos

---

### Paso 2️⃣: Verificar Login (2 minutos)

1. **Abrir en navegador:**
   ```
   https://artyco-financial-app-981333627435.us-central1.run.app
   ```

2. **Credenciales:**
   ```
   Usuario: admin
   Password: admin123
   ```

3. **Si login es exitoso:** ✅ ¡Listo! Deployment completado

4. **⚠️ IMPORTANTE:** Cambiar password de admin inmediatamente

---

### Paso 3️⃣: Verificar Logs de Seeding (Opcional)

```bash
gcloud run services logs read artyco-financial-app \
    --region us-central1 \
    --limit 50 | grep -A 10 "Creating initial"
```

**Deberías ver:**
```
📝 Creating initial roles and permissions...
👤 Creating default admin user...
✅ Initial data seeded successfully
   📧 Admin email: admin@artyco.com
   🔑 Admin password: admin123
```

---

### Paso 4️⃣: Optimizar para Futuros Builds (5 minutos)

Una vez verificado que todo funciona, **quitar `--no-cache`** para hacer builds 3x más rápidos:

```bash
# Editar cloudbuild.yaml
nano cloudbuild.yaml

# Buscar la línea:
      - '--no-cache'

# Y comentarla o eliminarla:
      # - '--no-cache'

# Guardar y commit:
git add cloudbuild.yaml
git commit -m "perf: remove --no-cache for faster builds"
git push
```

**Resultado:** Builds futuros tomarán 5-7 minutos en vez de 15-20 minutos

---

## 🎯 CHECKLIST RÁPIDO

```
[ ] Ejecutar comando de deployment
[ ] Abrir URL en navegador
[ ] Login con admin/admin123
[ ] Cambiar password de admin
[ ] Verificar logs de seeding (opcional)
[ ] Quitar --no-cache de cloudbuild.yaml
[ ] Commit y push cambios
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para más detalles, ver:
- **DEPLOYMENT_SUMMARY.md** - Documentación completa
- **scripts/check-costs.sh** - Monitoreo de costos

---

## 🆘 SI ALGO FALLA

### Error: Container no inicia
```bash
# Ver logs detallados:
gcloud run services logs read artyco-financial-app \
    --region us-central1 \
    --limit 100
```

### Error: Login 401
- Verificar que los logs muestren "Creating default admin user"
- Esperar 1-2 minutos para que seeding complete
- Refrescar la página

### Error: CORS
```bash
# Verificar que no haya localhost:8001 hardcoded:
curl -s https://artyco-financial-app-981333627435.us-central1.run.app/assets/index-*.js | grep -o "localhost:8001" | wc -l
# Debe retornar: 2 (solo fallbacks)
```

---

## ⏱️ TIEMPO TOTAL ESTIMADO

- **Deployment:** 3-5 minutos
- **Verificación:** 2 minutos
- **Optimización:** 5 minutos
- **TOTAL:** ~10-12 minutos

---

## 💰 RECORDATORIO DE COSTOS

Con la configuración actual (`min-instances=0`):
- **Cuando NO usas la app:** $0.00/hora
- **Costo mensual estimado:** ~$10-15/mes
- **Cloud Run FREE tier:** Cubre las primeras 2M requests/mes

Ver detalles en **DEPLOYMENT_SUMMARY.md** sección "Optimización de Costos"

---

**¡Todo listo para la próxima sesión!** 🚀
