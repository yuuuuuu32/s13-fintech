#!/bin/bash

echo "=== Redis TTL 정확도 측정 테스트 ==="

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

# 파라미터 설정
ROOMS=${1:-100000}
TTL_SECONDS=${2:-30}

echo "테스트 설정:"
echo "- 키 개수: $ROOMS"
echo "- TTL: $TTL_SECONDS 초"
echo ""

# 1. TTL 정확도 테스트 시작
print_step "TTL 정확도 테스트 시작"
START_TIME=$(date +%s)
curl -s "http://localhost:8081/monitor/ttl/accuracy-test?rooms=$ROOMS&ttlSeconds=$TTL_SECONDS"
echo ""

# 2. 예상 만료 시간 계산 및 출력
EXPECTED_EXPIRATION=$((START_TIME + TTL_SECONDS))
EXPECTED_EXPIRATION_FORMATTED=$(date -r $EXPECTED_EXPIRATION '+%H:%M:%S')
echo "예상 만료 시간: $EXPECTED_EXPIRATION_FORMATTED (Unix: $EXPECTED_EXPIRATION)"
echo ""

# 3. 실시간 통계 모니터링
print_step "실시간 통계 모니터링 (30초간)"
for i in {1..30}; do
    CURRENT_TIME=$(date +%s)
    REMAINING_TIME=$((EXPECTED_EXPIRATION - CURRENT_TIME))
    
    echo -n "남은 시간: ${REMAINING_TIME}초 | "
    
    # 통계 조회
    STATS=$(curl -s "http://localhost:8081/monitor/ttl/accuracy-stats")
    EXPIRED_KEYS=$(echo $STATS | jq -r '.totalExpiredKeys // 0')
    ACCURACY_MEASURED=$(echo $STATS | jq -r '.totalAccuracyMeasured // 0')
    PENDING_KEYS=$(echo $STATS | jq -r '.expectedExpirationTimesPending // 0')
    
    echo "만료된 키: $EXPIRED_KEYS, 정확도 측정: $ACCURACY_MEASURED, 대기 중: $PENDING_KEYS"
    
    sleep 1
done

echo ""

# 4. 만료 후 최종 통계
print_step "만료 후 최종 통계"
sleep 5  # 추가 대기 시간

FINAL_STATS=$(curl -s "http://localhost:8081/monitor/ttl/accuracy-stats")
echo "$FINAL_STATS" | jq .

# 5. Prometheus 메트릭으로 정확도 분석
print_step "Prometheus 메트릭으로 정확도 분석"
echo "TTL 정확도 분포:"
curl -s "http://localhost:9090/api/v1/query?query=redis_ttl_accuracy_ms" | jq '.data.result[0].value[1] // "No data"'

echo ""
echo "TTL 만료 이벤트 수:"
curl -s "http://localhost:9090/api/v1/query?query=redis_ttl_expired_events_total" | jq '.data.result[0].value[1] // "No data"'

# 6. 정확도 평가
print_step "정확도 평가"
ACCURACY_MS=$(curl -s "http://localhost:9090/api/v1/query?query=redis_ttl_accuracy_ms" | jq -r '.data.result[0].value[1] // "0"')
ACCURACY_MS_NUM=$(echo $ACCURACY_MS | sed 's/\"//g')

if (( $(echo "$ACCURACY_MS_NUM <= 100" | bc -l) )); then
    print_success "TTL 정확도: EXCELLENT (±100ms 이내)"
elif (( $(echo "$ACCURACY_MS_NUM <= 500" | bc -l) )); then
    print_success "TTL 정확도: GOOD (±500ms 이내)"
elif (( $(echo "$ACCURACY_MS_NUM <= 1000" | bc -l) )); then
    print_warning "TTL 정확도: ACCEPTABLE (±1s 이내)"
else
    print_error "TTL 정확도: POOR (±1s 초과)"
fi

echo "측정된 정확도: ${ACCURACY_MS_NUM}ms"
echo ""

# 7. 결과 요약
print_success "TTL 정확도 측정 테스트 완료!"
echo "=== 결과 요약 ==="
echo "테스트 키 수: $ROOMS"
echo "설정된 TTL: $TTL_SECONDS 초"
echo "측정된 정확도: ${ACCURACY_MS_NUM}ms"
echo "예상 만료 시간: $EXPECTED_EXPIRATION_FORMATTED"
echo "실제 만료 시간: $(date '+%H:%M:%S')"
echo ""
echo "Grafana에서 상세 분석: http://localhost:3000"
echo "Prometheus 메트릭: http://localhost:9090"
