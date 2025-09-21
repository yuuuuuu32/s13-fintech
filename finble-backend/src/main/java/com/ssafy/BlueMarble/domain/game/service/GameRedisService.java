
package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.Map;
import java.util.HashMap;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.domain.game.entity.RoomEconomicState;
@Service
@Slf4j
@RequiredArgsConstructor
public class GameRedisService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String GAME_MAP_PREFIX = "room:map:";
    private static final String ECONOMIC_EFFECT_PREFIX = "room:economic:";
    private static final String AFFECTED_PRICES_PREFIX = "room:prices:";
    private static final int GAME_STATE_TTL = 1800;

    private static final int BASE_SALARY = 1000000; // EventService와 동일한 기본 월급
    private static final int BASE_PROPERTY_PRICE = 100000;
    private static final int BASE_BUILDING_COST = 50000;
    
    /**
     * 방의 게임 맵 상태 저장
     */
    public void saveGameMapState(String roomId, CreateMapPayload gameState) {
        try {
            String key = GAME_MAP_PREFIX + roomId;
            String value = objectMapper.writeValueAsString(gameState);
            redisTemplate.opsForValue().set(key, value, GAME_STATE_TTL, TimeUnit.SECONDS);
            log.info("게임 맵 상태 저장 완료: roomId={}", roomId);
        } catch (JsonProcessingException e) {
            log.error("게임 맵 상태 저장 실패: roomId={}", roomId, e);
        }
    }
    
    /**
     * 방의 게임 맵 상태 조회
     */
    public CreateMapPayload getGameMapState(String roomId) {
        try {
            String key = GAME_MAP_PREFIX + roomId;
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, CreateMapPayload.class);
            }
        } catch (JsonProcessingException e) {
            log.error("게임 맵 상태 조회 실패: roomId={}", roomId, e);
        }
        return null;
    }
    
    /**
     * 방의 게임 맵 상태 삭제
     */
    public void deleteGameMapState(String roomId) {
        String key = GAME_MAP_PREFIX + roomId;
        redisTemplate.delete(key);
        log.info("게임 맵 상태 삭제 완료: roomId={}", roomId);
    }
    
    
    /**한
     * 게임 상태 업데이트 (TTL 갱신)
     */
    public void updateGameStateTTL(String roomId) {
        String key = GAME_MAP_PREFIX + roomId;
        redisTemplate.expire(key, GAME_STATE_TTL, TimeUnit.SECONDS);
    }
    
    /**
     * 방 ID로 게임 맵 상태 존재 여부 확인
     */
    public boolean hasGameMapState(String roomId) {
        String key = GAME_MAP_PREFIX + roomId;
        return redisTemplate.hasKey(key);
    }


    /**
     * 방의 경제 효과가 반영된 가격 정보 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getAffectedPrices(String roomId) {
        try {
            String key = AFFECTED_PRICES_PREFIX + roomId;
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, Map.class);
            }
        } catch (JsonProcessingException e) {
            log.error("경제 효과 반영된 가격 정보 조회 실패: roomId={}", roomId, e);
        }
        return null;
    }


    /**
     * 특정 플레이어의 경제 효과가 반영된 가격 정보 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPlayerAffectedPrices(String roomId, String playerId) {
        try {
            String key = AFFECTED_PRICES_PREFIX + roomId + ":player:" + playerId;
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, Map.class);
            }
        } catch (JsonProcessingException e) {
            log.error("플레이어 경제 효과 가격 정보 조회 실패: roomId={}, playerId={}", roomId, playerId, e);
        }
        return null;
    }

    /**
     * 방의 경제 효과 관련 Redis 데이터 삭제
     */
    public void deleteEconomicEffectData(String roomId) {
        // RoomEconomicState 데이터 삭제
        String roomEconomicKey = ECONOMIC_EFFECT_PREFIX + roomId + ":state";
        redisTemplate.delete(roomEconomicKey);

        String pricesKey = AFFECTED_PRICES_PREFIX + roomId;
        redisTemplate.delete(pricesKey);

        String pattern = AFFECTED_PRICES_PREFIX + roomId + ":player:*";
        redisTemplate.delete(redisTemplate.keys(pattern));

        log.info("경제 효과 관련 Redis 데이터 삭제 완료: roomId={}", roomId);
    }

    // ========== 새로운 RoomEconomicState 관련 메서드들 ==========

    /**
     * 게임방의 경제 상태 저장 (새로운 구조)
     */
    public void saveRoomEconomicState(String roomId, RoomEconomicState roomState) {
        try {
            String key = ECONOMIC_EFFECT_PREFIX + roomId + ":state";
            String value = objectMapper.writeValueAsString(roomState);
            redisTemplate.opsForValue().set(key, value, GAME_STATE_TTL, TimeUnit.SECONDS);
            log.info("게임방 경제 상태 저장 완료: roomId={}, effect={}", roomId, roomState.getFullEffectName());
        } catch (JsonProcessingException e) {
            log.error("게임방 경제 상태 저장 실패: roomId={}", roomId, e);
        }
    }

    /**
     * 게임방의 경제 상태 조회 (새로운 구조)
     */
    public RoomEconomicState getRoomEconomicState(String roomId) {
        try {
            String key = ECONOMIC_EFFECT_PREFIX + roomId + ":state";
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, RoomEconomicState.class);
            }
        } catch (JsonProcessingException e) {
            log.error("게임방 경제 상태 조회 실패: roomId={}", roomId, e);
        }
        return null;
    }

    /**
     * 게임방의 경제 상태 존재 여부 확인
     */
    public boolean hasRoomEconomicState(String roomId) {
        String key = ECONOMIC_EFFECT_PREFIX + roomId + ":state";
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * 방의 경제 효과가 반영된 가격 정보 저장 (새로운 RoomEconomicState용)
     */
    public void saveAffectedPrices(String roomId, RoomEconomicState roomState) {
        try {
            String key = AFFECTED_PRICES_PREFIX + roomId;

            Map<String, Object> affectedPrices = new HashMap<>();
            affectedPrices.put("baseSalary", BASE_SALARY);
            affectedPrices.put("basePropertyPrice", BASE_PROPERTY_PRICE);
            affectedPrices.put("baseBuildingCost", BASE_BUILDING_COST);

            affectedPrices.put("affectedSalary", roomState.applySalaryMultiplier(BASE_SALARY));
            affectedPrices.put("affectedPropertyPrice", roomState.applyPropertyPriceMultiplier(BASE_PROPERTY_PRICE));
            affectedPrices.put("affectedBuildingCost", roomState.applyBuildingCostMultiplier(BASE_BUILDING_COST));

            affectedPrices.put("salaryMultiplier", roomState.getSalaryMultiplier());
            affectedPrices.put("propertyPriceMultiplier", roomState.getPropertyPriceMultiplier());
            affectedPrices.put("buildingCostMultiplier", roomState.getBuildingCostMultiplier());

            affectedPrices.put("effectName", roomState.getFullEffectName());
            affectedPrices.put("currentPeriod", roomState.getCurrentPeriodDisplayName());
            affectedPrices.put("isBoom", roomState.isBoom());

            String value = objectMapper.writeValueAsString(affectedPrices);
            redisTemplate.opsForValue().set(key, value, GAME_STATE_TTL, TimeUnit.SECONDS);

            log.info("💰 [REDIS] 경제 효과 반영된 가격 정보 저장: roomId={}, effect={}",
                    roomId, roomState.getFullEffectName());
        } catch (JsonProcessingException e) {
            log.error("경제 효과 반영된 가격 정보 저장 실패: roomId={}", roomId, e);
        }
    }

    /**
     * 플레이어별로 경제 효과가 적용된 가격 정보를 업데이트하고 Redis에 저장 (새로운 RoomEconomicState용)
     */
    public void updatePlayerAffectedPrices(String roomId, CreateMapPayload gameState, RoomEconomicState roomState) {
        try {
            if (gameState.getPlayers() == null) {
                log.warn("플레이어 정보가 없어 가격 업데이트를 건너뜁니다: roomId={}", roomId);
                return;
            }

            for (String playerId : gameState.getPlayers().keySet()) {
                CreateMapPayload.PlayerState playerState = gameState.getPlayers().get(playerId);
                Map<String, Object> playerPrices = createPlayerPriceData(playerId, playerState, roomState);

                String playerKey = AFFECTED_PRICES_PREFIX + roomId + ":player:" + playerId;
                String playerValue = objectMapper.writeValueAsString(playerPrices);
                redisTemplate.opsForValue().set(playerKey, playerValue, GAME_STATE_TTL, TimeUnit.SECONDS);

                log.info("💰 [REDIS] 플레이어별 경제 효과 가격 저장: roomId={}, playerId={}, effect={}",
                        roomId, playerId, roomState.getFullEffectName());
            }
        } catch (JsonProcessingException e) {
            log.error("플레이어별 경제 효과 가격 저장 실패: roomId={}", roomId, e);
        }
    }

    /**
     * 플레이어 가격 데이터 생성 (새로운 RoomEconomicState용)
     */
    private Map<String, Object> createPlayerPriceData(String playerId, CreateMapPayload.PlayerState playerState, RoomEconomicState roomState) {
        Map<String, Object> playerPrices = new HashMap<>();

        int affectedSalary = roomState.applySalaryMultiplier(BASE_SALARY);
        int affectedPropertyPrice = roomState.applyPropertyPriceMultiplier(BASE_PROPERTY_PRICE);
        int affectedBuildingCost = roomState.applyBuildingCostMultiplier(BASE_BUILDING_COST);

        playerPrices.put("playerId", playerId);
        playerPrices.put("playerNickname", playerState.getNickname());
        playerPrices.put("currentMoney", playerState.getMoney());

        playerPrices.put("baseSalary", BASE_SALARY);
        playerPrices.put("affectedSalary", affectedSalary);
        playerPrices.put("basePropertyPrice", BASE_PROPERTY_PRICE);
        playerPrices.put("affectedPropertyPrice", affectedPropertyPrice);
        playerPrices.put("baseBuildingCost", BASE_BUILDING_COST);
        playerPrices.put("affectedBuildingCost", affectedBuildingCost);

        playerPrices.put("effectName", roomState.getFullEffectName());
        playerPrices.put("economicPeriod", roomState.getCurrentPeriodDisplayName());

        return playerPrices;
    }
}
