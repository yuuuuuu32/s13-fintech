package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.EconomicEffectUpdatePayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
@Slf4j
@RequiredArgsConstructor
public class EconomicHistoryService {

    private final GameRedisService gameRedisService;
    private final SessionMessageService sessionMessageService;
    private final ObjectMapper objectMapper;

    /**
     * 게임방의 현재 경제 효과 템플릿 조회 또는 초기화
     */
    public EconomicEffect getCurrentEconomicEffect(Long gameTurn) {
        EconomicEffect.EconomicPeriod currentPeriod = EconomicEffect.calculatePeriodFromTurn(gameTurn.intValue());
        
        // 2턴마다 경제 효과가 바뀌므로, 턴을 2로 나눈 몫을 시드로 사용
        int boomSeed = (int) (gameTurn / 2);
        Random boomRandom = new Random(boomSeed);
        boolean isBoom = boomRandom.nextBoolean();
        
        return EconomicEffect.getRandomTemplate(currentPeriod, isBoom);
    }

    /**
     * 게임방의 경제 효과가 반영된 가격들을 플레이어에게 적용
     */
    public void applyAndSaveEconomicEffectsForAllPlayers(String roomId, CreateMapPayload gameState) {
        EconomicEffect currentEffect = getCurrentEconomicEffect(gameState.getGameTurn());

        // 모든 플레이어에게 경제 효과 실제 적용
        applyEconomicEffectsToAllPlayers(gameState, currentEffect);

        // 변경된 게임 상태를 Redis에 저장
        gameRedisService.saveGameMapStateWithEconomicEffect(roomId, gameState, currentEffect);

        // 경제 효과 정보와 모든 타일 정보를 포함한 패킷 전송
        sendEconomicEffectUpdateMessage(roomId, gameState, currentEffect);
    }


    /**
     * 특정 효과로 월급 계산
     */
    public int calculateSalaryWithEffect(int baseSalary, Long gameTurn) {
        EconomicEffect currentEffect = getCurrentEconomicEffect(gameTurn);
        return currentEffect.applySalaryMultiplier(baseSalary);
    }

    /**
     * 특정 효과로 부동산 가격 계산
     */
    public Long calculatePropertyPriceWithEffect(Long basePrice, Long gameTurn) {
        EconomicEffect currentEffect = getCurrentEconomicEffect(gameTurn);
        return currentEffect.applyPropertyPriceMultiplier(basePrice);
    }

    /**
     * 특정 효과로 건물 건설 비용 계산
     */
    public Long calculateBuildingCostWithEffect(Long baseCost, Long gameTurn) {
        EconomicEffect currentEffect = getCurrentEconomicEffect(gameTurn);
        return currentEffect.applyBuildingCostMultiplier(baseCost);
    }

    /**
     * 모든 플레이어와 타일에 경제 효과 실제 적용
     */
    private void applyEconomicEffectsToAllPlayers(CreateMapPayload gameState, EconomicEffect currentEffect) {
        if (gameState == null) {
            log.warn("게임 상태가 null이어서 경제 효과를 적용할 수 없습니다.");
            return;
        }

        // 1. 맵의 모든 타일에 부동산/건물 가격 효과 적용
        if (gameState.getCurrentMap() != null && gameState.getCurrentMap().getCells() != null) {
            for (Tile tile : gameState.getCurrentMap().getCells()) {
                if (tile.getType() == Tile.TileType.NORMAL) {
                    applyEconomicEffectToTile(tile, currentEffect);
                }
            }
        }
    }

    /**
     * 개별 타일에 경제 효과 적용 (기본 가격에서 배수 적용)
     */
    private void applyEconomicEffectToTile(Tile tile, EconomicEffect currentEffect) {
        // 부동산 가격 적용
        Long originalLandPrice = tile.getLandPrice();
        if (originalLandPrice > 0) {
            Long newLandPrice = currentEffect.applyPropertyPriceMultiplier(originalLandPrice);
            tile.setLandPrice(newLandPrice);
        }

        // 건물 건설 비용 적용
        Long originalHousePrice = tile.getHousePrice();
        if (originalHousePrice > 0) {
            Long newHousePrice = currentEffect.applyBuildingCostMultiplier(originalHousePrice);
            tile.setHousePrice(newHousePrice);
        }

        Long originalBuildingPrice = tile.getBuildingPrice();
        if (originalBuildingPrice > 0) {
            Long newBuildingPrice = currentEffect.applyBuildingCostMultiplier(originalBuildingPrice);
            tile.setBuildingPrice(newBuildingPrice);
        }

        Long originalHotelPrice = tile.getHotelPrice();
        if (originalHotelPrice > 0) {
            Long newHotelPrice = currentEffect.applyBuildingCostMultiplier(originalHotelPrice);
            tile.setHotelPrice(newHotelPrice);
        }
    }

    /**
     * 경제 효과 정보와 모든 타일 정보를 포함한 패킷 전송
     */
    private void sendEconomicEffectUpdateMessage(String roomId, CreateMapPayload gameState, EconomicEffect currentEffect) {
        try {
            EconomicEffectUpdatePayload payload = EconomicEffectUpdatePayload.fromGameState(gameState, currentEffect);

            JsonNode payloadNode = objectMapper.valueToTree(payload);
            MessageDto message = new MessageDto(MessageType.ECONOMIC_HISTORY_UPDATE, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, message);
            log.info("경제 효과 업데이트 메시지 전송 완료: roomId={}, effect={}, period={}", 
                    roomId, currentEffect.getEffectName(), currentEffect.getPeriod().getDisplayName());

        } catch (Exception e) {
            log.error("경제 효과 업데이트 메시지 전송 실패: roomId={}", roomId, e);
        }
    }

}