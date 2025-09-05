-- Initial database setup for BlueMarble
CREATE DATABASE IF NOT EXISTS bluemarble;

USE bluemarble;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON bluemarble.* TO 'bluemarble_user'@'%';
FLUSH PRIVILEGES;

-- Create basic tables if they don't exist (optional - Spring Boot will handle this)
-- This file is mainly for ensuring database and user setup