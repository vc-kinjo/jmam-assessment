@echo off
echo Initializing Gunchart Database...

echo.
echo Starting Docker services...
docker-compose up -d postgres redis

echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 15

echo.
echo Running database migrations...
cd backend
set PYTHONPATH=.
set DATABASE_URL=postgresql://gunchart_user:gunchart_password@localhost:5432/gunchart_db
python -m alembic upgrade head

echo.
echo Creating initial admin user...
python app/database/seeds.py

echo.
echo Database initialization completed!
echo.
echo Admin credentials:
echo Username: admin
echo Password: admin123
echo.
cd ..
pause