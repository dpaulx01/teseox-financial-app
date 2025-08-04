@echo off
echo ========================================
echo INICIANDO APLICACION FINANCIERA CON RBAC
echo ========================================
echo.

echo [1/3] Verificando servicios backend...
docker ps | findstr artyco-api-rbac >nul
if %errorlevel% neq 0 (
    echo ERROR: La API RBAC no esta ejecutandose!
    echo Ejecuta primero: docker-compose -f docker-compose-api.yml up -d
    pause
    exit /b 1
)
echo ✓ API RBAC activa en http://localhost:8001

echo.
echo [2/3] Instalando dependencias frontend...
call npm install --legacy-peer-deps --no-audit --no-fund

echo.
echo [3/3] Iniciando aplicacion...
echo.
echo ========================================
echo ACCESOS:
echo ========================================
echo Frontend: http://localhost:5173
echo API RBAC: http://localhost:8001
echo API Docs: http://localhost:8001/docs
echo phpMyAdmin: http://localhost:8082
echo.
echo CREDENCIALES:
echo Usuario: admin
echo Password: admin123
echo ========================================
echo.

start http://localhost:5173
npm run dev