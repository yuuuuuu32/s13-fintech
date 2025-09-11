package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.request.JailRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.WorldTravelRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.UseDiceRequest;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.JailPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.ConstructPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.WorldTravelPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.UseDicePayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final GameRedisService gameRedisService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService sessionMessageService;
    private final CardService cardService;
    private final Random random = new Random();
    
    // 찬스 칸 위치 정의 (data.sql 참고)
    private static final int[] CHANCE_POSITIONS = {3, 11, 19, 27};
    
    /**
     * 해당 위치가 찬스 칸인지 확인
     */
    private boolean isChancePosition(int position) {
        for (int chancePos : CHANCE_POSITIONS) {
            if (chancePos == position) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * userName(nickname)을 통해 userId를 찾는 메서드
     */
    private String getUserIdByNickname(CreateMapPayload gameMapState, String userName) {
        return gameMapState.getPlayers().entrySet().stream()
                .filter(entry -> userName.equals(entry.getValue().getNickname()))
                .map(entry -> entry.getKey())
                .findFirst()
                .orElse(null);
    }

    /**
     * 감옥 이벤트 처리
     */
    public void handleJailEvent(WebSocketSession session, JailRequest jailRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 게임 상태 및 플레이어 ID 조회
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        String userId = getUserIdByNickname(gameState, jailRequest.getUserName());
        if (userId == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        // 2. 플레이어 상태 조회
        CreateMapPayload.PlayerState player = gameState.getPlayers().get(userId);
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
        gameState.getPlayers().put(userId, player);
        gameRedisService.saveGameMapState(roomId, gameState);

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
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        String userId = getUserIdByNickname(gameState, userName);
        if (userId == null) {
            return;
        }
        CreateMapPayload.PlayerState player = gameState.getPlayers().get(userId);
        if (player != null) {
            player.setInJail(true);
            player.setJailTurns(jailTurns);
            gameState.getPlayers().put(userId, player);
            gameRedisService.saveGameMapState(roomId, gameState);
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
        
        // 2. 여행 하려는 사람 ID 및 정보 조회
        String travelerId = getUserIdByNickname(gameState, worldTravelRequest.getUserName());
        if (travelerId == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }
        CreateMapPayload.PlayerState traveler = gameState.getPlayers().get(travelerId);

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

    /**
     * 주사위 사용 이벤트 처리
     */
    public void handleUseDiceEvent(WebSocketSession session, UseDiceRequest useDiceRequest) {
        String roomId = roomService.getRoom(session.getId());
        
        // 1. 게임 맵 정보
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        
        // 2. 주사위 사용자 ID 및 정보 조회
        String userId = getUserIdByNickname(gameState, useDiceRequest.getUserName());
        if (userId == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }
        CreateMapPayload.PlayerState player = gameState.getPlayers().get(userId);

        // 3. 주사위 던지기
        int diceNum = random.nextInt(6) + 1;
        
        // 4. 위치 계산
        int currentPosition = player.getPosition();
        int newPosition = (currentPosition + diceNum) % 32; // 32개 칸 순환
        
        // 5. 시작점 통과 여부
        int salaryBonus = 0;
        if (newPosition < currentPosition) { // 시작점을 통과했는지 확인
            salaryBonus = 1000; // 월급
            player.setMoney(player.getMoney() + salaryBonus);
        }
        
        // 6. 새로운 위치로 이동
        player.setPosition(newPosition);
        
        // 7. 도착한 땅 정보 확인
        String landOwner = null;
        int tollAmount = 0;
        boolean canBuyLand = false;
        
        if (gameState.getCurrentMap().getCells().get(newPosition).getOwnerName() != null) {
            
            landOwner = gameState.getCurrentMap().getCells().get(newPosition).getOwnerName();
            tollAmount = gameState.getCurrentMap().getCells().get(newPosition).getToll();
            
            // 8. 통행료 지불
            if (player.getMoney() >= tollAmount) {
                player.setMoney(player.getMoney() - tollAmount);
                
                // 소유자에게 통행료 지급
                CreateMapPayload.PlayerState owner = gameState.getPlayers().get(landOwner);
                if (owner != null) {
                    owner.setMoney(owner.getMoney() + tollAmount);
                }
            }
        } else {
            // 땅이 비어있으면 구매 가능
            canBuyLand = true;
        }
        
        // 9. 찬스 칸 확인 및 자동 카드 뽑기
        DrawCardPayload.DrawCardResult cardResult = null;
        if (isChancePosition(newPosition)) {
            log.info("플레이어가 찬스 칸에 도착: position={}, userName={}", newPosition, useDiceRequest.getUserName());
            // 주사위 결과를 먼저 저장
            gameRedisService.saveGameMapState(roomId, gameState);
            // 카드 뽑기 (내부에서 상태 변경 및 저장)
            cardResult = cardService.drawCard(roomId, useDiceRequest.getUserName());
            // 카드 효과가 적용된 최신 게임 상태를 다시 불러옴
            gameState = gameRedisService.getGameMapState(roomId);
            player = gameState.getPlayers().get(userId);
        } else {
            // 찬스 칸이 아니면, 주사위 이동 및 통행료 결과만 저장
            gameRedisService.saveGameMapState(roomId, gameState);
        }
        
        // 11. 결과 메시지 전송
        UseDicePayload payload = UseDicePayload.builder()
                .userName(useDiceRequest.getUserName())
                .diceNum(diceNum)
                .currentPosition(newPosition)
                .salaryBonus(salaryBonus)
                .canBuyLand(canBuyLand)
                .tollAmount(tollAmount)
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(player.getMoney())
                                .lands(player.getOwnedProperties() != null ? player.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .build();
        
        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.USE_DICE, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
        
        // 12. 찬스 카드 결과가 있으면 별도 메시지 전송
        if (cardResult != null) {
            DrawCardPayload cardPayload = DrawCardPayload.builder()
                    .userName(useDiceRequest.getUserName())
                    .result(cardResult)
                    .build();
            
            JsonNode cardPayloadNode = objectMapper.valueToTree(cardPayload);
            MessageDto cardMessage = new MessageDto(MessageType.DRAW_CARD, cardPayloadNode);
            sessionMessageService.sendMessageToRoom(roomId, cardMessage);
            
            log.info("찬스 칸 자동 카드 뽑기 완료: userName={}, cardName={}", 
                    useDiceRequest.getUserName(), cardResult.getCardName());
        }
    }
}
