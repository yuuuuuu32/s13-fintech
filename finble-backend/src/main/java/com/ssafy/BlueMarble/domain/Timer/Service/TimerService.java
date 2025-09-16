package com.ssafy.BlueMarble.domain.Timer.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.Timer.dto.TurnInfoDto;
import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Set;


@Service
@Slf4j
@RequiredArgsConstructor
public class TimerService {

    private final RedisTemplate<String, String> redisTemplate;
    private final GameRedisService gameRedisService;
    private final SessionMessageService sessionMessageService;
    private final ObjectMapper objectMapper;
    private final UserRedisService userRedisService;

    // 턴 타이머 키 패턴
    private static final String TURN_TIMER_PREFIX = "turn_timer:";

    /**
     * 턴 시작 시 타이머 설정
     */
    public void startTurnTimer(String roomId, String currentPlayerId) {
        String timerKey = TURN_TIMER_PREFIX + roomId;

        // 현재 시간 + 30초를 Redis에 저장
        long endTime = System.currentTimeMillis() + 30000; // 30초
        redisTemplate.opsForValue().set(timerKey, String.valueOf(endTime));

        // TODO : 타이머 시작 알림 보내야함
        sendTimerStartNotification(roomId, currentPlayerId);
    }

    /**
     * 턴 타이머 취소 (플레이어가 턴을 수동으로 종료한 경우)
     */
    public void cancelTurnTimer(String roomId) {
        String timerKey = TURN_TIMER_PREFIX + roomId;
        redisTemplate.delete(timerKey);

        endTurnByTimer(roomId);
    }

    @Scheduled(fixedRate = 1000) // 1초마다 갱신
    public void checkTurnTimers() {
        Set<String> keys = redisTemplate.keys(TURN_TIMER_PREFIX + "*");
        long now = System.currentTimeMillis();

        if (keys == null || keys.isEmpty()) {
            return;
        }

        for (String key : keys) {
            String endTimeStr = redisTemplate.opsForValue().get(key);
            if (endTimeStr == null) continue;

            long endTime = Long.parseLong(endTimeStr);
            if (now >= endTime) {
                String roomId = key.substring(TURN_TIMER_PREFIX.length());
                endTurnByTimer(roomId);
                redisTemplate.delete(key);
            }
        }
    }

    public void endTurnManually(String roomId){
        cancelTurnTimer(roomId);
    }

    private void endTurnByTimer(String roomId) {
            // 턴 종료 로직 실행
            CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
            if (gameState == null) {
                log.error("게임 상태를 찾을 수 없음: roomId={}", roomId);
                return;
            }

            // 턴 변경 로직
            if (gameState.getCurrentPlayerIndex() == gameState.getPlayerOrder().size() - 1) {
                gameState.setCurrentPlayerIndex(0);
                gameState.setGameTurn(gameState.getGameTurn() + 1);
            } else {
                gameState.setCurrentPlayerIndex(gameState.getCurrentPlayerIndex() + 1);
            }

            // 게임 상태 저장
            gameRedisService.saveGameMapState(roomId, gameState);

            // 다음 플레이어에게 턴 시작 (닉네임을 ID로 변환)
            String nextPlayerNickname = gameState.getPlayerOrder().get(gameState.getCurrentPlayerIndex());
            String nextPlayerId = userRedisService.getUserIdByNickname(nextPlayerNickname);
            if (nextPlayerId == null) {
                log.error("플레이어 ID를 찾을 수 없음: nickname={}", nextPlayerNickname);
                return;
            }
            startTurnTimer(roomId, nextPlayerId);

            log.info("타이머로 인한 턴 종료: roomId={}, nextPlayerId={}", roomId, nextPlayerId);

    }

    /**
     * 게임 상태변경 메시지 전송
     */
    private void sendTimerStartNotification(String roomId, String currentPlayerId) {
        try {
            CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
            if (gameState == null) {
                log.error("게임 상태를 찾을 수 없음: roomId={}", roomId);
                return;
            }

            CreateMapPayload.PlayerState currentPlayer = gameState.getPlayers().get(currentPlayerId);
            if (currentPlayer == null) {
                log.error("플레이어를 찾을 수 없음: roomId={}, playerId={}", roomId, currentPlayerId);
                return;
            }

            TurnInfoDto payload = TurnInfoDto.builder()
                    .roomId(roomId)
                    .gameTurn(gameState.getGameTurn())
                    .curPlayer(currentPlayer.getNickname())
                    .build();

            JsonNode payloadNode = objectMapper.valueToTree(payload);
            MessageDto message = new MessageDto(MessageType.GAME_STATE_CHANGE, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, message);

            log.info("턴 시작 알림 전송: roomId={}, player={}", roomId, currentPlayer.getNickname());
        } catch (Exception e) {
            log.error("턴 시작 알림 전송 실패: roomId={}", roomId, e);
        }
    }
}