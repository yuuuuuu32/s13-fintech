-- Initial database setup for BlueMarble
CREATE DATABASE IF NOT EXISTS bluemarble;

USE bluemarble;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON bluemarble.* TO 'bluemarble_user'@'%';
FLUSH PRIVILEGES;

-- Wait for Spring Boot to create tables, then insert data
-- This file will be executed after Spring Boot creates the schema