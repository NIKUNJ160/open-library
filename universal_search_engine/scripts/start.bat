@echo off
setlocal enabledelayedexpansion

echo Starting Universal Open Knowledge Search Engine...

:: Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker is not installed or not in PATH.
    echo Please install Docker Desktop to run the deployment script.
    exit /b 1
)

:: Check for .env file
if not exist .env (
    echo Warning: .env file not found. Copying .env.example to .env...
    copy .env.example .env >nul
    echo Please update the .env file with your specific configuration, especially OPENAI_API_KEY.
)

:: Create frontend directory if it doesn't exist
if not exist frontend (
    echo Creating empty frontend directory for volume mount...
    mkdir frontend
    echo ^<h1^>Frontend Placeholder^</h1^>^<p^>Replace this with your built frontend files.^</p^> > frontend\index.html
)

echo Building and starting Docker containers...

:: Run docker-compose
docker compose up -d --build
if %errorlevel% neq 0 (
    docker-compose up -d --build
    if !errorlevel! neq 0 (
        echo Error: Failed to start Docker containers.
        exit /b 1
    )
)

echo.
echo ==========================================================
echo Deployment Successful!
echo ==========================================================
echo.
echo Services are now running:
echo 🌐 Frontend:       http://localhost:8080
echo 🔌 API Health:     http://localhost:3000/api/v1/health
echo 📚 API Swagger:    http://localhost:3000/api/docs
echo.
echo To view logs, run:
echo   docker compose logs -f
echo ==========================================================

endlocal
