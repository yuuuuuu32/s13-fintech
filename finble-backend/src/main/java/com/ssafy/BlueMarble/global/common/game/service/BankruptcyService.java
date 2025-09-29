package com.ssafy.BlueMarble.global.common.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.user.service.UserService;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.BankrutcyPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import com.ssafy.BlueMarble.domain.game.entity.Tile;

@Service
@Slf4j
@RequiredArgsConstructor
public class BankruptcyService {
    private final SessionMessageService sessionMessageService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public void handleBankruptcy(CreateMapPayload state) {
        // roomId
        String roomId = state.getRoomId();
        Map<String, CreateMapPayload.PlayerState> players = state.getPlayers();

        players.forEach((userId, playerState) -> {
            // 플레이어 상태 비활성화
            if (playerState.getMoney() < 0) {
                String username = userService.getUserIdByNickname(state, userId);
                List<Integer> lands = players.get(userId).getOwnedProperties();
                
                // 파산한 플레이어가 소유한 모든 땅의 owner를 null로 초기화
                GameMap gameMap = state.getCurrentMap();
                for(int landNum : lands){
                    if (landNum >= 0 && landNum < gameMap.getCells().size()) {
                        Tile tile = gameMap.getCells().get(landNum);
                        if (tile != null) {
                            tile.setOwnerName(null);
                            tile.setBuildingType(Tile.BuildingType.FIELD); // 건물도 초기화
                        }
                    }
                }
                
                // 플레이어의 소유 땅 목록 초기화
                playerState.setOwnedProperties(new ArrayList<>());
                playerState.setActive(false);
                
                // GAME_RETIRED 메시지 전송
                sendGameRetiredMessage(roomId, username);
            }
        });

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
}
