# ⚡ Quick Start - Deployment a SiteGround

## 🎯 Pasos Rápidos (5 minutos en tu PC)

### 1. Build del Frontend
```powershell
npm run build
```

### 2. Empaquetar para Deployment
```powershell
cd deploy\siteground
.\prepare-deployment.ps1
```

### 3. Subir a SiteGround
- Conecta via SFTP a `cfg.artycoec.com`
- Sube `artyco-siteground.zip` a `~/public_html/`

---

## 📖 Instrucciones Completas

Consulta: **`DEPLOYMENT_INSTRUCTIONS.md`** para la guía paso a paso completa.

---

## 📁 Archivos Creados

✅ **requirements_siteground.txt** - Dependencias optimizadas para hosting compartido
✅ **passenger_wsgi.py** - Configurado con a2wsgi para Passenger
✅ **.htaccess** - Rutas configuradas para cfg.artycoec.com
✅ **prepare-deployment.ps1** - Script automatizado de empaquetado

---

## ✨ Mejoras Implementadas

### Correcciones vs README original:

1. **Passenger WSGI corregido**: Ahora usa `a2wsgi` en vez de `WSGIMiddleware` inválido
2. **Dependencies optimizadas**: Versiones específicas compatibles con SiteGround
3. **Rutas actualizadas**: `.htaccess` configurado para cfg.artycoec.com
4. **Proceso automatizado**: Un solo script PowerShell lo empaqueta todo
5. **Pandas opcional**: Se puede omitir si falla en instalación

### Cambios de seguridad:

- JWT_SECRET_KEY debe generarse en el servidor
- Contraseña admin debe cambiarse inmediatamente
- Archivo .env con permisos restrictivos (600)

---

## 🔧 Credenciales de SiteGround

```
Base de datos: dbhvwc3icpvb0z
Usuario:       u6ugyggyggw7u
Password:      WBfwbn-yPeYp7d5
Dominio:       cfg.artycoec.com
```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa `DEPLOYMENT_INSTRUCTIONS.md` → Sección Troubleshooting
2. Verifica logs: `logs/error.log` y `~/logs/passenger.log`
3. Contacta soporte de SiteGround para problemas de servidor

---

**¡Todo listo para deployment!** 🚀
