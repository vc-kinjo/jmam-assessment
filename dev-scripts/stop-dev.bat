@echo off
echo Stopping Gunchart Development Environment...

echo.
echo Stopping Docker services...
docker-compose down

echo.
echo Killing development servers on ports 3000, 8001, 8002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /F /PID %%a 2>nul  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8002') do taskkill /F /PID %%a 2>nul

echo.
echo Development environment stopped!
pause