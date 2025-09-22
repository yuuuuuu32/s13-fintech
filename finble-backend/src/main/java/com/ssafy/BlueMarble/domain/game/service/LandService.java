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
    private final EconomicHistoryService economicHistoryService;
    private final VictoryService victoryService;

    /**
     * 땅 구매
     */
    @Transactional
    public void tradeLand(WebSocketSession session, TradeLandRequest tradeLandRequest) {
        String roomId = roomService.getRoom(session.getId());

        log.info("[TRADE] roomId={}, buyerName={}, landNum={}", roomId, tradeLandRequest.getBuyerName(), tradeLandRequest.getLandNum());

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
        log.info("[TRADE] buyerUserId={}, buyerNickname={}, buyerMoney(before)={}", buyerUserId, buyer.getNickname(), buyer.getMoney());

        // 4. 구매하려는 땅의 정보를 찾는다.
        Tile targetCell = mapData.getCells().get(tradeLandRequest.getLandNum());

        // 4.1 경제역사 효과를 적용한 실제 가격 계산
        Long basePrice = targetCell.getToll();
        ;
        Long actualPrice = economicHistoryService.calculatePropertyPriceWithEffect(basePrice, gameState.getGameTurn());
        log.info("[TRADE] 경제역사 효과 적용: 기본가격={}, 적용가격={}",
                basePrice, actualPrice);

        log.info("[TRADE] targetCell: cellNumber={}, ownerName(before)={}, baseToll={}, actualPrice={}, type={}",
                targetCell.getCellNumber(), targetCell.getOwnerName(), targetCell.getToll(), actualPrice, targetCell.getType());
        if (targetCell.getCellNumber() != tradeLandRequest.getLandNum()) {
            log.warn("[TRADE][WARN] landNum mismatch: req.landNum={}, cell.cellNumber={}", tradeLandRequest.getLandNum(), targetCell.getCellNumber());
        }

        // 5. 땅이 이미 소유되어 있는지 확인
        String currentOwner = targetCell.getOwnerName();
        if (currentOwner != null) {
            // 이미 소유된 땅인 경우
            String sellerUserId = userRedisService.getUserIdByNickname(currentOwner);
            if (sellerUserId == null) {
                throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
            }

            // 판매자의 자산 정보를 가져온다.
            CreateMapPayload.PlayerState seller = gameState.getPlayers().get(sellerUserId);
            log.info("[TRADE] sellerUserId={}, sellerNickname={}, sellerMoney(before)={}", sellerUserId, seller.getNickname(), seller.getMoney());

            // 판매자가 실제로 해당 땅을 소유하고 있는지 확인
            if (!seller.getOwnedProperties().contains(tradeLandRequest.getLandNum())) {
                throw new BusinessException(BusinessError.LAND_NOT_FOUND);
            }

            // 구매자 잔액 확인 (경제역사 효과 적용된 가격)
            if (buyer.getMoney() < actualPrice) {
                throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
            }

            // 판매자의 자산 업데이트 (경제역사 효과 적용된 가격)
            log.info("[TRADE] transfer price={}, from buyer {} to seller {}", actualPrice, buyer.getNickname(), seller.getNickname());
            seller.setMoney(seller.getMoney() + actualPrice);
            log.info("[TRADE] sellerMoney(after)={}, sellerOwnedProps(before)={}", seller.getMoney(), seller.getOwnedProperties());
            if (seller.getOwnedProperties() != null) {
                seller.getOwnedProperties().remove(Integer.valueOf(targetCell.getCellNumber()));
                log.info("[TRADE] sellerOwnedProps(after)={}", seller.getOwnedProperties());
            }
        } else {
            // 소유되지 않은 땅인 경우 거래가 불가능함
            throw new BusinessException(BusinessError.CANNOT_TRADE);
        }

        // 6. 땅 주인을 구매자로 변경
        String prevOwner = targetCell.getOwnerName();
        targetCell.setOwnerName(tradeLandRequest.getBuyerName());
        log.info("[TRADE] owner changed: {} -> {}", prevOwner, tradeLandRequest.getBuyerName());

        // 7. 구매자의 자산 업데이트 (경제역사 효과 적용된 가격)
        buyer.setMoney(buyer.getMoney() - actualPrice);
        log.info("[TRADE] buyerMoney(after)={}, paidAmount={}", buyer.getMoney(), actualPrice);
        if (buyer.getOwnedProperties() == null) {
            buyer.setOwnedProperties(new ArrayList<>());
        }
        buyer.getOwnedProperties().add(targetCell.getCellNumber());
        log.info("[TRADE] buyerOwnedProps(after)={}", buyer.getOwnedProperties());

        // 8. 업데이트된 상태를 Redis에 저장
        log.info("[TRADE] saving game state to redis: roomId={}", roomId);
        gameRedisService.saveGameMapState(roomId, gameState);
        log.info("[TRADE] saved game state. players snapshot={}", gameState.getPlayers());

        // 9. 다른 플레이어들에게 땅 구매 알림 전송 (경제역사 효과 적용된 가격 정보 포함)
        TradeLandPayload payload = TradeLandPayload.builder()
                .result(true)
                .players(gameState.getPlayers())
                .actualPrice(actualPrice)
                .basePrice(basePrice)
                .buyerName(tradeLandRequest.getBuyerName())
                .landNum(tradeLandRequest.getLandNum())
                .build();
        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.TRADE_LAND, payloadNode);
        log.info("[TRADE] broadcast TRADE_LAND message sent to roomId={}", roomId);
        sessionMessageService.sendMessageToRoom(roomId, message);

        // 10. 토지 거래 후 승리 조건 체크 (모든 승리 조건 통합 체크)
        victoryService.checkAllVictoryConditions(roomId, gameState);
    }

    /**
     * 건설
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

        //3.0 특별 땅이라면 건물을 지을 수 없음
        if (targetCell.getType().equals(Tile.TileType.SPECIAL)) {
            throw new BusinessException(BusinessError.SPECIAL_CANNOT_BUILD);
        }

        //3.0.1 목표 건물 타입까지의 총 건설 비용 계산
        Tile.BuildingType currentType = targetCell.getBuildingType();
        Tile.BuildingType targetType = constructRequest.getTargetBuildingType();

        Long totalBuildingCost = calculateTotalConstructCost(targetType, targetCell);
        log.info("[CONSTRUCT] 건설 비용 계산: {} -> {} = {} (Redis에서 가져온 경제효과 적용된 비용)",
                currentType, targetType, totalBuildingCost);

        //3.1 유효성 검사
        // 현재 건물 타입보다 높은 타입만 건설 가능
        if (targetType.ordinal() <= currentType.ordinal()) {
            throw new BusinessException(BusinessError.INVALID_BUILDING_TYPE);
        }

        // 최대 건물 타입 제한 (HOTEL까지만)
        if (currentType == Tile.BuildingType.HOTEL) {
            throw new BusinessException(BusinessError.MAX_BUILDING_REACHED);
        }

        // 건설 자금이 충분한지 확인
        if (totalBuildingCost > user.getMoney()) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }
        //3.1 이땅의 주인이 없는지 체크
        if (targetCell.getOwnerName().equals(user.getNickname())) {
            // TODO : 땅의 주인이 없다면 구매하도록 유도함
            throw new BusinessException(BusinessError.LAND_NOT_FOUND);
        }
        //3.2 건설하려는 땅을 소유하고 있는가?
        if (!targetCell.getOwnerName().equals(constructRequest.getNickname())) {
            throw new BusinessException(BusinessError.INSUFFICIENT_MONEY);
        }

        //3.3 건물 타입을 목표 타입으로 변경
        targetCell.setBuildingType(targetType);
        log.info("[CONSTRUCT] 건물 타입 변경: {} -> {}", currentType, targetType);

        // 3.4 건설 비용 차감 (총 건설 비용)
        user.setMoney(user.getMoney() - totalBuildingCost);
        log.info("[CONSTRUCT] 건설 비용 차감: 잔액={}, 차감액={}", user.getMoney(), totalBuildingCost);

        //4. 업데이트된 상태를 Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);
        //5. 메시지 전달 (경제역사 효과 적용된 건설 비용 정보 포함)
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
                .actualBuildingCost(totalBuildingCost)
                .baseBuildingCost(targetCell.getToll())
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.CONSTRUCT_BUILDING, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }

    /**
     * 현재 건물 타입에서 목표 건물 타입까지의 총 건설 비용 계산
     */
    private Long calculateTotalConstructCost(Tile.BuildingType target,
                                            Tile targetCell) {
        Tile.BuildingType current = targetCell.getBuildingType();

        Long totalCost = 0L;

        // 현재 타입 다음부터 목표 타입까지의 각 단계 비용 계산
        for (int i = current.ordinal() + 1; i <= target.ordinal(); i++) {
            Tile.BuildingType buildingType = Tile.BuildingType.values()[i];
            Long stepCost = getBuildingCostFromTile(buildingType, targetCell);
            totalCost += stepCost;

            log.info("[CONSTRUCT] 단계별 비용: {} -> {} = {} (Redis에서 가져온 경제효과 적용된 비용)",
                    Tile.BuildingType.values()[i - 1], buildingType, stepCost);
        }

        return totalCost;
    }

    /**
     * Tile에서 건물 타입별 건설 비용 가져오기 (이미 경제 효과가 적용된 비용)
     */
    private Long getBuildingCostFromTile(Tile.BuildingType buildingType, Tile tile) {
        switch (buildingType) {
            case VILLA:
                return tile.getHousePrice();
            case BUILDING:
                return tile.getBuildingPrice();
            case HOTEL:
                return tile.getHotelPrice();
            default:
                return 0L;
        }
    }
}
