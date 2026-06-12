@echo off
cd /d "%~dp0"
start "BLE Trust Backend" cmd /k start-backend.cmd
start "BLE Trust Frontend" cmd /k start-frontend.cmd
echo Backend:  http://127.0.0.1:8000/status
echo Frontend: http://localhost:3000
