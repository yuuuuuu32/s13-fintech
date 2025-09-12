package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
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

        // 1. 구매자 userId 가져옴
        String buyerUserId = userRedisService.getUserIdByNickname(tradeLandRequest.getBuyerName());
        if (buyerUserId == null) {
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
        }

        // 2. 맵 데이터를 가져온다.
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        GameMap mapData = gameState.getCurrentMap();

        // 3. 구매자의 자산 정보를 가져온다.
        CreateMapPayload.PlayerState buyer = gameState.getPlayers().get(buyerUserId);

        // 4. 구매하려는 땅의 정보를 찾는다.
        Tile targetCell = mapData.getCells().get(tradeLandRequest.getLandNum());

        // 5. 땅이 이미 소유되어 있는지 확인
        String currentOwner = targetCell.getOwnerName();
        if (currentOwner != null) {
            // 이미 소유된 땅인 경우, 판매자의 닉네임을 userId로 변환
            String sellerUserId = userRedisService.getUserIdByNickname(currentOwner);
            if (sellerUserId == null) {
                throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
            }
            
            // 판매자의 자산 정보를 가져온다.
            CreateMapPayload.PlayerState seller = gameState.getPlayers().get(sellerUserId);
            if (seller == null) {
                throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
            }

            // 판매자가 실제로 해당 땅을 소유하고 있는지 확인
            if (!seller.getOwnedProperties().contains(tradeLandRequest.getLandNum())) {
                throw new BusinessException(BusinessError.LAND_NOT_FOUND);
            }

            // 구매자 잔액 확인
            if (buyer.getMoney() < targetCell.getToll()) {
                throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
            }

            // 판매자의 자산 업데이트
            seller.setMoney(seller.getMoney() + targetCell.getToll());
            if (seller.getOwnedProperties() != null) {
                seller.getOwnedProperties().remove(Integer.valueOf(targetCell.getCellNumber()));
            }
        } else {
            // 소유되지 않은 땅인 경우, 땅 가격으로 구매
            if (buyer.getMoney() < targetCell.getToll()) {
                throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
            }
        }

        // 6. 땅 주인을 구매자로 변경
        targetCell.setOwner(tradeLandRequest.getBuyerName());

        // 7. 구매자의 자산 업데이트
        buyer.setMoney(buyer.getMoney() - targetCell.getToll());
        if (buyer.getOwnedProperties() == null) {
            buyer.setOwnedProperties(new ArrayList<>());
        }
        buyer.getOwnedProperties().add(targetCell.getCellNumber());

        // 8. 업데이트된 상태를 Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);

        // 9. 다른 플레이어들에게 땅 구매 알림 전송
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
        Tile targetCell = mapData.getCells().get(constructRequest.getLandNum());

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

        Tile.BuildingType curType = targetCell.getBuildingType();

        switch (curType) {
            case BUILDING:
                targetCell.setBuildingType(Tile.BuildingType.HOTEL);
                break;
            case VILLA:
                targetCell.setBuildingType(Tile.BuildingType.BUILDING);
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
