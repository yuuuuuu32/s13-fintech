package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.request.JailRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.WorldTravelRequest;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.JailPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.ConstructPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.WorldTravelPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Random;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final GameRedisService gameRedisService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService sessionMessageService;

    /**
     * 감옥 이벤트 처리
     */
    public void handleJailEvent(WebSocketSession session, JailRequest jailRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 플레이어 상태 조회
        CreateMapPayload.PlayerState player = gameRedisService.getPlayerState(roomId, jailRequest.getUserName());
        if (player == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        // 2. 감옥에 있는지 확인
        if (!player.isInJail()) {
            throw new BusinessException(BusinessError.INVALID_JAIL_STATE);
        }

        boolean escapeSuccess = false;
        int remainingTurns = player.getJailTurns();

        if (jailRequest.isEscape()) {
            // 3. 보석금으로 탈출 시도
            int bailMoney = 500; // 보석금

            if (player.getMoney() >= bailMoney) {
                // 보석금 지불 가능
                player.setMoney(player.getMoney() - bailMoney);
                player.setInJail(false);
                player.setJailTurns(0);
                escapeSuccess = true;
                remainingTurns = 0;
            } else {
                // 보석금 부족
                escapeSuccess = false;
            }
        }

        // 4. 플레이어 상태 업데이트
        gameRedisService.savePlayerState(roomId, jailRequest.getUserName(), player);

        // 5. 게임 상태 업데이트
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        if (gameState != null && gameState.getPlayers() != null) {
            gameState.getPlayers().put(jailRequest.getUserName(), player);
            gameRedisService.saveGameMapState(roomId, gameState);
        }

        // 6. 결과 메시지 전송
        JailPayload payload = JailPayload.builder()
                .result(escapeSuccess)
                .userName(jailRequest.getUserName())
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(player.getMoney())
                                .lands(player.getOwnedProperties() != null ? player.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .turns(remainingTurns)
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.JAIL_EVENT, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }

    /**
     * 플레이어를 감옥에 보내는 메서드
     */
    public void sendPlayerToJail(String roomId, String userName, int jailTurns) {
        CreateMapPayload.PlayerState player = gameRedisService.getPlayerState(roomId, userName);
        if (player != null) {
            player.setInJail(true);
            player.setJailTurns(jailTurns);
            gameRedisService.savePlayerState(roomId, userName, player);

            // 게임 상태 업데이트
            CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
            if (gameState != null && gameState.getPlayers() != null) {
                gameState.getPlayers().put(userName, player);
                gameRedisService.saveGameMapState(roomId, gameState);
            }
            //TODO 사용자들에게 플레이어가 감옥에 갔다는 정보를 보내야 할 거 같음.
        }
    }

    /**
     * 세계여행 이벤트 처리
     */
    public void handleWorldTravelEvent(WebSocketSession session, WorldTravelRequest worldTravelRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 게임 맵 정보
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        
        // 2. 여행 하려는 사람 정보
        CreateMapPayload.PlayerState traveler = gameState.getPlayers().get(worldTravelRequest.getUserName());
        if (traveler == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        //3. 출발지 도착지 정보
        int startPosition = traveler.getPosition();
        int endPosition = worldTravelRequest.getDestination();

        // 4. 도착지점의 땅 정보 확인
        String landOwner = null;
        int tollAmount = 0;
        CreateMapPayload.PlayerState owner = null;

        // 4.1 만약 해당 땅에 주인이 있다면
        if (gameState.getCurrentMap().getCells().get(endPosition).getOwnerName() != null) {
            landOwner = gameState.getCurrentMap().getCells().get(endPosition).getOwnerName();
            tollAmount = gameState.getCurrentMap().getCells().get(endPosition).getToll();
            owner = gameState.getPlayers().get(landOwner);
        }

        // 5. 통행료 처리 및 위치 업데이트
        if (landOwner != null && owner != null) {
            // 통행료 지불
            if (traveler.getMoney() >= tollAmount) {
                traveler.setMoney(traveler.getMoney() - tollAmount);
                owner.setMoney(owner.getMoney() + tollAmount);
                // 여행자 위치 업데이트
                traveler.setPosition(endPosition);
            } else {
                // TODO: 파산 로직 구현 필요
                return;
            }
        } else {
            // 땅 주인이 없으면 바로 이동
            traveler.setPosition(endPosition);
        }

        // 6. 게임 상태 저장
        gameRedisService.saveGameMapState(roomId, gameState);


        // 8. 결과 메시지 전송
        WorldTravelPayload payload = WorldTravelPayload.builder()
                .result(true)
                .userName(worldTravelRequest.getUserName())
                .startLand(startPosition)
                .endLand(endPosition)
                .landOwner(landOwner)
                .tollAmount(tollAmount)
                .travelerAsset(
                        ConstructPayload.Asset.builder()
                                .money(traveler.getMoney())
                                .lands(traveler.getOwnedProperties() != null ? traveler.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .ownerAsset(
                        owner != null ? ConstructPayload.Asset.builder()
                                .money(owner.getMoney())
                                .lands(owner.getOwnedProperties() != null ? owner.getOwnedProperties() : new ArrayList<>())
                                .build()
                                : null
                )
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.WORLD_TRAVEL_EVENT, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }
}
