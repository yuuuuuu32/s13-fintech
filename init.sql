-- Initial database setup for Finble
CREATE DATABASE IF NOT EXISTS finble;

USE finble;

-- Grant privileges to the application user (user is already created by docker-entrypoint)
-- GRANT ALL PRIVILEGES ON finble.* TO 'bluemarble_user'@'%';
-- FLUSH PRIVILEGES;

-- Wait for Spring Boot to create tables, then insert data
-- This file will be executed after Spring Boot creates the schema