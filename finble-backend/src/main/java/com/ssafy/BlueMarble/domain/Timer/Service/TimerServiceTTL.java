package com.ssafy.BlueMarble.domain.Timer.Service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.listener.KeyExpirationEventMessageListener;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class TimerServiceTTL extends KeyExpirationEventMessageListener {

    private final com.ssafy.BlueMarble.domain.Timer.Service.TimerService timerService;
    
    // 턴 타이머 키 패턴 (TimerService와 일치)
    private static final String TURN_TIMER_PREFIX = "turn_timer:";

    public TimerServiceTTL(RedisMessageListenerContainer listenerContainer, com.ssafy.BlueMarble.domain.Timer.Service.TimerService timerService) {
        super(listenerContainer);
        this.timerService = timerService;
    }

    /**
     * Redis 키 만료 이벤트 처리
     * @param message   redis key
     * @param pattern   __keyevent@*__:expired
     */
    @Override
    public void onMessage(Message message, byte[] pattern) {
        String expiredKey = message.toString();
        //log.info("Redis 키 만료 감지: {}", expiredKey);
        
        // 턴 타이머 키인지 확인
        if (expiredKey.startsWith(TURN_TIMER_PREFIX)) {
            // roomId 추출 (turn_timer:roomId 형태)
            String roomId = expiredKey.substring(TURN_TIMER_PREFIX.length());
            //log.info("턴 타이머 만료 처리: roomId={}", roomId);
            
            // TimerService의 endTurnByTimer 메서드 호출
            // 이 메서드는 private이므로 public 메서드를 통해 접근해야 함
            // 또는 TimerService에 public 메서드를 추가해야 함
            handleTurnTimerExpiration(roomId);
        }
    }

    /**
     * 턴 타이머 만료 처리
     */
    private void handleTurnTimerExpiration(String roomId) {
        //log.info("Redis TTL 만료로 인한 턴 타이머 처리 시작: roomId={}", roomId);
        
        try {
            // TimerService의 endTurnByTimer 메서드를 호출하여 턴 종료 처리
            // endTurnByTimer는 private 메서드이므로 public 메서드를 통해 접근
            timerService.handleTurnTimerExpiration(roomId);
            
            //log.info("Redis TTL 만료로 인한 턴 타이머 처리 완료: roomId={}", roomId);
        } catch (Exception e) {
            //log.error("Redis TTL 만료로 인한 턴 타이머 처리 중 오류 발생: roomId={}", roomId, e);
        }
    }
}
