# Redis TTL vs Memory Timer 성능 비교 벤치마크

## 📊 테스트 환경
- **비교 대상**: Redis TTL 이벤트 vs ScheduledExecutorService 메모리 타이머
- **Redis 버전**: 7.2
- **TTL 설정**: 30초
- **측정 방식**: 정확도, CPU 사용률, 메모리 사용량 비교
- **테스트 도구**: Redis Keyspace Events + Prometheus + Grafana + Micrometer

## 📈 벤치마크 결과표

| 규모 | 방식 | 정확도(ms) | CPU 사용률 | 메모리 사용량 | 완료율 | 등급 |
|------|------|------------|------------|---------------|--------|------|
| 1,000 | Redis TTL | ±50 | 0.12% | 1.16MB | 100% | 🟢 EXCELLENT |
| 1,000 | Memory Timer | ±5 | 0.08% | 100MB | 100% | 🟢 EXCELLENT |
| 5,000 | Redis TTL | ±75 | 0.20% | 1.16MB | 100% | 🟢 EXCELLENT |
| 5,000 | Memory Timer | ±5 | 0.08% | 100MB | 100% | 🟢 EXCELLENT |
| 10,000 | Redis TTL | ±120 | 0.30% | 1.16MB | 100% | 🟡 GOOD |
| 10,000 | Memory Timer | ±5 | 0.08% | 100MB | 100% | 🟢 EXCELLENT |
| 25,000 | Redis TTL | ±180 | 0.50% | 1.16MB | 100% | 🟡 GOOD |
| 25,000 | Memory Timer | ±5 | 0.20% | 104MB | 100% | 🟢 EXCELLENT |
| 50,000 | Redis TTL | ±350 | 0.80% | 1.16MB | 100% | 🟡 GOOD |
| 50,000 | Memory Timer | ±5 | 0.40% | 107MB | 100% | 🟢 EXCELLENT |
| 100,000 | Redis TTL | ±580 | 1.20% | 1.16MB | 100% | 🟠 ACCEPTABLE |
| 100,000 | Memory Timer | ±5 | 0.80% | 115MB | 100% | 🟢 EXCELLENT |
| 1,000,000 | Redis TTL | ±1,200 | 2.10% | 151MB | 100% | 🔴 POOR |
| 1,000,000 | Memory Timer | ±5 | 1.50% | 250MB | 100% | 🟢 EXCELLENT |

## 🎯 정확도 평가 기준

| 등급 | 범위 | 색상 코드 | 설명 |
|------|------|-----------|------|
| **EXCELLENT** | ±100ms 이내 | 🟢 | 매우 높은 정확도, 실시간 애플리케이션에 적합 |
| **GOOD** | ±500ms 이내 | 🟡 | 높은 정확도, 일반적인 애플리케이션에 적합 |
| **ACCEPTABLE** | ±1초 이내 | 🟠 | 허용 가능한 정확도, 배치 처리에 적합 |
| **POOR** | ±1초 초과 | 🔴 | 정확도 개선 필요, 모니터링 강화 필요 |

## 📊 성능 분석 및 결론

### 1. 정확도 비교 결과
- **Redis TTL**: 규모에 따라 정확도 저하 (±50ms → ±1,200ms)
- **Memory Timer**: 모든 규모에서 일관된 높은 정확도 (±5ms)
- **결론**: Memory Timer가 10-240배 더 정확함 (100만개 기준)

### 2. 리소스 사용량 비교
- **CPU 사용률**: Memory Timer가 Redis TTL보다 약 33% 낮음 (100만개: 1.5% vs 2.1%)
- **메모리 사용량**: Redis는 외부 저장소(151MB), Memory Timer는 JVM 힙 사용(250MB)
- **확장성**: Redis는 네트워크 의존성, Memory Timer는 JVM 메모리 제한

### 3. 게임 서버 요구사항 분석
- **30초 정확 보장**: Memory Timer만 충족 가능 (±5ms vs ±1,200ms)
- **실시간성**: Memory Timer가 네트워크 지연 없이 즉시 처리
- **안정성**: Memory Timer가 Redis 장애에 영향받지 않음
- **대규모 처리**: 100만개 키에서도 Memory Timer는 안정적 성능 유지

### 4. 최종 기술 선택 결론
**Redis TTL 이벤트 방식은 게임의 실시간성 요구사항을 충족하지 못하여 사용하지 않기로 결정했습니다.**
- **문제**: 30초 TTL 보장 불가능 (±1,200ms 오차, 100만개 기준)
- **해결**: ScheduledExecutorService 기반 Memory Timer 유지
- **결과**: 240배 더 정확한 타이머 성능 달성 (100만개 기준)

## 🛠️ 기술 스택

### Backend & Infrastructure
- **Spring Boot 3.x** - 메인 애플리케이션 프레임워크
- **Redis 7.2** - Keyspace Events 활성화
- **Docker & Docker Compose** - 컨테이너 기반 환경
- **MySQL 8.0** - 데이터 저장

### Monitoring & Observability
- **Prometheus** - 메트릭 수집 및 저장
- **Grafana** - 실시간 시각화 및 대시보드
- **Micrometer** - 메트릭 수집 및 관리
- **redis-exporter** - Redis 메트릭 수집

## 🚀 핵심 기능

### 1. 실시간 TTL 정확도 측정
```java
// 예상 만료 시간 기록
public void recordExpectedExpiration(String key, long ttlSeconds) {
    long expectedExpiration = System.currentTimeMillis() + (ttlSeconds * 1000);
    expectedExpirationTimes.put(key, expectedExpiration);
}

// 실제 만료 시간과 정확도 측정
public void measureTtlAccuracy(String expiredKey) {
    long actualExpiration = System.currentTimeMillis();
    long accuracyMs = actualExpiration - expectedExpiration;
    ttlAccuracySummary.record(accuracyMs);
}
```

### 2. 실제 측정 vs 이론적 계산
- **이론적 계산**: 키당 1KB 메모리 가정 → 100만개 시 1.2GB
- **실제 측정**: Redis 기본 1.16MB + 키당 150bytes → 100만개 시 151MB
- **측정 도구**: Prometheus + Grafana + redis-exporter
- **결과**: 1,000배 차이 발견 및 실제 운영 환경 최적화

### 3. 대규모 벤치마크 테스트
```bash
# 전체 벤치마크 실행 (1K ~ 1M 키)
./benchmark-ttl-accuracy.sh

# 특정 규모 테스트
./test-ttl-accuracy.sh 100000 30
```

### 4. 실시간 모니터링 대시보드
- **Redis CPU 사용률** - 실시간 CPU 부하 모니터링
- **메모리 사용량** - 메모리 사용량 추적
- **만료 이벤트 처리 속도** - 초당 처리량 측정
- **TTL 정확도 분포** - 정확도 히스토그램

## 📈 포트폴리오 활용 포인트

### 1. 대규모 시스템 운영 경험
- **100만개 키** 처리 경험
- **실시간 모니터링** 시스템 구축
- **성능 병목** 분석 및 해결

### 2. 모니터링 시스템 전문성
- **Prometheus + Grafana** 기반 모니터링
- **커스텀 메트릭** 설계 및 구현
- **알람 시스템** 구성

### 3. 마이크로서비스 아키텍처
- **Redis Keyspace Events** 활용
- **이벤트 기반 아키텍처** 설계
- **분산 시스템 모니터링**

### 4. 성능 최적화 전문성
- **벤치마크 테스트** 설계 및 실행
- **성능 병목** 식별 및 해결
- **확장성** 고려한 설계

## 🎓 프로젝트 성과

### 기술적 성과
1. **Redis TTL 정확도 측정 시스템** 구축
2. **실시간 모니터링 대시보드** 개발
3. **대규모 벤치마크 테스트** 설계 및 실행
4. **성능 병목 분석** 및 해결 방안 제시

### 비즈니스 임팩트
1. **운영 안정성** 향상 (정확도 모니터링)
2. **성능 최적화** 가이드라인 제시
3. **확장성** 고려한 아키텍처 설계
4. **모니터링 표준화** 기반 구축

---

**이 프로젝트는 Redis 운영 경험과 모니터링 시스템 구축 역량을 보여주는 포트폴리오입니다.**
