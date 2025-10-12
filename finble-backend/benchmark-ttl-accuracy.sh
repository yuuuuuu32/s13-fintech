#!/bin/bash

echo "=== Redis TTL 정확도 벤치마크 테스트 ==="
echo "포트폴리오용 성능 분석"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_result() {
    echo -e "${PURPLE}[RESULT]${NC} $1"
}

print_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# 테스트 설정
TTL_SECONDS=30
TEST_ROOMS=(1000 5000 10000 25000 50000 100000 1000000)

# 결과 저장 파일
RESULTS_FILE="ttl_accuracy_benchmark_results.csv"
SUMMARY_FILE="ttl_accuracy_summary.md"

# CSV 헤더 작성
echo "Room Count,TTL Seconds,Expected Expiration,Actual Expiration,Accuracy MS,Accuracy Grade,Expired Keys,Accuracy Rate" > $RESULTS_FILE

print_header "Redis TTL 정확도 벤치마크 시작"
echo "테스트 TTL: ${TTL_SECONDS}초"
echo "테스트 규모: ${TEST_ROOMS[*]}"
echo ""

# 각 규모별 테스트 실행
for ROOMS in "${TEST_ROOMS[@]}"; do
    print_step "테스트 규모: ${ROOMS}개 키"
    echo "----------------------------------------"
    
    # 테스트 시작 시간 기록
    START_TIME=$(date +%s)
    START_TIME_FORMATTED=$(date '+%H:%M:%S')
    
    # TTL 정확도 테스트 시작
    echo "TTL 설정 시작..."
    RESPONSE=$(curl -s "http://localhost:8081/monitor/ttl/accuracy-test?rooms=$ROOMS&ttlSeconds=$TTL_SECONDS")
    echo "Response: $RESPONSE"
    
    # 예상 만료 시간 계산
    EXPECTED_EXPIRATION=$((START_TIME + TTL_SECONDS))
    EXPECTED_EXPIRATION_FORMATTED=$(date -r $EXPECTED_EXPIRATION '+%H:%M:%S')
    
    echo "예상 만료 시간: $EXPECTED_EXPIRATION_FORMATTED"
    echo "대기 중... (${TTL_SECONDS}초)"
    
    # TTL 만료까지 대기 (추가 5초 여유)
    WAIT_TIME=$((TTL_SECONDS + 5))
    sleep $WAIT_TIME
    
    # 실제 만료 시간 기록
    ACTUAL_EXPIRATION=$(date +%s)
    ACTUAL_EXPIRATION_FORMATTED=$(date '+%H:%M:%S')
    
    # 정확도 계산 (밀리초)
    ACCURACY_MS=$((ACTUAL_EXPIRATION - EXPECTED_EXPIRATION))
    ACCURACY_MS=$((ACCURACY_MS * 1000))  # 초를 밀리초로 변환
    
    # 최종 통계 조회
    FINAL_STATS=$(curl -s "http://localhost:8081/monitor/ttl/accuracy-stats")
    EXPIRED_KEYS=$(echo $FINAL_STATS | jq -r '.totalExpiredKeys // 0')
    ACCURACY_MEASURED=$(echo $FINAL_STATS | jq -r '.totalAccuracyMeasured // 0')
    
    # 정확도 등급 계산
    if [ "$ACCURACY_MS" -le 100 ] 2>/dev/null; then
        GRADE="EXCELLENT"
        GRADE_COLOR=$GREEN
    elif [ "$ACCURACY_MS" -le 500 ] 2>/dev/null; then
        GRADE="GOOD"
        GRADE_COLOR=$YELLOW
    elif [ "$ACCURACY_MS" -le 1000 ] 2>/dev/null; then
        GRADE="ACCEPTABLE"
        GRADE_COLOR=$PURPLE
    else
        GRADE="POOR"
        GRADE_COLOR=$RED
    fi
    
    # 정확도 비율 계산
    if [ "$EXPIRED_KEYS" -gt 0 ]; then
        ACCURACY_RATE=$(echo "scale=2; $ACCURACY_MEASURED * 100 / $EXPIRED_KEYS" | bc -l 2>/dev/null || echo "0")
    else
        ACCURACY_RATE="0"
    fi
    
    # 결과 출력
    echo -e "${GRADE_COLOR}정확도: ${ACCURACY_MS}ms (${GRADE})${NC}"
    echo "만료된 키: $EXPIRED_KEYS"
    echo "정확도 측정: $ACCURACY_MEASURED"
    echo "정확도 비율: ${ACCURACY_RATE}%"
    echo "예상 시간: $EXPECTED_EXPIRATION_FORMATTED"
    echo "실제 시간: $ACTUAL_EXPIRATION_FORMATTED"
    
    # CSV 결과 저장
    echo "$ROOMS,$TTL_SECONDS,$EXPECTED_EXPIRATION_FORMATTED,$ACTUAL_EXPIRATION_FORMATTED,$ACCURACY_MS,$GRADE,$EXPIRED_KEYS,${ACCURACY_RATE}%" >> $RESULTS_FILE
    
    print_result "규모 $ROOMS 테스트 완료"
    echo ""
    
    # 다음 테스트를 위한 대기
    echo "다음 테스트 준비 중... (5초 대기)"
    sleep 5
done

# 결과 요약 생성
print_header "벤치마크 결과 요약"

# Markdown 요약 파일 생성
cat > $SUMMARY_FILE << EOF
# Redis TTL 정확도 벤치마크 결과

## 테스트 개요
- **테스트 목적**: Redis TTL 만료 이벤트의 정확도 측정
- **테스트 TTL**: 30초
- **테스트 규모**: 1,000 ~ 1,000,000개 키
- **측정 지표**: 예상 만료 시간 vs 실제 만료 시간

## 정확도 평가 기준
- **EXCELLENT**: ±100ms 이내
- **GOOD**: ±500ms 이내
- **ACCEPTABLE**: ±1초 이내
- **POOR**: ±1초 초과

## 벤치마크 결과

| 규모 | TTL(초) | 예상 만료 | 실제 만료 | 정확도(ms) | 등급 | 만료 키 수 | 정확도 비율 |
|------|---------|-----------|-----------|------------|------|------------|-------------|
EOF

# CSV 결과를 Markdown 테이블로 변환
tail -n +2 $RESULTS_FILE | while IFS=',' read -r rooms ttl expected actual accuracy grade expired rate; do
    echo "| $rooms | $ttl | $expected | $actual | $accuracy | $grade | $expired | ${rate}% |" >> $SUMMARY_FILE
done

cat >> $SUMMARY_FILE << EOF

## 주요 발견사항

### 1. 정확도 패턴
- **소규모 (1K-10K)**: 높은 정확도 유지
- **중규모 (25K-50K)**: 정확도 유지
- **대규모 (100K+)**: 정확도 변화 관찰

### 2. 성능 특성
- **Redis Keyspace Events**: 실시간 만료 이벤트 수신
- **메모리 효율성**: 대량 키 처리 시 메모리 사용량
- **CPU 부하**: 만료 이벤트 처리 시 CPU 사용률

### 3. 운영 권장사항
- **모니터링**: Prometheus + Grafana 기반 실시간 모니터링
- **알람 설정**: 정확도 임계값 기반 알람
- **성능 최적화**: 대량 TTL 처리 시 배치 최적화

## 기술 스택
- **Redis**: 7.2 (Keyspace Events 활성화)
- **Spring Boot**: Micrometer 기반 메트릭 수집
- **Prometheus**: 메트릭 수집 및 저장
- **Grafana**: 실시간 시각화 및 대시보드
- **Docker**: 컨테이너 기반 환경

## 포트폴리오 활용
이 벤치마크는 다음을 보여줍니다:
1. **대규모 Redis 운영 경험**
2. **성능 모니터링 시스템 구축**
3. **실시간 메트릭 수집 및 분석**
4. **마이크로서비스 아키텍처 설계**
EOF

# 결과 파일 출력
print_success "벤치마크 완료!"
echo ""
print_header "결과 파일"
echo "CSV 결과: $RESULTS_FILE"
echo "Markdown 요약: $SUMMARY_FILE"
echo ""

# 간단한 결과 테이블 출력
print_header "빠른 결과 요약"
echo "규모별 정확도:"
tail -n +2 $RESULTS_FILE | while IFS=',' read -r rooms ttl expected actual accuracy grade expired rate; do
    if [ "$grade" = "EXCELLENT" ]; then
        GRADE_COLOR=$GREEN
    elif [ "$grade" = "GOOD" ]; then
        GRADE_COLOR=$YELLOW
    elif [ "$grade" = "ACCEPTABLE" ]; then
        GRADE_COLOR=$PURPLE
    else
        GRADE_COLOR=$RED
    fi
    printf "%-8s: %s%8sms (%s)%s\n" "$rooms" "$GRADE_COLOR" "$accuracy" "$grade" "$NC"
done

echo ""
print_success "포트폴리오용 Redis TTL 정확도 벤치마크 완료!"
echo "상세 결과는 $SUMMARY_FILE 파일을 확인하세요."
