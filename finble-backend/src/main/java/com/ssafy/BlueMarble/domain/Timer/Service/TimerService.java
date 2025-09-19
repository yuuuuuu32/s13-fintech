package com.ssafy.BlueMarble.domain.Timer.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.Timer.dto.TurnInfoDto;
import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.game.service.EconomicHistoryService;
import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.EconomicHistoryPayload;
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
    private final EconomicHistoryService economicHistoryService;

    // 턴 타이머 키 패턴
    private static final String TURN_TIMER_PREFIX = "turn_timer:";

    /**
     * 턴 시작 시 타이머 설정
     */
    public void startTurnTimer(String roomId, String currentPlayerId, Long seconds ) {
        String timerKey = TURN_TIMER_PREFIX + roomId;

        // 현재 시간 + 30초를 Redis에 저장
        long endTime = System.currentTimeMillis() + seconds; // 30초
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
                redisTemplate.delete(key);
                endTurnByTimer(roomId);
            }
        }
    }

    public void endTurnManually(String roomId){
        cancelTurnTimer(roomId);
    }

    /**
     * 게임 종료 시 타이머 정리
     */
    public void clearGameTimer(String roomId) {
        String timerKey = TURN_TIMER_PREFIX + roomId;
        redisTemplate.delete(timerKey);
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
            startTurnTimer(roomId, nextPlayerId,30000L);

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

            // 🏛️ 1단계: 턴 시작 시 경제 효과 체크 및 적용
            String currentPeriod = economicHistoryService.calculateCurrentPeriod(gameState.getGameTurn().intValue());
            boolean economicEffectChanged = false;

            // 경제 효과가 없거나 시대가 바뀌었으면 새로운 효과 생성
            if (gameState.getCurrentEconomicEffect() == null ||
                !currentPeriod.equals(gameState.getCurrentEconomicPeriod())) {

                EconomicEffect newEffect = economicHistoryService.initializeRoomEconomicEffect(roomId, gameState.getGameTurn());
                gameState.setCurrentEconomicPeriod(currentPeriod);
                gameState.setCurrentEconomicEffect(newEffect);
                economicEffectChanged = true;

                log.info("🏛️ [TIMER] 턴 시작 시 경제 효과 적용: roomId={}, effect={}", roomId, newEffect.getFullEffectName());

                // 경제 효과를 타일과 플레이어에게 실제 적용
                economicHistoryService.applyAndSaveEconomicEffectsForAllPlayers(roomId, gameState);

                // 경제 시대 변경 WebSocket 메시지 전송
                sendEconomicHistoryUpdateMessage(roomId, newEffect, currentPeriod);
            }

            // 게임 상태 저장 (경제 효과 적용 완료)
            gameRedisService.saveGameMapState(roomId, gameState);

            TurnInfoDto payload = TurnInfoDto.builder()
                    .roomId(roomId)
                    .gameTurn(gameState.getGameTurn())
                    .curPlayer(currentPlayer.getNickname())
                    .build();

            JsonNode payloadNode = objectMapper.valueToTree(payload);
            MessageDto message = new MessageDto(MessageType.GAME_STATE_CHANGE, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, message);

            log.info("턴 시작 알림 전송: roomId={}, player={}, economicChanged={}",
                    roomId, currentPlayer.getNickname(), economicEffectChanged);
        } catch (Exception e) {
            log.error("턴 시작 알림 전송 실패: roomId={}", roomId, e);
        }
    }

    /**
     * 경제역사 시대 변경 메시지 전송
     */
    private void sendEconomicHistoryUpdateMessage(String roomId, EconomicEffect effect, String period) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        int remainingTurns = economicHistoryService.getTurnsUntilNextPeriod(gameState.getGameTurn().intValue());

        EconomicHistoryPayload payload = EconomicHistoryPayload.builder()
                .periodName(getPeriodDisplayName(period))
                .effectName(effect.getEffectName())
                .description(effect.getDescription())
                .isBoom(effect.isBoom())
                .fullName(effect.getFullEffectName())
                .salaryMultiplier(effect.getSalaryMultiplier())
                .propertyPriceMultiplier(effect.getPropertyPriceMultiplier())
                .buildingCostMultiplier(effect.getBuildingCostMultiplier())
                .remainingTurns(remainingTurns)
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.ECONOMIC_HISTORY_UPDATE, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);

        log.info("🏛️ [TIMER] 경제 효과 WebSocket 메시지 전송: roomId={}, effect={}",
                roomId, effect.getFullEffectName());
    }

    /**
     * 경제 시대 표시명 반환
     */
    private String getPeriodDisplayName(String period) {
        switch (period) {
            case "MODERN": return "근대사";
            case "CONTEMPORARY": return "근현대사";
            case "RECENT": return "현대사";
            case "FUTURE": return "미래";
            default: return "알 수 없음";
        }
    }
}