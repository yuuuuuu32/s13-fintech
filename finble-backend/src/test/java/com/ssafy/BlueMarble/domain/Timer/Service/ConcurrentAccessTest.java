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

import java.util.concurrent.TimeUnit;

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * 동시 접근 성능 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class ConcurrentAccessTest {

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
    void testConcurrentAccessPerformance() {
        System.out.println("=== 동시 접근 성능 테스트 시작 ===");
        
        int roomCount = 100000;
        int[] threadCounts = {1, 2, 4, 8, 16};
        
        System.out.println("방 개수: " + roomCount);
        System.out.println("스레드수\t총시간(ms)\t평균(ms)\t최소(ms)\t최대(ms)\t표준편차(ms)\t처리량(건/초)");
        System.out.println("--------------------------------------------------------------------------------");
        
        for (int threadCount : threadCounts) {
            // 테스트 데이터 생성 (매 케이스마다 동일 조건)
            cleanupRedis(redisTemplate);
            createTimerData(redisTemplate, roomCount);
            
            Thread[] threads = new Thread[threadCount];
            long[] executionTimes = new long[threadCount];
            
            for (int i = 0; i < threadCount; i++) {
                final int threadIndex = i;
                threads[i] = new Thread(() -> {
                    long startTime = System.nanoTime();
                    long endTime = System.nanoTime();
                    executionTimes[threadIndex] = toMillis(startTime, endTime);
                });
            }
            
            long totalStartTime = System.nanoTime();
            for (Thread thread : threads) thread.start();
            for (Thread thread : threads) {
                try { thread.join(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
            long totalEndTime = System.nanoTime();
            long totalDurationMs = toMillis(totalStartTime, totalEndTime);
            
            // 통계 계산
            long sum = 0;
            long min = Long.MAX_VALUE;
            long max = Long.MIN_VALUE;
            for (long t : executionTimes) { 
                sum += t; 
                if (t < min) min = t; 
                if (t > max) max = t; 
            }
            double avg = sum / (double) threadCount;
            double varianceSum = 0.0;
            for (long t : executionTimes) { 
                double d = t - avg; 
                varianceSum += d * d; 
            }
            double stddev = Math.sqrt(varianceSum / threadCount);
            double throughput = totalDurationMs == 0 ? 0.0 : (roomCount * 1000.0 / totalDurationMs);
            
            System.out.printf("%d\t\t%d\t\t%.1f\t\t%d\t\t%d\t\t%.1f\t\t%.1f%n",
                threadCount, totalDurationMs, avg, min, max, stddev, throughput);
        }
        
        System.out.println("참고: 처리량은 전체 방 개수 기준 전체 소요 시간으로 산출");
        System.out.println("=== 동시 접근 성능 테스트 완료 ===");
    }
}
