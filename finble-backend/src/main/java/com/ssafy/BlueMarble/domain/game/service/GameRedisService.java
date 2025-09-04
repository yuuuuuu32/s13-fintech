package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.MapState;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class GameRedisService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    
    // 기존 RoomService와 통합된 키 구조
    private static final String GAME_MAP_PREFIX = "room:map:";
    private static final String PLAYER_STATE_PREFIX = "room:player:";
    private static final int GAME_STATE_TTL = 1800;
    
    /**
     * 방의 게임 맵 상태 저장
     */
    public void saveGameMapState(String roomId, MapState gameState) {
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
    public MapState getGameMapState(String roomId) {
        try {
            String key = GAME_MAP_PREFIX + roomId;
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, MapState.class);
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
    
    /**
     * 개별 플레이어 상태 저장
     */
    public void savePlayerState(String roomId, String userId, MapState.PlayerState playerState) {
        try {
            String key = PLAYER_STATE_PREFIX + roomId + ":" + userId;
            String value = objectMapper.writeValueAsString(playerState);
            redisTemplate.opsForValue().set(key, value, GAME_STATE_TTL, TimeUnit.SECONDS);
        } catch (JsonProcessingException e) {
            log.error("플레이어 상태 저장 실패: roomId={}, userId={}", roomId, userId, e);
        }
    }
    
    /**
     * 개별 플레이어 상태 조회
     */
    public MapState.PlayerState getPlayerState(String roomId, String userId) {
        try {
            String key = PLAYER_STATE_PREFIX + roomId + ":" + userId;
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.readValue(value, MapState.PlayerState.class);
            }
        } catch (JsonProcessingException e) {
            log.error("플레이어 상태 조회 실패: roomId={}, userId={}", roomId, userId, e);
        }
        return null;
    }
    
    /**
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
}
