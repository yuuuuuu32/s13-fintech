package com.ssafy.BlueMarble.global.common.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.game.service.MapService;
import com.ssafy.BlueMarble.domain.user.service.UserService;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.BankrutcyPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.EndGamePayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class BankruptcyService {
    private final SessionMessageService sessionMessageService;
    private final GameRedisService gameRedisService;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final MapService mapService;

    public void handleBankruptcy(CreateMapPayload state) {
        // roomId
        String roomId = state.getRoomId();
        Map<String, CreateMapPayload.PlayerState> players = state.getPlayers();

        players.forEach((userId, playerState) -> {
            // 플레이어 상태 비활성화
            if (playerState.getMoney() < 0) {
                String username = userService.getUserIdByNickname(state, userId);
                playerState.setActive(false);
                // GAME_RETIRED 메시지 전송
                sendGameRetiredMessage(roomId, username);
            }
        });

        // 게임 상태 저장 (이때는 AOP가 실행되지 않도록 주의)
        gameRedisService.saveGameMapState(roomId, state);


        // 게임 종료 조건 체크 (모든 플레이어가 파산했는지)
        checkGameEndCondition(roomId, state);
    }

    private void sendGameRetiredMessage(String roomId, String nickname) {
        BankrutcyPayload payload = BankrutcyPayload.builder()
                .nickname(nickname)
                .message(String.format("%s이 파산하였습니다.", nickname))
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.GAME_RETIRED, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);

        log.info("GAME_RETIRED 메시지 전송: roomId={}, nickname={}", roomId, nickname);
    }

    private void checkGameEndCondition(String roomId, CreateMapPayload gameState) {
        //TODO : 게임 종료 로직 실행

        List<CreateMapPayload.PlayerState> activePlayers = gameState.getPlayers().values().stream()
                .filter(CreateMapPayload.PlayerState::isActive)
                .toList();

        if (activePlayers.size() <= 1) {
            String winnerName = activePlayers.isEmpty() ? "No Winner" : activePlayers.get(0).getNickname();
            EndGamePayload payload = EndGamePayload.builder()
                    .winnerName(winnerName)
                    .build();

            JsonNode payloadNode = objectMapper.valueToTree(payload);
            MessageDto message = new MessageDto(MessageType.GAME_END, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, message);
            // 게임정보 모두 삭제
            mapService.deleteGameMapState(roomId);
        }
    }
}
