# Finble Backend 포팅 메뉴얼

## 1. 시스템 요구사항 및 기술 스택

### 1.1 JVM, 웹서버, WAS 제품 종류와 설정값, 버전

#### JVM (Java Virtual Machine)
- **Java Version**: OpenJDK 17 (Eclipse Temurin 17 JRE)
- **JVM 설정**: 
  - `-Djava.security.egd=file:/dev/./urandom` (보안 랜덤 생성기 최적화)
  - 기본 힙 메모리: JVM 기본값 사용
  - Garbage Collector: G1GC (Java 17 기본값)

#### 웹서버/WAS
- **Spring Boot**: 3.5.3 (내장 Tomcat 사용)
- **Tomcat Version**: Spring Boot 3.5.3 내장 버전
- **서버 포트**: 
  - 개발환경: 8080
  - 운영환경: 8081
- **Actuator 포트**: 동일 포트 사용 (`/actuator/*`)

#### 빌드 도구
- **Gradle**: 8.14.3
- **Gradle Wrapper**: gradle-8.14.3-bin.zip
- **Java Toolchain**: Java 17

### 1.2 주요 의존성 및 버전

#### Spring Framework
- Spring Boot: 3.5.3
- Spring Security: 3.5.3
- Spring Data JPA: 3.5.3
- Spring Data Redis: 3.5.3
- Spring WebSocket: 3.5.3
- Spring AOP: 3.5.3

#### 데이터베이스
- MySQL Connector: 8.x
- Hibernate: 6.x (Spring Boot 3.5.3 내장)
- H2 Database: 2.x (테스트용)

#### 인증/보안
- JWT (jjwt): 0.11.5
- OAuth2 Client: Spring Security 내장

#### 기타 라이브러리
- Lombok: 1.18.30
- Gson: 2.10.1
- Jackson: Spring Boot 내장
- Firebase Admin SDK: 9.2.0
- Swagger/OpenAPI: 2.8.6

## 2. 빌드 환경 변수 및 설정

### 2.1 필수 환경 변수

#### 데이터베이스 설정
```bash
# MySQL 설정
DB_HOST=localhost          # 개발환경 기본값
DB_HOST=mysql             # Docker 환경 기본값
DB_PORT=3307              # 개발환경 기본값
DB_PORT=3306              # Docker 환경 기본값
DB_NAME=finble
DB_USERNAME=finble_user   # Docker 환경에서만 사용
DB_PASSWORD=password      # Docker 환경에서만 사용
```

#### Redis 설정
```bash
REDIS_HOST=localhost      # 개발환경 기본값
REDIS_HOST=redis         # Docker 환경 기본값
REDIS_PORT=6379
```

#### 서버 설정
```bash
SERVER_PORT=8080         # 개발환경 기본값
SERVER_PORT=8081         # Docker 환경 기본값
```

#### JWT 설정
```bash
JWT_SECRET=bluemarble-jwt-secret-key-for-finble-game-project-2024-very-long-secure-key-minimum-256-bits-required
```

### 2.2 OAuth2 설정
```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=
spring.security.oauth2.client.registration.google.client-secret=

# Kakao OAuth2
KAKAO_REST_API_KEY=409725197be3c8a40abff4791c2ac7e6
```

### 2.3 빌드 명령어
```bash
# 개발환경 빌드
./gradlew clean build

# Docker 빌드
docker build -t finble-backend .

# 테스트 제외 빌드 (CI/CD용)
./gradlew clean build -x test
```

## 3. 배포 시 특이사항

### 3.1 Docker 배포
- **Multi-stage build** 사용 (빌드 스테이지 + 런타임 스테이지)
- **Non-root user** 실행 (보안 강화)
- **Health check** 내장 (`/actuator/health`)
- **로그 디렉토리** 자동 생성 (`/app/logs`)

### 3.2 보안 설정
- JWT 토큰 만료시간: 24시간 (Access Token), 7일 (Refresh Token)
- CORS 설정: 모든 오리진 허용 (`*`)
- WebSocket 인증: JWT 토큰 기반

### 3.3 로깅 설정
- 로그 파일: `/app/logs/bluemarble.log`
- 로그 레벨: 
  - 개발환경: INFO
  - Docker 환경: DEBUG
- 로그 포맷: `%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n`

### 3.4 모니터링
- Spring Actuator 활성화
- 헬스체크 엔드포인트: `/actuator/health`
- 메트릭 엔드포인트: `/actuator/metrics`
- 정보 엔드포인트: `/actuator/info`

## 4. 데이터베이스 및 주요 계정 정보

### 4.1 데이터베이스 접속 정보

#### 개발환경 (application.properties)
```properties
# MySQL
spring.datasource.url=jdbc:mysql://localhost:3307/finble?useSSL=false&serverTimezone=UTC&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=1234

# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

#### Docker 환경 (application-docker.yml)
```yaml
# MySQL
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/finble?useSSL=false&serverTimezone=UTC&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
    username: finble_user
    password: password

# Redis
spring:
  data:
    redis:
      host: redis
      port: 6379
```

#### 테스트환경 (application-test.yml)
```yaml
# H2 인메모리 데이터베이스
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password: 
```

### 4.2 주요 프로퍼티 파일 목록

#### 설정 파일
1. **`src/main/resources/application.properties`** - 개발환경 설정
2. **`src/main/resources/application-docker.yml`** - Docker/운영환경 설정
3. **`src/test/resources/application-test.yml`** - 테스트환경 설정

#### 빌드 설정 파일
1. **`build.gradle`** - Gradle 빌드 설정 및 의존성
2. **`settings.gradle`** - 프로젝트 설정
3. **`gradle/wrapper/gradle-wrapper.properties`** - Gradle Wrapper 설정

#### 배포 설정 파일
1. **`Dockerfile`** - Docker 이미지 빌드 설정
2. **`deploy.sh`** - 배포 스크립트 (현재 미사용)

### 4.3 외부 서비스 계정 정보

#### Google OAuth2
- Client ID: `488233152596-2p0q6k05r71d0i1hp0k8p28u5uc3g3r2.apps.googleusercontent.com`
- Client Secret: `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`
- Scope: `email, profile`

#### Kakao OAuth2
- REST API Key: `409725197be3c8a40abff4791c2ac7e6`
- Token URL: `https://kauth.kakao.com/oauth/token`

#### Firebase
- Admin SDK 사용 (서비스 계정 키 파일 필요)
- 버전: 9.2.0

## 5. 배포 절차

### 5.1 GitLab에서 소스 클론
```bash
git clone https://lab.ssafy.com/s13-fintech-finance-sub1/S13P21D106.git

cd finble-backend
```

### 5.2 로컬 개발환경 빌드
```bash
# 의존성 다운로드
./gradlew dependencies

# 애플리케이션 빌드
./gradlew clean build

# 애플리케이션 실행
./gradlew bootRun
```

### 5.3 Docker 환경 빌드 및 실행
```bash
# Docker Compose로 전체 스택 실행 (MySQL, Redis 포함)
docker-compose up -d
```

### 5.4 헬스체크 확인
```bash
# 애플리케이션 상태 확인
curl http://localhost:8081/actuator/health

# 상세 정보 확인
curl http://localhost:8081/actuator/info
```

---

**문서 작성일**: 2025년 9월 28일 

**프로젝트명**: Finble Backend (Blue Marble Game)

**버전**: 0.0.1-SNAPSHOT
