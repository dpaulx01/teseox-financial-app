@echo off
echo ========================================
echo Iniciando Backend API en puerto 8001
echo ========================================
echo.

cd backend
php -S localhost:8001 -t .

pause