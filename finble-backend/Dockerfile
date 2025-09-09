# Multi-stage build for Spring Boot application
FROM gradle:8.5-jdk21 AS build

# Set working directory
WORKDIR /app

# Copy gradle files first for better caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Download dependencies
RUN gradle dependencies --no-daemon

# Copy source code
COPY src ./src

# Build the application
RUN gradle clean build --no-daemon -x test

# Runtime stage
<<<<<<< HEAD
FROM eclipse-temurin:21-jre-alpine
=======
FROM eclipse-temurin:17-jre-alpine
>>>>>>> 4e19aea (feature/back-server : 배포 세팅- Docker 세팅- Redis, DB 연결 준비)

# Set working directory
WORKDIR /app

# Install curl for health check (before switching to non-root user)
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Copy JAR file from build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Change ownership to appuser
RUN chown appuser:appuser app.jar

# Switch to non-root user
USER appuser

# Expose port
<<<<<<< HEAD
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8081/actuator/health || exit 1
=======
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
>>>>>>> 4e19aea (feature/back-server : 배포 세팅- Docker 세팅- Redis, DB 연결 준비)

# Run the application
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]