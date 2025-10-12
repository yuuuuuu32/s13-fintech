package com.ssafy.BlueMarble.monitoring;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class MemoryTimerAccuracyService {
    
    private final MeterRegistry meterRegistry;
    private final ConcurrentMap<String, Long> expectedExpirationTimes = new ConcurrentHashMap<>();
    private final AtomicLong totalTimers = new AtomicLong(0);
    private final AtomicLong completedTimers = new AtomicLong(0);
    
    private static final String MEMORY_TIMER_PREFIX = "memory_timer:";
    
    // 메트릭 등록 (생성자에서 초기화)
    private Timer.Sample ttlAccuracySample;
    private Timer ttlAccuracySummary;
    private AtomicLong memoryTimerTotal;
    private AtomicLong memoryTimerCompleted;
    
    // ScheduledExecutorService (현재 TimerService와 동일한 설정)
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final ConcurrentMap<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    
    // 생성자에서 메트릭 초기화
    public MemoryTimerAccuracyService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.ttlAccuracySummary = Timer.builder("memory_timer_accuracy_ms")
                .description("Memory Timer TTL Accuracy in milliseconds")
                .register(meterRegistry);
        this.memoryTimerTotal = meterRegistry.gauge("memory_timer_total", new AtomicLong(0));
        this.memoryTimerCompleted = meterRegistry.gauge("memory_timer_completed", new AtomicLong(0));
    }
    
    /**
     * 대량의 메모리 타이머 설정 및 정확도 측정
     */
    public void bulkSetMemoryTimerWithAccuracyMeasurement(int roomCount, long ttlSeconds) {
        log.info("메모리 타이머 정확도 테스트 시작: rooms={}, ttlSeconds={}", roomCount, ttlSeconds);
        
        long currentTime = System.currentTimeMillis();
        totalTimers.set(roomCount);
        completedTimers.set(0);
        
        for (int i = 0; i < roomCount; i++) {
            String key = MEMORY_TIMER_PREFIX + i;
            long expectedEndTime = currentTime + (ttlSeconds * 1000);
            expectedExpirationTimes.put(key, expectedEndTime);
            
            // ScheduledExecutorService를 사용한 타이머 설정 (현재 TimerService와 동일)
            Runnable task = () -> measureMemoryTimerAccuracy(key);
            ScheduledFuture<?> scheduledFuture = scheduler.schedule(task, ttlSeconds, TimeUnit.SECONDS);
            scheduledTasks.put(key, scheduledFuture);
        }
        
        log.info("메모리 타이머 {}개 설정 완료", roomCount);
    }
    
    /**
     * 메모리 타이머 정확도 측정
     */
    public void measureMemoryTimerAccuracy(String timerKey) {
        Long expectedEndTime = expectedExpirationTimes.remove(timerKey);
        if (expectedEndTime != null) {
            long actualEndTime = System.currentTimeMillis();
            long deviation = actualEndTime - expectedEndTime;
            
            // 정확도 메트릭 기록
            ttlAccuracySummary.record(deviation, TimeUnit.MILLISECONDS);
            
            completedTimers.incrementAndGet();
            memoryTimerCompleted.set(completedTimers.get());
            
            log.debug("메모리 타이머 정확도: key={}, deviation={}ms", timerKey, deviation);
        }
        
        // 스케줄된 태스크 정리
        scheduledTasks.remove(timerKey);
    }
    
    /**
     * 메모리 타이머 정확도 통계 조회
     */
    public MemoryTimerStats getMemoryTimerStats() {
        return MemoryTimerStats.builder()
                .totalTimers(totalTimers.get())
                .completedTimers(completedTimers.get())
                .completionRate(totalTimers.get() > 0 ? 
                    (double) completedTimers.get() / totalTimers.get() * 100 : 0.0)
                .build();
    }
    
    /**
     * 모든 메모리 타이머 취소
     */
    public void cancelAllMemoryTimers() {
        log.info("모든 메모리 타이머 취소 시작");
        
        scheduledTasks.values().forEach(future -> {
            if (future != null && !future.isCancelled() && !future.isDone()) {
                future.cancel(false);
            }
        });
        
        scheduledTasks.clear();
        expectedExpirationTimes.clear();
        totalTimers.set(0);
        completedTimers.set(0);
        
        log.info("모든 메모리 타이머 취소 완료");
    }
    
    /**
     * 메모리 타이머 통계 DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class MemoryTimerStats {
        private long totalTimers;
        private long completedTimers;
        private double completionRate;
    }
}
