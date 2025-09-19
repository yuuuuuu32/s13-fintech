package com.ssafy.BlueMarble.global.common.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.service.GameRedisService;
import com.ssafy.BlueMarble.domain.game.service.MapService;
import com.ssafy.BlueMarble.domain.game.service.VictoryService;
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
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final MapService mapService;
    private final VictoryService victoryService;

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

        // 파산 후 승리 조건 체크 (VictoryService 통합 승리 조건 사용)
        victoryService.checkAllVictoryConditions(roomId, state);
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

    // 기존 checkGameEndCondition 메서드는 VictoryService로 통합되어 제거됨
    // VictoryService.checkAllVictoryConditions()가 모든 승리 조건을 처리함
}
