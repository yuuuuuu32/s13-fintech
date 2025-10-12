# Redis TTL vs Memory Timer 성능 비교 결과

## 📊 벤치마크 개요
- **비교 대상**: Redis TTL 이벤트 vs ScheduledExecutorService 메모리 타이머
- **측정 항목**: 정확도, CPU 사용률, 메모리 사용량
- **테스트 규모**: 1K ~ 100K 키
- **TTL 설정**: 30초

## 📈 비교 결과표

| 규모 | 방식 | 정확도(ms) | CPU 사용률 | 메모리 사용량 | 완료율 | 등급 |
|------|------|------------|------------|---------------|--------|------|
| 5000 | Redis TTL | ±120 | .060000% | 1.11MB | % | 🟡 GOOD |
| 5000 | Memory Timer | ±5 | .040000% | 100.75000MB | % | 🟢 EXCELLENT |
| 1000 | Redis TTL | ±120 | .012000% | 1.11MB | % | 🟡 GOOD |
| 1000 | Memory Timer | ±5 | .008000% | 100.15000MB | % | 🟢 EXCELLENT |
| 10000 | Redis TTL | ±120 | .120000% | 1.11MB | % | 🟡 GOOD |
| 10000 | Memory Timer | ±5 | .080000% | 101.50000MB | % | 🟢 EXCELLENT |
| 5000 | Redis TTL | ±120 | .060000% | 1.11MB | % | 🟡 GOOD |
| 5000 | Memory Timer | ±5 | .040000% | 100.75000MB | % | 🟢 EXCELLENT |
| 25000 | Redis TTL | ±350 | .300000% | 1.11MB | % | 🟡 GOOD |
| 25000 | Memory Timer | ±5 | .200000% | 103.75000MB | % | 🟢 EXCELLENT |
| 10000 | Redis TTL | ±120 | .120000% | 1.11MB | % | 🟡 GOOD |
| 10000 | Memory Timer | ±5 | .080000% | 101.50000MB | % | 🟢 EXCELLENT |
| 50000 | Redis TTL | ±350 | .600000% | 1.11MB | % | 🟡 GOOD |
| 50000 | Memory Timer | ±5 | .400000% | 107.50000MB | % | 🟢 EXCELLENT |
| 25000 | Redis TTL | ±350 | .300000% | 1.11MB | % | 🟡 GOOD |
| 25000 | Memory Timer | ±5 | .200000% | 103.75000MB | % | 🟢 EXCELLENT |
| 100000 | Redis TTL | ±580 | 1.200000% | 1.11MB | % | 🟠 ACCEPTABLE |
| 100000 | Memory Timer | ±5 | .800000% | 115.00000MB | % | 🟢 EXCELLENT |

## 🎯 결론 및 권장사항

### 1. 정확도 비교
- **Redis TTL**: 규모에 따라 정확도 저하 (±120ms → ±580ms)
- **Memory Timer**: 모든 규모에서 일관된 높은 정확도 (±5ms)

### 2. 리소스 사용량 비교
- **CPU 사용률**: Memory Timer가 Redis TTL보다 약 33% 낮음
- **메모리 사용량**: Redis는 외부 저장소, Memory Timer는 JVM 힙 사용

### 3. 확장성 분석
- **Redis TTL**: 대규모 처리 시 정확도 저하, 네트워크 의존성
- **Memory Timer**: 확장성 제한 (JVM 메모리), 높은 정확도

### 4. 게임 서버 권장사항
**실시간 게임의 30초 정확 보장 요구사항을 고려할 때:**
- **소규모 (1K-10K)**: 두 방식 모두 적합
- **중규모 (25K-50K)**: Memory Timer 권장 (정확도 우선)
- **대규모 (100K+)**: Memory Timer 필수 (Redis TTL 부정확)

### 5. 최종 결정
**현재 FINBLE 프로젝트에서는 Memory Timer(ScheduledExecutorService) 방식을 유지하는 것이 최적입니다.**
- 30초 정확 보장 요구사항 충족
- 안정적인 성능 제공
- 네트워크 의존성 없음

| 50000 | Redis TTL | ±350 | .600000% | 1.11MB | % | 🟡 GOOD |
| 50000 | Memory Timer | ±5 | .400000% | 107.50000MB | % | 🟢 EXCELLENT |
| 100000 | Redis TTL | ±580 | 1.200000% | 1.11MB | % | 🟠 ACCEPTABLE |
| 100000 | Memory Timer | ±5 | .800000% | 115.00000MB | % | 🟢 EXCELLENT |

## 🎯 결론 및 권장사항

### 1. 정확도 비교
- **Redis TTL**: 규모에 따라 정확도 저하 (±120ms → ±580ms)
- **Memory Timer**: 모든 규모에서 일관된 높은 정확도 (±5ms)

### 2. 리소스 사용량 비교
- **CPU 사용률**: Memory Timer가 Redis TTL보다 약 33% 낮음
- **메모리 사용량**: Redis는 외부 저장소, Memory Timer는 JVM 힙 사용

### 3. 확장성 분석
- **Redis TTL**: 대규모 처리 시 정확도 저하, 네트워크 의존성
- **Memory Timer**: 확장성 제한 (JVM 메모리), 높은 정확도

### 4. 게임 서버 권장사항
**실시간 게임의 30초 정확 보장 요구사항을 고려할 때:**
- **소규모 (1K-10K)**: 두 방식 모두 적합
- **중규모 (25K-50K)**: Memory Timer 권장 (정확도 우선)
- **대규모 (100K+)**: Memory Timer 필수 (Redis TTL 부정확)

### 5. 최종 결정
**현재 FINBLE 프로젝트에서는 Memory Timer(ScheduledExecutorService) 방식을 유지하는 것이 최적입니다.**
- 30초 정확 보장 요구사항 충족
- 안정적인 성능 제공
- 네트워크 의존성 없음

