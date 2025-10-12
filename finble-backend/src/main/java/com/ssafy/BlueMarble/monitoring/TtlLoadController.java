package com.ssafy.BlueMarble.monitoring;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/monitor")
public class TtlLoadController {

    private final TtlLoadService ttlLoadService;
    private final RedisExpiredKeyListener expiredKeyListener;
    private final RedisTemplate<String, String> redisTemplate;
    private final TtlAccuracyService ttlAccuracyService;
    private final MemoryTimerAccuracyService memoryTimerAccuracyService;

    public TtlLoadController(TtlLoadService ttlLoadService, 
                           RedisExpiredKeyListener expiredKeyListener,
                           RedisTemplate<String, String> redisTemplate,
                           TtlAccuracyService ttlAccuracyService,
                           MemoryTimerAccuracyService memoryTimerAccuracyService) {
        this.ttlLoadService = ttlLoadService;
        this.expiredKeyListener = expiredKeyListener;
        this.redisTemplate = redisTemplate;
        this.ttlAccuracyService = ttlAccuracyService;
        this.memoryTimerAccuracyService = memoryTimerAccuracyService;
    }

    @GetMapping("/ttl/bulk")
    public ResponseEntity<String> runBulk(
            @RequestParam(name = "rooms") int rooms,
            @RequestParam(name = "ttlSeconds", defaultValue = "60") long ttlSeconds
    ) {
        ttlLoadService.bulkSetWithTtl(rooms, Duration.ofSeconds(ttlSeconds));
        return ResponseEntity.ok("queued rooms=" + rooms + ", ttlSeconds=" + ttlSeconds);
    }
    
    @GetMapping("/ttl/status")
    public ResponseEntity<Map<String, Object>> getTtlStatus() {
        Map<String, Object> status = new HashMap<>();
        
        // 만료된 키 총 개수
        status.put("totalExpiredKeys", expiredKeyListener.getTotalExpiredKeys());
        
        // 현재 TTL이 설정된 키 개수 (turn_timer 패턴)
        Set<String> activeKeys = redisTemplate.keys("turn_timer:*");
        status.put("activeTimerKeys", activeKeys != null ? activeKeys.size() : 0);
        
        // Redis 메모리 사용량
        try {
            Object memoryInfo = redisTemplate.getConnectionFactory()
                .getConnection()
                .info("memory")
                .get("used_memory");
            status.put("redisMemoryUsage", memoryInfo.toString());
        } catch (Exception e) {
            status.put("redisMemoryUsage", "N/A");
        }
        
        // Redis 연결 정보
        try {
            Object connectedClients = redisTemplate.getConnectionFactory()
                .getConnection()
                .info("clients")
                .get("connected_clients");
            status.put("connectedClients", connectedClients.toString());
        } catch (Exception e) {
            status.put("connectedClients", "N/A");
        }
        
        return ResponseEntity.ok(status);
    }
    
    @GetMapping("/monitor/ttl/simulate-load")
    public ResponseEntity<String> simulateHighLoad(
            @RequestParam(name = "rooms", defaultValue = "100000") int rooms,
            @RequestParam(name = "ttlSeconds", defaultValue = "30") long ttlSeconds,
            @RequestParam(name = "burstCount", defaultValue = "5") int burstCount
    ) {
        // 대량 TTL 설정으로 만료 이벤트 집중 발생 시뮬레이션
        for (int i = 0; i < burstCount; i++) {
            ttlLoadService.bulkSetWithTtl(rooms / burstCount, Duration.ofSeconds(ttlSeconds));
        }
        
        return ResponseEntity.ok(String.format(
            "High load simulation started: rooms=%d, ttlSeconds=%d, bursts=%d", 
            rooms, ttlSeconds, burstCount));
    }
    
    @GetMapping("/ttl/accuracy-test")
    public ResponseEntity<String> runAccuracyTest(
            @RequestParam(name = "rooms", defaultValue = "100000") int rooms,
            @RequestParam(name = "ttlSeconds", defaultValue = "30") long ttlSeconds
    ) {
        ttlAccuracyService.bulkSetTtlWithAccuracyMeasurement(rooms, ttlSeconds);
        return ResponseEntity.ok(String.format(
            "TTL Accuracy test started: rooms=%d, ttlSeconds=%d", 
            rooms, ttlSeconds));
    }
    
    @GetMapping("/ttl/accuracy-stats")
    public ResponseEntity<TtlAccuracyService.TtlAccuracyStats> getAccuracyStats() {
        TtlAccuracyService.TtlAccuracyStats stats = ttlAccuracyService.getTtlAccuracyStats();
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/memory-timer/accuracy-test")
    public ResponseEntity<String> runMemoryTimerAccuracyTest(
            @RequestParam(name = "rooms", defaultValue = "100000") int rooms,
            @RequestParam(name = "ttlSeconds", defaultValue = "30") long ttlSeconds
    ) {
        memoryTimerAccuracyService.bulkSetMemoryTimerWithAccuracyMeasurement(rooms, ttlSeconds);
        return ResponseEntity.ok(String.format(
                "Memory Timer Accuracy test started: rooms=%d, ttlSeconds=%d",
                rooms, ttlSeconds));
    }
    
    @GetMapping("/memory-timer/accuracy-stats")
    public ResponseEntity<MemoryTimerAccuracyService.MemoryTimerStats> getMemoryTimerAccuracyStats() {
        MemoryTimerAccuracyService.MemoryTimerStats stats = memoryTimerAccuracyService.getMemoryTimerStats();
        return ResponseEntity.ok(stats);
    }
    
    @PostMapping("/memory-timer/cancel-all")
    public ResponseEntity<String> cancelAllMemoryTimers() {
        memoryTimerAccuracyService.cancelAllMemoryTimers();
        return ResponseEntity.ok("All memory timers cancelled");
    }
}


