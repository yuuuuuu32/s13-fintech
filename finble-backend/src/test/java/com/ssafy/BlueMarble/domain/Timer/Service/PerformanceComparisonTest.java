package com.ssafy.BlueMarble.domain.Timer.Service;

import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.game.service.EconomicHistoryService;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import com.ssafy.BlueMarble.config.MetricsConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;
import java.util.List;
import java.util.ArrayList;
import java.util.PriorityQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * 통합 성능 비교 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class PerformanceComparisonTest {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Autowired
    private GameRedisService gameRedisService;
    
    @Autowired
    private SessionMessageService sessionMessageService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private UserRedisService userRedisService;
    
    @Autowired
    private EconomicHistoryService economicHistoryService;
    
    @Autowired
    private RoomService roomService;
    
    @Autowired
    private MetricsConfig metricsConfig;

    private TimerService timerService;

    @BeforeEach
    void setUp() {
        timerService = new TimerService(
            redisTemplate, 
            gameRedisService, 
            sessionMessageService, 
            objectMapper, 
            userRedisService, 
            economicHistoryService, 
            roomService,
            metricsConfig
        );
        
        // 테스트 전 Redis 정리
        cleanupRedis(redisTemplate);
    }

    @Test
    void testPerformanceComparison() {
        System.out.println("=== 전체 성능 비교 테스트 시작 ===");
        
        int roomCount = 50000; // 비교를 위해 중간 크기로 설정
        
        System.out.println("테스트 방 개수: " + roomCount);
        System.out.println("================================================");
        
        // 기존 방식
        testOriginalMethod(roomCount);
        
        // 병렬 처리 방식
        testParallelMethod(roomCount);
        
        // Priority Queue 방식
        testPriorityQueueMethod(roomCount);
        
        // 로컬 캐시 + SCAN 방식
        testLocalCacheMethod(roomCount);
        
        System.out.println("=== 전체 성능 비교 테스트 완료 ===");
    }

    @Test
    void testApproachMatrixPerformance() {
        System.out.println("=== 모든 방안 성능 비교 테이블 ===");
        int[] roomCounts = {1000, 5000, 10000, 25000, 50000, 100000};
        int scanCount = 1000;

        System.out.println(
            "방 개수\t\tKEYS(ms)\tSCAN(ms)\t기존(ms)\t병렬(ms)\tPriorityQ(ms)\t로컬배치(ms)\t메모리(bytes)");
        System.out.println(
            "---------------------------------------------------------------------------------------------------------------");

        for (int roomCount : roomCounts) {
            cleanupRedis(redisTemplate);
            createTimerData(redisTemplate, roomCount);

            long keysMs = measureKeysMs();
            long scanMs = measureScanMs(scanCount);
            long originalMs = measureOriginalMs(roomCount);
            long parallelMs = measureParallelMs(roomCount);
            long pqMs = measurePriorityQueueMs();
            long localBatchMs = measureLocalBatchMs();
            long mem = getRedisMemoryUsage(redisTemplate);

            System.out.printf(
                "%d\t\t%d\t\t%d\t\t%d\t\t%d\t\t%d\t\t\t%d\t\t\t%d%n",
                roomCount, keysMs, scanMs, originalMs, parallelMs, pqMs, localBatchMs, mem
            );
        }

        cleanupRedis(redisTemplate);
        System.out.println("=== 모든 방안 성능 비교 완료 ===");
    }

    private void testOriginalMethod(int roomCount) {
        createTimerData(redisTemplate, roomCount);
        long startTime = System.nanoTime();
        
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long now = System.currentTimeMillis();
        
        if (keys != null) {
            for (String key : keys) {
                String endTimeStr = redisTemplate.opsForValue().get(key);
                if (endTimeStr != null) {
                    long endTime = Long.parseLong(endTimeStr);
                    if (now >= endTime) {
                        redisTemplate.delete(key);
                    }
                }
            }
        }
        
        long endTime = System.nanoTime();
        long duration = toMillis(startTime, endTime);
        System.out.println("1. 기존 방식: " + duration + "ms");
        cleanupRedis(redisTemplate);
    }

    private void testParallelMethod(int roomCount) {
        createTimerData(redisTemplate, roomCount);
        long startTime = System.nanoTime();
        
        ExecutorService executor = Executors.newFixedThreadPool(10);
        int batchSize = roomCount / 10;
        
        try {
            List<CompletableFuture<Void>> futures = new ArrayList<>();
            
            for (int i = 0; i < 10; i++) {
                final int startIdx = i * batchSize;
                final int endIdx = Math.min(startIdx + batchSize, roomCount);
                
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    long now = System.currentTimeMillis();
                    for (int j = startIdx; j < endIdx; j++) {
                        String timerKey = TURN_TIMER_PREFIX + "room_" + j;
                        String endTimeStr = redisTemplate.opsForValue().get(timerKey);
                        if (endTimeStr != null) {
                            long endTime = Long.parseLong(endTimeStr);
                            if (now >= endTime) {
                                redisTemplate.delete(timerKey);
                            }
                        }
                    }
                }, executor);
                
                futures.add(future);
            }
            
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            executor.shutdown();
        }
        
        long endTime = System.nanoTime();
        long duration = toMillis(startTime, endTime);
        System.out.println("2. 병렬 처리: " + duration + "ms");
        cleanupRedis(redisTemplate);
    }

    private void testPriorityQueueMethod(int roomCount) {
        createTimerData(redisTemplate, roomCount);
        long startTime = System.nanoTime();
        
        PriorityQueue<TimerInfo> queue = new PriorityQueue<>((a, b) -> 
            Long.compare(a.getEndTime(), b.getEndTime()));
        
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        if (keys != null) {
            for (String key : keys) {
                String endTimeStr = redisTemplate.opsForValue().get(key);
                if (endTimeStr != null) {
                    long endTime = Long.parseLong(endTimeStr);
                    queue.offer(new TimerInfo(key, endTime));
                }
            }
        }
        
        long now = System.currentTimeMillis();
        while (!queue.isEmpty()) {
            TimerInfo timer = queue.poll();
            if (timer.getEndTime() > now) {
                break;
            }
            redisTemplate.delete(timer.getKey());
        }
        
        long endTime = System.nanoTime();
        long duration = toMillis(startTime, endTime);
        System.out.println("3. Priority Queue: " + duration + "ms");
        cleanupRedis(redisTemplate);
    }

    private void testLocalCacheMethod(int roomCount) {
        createTimerData(redisTemplate, roomCount);
        long startTime = System.nanoTime();
        
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long now = System.currentTimeMillis();
        
        if (keys != null) {
            // 배치 처리 시뮬레이션
            List<String> keyList = new ArrayList<>(keys);
            int batchSize = 1000;
            
            for (int i = 0; i < keyList.size(); i += batchSize) {
                int endIdx = Math.min(i + batchSize, keyList.size());
                List<String> batch = keyList.subList(i, endIdx);
                
                for (String key : batch) {
                    String endTimeStr = redisTemplate.opsForValue().get(key);
                    if (endTimeStr != null) {
                        long endTime = Long.parseLong(endTimeStr);
                        if (now >= endTime) {
                            redisTemplate.delete(key);
                        }
                    }
                }
            }
        }
        
        long endTime = System.nanoTime();
        long duration = toMillis(startTime, endTime);
        System.out.println("4. 로컬 캐시 + 배치: " + duration + "ms");
        cleanupRedis(redisTemplate);
    }

    private long measureKeysMs() {
        long start = System.nanoTime();
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long end = System.nanoTime();
        return toMillis(start, end);
    }

    private long measureScanMs(int count) {
        long start = System.nanoTime();
        try (var cursor = redisTemplate.scan(
            org.springframework.data.redis.core.ScanOptions.scanOptions()
                .match(TURN_TIMER_PREFIX + "*")
                .count(count)
                .build()
        )) {
            while (cursor.hasNext()) { cursor.next(); }
        }
        long end = System.nanoTime();
        return toMillis(start, end);
    }

    private long measureOriginalMs(int roomCount) {
        long start = System.nanoTime();
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long now = System.currentTimeMillis();
        if (keys != null) {
            for (String key : keys) {
                String endTimeStr = redisTemplate.opsForValue().get(key);
                if (endTimeStr != null) {
                    long endTime = Long.parseLong(endTimeStr);
                    if (now >= endTime) { redisTemplate.delete(key); }
                }
            }
        }
        long end = System.nanoTime();
        return toMillis(start, end);
    }

    private long measureParallelMs(int roomCount) {
        ExecutorService executor = Executors.newFixedThreadPool(10);
        int batchSize = Math.max(1, roomCount / 10);
        long start = System.nanoTime();
        try {
            List<CompletableFuture<Void>> futures = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                final int startIdx = i * batchSize;
                final int endIdx = Math.min(startIdx + batchSize, roomCount);
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    long now = System.currentTimeMillis();
                    for (int j = startIdx; j < endIdx; j++) {
                        String timerKey = TURN_TIMER_PREFIX + "room_" + j;
                        String endTimeStr = redisTemplate.opsForValue().get(timerKey);
                        if (endTimeStr != null) {
                            long endTime = Long.parseLong(endTimeStr);
                            if (now >= endTime) { redisTemplate.delete(timerKey); }
                        }
                    }
                }, executor);
                futures.add(future);
            }
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } finally {
            executor.shutdown();
        }
        long end = System.nanoTime();
        return toMillis(start, end);
    }

    private long measurePriorityQueueMs() {
        long start = System.nanoTime();
        PriorityQueue<TimerInfo> queue = new PriorityQueue<>((a, b) -> Long.compare(a.getEndTime(), b.getEndTime()));
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        if (keys != null) {
            for (String key : keys) {
                String endTimeStr = redisTemplate.opsForValue().get(key);
                if (endTimeStr != null) {
                    long endTime = Long.parseLong(endTimeStr);
                    queue.offer(new TimerInfo(key, endTime));
                }
            }
        }
        long now = System.currentTimeMillis();
        while (!queue.isEmpty()) {
            TimerInfo timer = queue.poll();
            if (timer.getEndTime() > now) { break; }
            // 만료된 경우만 삭제 (테스트 데이터는 보통 만료 전)
            redisTemplate.delete(timer.getKey());
        }
        long end = System.nanoTime();
        return toMillis(start, end);
    }

    private long measureLocalBatchMs() {
        long start = System.nanoTime();
        // 키 수를 세어 사용하여 경고 제거
        int count = 0;
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        if (keys != null) count = keys.size();
        long now = System.currentTimeMillis();
        if (keys != null) {
            List<String> keyList = new ArrayList<>(keys);
            int batchSize = 1000;
            for (int i = 0; i < keyList.size(); i += batchSize) {
                int endIdx = Math.min(i + batchSize, keyList.size());
                List<String> batch = keyList.subList(i, endIdx);
                for (String key : batch) {
                    String endTimeStr = redisTemplate.opsForValue().get(key);
                    if (endTimeStr != null) {
                        long endTime = Long.parseLong(endTimeStr);
                        if (now >= endTime) { redisTemplate.delete(key); }
                    }
                }
            }
        }
        long end = System.nanoTime();
        return toMillis(start, end);
    }
}
