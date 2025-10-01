package com.ssafy.BlueMarble.domain.Timer.Service;

import com.ssafy.BlueMarble.config.MetricsConfig;
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
import java.util.List;
import java.util.ArrayList;

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * Redis KEYS 명령어 성능 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class RedisKeysCommandTest {

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

    public void runRedisKeysCommandPerformanceTest() {
        System.out.println("=== Redis KEYS 명령어 실제 성능 테스트 ===");

        int[] roomCounts = {1000, 5000, 10000, 25000, 50000, 100000};
        int scanCount = 1000; // SCAN batch size

        System.out.println("방 개수\t\tKEYS(ms)\tKEYS개수\tSCAN(ms)\tSCAN/KEYS(%)\t메모리(bytes)");
        System.out.println("------------------------------------------------------------------------------------");

        for (int roomCount : roomCounts) {
            // 테스트 데이터 생성
            createTimerData(redisTemplate, roomCount);

            // KEYS 명령어 성능 측정
            long keysStartTime = System.nanoTime();
            Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
            long keysEndTime = System.nanoTime();

            long keysDurationMs = toMillis(keysStartTime, keysEndTime);
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
            long scanDurationMs = toMillis(scanStartTime, scanEndTime);

            long memoryUsage = getRedisMemoryUsage(redisTemplate);

            double ratio = keysDurationMs == 0 ? 0 : (scanDurationMs * 100.0 / keysDurationMs);
            System.out.printf("%d\t\t%d\t\t%d\t\t%d\t\t%.1f\t\t\t%d%n",
                    roomCount, keysDurationMs, keysCount, scanDurationMs, ratio, memoryUsage);

            // 테스트 데이터 정리
            cleanupRedis(redisTemplate);
        }

        System.out.println("=== Redis KEYS 명령어 실제 성능 테스트 완료 ===");
    }
}
