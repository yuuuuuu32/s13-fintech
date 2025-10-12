package com.ssafy.BlueMarble.monitoring;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/test")
public class TestController {
    
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final AtomicLong completedTasks = new AtomicLong(0);
    private final AtomicLong totalTasks = new AtomicLong(0);
    
    @GetMapping("/memory-timer")
    public Map<String, Object> testMemoryTimer(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "100") int tasks,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "5") int seconds
    ) {
        completedTasks.set(0);
        totalTasks.set(tasks);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < tasks; i++) {
            Runnable task = () -> {
                completedTasks.incrementAndGet();
            };
            scheduler.schedule(task, seconds, TimeUnit.SECONDS);
        }
        
        long endTime = System.currentTimeMillis();
        long setupTime = endTime - startTime;
        
        Map<String, Object> result = new HashMap<>();
        result.put("totalTasks", tasks);
        result.put("setupTimeMs", setupTime);
        result.put("ttlSeconds", seconds);
        result.put("message", "Memory timer test started");
        
        return result;
    }
    
    @GetMapping("/memory-timer/stats")
    public Map<String, Object> getMemoryTimerStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTasks", totalTasks.get());
        stats.put("completedTasks", completedTasks.get());
        stats.put("completionRate", totalTasks.get() > 0 ? 
            (double) completedTasks.get() / totalTasks.get() * 100 : 0.0);
        return stats;
    }
}
