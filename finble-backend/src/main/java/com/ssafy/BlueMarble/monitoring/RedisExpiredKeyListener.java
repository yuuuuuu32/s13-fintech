package com.ssafy.BlueMarble.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Slf4j
public class RedisExpiredKeyListener implements MessageListener {

    private final RedisTemplate<String, String> redisTemplate;
    private final MeterRegistry meterRegistry;
    private final TtlAccuracyService ttlAccuracyService;
    
    // 메트릭 수집을 위한 카운터 및 타이머
    private final Counter expiredKeysCounter;
    private final Counter expiredKeysByPatternCounter;
    private final Timer expiredKeyProcessingTimer;
    private final AtomicLong totalExpiredKeys = new AtomicLong(0);
    
    public RedisExpiredKeyListener(RedisTemplate<String, String> redisTemplate, 
                                   MeterRegistry meterRegistry, 
                                   TtlAccuracyService ttlAccuracyService) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
        this.ttlAccuracyService = ttlAccuracyService;
        
        // 메트릭 초기화
        this.expiredKeysCounter = Counter.builder("redis.expired.keys.total")
                .description("Total number of expired Redis keys")
                .register(meterRegistry);
                
        this.expiredKeysByPatternCounter = Counter.builder("redis.expired.keys.by_pattern")
                .description("Expired Redis keys by pattern")
                .tag("pattern", "turn_timer")
                .register(meterRegistry);
                
        this.expiredKeyProcessingTimer = Timer.builder("redis.expired.key.processing.time")
                .description("Time taken to process expired key events")
                .register(meterRegistry);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            String expiredKey = message.toString();
            String patternStr = new String(pattern);
            
            log.debug("Redis key expired: key={}, pattern={}", expiredKey, patternStr);
            
            // 전체 만료 키 카운터 증가
            expiredKeysCounter.increment();
            totalExpiredKeys.incrementAndGet();
            
            // 패턴별 만료 키 카운터 증가
            if (expiredKey.startsWith("turn_timer:")) {
                expiredKeysByPatternCounter.increment();
                processTurnTimerExpired(expiredKey);
            }
            
            // TTL 정확도 측정 (accuracy_test 패턴)
            if (expiredKey.startsWith("accuracy_test:")) {
                ttlAccuracyService.measureTtlAccuracy(expiredKey);
            }
            
            // 만료 이벤트 처리 시간 기록
            sample.stop(expiredKeyProcessingTimer);
            
            log.info("Redis 만료 이벤트 처리 완료: key={}, totalExpired={}", 
                    expiredKey, totalExpiredKeys.get());
                    
        } catch (Exception e) {
            log.error("Redis 만료 이벤트 처리 중 오류 발생: message={}, pattern={}", 
                    message, pattern, e);
            sample.stop(expiredKeyProcessingTimer);
        }
    }
    
    /**
     * 턴 타이머 만료 이벤트 처리
     */
    private void processTurnTimerExpired(String expiredKey) {
        try {
            // 만료된 키에서 roomId 추출
            String roomId = expiredKey.replace("turn_timer:", "");
            
            log.info("턴 타이머 만료: roomId={}, expiredKey={}", roomId, expiredKey);
            
            // 실제 게임 로직에서는 여기서 턴 종료 처리
            // TimerService.endTurnByTimer(roomId) 같은 메서드 호출
            
        } catch (Exception e) {
            log.error("턴 타이머 만료 처리 중 오류: expiredKey={}", expiredKey, e);
        }
    }
    
    /**
     * 현재까지 만료된 키 총 개수 조회
     */
    public long getTotalExpiredKeys() {
        return totalExpiredKeys.get();
    }
}
