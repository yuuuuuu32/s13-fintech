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

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * Priority Queue 기반 타이머 체크 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class PriorityQueueTest {

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
    void testPriorityQueueBasedTimerCheck() {
        System.out.println("=== 3.2 Priority Queue 기반 테스트 시작 ===");
        
        int roomCount = 100000;
        int batchSize = 1000;
        
        // 테스트 데이터 생성
        createTimerData(redisTemplate, roomCount);
        
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
        
        long queueBuildTime = toMillis(queueBuildStartTime, queueBuildEndTime);
        long processingTime = toMillis(processingStartTime, processingEndTime);
        
        System.out.println("Priority Queue 결과:");
        System.out.println("- Queue 구축 시간: " + queueBuildTime + "ms");
        System.out.println("- 배치 처리 시간: " + processingTime + "ms");
        System.out.println("- 처리된 타이머 수: " + processedCount);
        System.out.println("- 총 시간: " + (queueBuildTime + processingTime) + "ms");
        
        cleanupRedis(redisTemplate);
        System.out.println("=== 3.2 Priority Queue 기반 테스트 완료 ===\n");
    }
}
