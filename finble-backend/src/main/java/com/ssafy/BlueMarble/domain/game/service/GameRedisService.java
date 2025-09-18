package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
@Service
@Slf4j
@RequiredArgsConstructor
public class GameRedisService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String GAME_MAP_PREFIX = "room:map:";
    private static final int GAME_STATE_TTL = 1800;
    
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
}
