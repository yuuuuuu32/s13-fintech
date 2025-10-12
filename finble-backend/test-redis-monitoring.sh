#!/bin/bash

echo "=== Redis TTL 모니터링 테스트 스크립트 ==="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Docker Compose 실행 확인
print_step "Docker Compose 서비스 상태 확인"
docker-compose ps

# 2. Redis 연결 테스트
print_step "Redis 연결 테스트"
docker exec finble-backend-redis-1 redis-cli ping

# 3. 애플리케이션 헬스 체크
print_step "애플리케이션 헬스 체크"
curl -s http://localhost:8081/actuator/health | jq .

# 4. TTL 상태 확인
print_step "TTL 상태 확인"
curl -s http://localhost:8081/monitor/ttl/status | jq .

# 5. 대량 TTL 설정 테스트
print_step "대량 TTL 설정 테스트 (10만개, 30초)"
curl -s "http://localhost:8081/monitor/ttl/simulate-load?rooms=100000&ttlSeconds=30&burstCount=5"

# 6. Prometheus 메트릭 확인
print_step "Prometheus 메트릭 확인"
echo "Redis 메트릭:"
curl -s http://localhost:9090/api/v1/query?query=redis_expired_keys_total

echo -e "\n애플리케이션 메트릭:"
curl -s http://localhost:9090/api/v1/query?query=ttlLoad_set_latency_seconds

# 7. Redis CLI로 실시간 키 확인
print_step "Redis CLI로 실시간 키 확인"
echo "현재 TTL이 설정된 키 개수:"
docker exec finble-backend-redis-1 redis-cli --scan --pattern "turn_timer:*" | wc -l

echo "Redis 메모리 사용량:"
docker exec finble-backend-redis-1 redis-cli info memory | grep used_memory_human

# 8. 30초 대기 후 만료 상태 확인
print_step "30초 대기 후 만료 상태 확인"
sleep 30

echo "만료 후 TTL 키 개수:"
docker exec finble-backend-redis-1 redis-cli --scan --pattern "turn_timer:*" | wc -l

echo "TTL 상태 재확인:"
curl -s http://localhost:8081/monitor/ttl/status | jq .

# 9. Grafana 접속 정보 출력
print_success "모니터링 접속 정보:"
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo "- Prometheus: http://localhost:9090"
echo "- Redis CLI: docker exec -it finble-backend-redis-1 redis-cli"
echo "- 애플리케이션: http://localhost:8081"

print_success "Redis TTL 모니터링 테스트 완료!"
