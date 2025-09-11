package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.dto.MapCell;
import com.ssafy.BlueMarble.domain.game.dto.request.ConstructRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.TradeLandRequest;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.ConstructPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.TradeLandPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class LandService {

    private final GameRedisService gameRedisService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService sessionMessageService;
    private final UserRedisService userRedisService;

    /**
     * 땅 구매
     */
    @Transactional
    public void tradeLand(WebSocketSession session, TradeLandRequest tradeLandRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 맵 데이터를 가져온다.
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        GameMap mapData = gameState.getCurrentMap();

        // 2. 구매자, 판매자의 자산 정보를 가져온다.
        String buyerId = userRedisService.getUserIdByNickname(tradeLandRequest.getBuyerName());
        String sellerId = userRedisService.getUserIdByNickname(tradeLandRequest.getLandOwner());
        CreateMapPayload.PlayerState buyer = gameState.getPlayers().get(buyerId);
        CreateMapPayload.PlayerState seller = gameState.getPlayers().get(sellerId);

        log.info("buyer={} seller={}", buyer, seller);


        // 3. 구매하려는 땅의 정보를 찾는다.
        MapCell targetCell = mapData.getCells().get(tradeLandRequest.getLandNum());

        // 4. 만약 판매자가 땅을 가지고 있지 않다면
        if (!seller.getOwnedProperties().contains(tradeLandRequest.getLandNum())) {
            throw new BusinessException(BusinessError.LAND_NOT_FOUND);
        }

        // 5. 구매자 잔액 확인
        if (buyer.getMoney() <= targetCell.getToll()) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }

        // 6. 땅 주인을 구매자로 변경
        targetCell.setOwnerName(tradeLandRequest.getBuyerName());

        // 7. 구매자의 자산 업데이트
        buyer.setMoney(buyer.getMoney() - targetCell.getToll());
        if (buyer.getOwnedProperties() == null) {
            buyer.setOwnedProperties(new ArrayList<>());
        }
        buyer.getOwnedProperties().add(targetCell.getCellNumber());

        // 8 판매자의 자산 업데이트 (판매자가 있는 경우)
        if (!tradeLandRequest.getLandOwner().equals("null")) {
            seller.setMoney(seller.getMoney() + targetCell.getToll());
            if (seller.getOwnedProperties() != null) {
                seller.getOwnedProperties().remove(Integer.valueOf(targetCell.getCellNumber()));
            }
        }

        // 9. 업데이트된 상태를 Redis에 저장
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

    /**
     * 건설
     *
     */
    @Transactional
    public void constructBuilding(WebSocketSession session, ConstructRequest constructRequest) {
        //1. 건설 하려는 사람의 정보를 가져온다.
        String roomId = roomService.getRoom(session.getId());
        String userId = userRedisService.getUserIdByNickname(constructRequest.getNickname());

        log.info("[CONSTRUCT] roomId={}, req.nickname={}, mapped.userId={}", roomId, constructRequest.getNickname(), userId);
        //2. 맵 정보를 가져온다.
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        CreateMapPayload.PlayerState user = gameState.getPlayers().get(userId);

        if (gameState != null && gameState.getPlayers() != null) {
            log.info("[CONSTRUCT] players keys(userIds)={}", gameState.getPlayers().keySet());
            log.info("[CONSTRUCT] players={}", gameState.getPlayers());
        }
        log.info("[CONSTRUCT] player null? {}", user == null);
        GameMap mapData = gameState.getCurrentMap();
        //3. 건설시도 ( 건설 자금이 충분한지 / 현재 건설하려는 땅을 소유하고 있는지 체크해야함)
        MapCell targetCell = mapData.getCells().get(constructRequest.getLandNum());

        //3.1 건설 자금이 충분한지
        if (targetCell.getToll() * 10 > user.getMoney()) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }
        //3.1 이땅의 주인이 없는지 체크
        if (targetCell.getOwnerName() == null) {
            // TODO : 땅의 주인이 없다면 구매하도록 유도함
            throw new BusinessException(BusinessError.LAND_NOT_FOUND);
        }
        //3.2 건설하려는 땅을 소유하고 있는가?
        if (!targetCell.getOwnerName().equals(constructRequest.getNickname())) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }

        MapCell.BuildingType curType = targetCell.getBuildingType();

        switch (curType) {
            case BUILDING:
                targetCell.setBuildingType(MapCell.BuildingType.HOTEL);
                break;
            case VILLA:
                targetCell.setBuildingType(MapCell.BuildingType.BUILDING);
                break;
            case HOTEL:
                break;
        }

        //4. 업데이트된 상태를 Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);
        //5. 메시지 전달
        ConstructPayload payload = ConstructPayload.builder()
                .result(true)
                .nickname(constructRequest.getNickname())
                .landNum(constructRequest.getLandNum())
                .buildingType(targetCell.getBuildingType())
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(user.getMoney())
                                .lands(user.getOwnedProperties())
                                .build()
                )
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.CONSTRUCT_BUILDING, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }
}
