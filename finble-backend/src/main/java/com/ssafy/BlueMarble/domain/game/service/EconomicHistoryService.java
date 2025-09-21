package com.ssafy.BlueMarble.domain.game.service;

import com.ssafy.BlueMarble.domain.game.entity.EconomicEffectTemplate;
import com.ssafy.BlueMarble.domain.game.entity.RoomEconomicState;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

/**
 * 경제역사 효과 서비스 (Enum 기반 최적화 버전)
 * - 템플릿 데이터: EconomicEffectTemplate Enum 사용
 * - 런타임 데이터: Redis를 통한 RoomEconomicState 관리
 * - DB 의존성 완전 제거
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EconomicHistoryService {

    private final Random random = new Random();
    private final TileRepository tileRepository;
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
     * 게임방의 경제 효과 초기화 및 Redis 저장
     */
    public RoomEconomicState initializeRoomEconomicState(String roomId, Long gameTurn) {
        EconomicEffectTemplate.EconomicPeriod currentPeriod = calculateCurrentPeriod(gameTurn.intValue());
        boolean isBoom = random.nextBoolean();
        EconomicEffectTemplate template = EconomicEffectTemplate.getRandomTemplate(currentPeriod, isBoom);
        int remainingTurns = getTurnsUntilNextPeriod(gameTurn.intValue());

        RoomEconomicState roomState = RoomEconomicState.builder()
                .roomId(roomId)
                .currentTemplate(template)
                .gameTurn(gameTurn)
                .remainingTurns(remainingTurns)
                .build();

        // Redis에 저장
        gameRedisService.saveRoomEconomicState(roomId, roomState);

        log.info("🏛️ [REDIS] 게임방 경제 효과 초기화: roomId={}, effect={}, period={}",
                roomId, roomState.getFullEffectName(), roomState.getCurrentPeriodDisplayName());

        return roomState;
    }

    /**
     * 게임방의 경제 효과 업데이트 (턴 진행 시)
     */
    public RoomEconomicState updateRoomEconomicState(String roomId, Long gameTurn) {
        RoomEconomicState roomState = getRoomEconomicState(roomId);
        
        if (roomState == null) {
            log.warn("게임방 경제 효과가 없어 새로 초기화합니다: roomId={}", roomId);
            return initializeRoomEconomicState(roomId, gameTurn);
        }

        EconomicEffectTemplate.EconomicPeriod newPeriod = calculateCurrentPeriod(gameTurn.intValue());

        // 시대가 바뀌었으면 새로운 템플릿 선택
        if (!roomState.getCurrentPeriod().equals(newPeriod)) {
            boolean isBoom = random.nextBoolean();
            EconomicEffectTemplate newTemplate = EconomicEffectTemplate.getRandomTemplate(newPeriod, isBoom);

            roomState.updateGameTurn(gameTurn, newTemplate);
            
            // Redis 업데이트
            gameRedisService.saveRoomEconomicState(roomId, roomState);

            log.info("🔄 [REDIS] 경제 시대 변경: roomId={}, newPeriod={}, newEffect={}",
                    roomId, newPeriod.getDisplayName(), roomState.getFullEffectName());
        }

        return roomState;
    }

    /**
     * 게임방별 경제 효과가 반영된 가격들을 플레이어에게 적용하고 Redis에 저장
     */
    public void applyAndSaveEconomicEffectsForAllPlayers(String roomId, CreateMapPayload gameState) {
        RoomEconomicState roomState = getRoomEconomicState(roomId);

        if (roomState == null) {
            log.warn("게임방 경제 효과가 없어 기본값으로 초기화합니다: roomId={}", roomId);
            roomState = initializeRoomEconomicState(roomId, gameState.getGameTurn());
        }

        // 모든 플레이어에게 경제 효과 실제 적용
        applyEconomicEffectsToAllPlayers(gameState, roomState);

        // 적용된 효과 정보를 Redis에 저장
        gameRedisService.saveAffectedPrices(roomId, roomState);
        gameRedisService.updatePlayerAffectedPrices(roomId, gameState, roomState);

        // 변경된 게임 상태를 Redis에 저장 (경제 효과 정보 포함)
        gameRedisService.saveGameMapStateWithEconomicEffect(roomId, gameState, roomState);

        log.info("🎯 [ECONOMIC_EFFECT] 모든 플레이어에게 경제 효과 적용 완료: roomId={}, effect={}",
                roomId, roomState.getFullEffectName());
    }

    /**
     * 특정 효과로 월급 계산
     */
    public int calculateSalaryWithEffect(String roomId, int baseSalary) {
        RoomEconomicState roomState = getRoomEconomicState(roomId);
        return roomState != null ? roomState.applySalaryMultiplier(baseSalary) : baseSalary;
    }

    /**
     * 특정 효과로 부동산 가격 계산
     */
    public int calculatePropertyPriceWithEffect(String roomId, int basePrice) {
        RoomEconomicState roomState = getRoomEconomicState(roomId);
        return roomState != null ? roomState.applyPropertyPriceMultiplier(basePrice) : basePrice;
    }

    /**
     * 특정 효과로 건물 건설 비용 계산
     */
    public int calculateBuildingCostWithEffect(String roomId, int baseCost) {
        RoomEconomicState roomState = getRoomEconomicState(roomId);
        return roomState != null ? roomState.applyBuildingCostMultiplier(baseCost) : baseCost;
    }

    /**
     * 게임방의 경제 효과 조회 (Redis에서)
     */
    public RoomEconomicState getRoomEconomicState(String roomId) {
        return gameRedisService.getRoomEconomicState(roomId);
    }

    /**
     * 게임방의 경제 효과 삭제
     */
    public void deleteRoomEconomicState(String roomId) {
        gameRedisService.deleteEconomicEffectData(roomId);
        log.info("🗑️ [CLEANUP] 게임방 경제 효과 데이터 삭제: roomId={}", roomId);
    }

    /**
     * 모든 플레이어와 타일에 경제 효과 실제 적용
     */
    private void applyEconomicEffectsToAllPlayers(CreateMapPayload gameState, RoomEconomicState roomState) {
        if (gameState == null) {
            log.warn("게임 상태가 null이어서 경제 효과를 적용할 수 없습니다.");
            return;
        }

        // 1. 맵의 모든 타일에 부동산/건물 가격 효과 적용
        if (gameState.getCurrentMap() != null && gameState.getCurrentMap().getCells() != null) {
            for (var tile : gameState.getCurrentMap().getCells()) {
                if (tile.getType() == Tile.TileType.NORMAL) {
                    // 기본 가격을 DB에서 가져와서 경제 효과 적용
                    applyEconomicEffectToTile(tile, roomState);
                }
            }
            log.info("🏘️ [ECONOMIC_EFFECT] 모든 타일에 경제 효과 적용 완료: effect={}", roomState.getEffectName());
        }

        // 2. 모든 플레이어에게 월급 효과 적용 (실제로는 EventService에서 월급 지급 시 적용)
        if (gameState.getPlayers() != null) {
            for (Map.Entry<String, CreateMapPayload.PlayerState> entry : gameState.getPlayers().entrySet()) {
                String playerId = entry.getKey();
                CreateMapPayload.PlayerState playerState = entry.getValue();

                // 로그용으로만 출력 (실제 월급은 EventService에서 calculateSalaryWithEffect 사용)
                int baseSalary = 1000000; // EventService와 동일한 기본 월급
                int affectedSalary = roomState.applySalaryMultiplier(baseSalary);

                log.info("💰 [EFFECT_APPLY] 플레이어 {}({})의 월급 효과: 기본월급={} -> 적용월급={}",
                        playerState.getNickname(), playerId, baseSalary, affectedSalary);
            }
        }
    }

    /**
     * 개별 타일에 경제 효과 적용 (기본 가격에서 배수 적용)
     */
    private void applyEconomicEffectToTile(Tile tile, RoomEconomicState roomState) {
        // DB에서 가져온 기본 가격들 (data.sql의 원본 가격)
        // 경제 효과가 바뀔 때마다 기본 가격에서 다시 계산

        // 부동산 가격 적용
        int originalLandPrice = getOriginalLandPrice(tile.getName());
        if (originalLandPrice > 0) {
            int newLandPrice = roomState.applyPropertyPriceMultiplier(originalLandPrice);
            tile.setLandPrice(newLandPrice);
        }

        // 건물 건설 비용 적용
        int originalHousePrice = getOriginalHousePrice(tile.getName());
        if (originalHousePrice > 0) {
            int newHousePrice = roomState.applyBuildingCostMultiplier(originalHousePrice);
            tile.setHousePrice(newHousePrice);
        }

        int originalBuildingPrice = getOriginalBuildingPrice(tile.getName());
        if (originalBuildingPrice > 0) {
            int newBuildingPrice = roomState.applyBuildingCostMultiplier(originalBuildingPrice);
            tile.setBuildingPrice(newBuildingPrice);
        }

        int originalHotelPrice = getOriginalHotelPrice(tile.getName());
        if (originalHotelPrice > 0) {
            int newHotelPrice = roomState.applyBuildingCostMultiplier(originalHotelPrice);
            tile.setHotelPrice(newHotelPrice);
        }

        log.debug("🏠 [TILE_EFFECT] 타일 {} 가격 적용: 땅값={}, 주택={}, 빌딩={}, 호텔={}",
                tile.getName(), tile.getLandPrice(), tile.getHousePrice(),
                tile.getBuildingPrice(), tile.getHotelPrice());
    }

    /**
     * DB에서 타일별 원본 가격 조회
     */
    private int getOriginalLandPrice(String tileName) {
        return tileRepository.findByName(tileName)
                .map(Tile::getLandPrice)
                .orElse(0);
    }

    private int getOriginalHousePrice(String tileName) {
        return tileRepository.findByName(tileName)
                .map(Tile::getHousePrice)
                .orElse(0);
    }

    private int getOriginalBuildingPrice(String tileName) {
        return tileRepository.findByName(tileName)
                .map(Tile::getBuildingPrice)
                .orElse(0);
    }

    private int getOriginalHotelPrice(String tileName) {
        return tileRepository.findByName(tileName)
                .map(Tile::getHotelPrice)
                .orElse(0);
    }
}