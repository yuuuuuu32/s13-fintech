-- Initial database setup for Finble
CREATE DATABASE IF NOT EXISTS finble;

-- Ensure application user exists and has privileges
CREATE USER IF NOT EXISTS 'finble'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON finble.* TO 'finble'@'%';
FLUSH PRIVILEGES;

-- Spring Boot will handle schema creation via JPA