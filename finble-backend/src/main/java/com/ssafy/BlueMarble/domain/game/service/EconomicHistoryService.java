package com.ssafy.BlueMarble.domain.game.service;

import com.ssafy.BlueMarble.domain.game.entity.EconomicEffectTemplate;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

@Service
@Slf4j
@RequiredArgsConstructor
public class EconomicHistoryService {

    private final Random random = new Random();
    private final GameRedisService gameRedisService;

    /**
     * 턴 기반으로 경제역사 시대 계산
     */
    public EconomicEffectTemplate.EconomicPeriod calculateCurrentPeriod(int gameTurn) {
        return EconomicEffectTemplate.calculatePeriodFromTurn(gameTurn);
    }

    /**
     * 다음 시대까지 남은 턴 수 계산
     */
    public int getTurnsUntilNextPeriod(int gameTurn) {
        return EconomicEffectTemplate.getTurnsUntilNextPeriod(gameTurn);
    }

    /**
     * 게임방의 현재 경제 효과 템플릿 조회 또는 초기화
     */
    public EconomicEffectTemplate getCurrentEconomicEffect(String roomId, Long gameTurn) {
        EconomicEffectTemplate.EconomicPeriod currentPeriod = calculateCurrentPeriod(gameTurn.intValue());
        boolean isBoom = random.nextBoolean();
        return EconomicEffectTemplate.getRandomTemplate(currentPeriod, isBoom);
    }

    /**
     * 게임방의 경제 효과가 반영된 가격들을 플레이어에게 적용
     */
    public void applyAndSaveEconomicEffectsForAllPlayers(String roomId, CreateMapPayload gameState) {
        EconomicEffectTemplate currentEffect = getCurrentEconomicEffect(roomId, gameState.getGameTurn());

        // 모든 플레이어에게 경제 효과 실제 적용
        applyEconomicEffectsToAllPlayers(gameState, currentEffect);

        // 변경된 게임 상태를 Redis에 저장
        gameRedisService.saveGameMapStateWithEconomicEffect(roomId, gameState, currentEffect);
    }


    /**
     * 특정 효과로 월급 계산
     */
    public int calculateSalaryWithEffect(String roomId, int baseSalary) {
        EconomicEffectTemplate currentEffect = getCurrentEconomicEffect(roomId, 0L); // gameTurn은 임시로 0 사용
        return currentEffect.applySalaryMultiplier(baseSalary);
    }

    /**
     * 특정 효과로 부동산 가격 계산
     */
    public int calculatePropertyPriceWithEffect(String roomId, int basePrice) {
        EconomicEffectTemplate currentEffect = getCurrentEconomicEffect(roomId, 0L); // gameTurn은 임시로 0 사용
        return currentEffect.applyPropertyPriceMultiplier(basePrice);
    }

    /**
     * 특정 효과로 건물 건설 비용 계산
     */
    public int calculateBuildingCostWithEffect(String roomId, int baseCost) {
        EconomicEffectTemplate currentEffect = getCurrentEconomicEffect(roomId, 0L); // gameTurn은 임시로 0 사용
        return currentEffect.applyBuildingCostMultiplier(baseCost);
    }

    /**
     * 모든 플레이어와 타일에 경제 효과 실제 적용
     */
    private void applyEconomicEffectsToAllPlayers(CreateMapPayload gameState, EconomicEffectTemplate currentEffect) {
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
    private void applyEconomicEffectToTile(Tile tile, EconomicEffectTemplate currentEffect) {
        // 부동산 가격 적용
        int originalLandPrice = tile.getLandPrice();
        if (originalLandPrice > 0) {
            int newLandPrice = currentEffect.applyPropertyPriceMultiplier(originalLandPrice);
            tile.setLandPrice(newLandPrice);
        }

        // 건물 건설 비용 적용
        int originalHousePrice = tile.getHousePrice();
        if (originalHousePrice > 0) {
            int newHousePrice = currentEffect.applyBuildingCostMultiplier(originalHousePrice);
            tile.setHousePrice(newHousePrice);
        }

        int originalBuildingPrice = tile.getBuildingPrice();
        if (originalBuildingPrice > 0) {
            int newBuildingPrice = currentEffect.applyBuildingCostMultiplier(originalBuildingPrice);
            tile.setBuildingPrice(newBuildingPrice);
        }

        int originalHotelPrice = tile.getHotelPrice();
        if (originalHotelPrice > 0) {
            int newHotelPrice = currentEffect.applyBuildingCostMultiplier(originalHotelPrice);
            tile.setHotelPrice(newHotelPrice);
        }
    }

}