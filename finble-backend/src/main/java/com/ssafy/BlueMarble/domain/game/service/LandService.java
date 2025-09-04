package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.dto.MapCell;
import com.ssafy.BlueMarble.domain.game.dto.request.TradeLand;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.TradeLandPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class LandService {

    private final GameRedisService gameRedisService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService  sessionMessageService;
    /**
     * 땅 구매
     */
    @Transactional
    public void tradeLand(WebSocketSession session, TradeLand tradeLand) {
        String roomId = roomService.getRoom(session.getId());
        
        // 1. 구매자, 판매자의 자산 정보를 가져온다.
        CreateMapPayload.PlayerState buyer = gameRedisService.getPlayerState(roomId, tradeLand.getBuyerName());
        CreateMapPayload.PlayerState seller = gameRedisService.getPlayerState(roomId, tradeLand.getLandOwner());
        
        // 2. 맵 데이터를 가져온다.
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        GameMap mapData = gameState.getCurrentMap();
        
        // 3. 구매하려는 땅의 정보를 찾는다.
        MapCell targetCell = mapData.getCells().get(tradeLand.getLandNum());

        // 만약 판매자가 땅을 가지고 있지 않다면
        if (!seller.getOwnedProperties().contains(tradeLand.getLandNum())) {
            throw new BusinessException(BusinessError.LAND_NOT_FOUND);
        }

        // 4. 구매자 잔액 확인
        if (buyer.getMoney() <= targetCell.getToll()) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }
        
        // 5. 땅 주인을 구매자로 변경
        targetCell.setOwnerName(tradeLand.getBuyerName());
        
        // 6. 구매자의 자산 업데이트
        buyer.setMoney(buyer.getMoney() - targetCell.getToll());
        if (buyer.getOwnedProperties() == null) {
            buyer.setOwnedProperties(new ArrayList<>());
        }
        buyer.getOwnedProperties().add(targetCell.getCellNumber());
        
        // 7. 판매자의 자산 업데이트 (판매자가 있는 경우)
        if (!tradeLand.getLandOwner().equals("null")) {
            seller.setMoney(seller.getMoney() + targetCell.getToll());
            if (seller.getOwnedProperties() != null) {
                seller.getOwnedProperties().remove(Integer.valueOf(targetCell.getCellNumber()));
            }
        }
        
        // 8. 업데이트된 상태를 Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);
        
        // 10. 다른 플레이어들에게 땅 구매 알림 전송
        TradeLandPayload payload = TradeLandPayload.builder()
                .result(true)
                .players(gameState.getPlayers())
                .build();
        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.TRADE_LAND, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }
}
