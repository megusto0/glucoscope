@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "VENV_DIR=%ROOT_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "BACKEND_REQUIREMENTS=%ROOT_DIR%\backend\requirements.txt"

if not defined BACKEND_PORT set "BACKEND_PORT=8000"
if not defined FRONTEND_PORT set "FRONTEND_PORT=5173"

where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_BOOTSTRAP=python"
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_BOOTSTRAP=py -3"
  ) else (
    echo Missing required command: python or py
    exit /b 1
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo Missing required command: node
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Missing required command: npm
  exit /b 1
)

if not exist "%VENV_PYTHON%" (
  echo Creating Python virtual environment...
  call %PYTHON_BOOTSTRAP% -m venv "%VENV_DIR%"
  if errorlevel 1 exit /b 1
)

call :hash_file "%BACKEND_REQUIREMENTS%" BACKEND_HASH
if errorlevel 1 exit /b 1

set "BACKEND_STAMP=%VENV_DIR%\.backend-requirements.sha256"
set "CURRENT_BACKEND_HASH="
if exist "%BACKEND_STAMP%" set /p CURRENT_BACKEND_HASH=<"%BACKEND_STAMP%"

if not "%CURRENT_BACKEND_HASH%"=="%BACKEND_HASH%" (
  echo Installing backend dependencies...
  "%VENV_PYTHON%" -m pip install --upgrade pip
  if errorlevel 1 exit /b 1
  "%VENV_PYTHON%" -m pip install -r "%BACKEND_REQUIREMENTS%"
  if errorlevel 1 exit /b 1
  >"%BACKEND_STAMP%" echo %BACKEND_HASH%
)

call :hash_file "%FRONTEND_DIR%\package-lock.json" FRONTEND_HASH
if errorlevel 1 exit /b 1

set "FRONTEND_STAMP=%FRONTEND_DIR%\node_modules\.package-lock.sha256"
set "CURRENT_FRONTEND_HASH="
set "NEED_FRONTEND_INSTALL="

if not exist "%FRONTEND_DIR%\node_modules" set "NEED_FRONTEND_INSTALL=1"
if exist "%FRONTEND_STAMP%" set /p CURRENT_FRONTEND_HASH=<"%FRONTEND_STAMP%"
if not "%CURRENT_FRONTEND_HASH%"=="%FRONTEND_HASH%" set "NEED_FRONTEND_INSTALL=1"

if defined NEED_FRONTEND_INSTALL (
  echo Installing frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm ci
  set "NPM_EXIT=%ERRORLEVEL%"
  popd
  if not "%NPM_EXIT%"=="0" exit /b %NPM_EXIT%
  if not exist "%FRONTEND_DIR%\node_modules" mkdir "%FRONTEND_DIR%\node_modules"
  >"%FRONTEND_STAMP%" echo %FRONTEND_HASH%
)

echo Starting backend on http://localhost:%BACKEND_PORT% ...
start "Glucoscope Backend" /D "%ROOT_DIR%" cmd /k ""%VENV_PYTHON%" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%"

echo Starting frontend on http://localhost:%FRONTEND_PORT%/app/ ...
echo Backend opens in a separate window. Close both windows when finished.

pushd "%FRONTEND_DIR%"
call npm run dev -- --host 0.0.0.0 --port %FRONTEND_PORT%
set "NPM_EXIT=%ERRORLEVEL%"
popd
exit /b %NPM_EXIT%

:hash_file
set "%~2="
for /f "usebackq delims=" %%H in (`"%VENV_PYTHON%" -c "import hashlib,sys; print(hashlib.sha256(open(sys.argv[1], 'rb').read()).hexdigest())" "%~1"`) do set "%~2=%%H"
if not defined %~2 exit /b 1
exit /b 0
