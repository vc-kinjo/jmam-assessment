@echo off
echo Starting Gunchart Development Environment...

echo.
echo Starting Docker services...
docker-compose up -d postgres redis

echo.
echo Waiting for services to be ready...
timeout /t 10

echo.
echo Starting Backend API...
start cmd /k "cd backend && set PYTHONPATH=. && set DATABASE_URL=postgresql://gunchart_user:gunchart_password@localhost:5432/gunchart_db && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"

echo.
echo Starting BFF API...
start cmd /k "cd bff && set PYTHONPATH=. && set BACKEND_URL=http://localhost:8002 && set REDIS_HOST=localhost && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo.
echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo.
echo Development environment started!
echo Frontend: http://localhost:3000
echo BFF API: http://localhost:8001
echo Backend API: http://localhost:8002
echo.
pause