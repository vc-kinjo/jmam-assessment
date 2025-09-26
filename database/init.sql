-- Initial database setup for Gunchart Project Management System

-- Create database (if not exists)
-- This will be created by docker-compose

-- Set timezone
SET timezone = 'UTC';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- This file will be executed when the PostgreSQL container starts
-- Additional initialization can be added here