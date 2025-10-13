package com.ssafy.BlueMarble.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class TtlAccuracyService {

    private final RedisTemplate<String, String> redisTemplate;
    private final MeterRegistry meterRegistry;
    
    // TTL 정확도 측정을 위한 메트릭들
    private final Counter expiredEventsCounter;
    private final DistributionSummary ttlAccuracySummary;
    private final Timer ttlAccuracyTimer;
    
    // 예상 만료 시간을 저장하는 맵
    private final ConcurrentHashMap<String, Long> expectedExpirationTimes = new ConcurrentHashMap<>();
    private final AtomicLong totalExpiredKeys = new AtomicLong(0);
    private final AtomicLong totalAccuracyMeasured = new AtomicLong(0);

    public TtlAccuracyService(RedisTemplate<String, String> redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
        
        // 메트릭 초기화
        this.expiredEventsCounter = Counter.builder("redis.ttl.expired.events")
                .description("Total number of TTL expired events received")
                .register(meterRegistry);
                
        this.ttlAccuracySummary = DistributionSummary.builder("redis.ttl.accuracy.ms")
                .description("TTL accuracy in milliseconds (actual - expected)")
                .register(meterRegistry);
                
        this.ttlAccuracyTimer = Timer.builder("redis.ttl.accuracy.measurement")
                .description("Time taken to measure TTL accuracy")
                .register(meterRegistry);
    }

    /**
     * TTL이 설정된 키의 예상 만료 시간을 기록
     */
    public void recordExpectedExpiration(String key, long ttlSeconds) {
        long currentTime = System.currentTimeMillis();
        long expectedExpiration = currentTime + (ttlSeconds * 1000);
        expectedExpirationTimes.put(key, expectedExpiration);
        
        log.debug("Expected expiration recorded: key={}, ttl={}s, expected={}", 
                key, ttlSeconds, expectedExpiration);
    }

    /**
     * 실제 만료 이벤트가 발생했을 때 정확도 측정
     */
    public void measureTtlAccuracy(String expiredKey) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            Long expectedExpiration = expectedExpirationTimes.remove(expiredKey);
            if (expectedExpiration == null) {
                log.warn("No expected expiration time found for key: {}", expiredKey);
                return;
            }
            
            long actualExpiration = System.currentTimeMillis();
            long accuracyMs = actualExpiration - expectedExpiration;
            
            // 메트릭 기록
            expiredEventsCounter.increment();
            ttlAccuracySummary.record(accuracyMs);
            totalExpiredKeys.incrementAndGet();
            totalAccuracyMeasured.incrementAndGet();
            
            log.info("TTL Accuracy measured: key={}, expected={}, actual={}, accuracy={}ms", 
                    expiredKey, expectedExpiration, actualExpiration, accuracyMs);
                    
            // 정확도 범위별 로깅
            if (Math.abs(accuracyMs) <= 100) {
                log.debug("TTL Accuracy: EXCELLENT (±100ms): {}ms", accuracyMs);
            } else if (Math.abs(accuracyMs) <= 500) {
                log.info("TTL Accuracy: GOOD (±500ms): {}ms", accuracyMs);
            } else if (Math.abs(accuracyMs) <= 1000) {
                log.warn("TTL Accuracy: ACCEPTABLE (±1s): {}ms", accuracyMs);
            } else {
                log.error("TTL Accuracy: POOR (>±1s): {}ms", accuracyMs);
            }
            
        } catch (Exception e) {
            log.error("Error measuring TTL accuracy for key: {}", expiredKey, e);
        } finally {
            sample.stop(ttlAccuracyTimer);
        }
    }

    /**
     * TTL 정확도 통계 조회
     */
    public TtlAccuracyStats getTtlAccuracyStats() {
        return TtlAccuracyStats.builder()
                .totalExpiredKeys(totalExpiredKeys.get())
                .totalAccuracyMeasured(totalAccuracyMeasured.get())
                .expectedExpirationTimesPending(expectedExpirationTimes.size())
                .build();
    }

    /**
     * 대량 TTL 설정 및 정확도 측정
     */
    public void bulkSetTtlWithAccuracyMeasurement(int roomCount, long ttlSeconds) {
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < roomCount; i++) {
            String key = "accuracy_test:room:" + roomCount + ":" + i;
            String value = String.valueOf(System.currentTimeMillis());
            
            // Redis에 TTL과 함께 저장
            redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
            
            // 예상 만료 시간 기록
            recordExpectedExpiration(key, ttlSeconds);
        }
        
        long endTime = System.currentTimeMillis();
        log.info("Bulk TTL setup completed: {} keys, {}s TTL, took {}ms", 
                roomCount, ttlSeconds, (endTime - startTime));
    }

    /**
     * TTL 정확도 통계 DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class TtlAccuracyStats {
        private long totalExpiredKeys;
        private long totalAccuracyMeasured;
        private int expectedExpirationTimesPending;
        
        public double getAccuracyRate() {
            return totalExpiredKeys == 0 ? 0.0 : 
                (double) totalAccuracyMeasured / totalExpiredKeys * 100.0;
        }
    }
}
