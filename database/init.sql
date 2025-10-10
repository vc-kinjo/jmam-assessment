-- Initial database setup for Gunchart Project Management System
-- Django will handle table creation via migrations

-- Set timezone
SET timezone = 'UTC';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database user if not exists (for development)
-- Note: In production, this should be done separately
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gunchart_user') THEN
        CREATE ROLE gunchart_user WITH LOGIN PASSWORD 'gunchart_password';
    END IF;
END
$$;

-- Grant necessary privileges
GRANT CONNECT ON DATABASE gunchart_db TO gunchart_user;
GRANT USAGE ON SCHEMA public TO gunchart_user;
GRANT CREATE ON SCHEMA public TO gunchart_user;

-- This file will be executed when the PostgreSQL container starts