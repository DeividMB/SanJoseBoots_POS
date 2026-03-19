@echo off
title San Jose Boots - Sistema POS
color 0A

echo.
echo  ============================================
echo   SAN JOSE BOOTS - Sistema POS
echo   Iniciando servicios...
echo  ============================================
echo.

REM ── Verificar que XAMPP MySQL este corriendo ──────────────────
echo  [1/3] Verificando MySQL (XAMPP)...
sc query mysql >nul 2>&1
if %errorlevel% neq 0 (
  echo  [!] MySQL no esta corriendo. Iniciando...
  net start mysql >nul 2>&1
  if %errorlevel% neq 0 (
    echo  [!] No se pudo iniciar MySQL automaticamente.
    echo      Por favor abre XAMPP y enciende MySQL manualmente.
    echo      Luego presiona cualquier tecla para continuar.
    pause >nul
  ) else (
    echo  [OK] MySQL iniciado.
  )
) else (
  echo  [OK] MySQL ya esta corriendo.
)

echo.

REM ── Rutas del proyecto ────────────────────────────────────────
set "ROOT=C:\Users\gaelm\Downloads\SanJose_Boots"
set "BACKEND=%ROOT%\backend-sanjoseboots"
set "FRONTEND=%ROOT%\frontend-sanjoseboots"

REM ── Verificar que existan las carpetas ────────────────────────
if not exist "%BACKEND%" (
  echo  [ERROR] No se encontro la carpeta backend en:
  echo  %BACKEND%
  echo  Verifica la ruta del proyecto.
  pause
  exit /b 1
)

if not exist "%FRONTEND%" (
  echo  [ERROR] No se encontro la carpeta frontend en:
  echo  %FRONTEND%
  echo  Verifica la ruta del proyecto.
  pause
  exit /b 1
)

REM ── Iniciar Backend ───────────────────────────────────────────
echo  [2/3] Iniciando Backend (puerto 3001)...
start "SJB - Backend" cmd /k "cd /d "%BACKEND%" && echo  Backend iniciando... && npm start"

REM Esperar 3 segundos para que el backend arranque primero
timeout /t 3 /nobreak >nul

REM ── Iniciar Frontend ──────────────────────────────────────────
echo  [3/3] Iniciando Frontend (puerto 5173)...
start "SJB - Frontend" cmd /k "cd /d "%FRONTEND%" && echo  Frontend iniciando... && npm run dev"

REM Esperar 4 segundos para que el frontend compile
timeout /t 4 /nobreak >nul

REM ── Abrir navegador ───────────────────────────────────────────
echo.
echo  Abriendo navegador...
start "" "http://localhost:5173"

echo.
echo  ============================================
echo   Sistema iniciado correctamente.
echo.
echo   Backend:   http://localhost:3001
echo   Frontend:  http://localhost:5173
echo.
echo   Para detener el sistema, cierra las
echo   ventanas "SJB - Backend" y "SJB - Frontend"
echo  ============================================
echo.

REM Mantener esta ventana abierta unos segundos y luego cerrar
timeout /t 8 /nobreak >nul
exit
