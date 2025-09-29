package com.ssafy.BlueMarble.domain.Timer.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.Timer.dto.TurnInfoDto;
import com.ssafy.BlueMarble.domain.game.dto.request.TurnSkipRequest;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.game.service.EconomicHistoryService;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Set;
import java.util.concurrent.*;


@Service
@Slf4j
@RequiredArgsConstructor
public class TimerService {

    private final RedisTemplate<String, String> redisTemplate;
    private final GameRedisService gameRedisService;
    private final SessionMessageService sessionMessageService;
    private final ObjectMapper objectMapper;
    private final UserRedisService userRedisService;
    private final EconomicHistoryService economicHistoryService;
    private final RoomService roomService;
    // 턴 타이머 키 패턴
    private static final String TURN_TIMER_PREFIX = "turn_timer:";

    //
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final ConcurrentMap<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    /**
     * 턴 시작 시 타이머 설정
     */
    public void startTurnTimer(String roomId, Long seconds) {

        // 이미 존재하는 타이머가 있다면 제거
        ScheduledFuture<?> existingFuture = scheduledTasks.get(roomId);
        if (existingFuture != null && !existingFuture.isDone()) {
            existingFuture.cancel(false);
        }

        // 타이머 시작 후 할 일
        Runnable task = () -> {
            endTurnByTimer(roomId);
        };

        // 타이머 예약 (seconds 후 실행)
        ScheduledFuture<?> scheduledFuture = scheduler.schedule(task, seconds, TimeUnit.SECONDS);

        // 예약 정보 저장
        scheduledTasks.put(roomId, scheduledFuture);
    }

    /**
     * 턴 타이머 취소 (플레이어가 턴을 수동으로 종료한 경우)
     */
    public void cancelTurnTimer(String roomId, String username) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);

        // 현재 플레이 상태인 유저 이름 가져오기
        String currentPlayerNickname = gameState.getPlayerOrder().get(gameState.getCurrentPlayerIndex());

        // 현재 플레이어와 요청한 플레이어가 일치하는지 확인
        if (!currentPlayerNickname.equals(username)) {
            log.warn("턴 취소 권한이 없음: roomId={}, currentPlayer={}, requestedPlayer={}",
                    roomId, currentPlayerNickname, username);
            return;
        }

        ScheduledFuture<?> scheduledTask = scheduledTasks.get(roomId);
        if (scheduledTask != null && !scheduledTask.isCancelled() && !scheduledTask.isDone()) {
            scheduledTask.cancel(false);
            log.info("턴 타이머 취소됨: roomId={}, player={}", roomId, username);
        } else {
            log.warn("취소할 활성화된 타이머 없음: roomId={}", roomId);
        }

        endTurnByTimer(roomId);
    }

    public void endTurnManually(WebSocketSession session, TurnSkipRequest turnSkipRequest) {
        String roomId = roomService.getRoom(session.getId());
        cancelTurnTimer(roomId, turnSkipRequest.getUsername());
    }

    /**
     * 게임 종료 시 타이머 정리
     */
    public void clearGameTimer(String roomId) {
        // 메모리 기반 타이머 취소
        ScheduledFuture<?> scheduledTask = scheduledTasks.get(roomId);
        if (scheduledTask != null && !scheduledTask.isCancelled() && !scheduledTask.isDone()) {
            scheduledTask.cancel(false);
        }
        scheduledTasks.remove(roomId);

        log.info("게임 종료로 인한 타이머 정리 완료: roomId={}", roomId);
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
            // 경제 효과를 타일과 플레이어에게 실제 적용 (2턴마다 적용)
            if (gameState.getGameTurn() > 0 && gameState.getGameTurn() % 2 == 0) {
                economicHistoryService.applyAndSaveEconomicEffectsForAllPlayers(roomId, gameState);
            }
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
        startTurnTimer(roomId, 30L);

        sendTimerStartNotification(roomId, nextPlayerId);

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


            // 감옥에 있다면 턴을 줄여주는걸로 대신해야함
            if (currentPlayer.isInJail()) {
                currentPlayer.setJailTurns(currentPlayer.getJailTurns() - 1);
                // 만기 채웠으면 초기화 시켜주자
                if (currentPlayer.getJailTurns() <= 0) {
                    currentPlayer.setInJail(false);
                    currentPlayer.setJailTurns(0);
                }
            }


            TurnInfoDto payload = TurnInfoDto.builder()
                    .roomId(roomId)
                    .gameTurn(gameState.getGameTurn())
                    .curPlayer(currentPlayer.getNickname())
                    .build();

            JsonNode payloadNode = objectMapper.valueToTree(payload);
            MessageDto message = new MessageDto(MessageType.GAME_STATE_CHANGE, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, message);
            gameRedisService.saveGameMapState(roomId, gameState);

        } catch (Exception e) {
            log.error("턴 시작 알림 전송 실패: roomId={}", roomId, e);
        }
    }
}