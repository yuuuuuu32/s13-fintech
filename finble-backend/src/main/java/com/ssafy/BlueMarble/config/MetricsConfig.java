package com.ssafy.BlueMarble.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Gauge;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.concurrent.atomic.AtomicLong;

@Configuration
public class MetricsConfig {

    private final MeterRegistry meterRegistry;
    private final RedisTemplate<String, String> redisTemplate;

    // Redis TTL 타이머 관련 메트릭
    private final AtomicLong activeTimers = new AtomicLong(0);
    private final AtomicLong totalTimersCreated = new AtomicLong(0);
    private final AtomicLong totalTimersExpired = new AtomicLong(0);

    public MetricsConfig(MeterRegistry meterRegistry, RedisTemplate<String, String> redisTemplate) {
        this.meterRegistry = meterRegistry;
        this.redisTemplate = redisTemplate;
        initializeMetrics();
    }

    private void initializeMetrics() {
        // TTL 타이머 생성 카운터
        Counter.builder("redis.ttl.timer.created")
                .description("Total number of TTL timers created")
                .register(meterRegistry);

        // TTL 타이머 만료 카운터
        Counter.builder("redis.ttl.timer.expired")
                .description("Total number of TTL timers expired")
                .register(meterRegistry);

        // TTL 타이머 갱신 카운터
        Counter.builder("redis.ttl.timer.refreshed")
                .description("Total number of TTL timer refreshes")
                .register(meterRegistry);

        // 활성 타이머 수 게이지
        Gauge.builder("redis.ttl.timer.active", this, MetricsConfig::getActiveTimersCount)
                .description("Number of active TTL timers")
                .register(meterRegistry);

        // Redis 메모리 사용량 게이지
        Gauge.builder("redis.memory.usage", this, MetricsConfig::getRedisMemoryUsage)
                .description("Redis memory usage in bytes")
                .register(meterRegistry);

        // TTL 설정 시간 타이머
        Timer.builder("redis.ttl.timer.setup.time")
                .description("Time taken to set up TTL timers")
                .register(meterRegistry);

        // TTL 만료 처리 시간 타이머
        Timer.builder("redis.ttl.expiration.processing.time")
                .description("Time taken to process TTL expirations")
                .register(meterRegistry);

        // TTL 갱신 시간 타이머
        Timer.builder("redis.ttl.timer.refresh.time")
                .description("Time taken to refresh TTL timers")
                .register(meterRegistry);
    }

    private double getActiveTimersCount() {
        try {
            // Redis에서 활성 타이머 키 개수 확인
            return redisTemplate.keys("turn_timer:*").size();
        } catch (Exception e) {
            return 0;
        }
    }

    private double getRedisMemoryUsage() {
        try {
            // Redis INFO 명령어로 메모리 사용량 조회
            var info = redisTemplate.getConnectionFactory().getConnection().serverCommands().info("memory");
            String usedMemory = info.getProperty("used_memory");
            return usedMemory != null ? Double.parseDouble(usedMemory) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    // 메트릭 업데이트를 위한 헬퍼 메서드들
    public void incrementTimerCreated() {
        Counter.builder("redis.ttl.timer.created")
                .register(meterRegistry)
                .increment();
        totalTimersCreated.incrementAndGet();
        activeTimers.incrementAndGet();
    }

    public void incrementTimerExpired() {
        Counter.builder("redis.ttl.timer.expired")
                .register(meterRegistry)
                .increment();
        totalTimersExpired.incrementAndGet();
        activeTimers.decrementAndGet();
    }

    public void incrementTimerRefreshed() {
        Counter.builder("redis.ttl.timer.refreshed")
                .register(meterRegistry)
                .increment();
    }

    public Timer.Sample startTimerSetup() {
        return Timer.start(meterRegistry);
    }

    public void recordTimerSetup(Timer.Sample sample) {
        sample.stop(Timer.builder("redis.ttl.timer.setup.time")
                .register(meterRegistry));
    }

    public Timer.Sample startExpirationProcessing() {
        return Timer.start(meterRegistry);
    }

    public void recordExpirationProcessing(Timer.Sample sample) {
        sample.stop(Timer.builder("redis.ttl.expiration.processing.time")
                .register(meterRegistry));
    }

    public Timer.Sample startTimerRefresh() {
        return Timer.start(meterRegistry);
    }

    public void recordTimerRefresh(Timer.Sample sample) {
        sample.stop(Timer.builder("redis.ttl.timer.refresh.time")
                .register(meterRegistry));
    }
}
