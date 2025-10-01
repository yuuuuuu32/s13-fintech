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

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * 스레드 풀을 활용한 병렬 처리 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class ParallelProcessingTest {

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
    void testParallelProcessingWithThreadPool() {
        System.out.println("=== 3.1 스레드 풀 병렬 처리 테스트 시작 ===");
        
        int roomCount = 100000;
        int threadCount = 10;
        int batchSize = roomCount / threadCount; // 각 스레드당 10,000개
        
        // 테스트 데이터 생성
        createTimerData(redisTemplate, roomCount);
        
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
                    return toMillis(threadStartTime, threadEndTime);
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
        long totalDurationMs = toMillis(startTime, endTime);
        
        System.out.println("병렬 처리 결과:");
        System.out.println("- 총 처리 시간: " + totalDurationMs + "ms");
        System.out.println("- 스레드 수: " + threadCount);
        System.out.println("- 스레드당 처리량: " + batchSize + "개");
        
        cleanupRedis(redisTemplate);
        System.out.println("=== 3.1 스레드 풀 병렬 처리 테스트 완료 ===\n");
    }
}
