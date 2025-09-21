package com.ssafy.BlueMarble.domain.game.service;

import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.repository.EconomicEffectRepository;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import jakarta.annotation.PostConstruct;

/**
 * 경제역사 효과 서비스 (호황/불황 랜덤 적용)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EconomicHistoryService {

    private final Random random = new Random();
    private final EconomicEffectRepository economicEffectRepository;
    private final TileRepository tileRepository;
    private final GameRedisService gameRedisService;

    // 메모리에 로드된 시대별 경제 효과 템플릿
    private final Map<String, Map<Boolean, List<EconomicEffect>>> economicEffectTemplates = new HashMap<>();

    /**
     * 서버 시작 시 DB에서 경제 효과 템플릿 로드
     */
    @PostConstruct
    public void loadEconomicEffectTemplates() {
        log.info("🏛️ [INIT] 경제 효과 템플릿 로딩 시작...");

        String[] periods = {"MODERN", "CONTEMPORARY", "RECENT", "FUTURE"};
        boolean[] boomStates = {true, false};

        for (String period : periods) {
            economicEffectTemplates.put(period, new HashMap<>());

            for (boolean isBoom : boomStates) {
                List<EconomicEffect> templates = economicEffectRepository.findByCurrentPeriodAndIsBoomAndRoomIdStartingWith(
                        period, isBoom, "template-");

                economicEffectTemplates.get(period).put(isBoom, new ArrayList<>(templates));

                log.info("📊 [TEMPLATE_LOAD] {}시대 {}효과: {}개 템플릿 로드됨",
                        getDisplayPeriodName(period),
                        isBoom ? "호황" : "불황",
                        templates.size());
            }
        }

        log.info("✅ [INIT] 경제 효과 템플릿 로딩 완료!");
    }

    /**
     * 시대 표시명 반환
     */
    private String getDisplayPeriodName(String period) {
        switch (period) {
            case "MODERN": return "근대사";
            case "CONTEMPORARY": return "근현대사";
            case "RECENT": return "현대사";
            case "FUTURE": return "미래";
            default: return period;
        }
    }

    /**
     * 턴 기반으로 경제역사 시대 계산
     */
    public String calculateCurrentPeriod(int gameTurn) {
        int periodIndex = ((gameTurn - 1) / 2) % 4;
        String[] periods = {"MODERN", "CONTEMPORARY", "RECENT", "FUTURE"};
        return periods[periodIndex];
    }

    /**
     * 다음 시대까지 남은 턴 수 계산
     */
    public int getTurnsUntilNextPeriod(int gameTurn) {
        int turnsInCurrentPeriod = ((gameTurn - 1) % 2) + 1;
        return 2 - turnsInCurrentPeriod;
    }

    /**
     * 게임방의 경제 효과 초기화 및 DB 저장
     */
    public EconomicEffect initializeRoomEconomicEffect(String roomId, Long gameTurn) {
        String currentPeriod = calculateCurrentPeriod(gameTurn.intValue());
        boolean isBoom = random.nextBoolean();
        EconomicEffect template = getRandomTemplateEffect(currentPeriod, isBoom);
        int remainingTurns = getTurnsUntilNextPeriod(gameTurn.intValue());

        EconomicEffect roomEffect = EconomicEffect.builder()
                .roomId(roomId)
                .currentPeriod(currentPeriod)
                .effectName(template.getEffectName())
                .description(template.getDescription())
                .isBoom(isBoom)
                .salaryMultiplier(template.getSalaryMultiplier())
                .propertyPriceMultiplier(template.getPropertyPriceMultiplier())
                .buildingCostMultiplier(template.getBuildingCostMultiplier())
                .gameTurn(gameTurn)
                .remainingTurns(remainingTurns)
                .build();

        economicEffectRepository.save(roomEffect);

        log.info("🏛️ [DB] 게임방 경제 효과 초기화: roomId={}, effect={}, period={}",
                roomId, roomEffect.getFullEffectName(), roomEffect.getCurrentPeriodDisplayName());

        return roomEffect;
    }

    /**
     * 게임방의 경제 효과 업데이트 (턴 진행 시)
     */
    public EconomicEffect updateRoomEconomicEffect(String roomId, Long gameTurn) {
        EconomicEffect roomEffect = economicEffectRepository.findByRoomId(roomId)
                .orElseThrow(() -> new IllegalArgumentException("게임방 경제 효과를 찾을 수 없습니다: " + roomId));

        String newPeriod = calculateCurrentPeriod(gameTurn.intValue());
        int remainingTurns = getTurnsUntilNextPeriod(gameTurn.intValue());

        if (!roomEffect.getCurrentPeriod().equals(newPeriod)) {
            boolean isBoom = random.nextBoolean();
            EconomicEffect template = getRandomTemplateEffect(newPeriod, isBoom);

            roomEffect.updatePeriod(newPeriod);
            roomEffect.updateEconomicEffect(
                    template.getEffectName(), template.getDescription(), isBoom,
                    template.getSalaryMultiplier(), template.getPropertyPriceMultiplier(),
                    template.getBuildingCostMultiplier(), gameTurn, remainingTurns
            );

            log.info("🔄 [DB] 경제 시대 변경: roomId={}, newPeriod={}, newEffect={}",
                    roomId, newPeriod, roomEffect.getFullEffectName());
        }

        return economicEffectRepository.save(roomEffect);
    }

    /**
     * 게임방별 경제 효과가 반영된 가격들을 for문으로 플레이어에게 적용하고 Redis에 저장
     */
    public void applyAndSaveEconomicEffectsForAllPlayers(String roomId, CreateMapPayload gameState) {
        EconomicEffect roomEffect = economicEffectRepository.findByRoomId(roomId)
                .orElse(null);

        if (roomEffect == null) {
            log.warn("게임방 경제 효과가 없어 기본값으로 초기화합니다: roomId={}", roomId);
            roomEffect = initializeRoomEconomicEffect(roomId, gameState.getGameTurn());
        }

        // for문으로 모든 플레이어에게 경제 효과 실제 적용
        applyEconomicEffectsToAllPlayers(gameState, roomEffect);

        // 적용된 효과 정보를 Redis에 저장
        gameRedisService.saveAffectedPrices(roomId, roomEffect);
        gameRedisService.updatePlayerAffectedPrices(roomId, gameState, roomEffect);

        // 변경된 게임 상태를 Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);

        log.info("🎯 [ECONOMIC_EFFECT] 모든 플레이어에게 경제 효과 적용 완료: roomId={}, effect={}",
                roomId, roomEffect.getFullEffectName());
    }

    /**
     * 특정 효과로 월급 계산
     */
    public int calculateSalaryWithEffect(String roomId, int baseSalary) {
        EconomicEffect roomEffect = getRoomEconomicEffect(roomId);
        if (roomEffect != null) {
            return roomEffect.applySalaryMultiplier(baseSalary);
        }
        return baseSalary;
    }

    /**
     * 특정 효과로 부동산 가격 계산
     */
    public int calculatePropertyPriceWithEffect(String roomId, int basePrice) {
        EconomicEffect roomEffect = getRoomEconomicEffect(roomId);
        if (roomEffect != null) {
            return roomEffect.applyPropertyPriceMultiplier(basePrice);
        }
        return basePrice;
    }

    /**
     * 특정 효과로 건물 건설 비용 계산
     */
    public int calculateBuildingCostWithEffect(String roomId, int baseCost) {
        EconomicEffect roomEffect = getRoomEconomicEffect(roomId);
        if (roomEffect != null) {
            return roomEffect.applyBuildingCostMultiplier(baseCost);
        }
        return baseCost;
    }

    /**
     * 게임방의 경제 효과 조회
     */
    public EconomicEffect getRoomEconomicEffect(String roomId) {
        return economicEffectRepository.findByRoomId(roomId).orElse(null);
    }

    /**
     * 게임방의 경제 효과 삭제
     */
    public void deleteRoomEconomicEffect(String roomId) {
        economicEffectRepository.deleteByRoomId(roomId);
        gameRedisService.deleteEconomicEffectData(roomId);

        log.info("🗑️ [CLEANUP] 게임방 경제 효과 데이터 삭제: roomId={}", roomId);
    }

    /**
     * 메모리에서 시대와 호황/불황에 맞는 랜덤 템플릿 효과 조회
     */
    private EconomicEffect getRandomTemplateEffect(String period, boolean isBoom) {
        List<EconomicEffect> templates = economicEffectTemplates.get(period).get(isBoom);

        if (templates == null || templates.isEmpty()) {
            throw new IllegalStateException("템플릿 경제 효과를 찾을 수 없습니다: period=" + period + ", isBoom=" + isBoom);
        }

        int randomIndex = random.nextInt(templates.size());
        EconomicEffect selectedTemplate = templates.get(randomIndex);

        log.info("🎲 [MEMORY] 랜덤 템플릿 선택: period={}, isBoom={}, selected={}",
                period, isBoom, selectedTemplate.getEffectName());

        return selectedTemplate;
    }

    /**
     * for문으로 모든 플레이어와 타일에 경제 효과 실제 적용
     */
    private void applyEconomicEffectsToAllPlayers(CreateMapPayload gameState, EconomicEffect roomEffect) {
        if (gameState == null) {
            log.warn("게임 상태가 null이어서 경제 효과를 적용할 수 없습니다.");
            return;
        }

        // 1. 맵의 모든 타일에 부동산/건물 가격 효과 적용
        if (gameState.getCurrentMap() != null && gameState.getCurrentMap().getCells() != null) {
            for (var tile : gameState.getCurrentMap().getCells()) {
                if (tile.getType() == com.ssafy.BlueMarble.domain.game.entity.Tile.TileType.NORMAL) {
                    // 기본 가격을 DB에서 가져와서 경제 효과 적용
                    applyEconomicEffectToTile(tile, roomEffect);
                }
            }
            log.info("🏘️ [ECONOMIC_EFFECT] 모든 타일에 경제 효과 적용 완료: effect={}", roomEffect.getEffectName());
        }

        // 2. 모든 플레이어에게 월급 효과 적용 (실제로는 EventService에서 월급 지급 시 적용)
        if (gameState.getPlayers() != null) {
            for (Map.Entry<String, CreateMapPayload.PlayerState> entry : gameState.getPlayers().entrySet()) {
                String playerId = entry.getKey();
                CreateMapPayload.PlayerState playerState = entry.getValue();

                // 로그용으로만 출력 (실제 월급은 EventService에서 calculateSalaryWithEffect 사용)
                int baseSalary = 1000000; // EventService와 동일한 기본 월급
                int affectedSalary = roomEffect.applySalaryMultiplier(baseSalary);

                log.info("💰 [EFFECT_APPLY] 플레이어 {}({})의 월급 효과: 기본월급={} -> 적용월급={}",
                        playerState.getNickname(), playerId, baseSalary, affectedSalary);
            }
        }
    }

    /**
     * 개별 타일에 경제 효과 적용 (기본 가격에서 배수 적용)
     */
    private void applyEconomicEffectToTile(com.ssafy.BlueMarble.domain.game.entity.Tile tile, EconomicEffect roomEffect) {
        // DB에서 가져온 기본 가격들 (data.sql의 원본 가격)
        // 경제 효과가 바뀔 때마다 기본 가격에서 다시 계산

        // 부동산 가격 적용
        int originalLandPrice = getOriginalLandPrice(tile.getName());
        if (originalLandPrice > 0) {
            int newLandPrice = roomEffect.applyPropertyPriceMultiplier(originalLandPrice);
            tile.setLandPrice(newLandPrice);
        }

        // 건물 건설 비용 적용
        int originalHousePrice = getOriginalHousePrice(tile.getName());
        if (originalHousePrice > 0) {
            int newHousePrice = roomEffect.applyBuildingCostMultiplier(originalHousePrice);
            tile.setHousePrice(newHousePrice);
        }

        int originalBuildingPrice = getOriginalBuildingPrice(tile.getName());
        if (originalBuildingPrice > 0) {
            int newBuildingPrice = roomEffect.applyBuildingCostMultiplier(originalBuildingPrice);
            tile.setBuildingPrice(newBuildingPrice);
        }

        int originalHotelPrice = getOriginalHotelPrice(tile.getName());
        if (originalHotelPrice > 0) {
            int newHotelPrice = roomEffect.applyBuildingCostMultiplier(originalHotelPrice);
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