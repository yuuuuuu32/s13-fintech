# Redis TTL 모니터링 시스템

Redis TTL 만료 이벤트와 리소스 과부하 현상을 실시간으로 모니터링하는 시스템입니다.

## 🎯 모니터링 목표

- **Redis TTL 만료 이벤트 집중 발생 구간의 성능 병목 확인**
- **만료 키 수(`expired_keys`), 메모리 사용량, active expire cycle 등 주요 Redis 메트릭 수집**
- **TTL 대량 상태에서 CPU · 메모리 · 처리 시간 변화 패턴 분석**
- **실제 만료 이벤트 처리 로직 호출 속도와 누적 건수 측정**

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Server  │    │  Spring Boot    │    │   Prometheus    │
│  (Keyspace      │◄──►│  Application    │◄──►│   (Metrics      │
│   Events)       │    │  (Custom        │    │   Collection)   │
│                 │    │   Metrics)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  redis-exporter │    │  Micrometer     │    │    Grafana      │
│  (Redis Metrics)│    │  (Custom        │    │  (Visualization)│
│                 │    │   Metrics)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 수집되는 메트릭

### Redis 기본 메트릭 (redis-exporter)
- `redis_expired_keys_total` - 총 만료된 키 수
- `redis_memory_used_bytes` - Redis 메모리 사용량
- `redis_connected_clients` - 연결된 클라이언트 수
- `redis_cpu_used_sys_seconds_total` - Redis CPU 사용량

### 커스텀 메트릭 (Micrometer)
- `ttlLoad.set.latency` - TTL 설정 지연시간
- `ttlLoad.bulk.latency` - 벌크 TTL 설정 지연시간
- `redis.expired.keys.total` - 만료된 키 총 개수
- `redis.expired.keys.by_pattern` - 패턴별 만료 키 수
- `redis.expired.key.processing.time` - 만료 이벤트 처리 시간

## 🚀 실행 방법

### 1. 전체 시스템 실행
```bash
# Docker Compose로 모든 서비스 실행
docker-compose up -d

# 서비스 상태 확인
docker-compose ps
```

### 2. 자동화된 테스트 실행
```bash
# 테스트 스크립트 실행
./test-redis-monitoring.sh
```

### 3. 수동 테스트
```bash
# 대량 TTL 설정 (10만개, 30초)
curl "http://localhost:8081/monitor/ttl/simulate-load?rooms=100000&ttlSeconds=30&burstCount=5"

# TTL 상태 확인
curl "http://localhost:8081/monitor/ttl/status"

# 기본 TTL 설정
curl "http://localhost:8081/monitor/ttl/bulk?rooms=5000&ttlSeconds=60"
```

## 📈 모니터링 대시보드

### 접속 정보
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Redis CLI**: `docker exec -it finble-backend_redis_1 redis-cli`

### 주요 대시보드 패널
1. **Redis Expired Keys Total** - 총 만료 키 수
2. **Redis Memory Usage** - 메모리 사용량
3. **Redis Connected Clients** - 연결 클라이언트 수
4. **Redis CPU Usage** - CPU 사용량
5. **TTL Load Test Metrics** - TTL 설정 지연시간
6. **Redis Expired Key Processing Time** - 만료 이벤트 처리 시간
7. **Redis Keyspace Events Rate** - 만료 이벤트 발생률

## 🔧 설정 정보

### Redis Keyspace Events 설정
```yaml
# docker-compose.yml
command: ["redis-server", "--appendonly", "yes", "--notify-keyspace-events", "Ex"]
```
- `E`: 키 이벤트 활성화
- `x`: 만료 이벤트 활성화

### Prometheus 설정
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'finble-backend'
    targets: ['app:8081']
  - job_name: 'redis-exporter'
    targets: ['redis-exporter:9121']
```

## 📋 API 엔드포인트

### TTL 모니터링 API
- `GET /monitor/ttl/bulk` - 대량 TTL 설정
- `GET /monitor/ttl/status` - TTL 상태 조회
- `GET /monitor/ttl/simulate-load` - 고부하 시뮬레이션

### 메트릭 API
- `GET /actuator/prometheus` - Prometheus 메트릭
- `GET /actuator/health` - 헬스 체크

## 🎯 실무 활용 시나리오

### 1. 대량 만료 이벤트 집중 발생 시뮬레이션
```bash
# 10만개 키를 30초 TTL로 설정하여 만료 이벤트 집중 발생
curl "http://localhost:8081/monitor/ttl/simulate-load?rooms=100000&ttlSeconds=30&burstCount=5"
```

### 2. 성능 병목 지점 분석
- **CPU 스파이크**: Redis CPU 사용량 급증 구간 확인
- **메모리 사용량**: 만료 이벤트 처리 중 메모리 변화 패턴
- **처리 지연시간**: 만료 이벤트 처리 시간 분포 분석

### 3. Cache Stampede 현상 모니터링
- 대량 만료 시점의 시스템 부하 패턴
- 만료 이벤트 처리 속도와 시스템 응답성 관계

## 🔍 문제 해결

### Redis 연결 문제
```bash
# Redis 연결 상태 확인
docker exec finble-backend_redis_1 redis-cli ping

# Redis 설정 확인
docker exec finble-backend_redis_1 redis-cli config get notify-keyspace-events
```

### 메트릭 수집 문제
```bash
# Prometheus 타겟 상태 확인
curl http://localhost:9090/api/v1/targets

# 애플리케이션 메트릭 확인
curl http://localhost:8081/actuator/prometheus | grep ttlLoad
```

### Grafana 접속 문제
```bash
# Grafana 컨테이너 로그 확인
docker-compose logs grafana

# Grafana 데이터소스 설정 확인
curl http://admin:admin@localhost:3000/api/datasources
```

## 📚 참고 자료

- [Redis Keyspace Notifications](https://redis.io/docs/manual/keyspace-notifications/)
- [redis-exporter GitHub](https://github.com/oliver006/redis_exporter)
- [Micrometer Prometheus](https://micrometer.io/docs/registry/prometheus)
- [Grafana Dashboard JSON](https://grafana.com/docs/grafana/latest/dashboards/json-dashboard/)

## 🎓 포트폴리오 활용

이 모니터링 시스템은 다음과 같은 실무 경험을 보여줍니다:

1. **대규모 Redis 운영 경험**: TTL 만료 이벤트 처리 최적화
2. **모니터링 시스템 구축**: Prometheus + Grafana 기반 실시간 모니터링
3. **성능 병목 분석**: 메트릭 기반 성능 문제 진단 및 해결
4. **마이크로서비스 아키텍처**: 분산 시스템 모니터링 경험
