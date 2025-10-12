package com.ssafy.BlueMarble.monitoring;

import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.RedisTemplate;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class TtlLoadService {

    private final RedisTemplate<String, String> redisTemplate;
    private final MeterRegistry meterRegistry;

    public TtlLoadService(RedisTemplate<String, String> redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    public void setKeyWithTtl(String key, String value, Duration ttl) {
        long start = System.nanoTime();
        redisTemplate.opsForValue().set(key, value, ttl);
        long end = System.nanoTime();
        Timer.builder("ttlLoad.set.latency")
                .tag("ttlSeconds", String.valueOf(ttl.toSeconds()))
                .register(meterRegistry)
                .record(Duration.ofNanos(end - start));
        DistributionSummary.builder("ttlLoad.set.keySizeBytes")
                .register(meterRegistry)
                .record(value.length());
    }

    public void bulkSetWithTtl(int roomCount, Duration ttl) {
        long startAll = System.nanoTime();
        for (int i = 0; i < roomCount; i++) {
            String key = "room:" + roomCount + ":" + i;
            String value = String.valueOf(ThreadLocalRandom.current().nextLong());
            setKeyWithTtl(key, value, ttl);
        }
        long endAll = System.nanoTime();
        Timer.builder("ttlLoad.bulk.latency")
                .tag("rooms", String.valueOf(roomCount))
                .tag("ttlSeconds", String.valueOf(ttl.toSeconds()))
                .register(meterRegistry)
                .record(Duration.ofNanos(endAll - startAll));
        DistributionSummary.builder("ttlLoad.bulk.count")
                .tag("ttlSeconds", String.valueOf(ttl.toSeconds()))
                .register(meterRegistry)
                .record(roomCount);
    }
}


