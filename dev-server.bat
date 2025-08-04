@echo off
echo ====================================
echo INICIANDO SERVIDOR DE DESARROLLO
echo ====================================
echo.

cd /d "C:\Users\dpaul\OneDrive\Escritorio\artyco-financial-app-rbac"

echo Instalando dependencias...
call npm install --legacy-peer-deps

echo.
echo Iniciando servidor Vite...
echo.
echo Accede a: http://localhost:5173
echo.

npx vite --host 0.0.0.0 --port 5173