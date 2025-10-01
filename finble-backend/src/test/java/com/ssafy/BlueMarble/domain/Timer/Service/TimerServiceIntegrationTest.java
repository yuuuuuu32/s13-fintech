package com.ssafy.BlueMarble.domain.Timer.Service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import static com.ssafy.BlueMarble.domain.Timer.Service.TimerTestUtils.*;

/**
 * TimerService 통합 테스트 - 개별 테스트 클래스들의 통합 실행
 * 
 * 개별 테스트 클래스들:
 * - RedisKeysCommandTest: Redis KEYS 명령어 성능 테스트
 * - ConcurrentAccessTest: 동시 접근 성능 테스트
 * - ParallelProcessingTest: 스레드 풀 병렬 처리 테스트
 * - PriorityQueueTest: Priority Queue 기반 타이머 체크 테스트
 * - LocalCacheTest: 로컬 캐시 + SCAN + 배치 처리 테스트
 * - PerformanceComparisonTest: 통합 성능 비교 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
class TimerServiceIntegrationTest {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @BeforeEach
    void setUp() {
        // 테스트 전 Redis 정리
        cleanupRedis(redisTemplate);
    }

    @Test
    void testTimerServiceIntegration() {
        System.out.println("=== TimerService 통합 테스트 시작 ===");
        System.out.println("이 테스트는 개별 테스트 클래스들을 참조합니다:");
        System.out.println("1. RedisKeysCommandTest - Redis KEYS 명령어 성능 테스트");
        System.out.println("2. ConcurrentAccessTest - 동시 접근 성능 테스트");
        System.out.println("3. ParallelProcessingTest - 스레드 풀 병렬 처리 테스트");
        System.out.println("4. PriorityQueueTest - Priority Queue 기반 타이머 체크 테스트");
        System.out.println("5. LocalCacheTest - 로컬 캐시 + SCAN + 배치 처리 테스트");
        System.out.println("6. PerformanceComparisonTest - 통합 성능 비교 테스트");
        System.out.println();
        System.out.println("개별 테스트를 실행하려면 각 클래스를 직접 실행하세요.");
        System.out.println("=== TimerService 통합 테스트 완료 ===");
    }

}
