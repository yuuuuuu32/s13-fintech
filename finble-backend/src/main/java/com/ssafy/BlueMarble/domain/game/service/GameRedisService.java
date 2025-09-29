
package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.Map;

import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
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
     * 경제 효과 정보를 포함한 게임 맵 상태 저장
     */
    public void saveGameMapStateWithEconomicEffect(String roomId, CreateMapPayload gameState, EconomicEffect currentEffect) {
        try {
            // 경제 효과 정보를 gameState에 추가
            if (currentEffect != null) {
                gameState.setEconomicPeriodName(currentEffect.getPeriod().getDisplayName());
                gameState.setEconomicEffectName(currentEffect.getEffectName());
                gameState.setEconomicDescription(currentEffect.getDescription());
                gameState.setEconomicFullName(currentEffect.getFullEffectName());
                gameState.setBoom(currentEffect.isBoom());
                gameState.setRemainingTurns(EconomicEffect.getTurnsUntilNextPeriod(gameState.getGameTurn().intValue()));
            }
            
            saveGameMapState(roomId, gameState);
            log.info("경제 효과 포함 게임 맵 상태 저장 완료: roomId={}, effect={}", 
                    roomId, currentEffect != null ? currentEffect.getFullEffectName() : "없음");
        } catch (Exception e) {
            log.error("경제 효과 포함 게임 맵 상태 저장 실패: roomId={}", roomId, e);
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



}
