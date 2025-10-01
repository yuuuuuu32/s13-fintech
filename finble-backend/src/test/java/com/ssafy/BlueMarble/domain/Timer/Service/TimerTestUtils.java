package com.ssafy.BlueMarble.domain.Timer.Service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.RedisCallback;

import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * 타이머 테스트를 위한 유틸리티 클래스
 */
public class TimerTestUtils {
    
    // 턴 타이머 키 패턴
    public static final String TURN_TIMER_PREFIX = "turn_timer:";
    
    /**
     * Redis 정리
     */
    public static void cleanupRedis(RedisTemplate<String, String> redisTemplate) {
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        // 테스트 게임 상태도 정리
        Set<String> gameKeys = redisTemplate.keys("game_state:*");
        if (gameKeys != null && !gameKeys.isEmpty()) {
            redisTemplate.delete(gameKeys);
        }
    }
    
    /**
     * 테스트용 타이머 데이터 생성
     */
    public static void createTimerData(RedisTemplate<String, String> redisTemplate, int roomCount) {
        for (int i = 0; i < roomCount; i++) {
            String roomId = "room_" + i;
            String timerKey = TURN_TIMER_PREFIX + roomId;
            redisTemplate.opsForValue().set(timerKey, "active", 30L, TimeUnit.SECONDS);
        }
    }
    
    /**
     * 나노초를 밀리초로 변환
     */
    public static long toMillis(long startNanos, long endNanos) {
        return (endNanos - startNanos) / 1_000_000;
    }
    
    /**
     * Redis 메모리 사용량 조회
     */
    public static long getRedisMemoryUsage(RedisTemplate<String, String> redisTemplate) {
        try {
            return redisTemplate.getConnectionFactory()
                    .getConnection()
                    .serverCommands()
                    .info("memory")
                    .getProperty("used_memory") != null ? 
                    Long.parseLong(redisTemplate.getConnectionFactory()
                            .getConnection()
                            .serverCommands()
                            .info("memory")
                            .getProperty("used_memory")) : 0;
        } catch (Exception e) {
            return 0;
        }
    }
    
    /**
     * 타이머 정보를 담는 클래스
     */
    public static class TimerInfo {
        private final String key;
        private final long endTime;
        
        public TimerInfo(String key, long endTime) {
            this.key = key;
            this.endTime = endTime;
        }
        
        public String getKey() {
            return key;
        }
        
        public long getEndTime() {
            return endTime;
        }
    }
    
    /**
     * Redis SCAN을 사용한 키 조회 (KEYS 대신 사용)
     */
    public static Set<String> scanKeys(RedisTemplate<String, String> redisTemplate, String pattern) {
        return redisTemplate.execute((RedisCallback<Set<String>>) connection -> {
            Set<String> keys = new java.util.HashSet<>();
            Cursor<byte[]> cursor = connection.scan(ScanOptions.scanOptions()
                    .match(pattern)
                    .count(100)
                    .build());
            
            while (cursor.hasNext()) {
                keys.add(new String(cursor.next()));
            }
            cursor.close();
            return keys;
        });
    }
    
    /**
     * 바이트를 읽기 쉬운 형태로 포맷
     */
    public static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}