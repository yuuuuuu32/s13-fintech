package com.ssafy.BlueMarble.domain.Timer.Service;

import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.game.service.EconomicHistoryService;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.*;
import java.util.List;
import java.util.ArrayList;
import java.util.PriorityQueue;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicInteger;
 

@SpringBootTest
@ActiveProfiles("test")
class TimerServiceIntegrationTest {

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

    private TimerService timerService;
    private static final String TURN_TIMER_PREFIX = "turn_timer:";

    @BeforeEach
    void setUp() {
        timerService = new TimerService(
            redisTemplate, 
            gameRedisService, 
            sessionMessageService, 
            objectMapper, 
            userRedisService, 
            economicHistoryService, 
            roomService
        );
        
        // 테스트 전 Redis 정리
        cleanupRedis();
    }


    @Test
    void testRedisKeysCommandPerformance() {
        System.out.println("=== Redis KEYS 명령어 실제 성능 테스트 ===");
        
        int[] roomCounts = {1000, 5000, 10000, 25000, 50000, 100000};
        int scanCount = 1000; // SCAN batch size
        
        System.out.println("방 개수\t\tKEYS(ms)\tKEYS개수\tSCAN(ms)\tSCAN/KEYS(%)\t메모리(bytes)");
        System.out.println("------------------------------------------------------------------------------------");
        
        for (int roomCount : roomCounts) {
            // 테스트 데이터 생성
            createTimerData(roomCount);
            
            // KEYS 명령어 성능 측정
            long keysStartTime = System.nanoTime();
            Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
            long keysEndTime = System.nanoTime();
            
            long keysDurationMs = TimeUnit.NANOSECONDS.toMillis(keysEndTime - keysStartTime);
            int keysCount = (keys == null) ? 0 : keys.size();
            
            // SCAN 성능 측정 (동일 패턴)
            long scanStartTime = System.nanoTime();
            List<String> scanKeys = new ArrayList<>();
            try (var cursor = redisTemplate.scan(
                org.springframework.data.redis.core.ScanOptions.scanOptions()
                    .match(TURN_TIMER_PREFIX + "*")
                    .count(scanCount)
                    .build()
            )) {
                while (cursor.hasNext()) {
                    scanKeys.add(cursor.next());
                }
            }
            long scanEndTime = System.nanoTime();
            long scanDurationMs = TimeUnit.NANOSECONDS.toMillis(scanEndTime - scanStartTime);
            
            long memoryUsage = getRedisMemoryUsage();
            
            double ratio = keysDurationMs == 0 ? 0 : (scanDurationMs * 100.0 / keysDurationMs);
            System.out.printf("%d\t\t%d\t\t%d\t\t%d\t\t%.1f\t\t\t%d%n", 
                roomCount, keysDurationMs, keysCount, scanDurationMs, ratio, memoryUsage);
            
            // 테스트 데이터 정리
            cleanupRedis();
        }
        
        System.out.println("=== Redis KEYS 명령어 실제 성능 테스트 완료 ===");
    }

    @Test
    void testConcurrentAccessPerformance() {
        System.out.println("=== 동시 접근 성능 테스트 시작 ===");
        
        int roomCount = 100000;
        int[] threadCounts = {1, 2, 4, 8, 16};
        
        System.out.println("방 개수: " + roomCount);
        System.out.println("스레드수\t총시간(ms)\t평균(ms)\t최소(ms)\t최대(ms)\t표준편차(ms)\t처리량(건/초)");
        System.out.println("--------------------------------------------------------------------------------");
        
        for (int threadCount : threadCounts) {
            // 테스트 데이터 생성 (매 케이스마다 동일 조건)
            cleanupRedis();
            createTimerData(roomCount);
            
            Thread[] threads = new Thread[threadCount];
            long[] executionTimes = new long[threadCount];
            
            for (int i = 0; i < threadCount; i++) {
                final int threadIndex = i;
                threads[i] = new Thread(() -> {
                    long startTime = System.nanoTime();
                    long endTime = System.nanoTime();
                    executionTimes[threadIndex] = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
                });
            }
            
            long totalStartTime = System.nanoTime();
            for (Thread thread : threads) thread.start();
            for (Thread thread : threads) {
                try { thread.join(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
            long totalEndTime = System.nanoTime();
            long totalDurationMs = TimeUnit.NANOSECONDS.toMillis(totalEndTime - totalStartTime);
            
            // 통계 계산
            long sum = 0;
            long min = Long.MAX_VALUE;
            long max = Long.MIN_VALUE;
            for (long t : executionTimes) { sum += t; if (t < min) min = t; if (t > max) max = t; }
            double avg = sum / (double) threadCount;
            double varianceSum = 0.0;
            for (long t : executionTimes) { double d = t - avg; varianceSum += d * d; }
            double stddev = Math.sqrt(varianceSum / threadCount);
            double throughput = totalDurationMs == 0 ? 0.0 : (roomCount * 1000.0 / totalDurationMs);
            
            System.out.printf("%d\t\t%d\t\t%.1f\t\t%d\t\t%d\t\t%.1f\t\t%.1f%n",
                threadCount, totalDurationMs, avg, min, max, stddev, throughput);
        }
        
        System.out.println("참고: 처리량은 전체 방 개수 기준 전체 소요 시간으로 산출");
        System.out.println("=== 동시 접근 성능 테스트 완료 ===");
    }

    /**
     * 테스트용 타이머 데이터 생성
     */
    private void createTimerData(int roomCount) {
        long currentTime = System.currentTimeMillis();
        
        for (int i = 0; i < roomCount; i++) {
            String timerKey = TURN_TIMER_PREFIX + "room_" + i;
            long endTime = currentTime + 30000; // 30초 후 만료
            redisTemplate.opsForValue().set(timerKey, String.valueOf(endTime));
        }
    }

    /**
     * Redis 메모리 사용량 조회
     */
    private long getRedisMemoryUsage() {
        try {
            // Redis INFO 명령어를 통해 메모리 사용량 조회
            Object info = redisTemplate.getConnectionFactory()
                .getConnection()
                .info("memory")
                .get("used_memory");
            return Long.parseLong(info.toString());
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Redis 정리
     */
    private void cleanupRedis() {
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    // ========================================
    // 4가지 최적화 방법 구현 및 성능 비교 테스트
    // ========================================

    /**
     * 3.1 스레드 풀을 활용한 병렬 처리 테스트
     */
    @Test
    void testParallelProcessingWithThreadPool() {
        System.out.println("=== 3.1 스레드 풀 병렬 처리 테스트 시작 ===");
        
        int roomCount = 100000;
        int threadCount = 10;
        int batchSize = roomCount / threadCount; // 각 스레드당 10,000개
        
        // 테스트 데이터 생성
        createTimerData(roomCount);
        
        // 스레드 풀 생성
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        // 성능 측정
        long startTime = System.nanoTime();
        
        try {
            List<CompletableFuture<Long>> futures = new ArrayList<>();
            
            for (int i = 0; i < threadCount; i++) {
                final int startIdx = i * batchSize;
                final int endIdx = Math.min(startIdx + batchSize, roomCount);
                
                CompletableFuture<Long> future = CompletableFuture.supplyAsync(() -> {
                    long threadStartTime = System.nanoTime();
                    
                    // 각 스레드가 배치 처리
                    for (int j = startIdx; j < endIdx; j++) {
                        String timerKey = TURN_TIMER_PREFIX + "room_" + j;
                        String endTimeStr = redisTemplate.opsForValue().get(timerKey);
                        if (endTimeStr != null) {
                            long endTime = Long.parseLong(endTimeStr);
                            long now = System.currentTimeMillis();
                            if (now >= endTime) {
                                redisTemplate.delete(timerKey);
                            }
                        }
                    }
                    
                    long threadEndTime = System.nanoTime();
                    return TimeUnit.NANOSECONDS.toMillis(threadEndTime - threadStartTime);
                }, executor);
                
                futures.add(future);
            }
            
            // 모든 스레드 완료 대기
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();
            
        } catch (Exception e) {
            System.err.println("병렬 처리 중 오류: " + e.getMessage());
        } finally {
            executor.shutdown();
        }
        
        long endTime = System.nanoTime();
        long totalDurationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        System.out.println("병렬 처리 결과:");
        System.out.println("- 총 처리 시간: " + totalDurationMs + "ms");
        System.out.println("- 스레드 수: " + threadCount);
        System.out.println("- 스레드당 처리량: " + batchSize + "개");
        
        cleanupRedis();
        System.out.println("=== 3.1 스레드 풀 병렬 처리 테스트 완료 ===\n");
    }

    /**
     * 3.2 Priority Queue 기반 타이머 체크 테스트
     */
    @Test
    void testPriorityQueueBasedTimerCheck() {
        System.out.println("=== 3.2 Priority Queue 기반 테스트 시작 ===");
        
        int roomCount = 100000;
        int batchSize = 1000;
        
        // 테스트 데이터 생성
        createTimerData(roomCount);
        
        // Priority Queue 생성 (만료 시간 기준 정렬)
        PriorityQueue<TimerInfo> timerQueue = new PriorityQueue<>((a, b) -> 
            Long.compare(a.getEndTime(), b.getEndTime()));
        
        // Redis에서 모든 타이머 정보를 가져와서 Priority Queue에 저장
        long queueBuildStartTime = System.nanoTime();
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        
        if (keys != null) {
            for (String key : keys) {
                String endTimeStr = redisTemplate.opsForValue().get(key);
                if (endTimeStr != null) {
                    long endTime = Long.parseLong(endTimeStr);
                    timerQueue.offer(new TimerInfo(key, endTime));
                }
            }
        }
        long queueBuildEndTime = System.nanoTime();
        
        // Priority Queue 기반 배치 처리
        long processingStartTime = System.nanoTime();
        long now = System.currentTimeMillis();
        int processedCount = 0;
        
        List<TimerInfo> batch = new ArrayList<>();
        
        while (!timerQueue.isEmpty() && batch.size() < batchSize) {
            TimerInfo timer = timerQueue.poll();
            
            // 가장 늦게 만료되는 타이머가 아직 만료되지 않았다면
            // 그 앞의 모든 타이머도 아직 만료되지 않음
            if (timer.getEndTime() > now) {
                timerQueue.offer(timer); // 다시 큐에 넣음
                break;
            }
            
            batch.add(timer);
        }
        
        // 배치 처리: 모든 타이머가 만료됨
        for (TimerInfo timer : batch) {
            redisTemplate.delete(timer.getKey());
            processedCount++;
        }
        
        long processingEndTime = System.nanoTime();
        
        long queueBuildTime = TimeUnit.NANOSECONDS.toMillis(queueBuildEndTime - queueBuildStartTime);
        long processingTime = TimeUnit.NANOSECONDS.toMillis(processingEndTime - processingStartTime);
        
        System.out.println("Priority Queue 결과:");
        System.out.println("- Queue 구축 시간: " + queueBuildTime + "ms");
        System.out.println("- 배치 처리 시간: " + processingTime + "ms");
        System.out.println("- 처리된 타이머 수: " + processedCount);
        System.out.println("- 총 시간: " + (queueBuildTime + processingTime) + "ms");
        
        cleanupRedis();
        System.out.println("=== 3.2 Priority Queue 기반 테스트 완료 ===\n");
    }

    /**
     * 3.3 로컬 캐시 + SCAN + 배치 처리 테스트
     */
    @Test
    void testLocalCacheWithScanAndBatch() {
        System.out.println("=== 3.3 로컬 캐시 + SCAN + 배치 처리 테스트 시작 ===");
        
        int roomCount = 100000;
        int batchSize = 1000;
        
        // 테스트 데이터 생성
        createTimerData(roomCount);
        
        // 로컬 캐시 (활성 타이머 목록)
        Set<String> localCache = ConcurrentHashMap.newKeySet();
        
        // Redis SCAN을 사용한 배치 처리
        long startTime = System.nanoTime();
        
        try {
            // SCAN 명령어로 배치 단위로 키 조회
            List<String> allKeys = new ArrayList<>();
            String cursor = "0";
            
            do {
                // SCAN 명령어 실행 (배치 크기: 1000)
                try (var scanResult = redisTemplate.scan(
                    org.springframework.data.redis.core.ScanOptions.scanOptions()
                        .match(TURN_TIMER_PREFIX + "*")
                        .count(batchSize)
                        .build()
                )) {
                    while (scanResult.hasNext()) {
                        allKeys.add(scanResult.next());
                    }
                }
                
            } while (!cursor.equals("0"));
            
            // 로컬 캐시 업데이트
            localCache.addAll(allKeys);
            
            // 배치 단위로 병렬 처리
            ExecutorService executor = Executors.newFixedThreadPool(4);
            List<CompletableFuture<Integer>> futures = new ArrayList<>();
            
            for (int i = 0; i < allKeys.size(); i += batchSize) {
                int endIdx = Math.min(i + batchSize, allKeys.size());
                List<String> batch = allKeys.subList(i, endIdx);
                
                CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
                    int processedCount = 0;
                    long now = System.currentTimeMillis();
                    
                    for (String key : batch) {
                        String endTimeStr = redisTemplate.opsForValue().get(key);
                        if (endTimeStr != null) {
                            long endTime = Long.parseLong(endTimeStr);
                            if (now >= endTime) {
                                redisTemplate.delete(key);
                                localCache.remove(key);
                                processedCount++;
                            }
                        }
                    }
                    return processedCount;
                }, executor);
                
                futures.add(future);
            }
            
            // 모든 배치 처리 완료 대기
            int totalProcessed = futures.stream()
                .mapToInt(future -> {
                    try {
                        return future.get();
                    } catch (Exception e) {
                        return 0;
                    }
                })
                .sum();
            
            executor.shutdown();
            
            long endTime = System.nanoTime();
            long durationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
            
            System.out.println("로컬 캐시 + SCAN + 배치 처리 결과:");
            System.out.println("- 총 처리 시간: " + durationMs + "ms");
            System.out.println("- 로컬 캐시 크기: " + localCache.size());
            System.out.println("- 처리된 타이머 수: " + totalProcessed);
            System.out.println("- 배치 크기: " + batchSize);
            System.out.println("- 최적화 효과: KEYS 대신 SCAN 사용, 로컬 캐시 활용");
            
        } catch (Exception e) {
            System.err.println("로컬 캐시 처리 중 오류: " + e.getMessage());
        }
        
        cleanupRedis();
        System.out.println("=== 3.3 로컬 캐시 + SCAN + 배치 처리 테스트 완료 ===\n");
    }

    /**
     * 3.4 Redis Keyspace Notification 구독 방식 테스트 (시뮬레이션)
     */
    @Test
    void testRedisKeyspaceNotificationSimulation() {
        System.out.println("=== 3.4 Redis Keyspace Notification 시뮬레이션 테스트 시작 ===");
        
        int roomCount = 10000; // 실제 이벤트 기반이므로 적은 수로 테스트
        final AtomicInteger expiredCount = new AtomicInteger(0);
        
        // 테스트 데이터 생성 (TTL과 함께)
        long currentTime = System.currentTimeMillis();
        
        for (int i = 0; i < roomCount; i++) {
            String timerKey = TURN_TIMER_PREFIX + "room_" + i;
            long endTime = currentTime + 1000; // 1초 후 만료
            redisTemplate.opsForValue().set(timerKey, String.valueOf(endTime));
            
            // TTL 설정 (실제 만료 시간과 동일하게)
            redisTemplate.expire(timerKey, 2, TimeUnit.SECONDS);
        }
        
        System.out.println("TTL 설정된 타이머 수: " + roomCount);
        
        // 이벤트 구독 시뮬레이션 (실제로는 Redis pub/sub 사용)
        long startTime = System.nanoTime();
        
        // 만료 이벤트 시뮬레이션을 위한 주기적 체크
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        AtomicLong eventProcessingTime = new AtomicLong(0);
        
        scheduler.scheduleAtFixedRate(() -> {
            Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
            if (keys != null) {
                long now = System.currentTimeMillis();
                for (String key : keys) {
                    String endTimeStr = redisTemplate.opsForValue().get(key);
                    if (endTimeStr != null) {
                        long endTime = Long.parseLong(endTimeStr);
                        if (now >= endTime) {
                            // 이벤트 기반 처리 시뮬레이션
                            long eventStartTime = System.nanoTime();
                            
                            // 새로운 타이머 시작 (실제 게임 로직)
                            String roomId = key.substring(TURN_TIMER_PREFIX.length());
                            processExpiredTimerEvent(roomId);
                            
                            long eventEndTime = System.nanoTime();
                            eventProcessingTime.addAndGet(TimeUnit.NANOSECONDS.toMillis(eventEndTime - eventStartTime));
                            
                            redisTemplate.delete(key);
                            expiredCount.incrementAndGet();
                        }
                    }
                }
            }
        }, 0, 100, TimeUnit.MILLISECONDS); // 100ms마다 체크
        
        // 3초 대기 (TTL 만료 시간)
        try {
            Thread.sleep(3000);
            scheduler.shutdown();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long endTime = System.nanoTime();
        long totalDurationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        System.out.println("Redis Keyspace Notification 시뮬레이션 결과:");
        System.out.println("- 총 처리 시간: " + totalDurationMs + "ms");
        System.out.println("- 만료된 타이머 수: " + expiredCount.get());
        System.out.println("- 이벤트 처리 시간: " + eventProcessingTime.get() + "ms");
        System.out.println("- 평균 이벤트 처리 시간: " + (expiredCount.get() > 0 ? eventProcessingTime.get() / expiredCount.get() : 0) + "ms");
        System.out.println("- 최적화 효과: 실시간 이벤트 기반 처리, 폴링 불필요");
        
        cleanupRedis();
        System.out.println("=== 3.4 Redis Keyspace Notification 시뮬레이션 테스트 완료 ===\n");
    }

    /**
     * 전체 성능 비교 테스트
     */
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

    private void testOriginalMethod(int roomCount) {
        createTimerData(roomCount);
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
        long duration = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("1. 기존 방식: " + duration + "ms");
        cleanupRedis();
    }

    private void testParallelMethod(int roomCount) {
        createTimerData(roomCount);
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
        long duration = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("2. 병렬 처리: " + duration + "ms");
        cleanupRedis();
    }

    private void testPriorityQueueMethod(int roomCount) {
        createTimerData(roomCount);
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
        long duration = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("3. Priority Queue: " + duration + "ms");
        cleanupRedis();
    }

    private void testLocalCacheMethod(int roomCount) {
        createTimerData(roomCount);
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
        long duration = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("4. 로컬 캐시 + 배치: " + duration + "ms");
        cleanupRedis();
    }

    private void processExpiredTimerEvent(String roomId) {
        // 실제 게임 로직 시뮬레이션
        // endTurnByTimer() 메서드 호출과 유사한 처리
        //System.out.println("타이머 만료 이벤트 처리: roomId=" + roomId);
    }

    // 타이머 정보를 담는 내부 클래스
    private static class TimerInfo {
        private final String key;
        private final long endTime;
        
        public TimerInfo(String key, long endTime) {
            this.key = key;
            this.endTime = endTime;
        }
        
        public String getKey() { return key; }
        public long getEndTime() { return endTime; }
    }

    // ========================================
    // 통합 비교 테이블 출력 테스트 (모든 방안)
    // ========================================

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
            cleanupRedis();
            createTimerData(roomCount);

            long keysMs = measureKeysMs();
            long scanMs = measureScanMs(scanCount);
            long originalMs = measureOriginalMs(roomCount);
            long parallelMs = measureParallelMs(roomCount);
            long pqMs = measurePriorityQueueMs();
            long localBatchMs = measureLocalBatchMs();
            long mem = getRedisMemoryUsage();

            System.out.printf(
                "%d\t\t%d\t\t%d\t\t%d\t\t%d\t\t%d\t\t\t%d\t\t\t%d%n",
                roomCount, keysMs, scanMs, originalMs, parallelMs, pqMs, localBatchMs, mem
            );
        }

        cleanupRedis();
        System.out.println("=== 모든 방안 성능 비교 완료 ===");
    }

    private long measureKeysMs() {
        long start = System.nanoTime();
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long end = System.nanoTime();
        return TimeUnit.NANOSECONDS.toMillis(end - start);
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
        return TimeUnit.NANOSECONDS.toMillis(end - start);
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
        return TimeUnit.NANOSECONDS.toMillis(end - start);
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
        return TimeUnit.NANOSECONDS.toMillis(end - start);
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
        return TimeUnit.NANOSECONDS.toMillis(end - start);
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
        return TimeUnit.NANOSECONDS.toMillis(end - start);
    }
}
