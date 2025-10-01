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

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * 로컬 캐시 + SCAN + 배치 처리 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class LocalCacheTest {

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
    void testLocalCacheWithScanAndBatch() {
        System.out.println("=== 3.3 로컬 캐시 + SCAN + 배치 처리 테스트 시작 ===");
        
        int roomCount = 100000;
        int batchSize = 1000;
        
        // 테스트 데이터 생성
        createTimerData(redisTemplate, roomCount);
        
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
            long durationMs = toMillis(startTime, endTime);
            
            System.out.println("로컬 캐시 + SCAN + 배치 처리 결과:");
            System.out.println("- 총 처리 시간: " + durationMs + "ms");
            System.out.println("- 로컬 캐시 크기: " + localCache.size());
            System.out.println("- 처리된 타이머 수: " + totalProcessed);
            System.out.println("- 배치 크기: " + batchSize);
            System.out.println("- 최적화 효과: KEYS 대신 SCAN 사용, 로컬 캐시 활용");
            
        } catch (Exception e) {
            System.err.println("로컬 캐시 처리 중 오류: " + e.getMessage());
        }
        
        cleanupRedis(redisTemplate);
        System.out.println("=== 3.3 로컬 캐시 + SCAN + 배치 처리 테스트 완료 ===\n");
    }
}
