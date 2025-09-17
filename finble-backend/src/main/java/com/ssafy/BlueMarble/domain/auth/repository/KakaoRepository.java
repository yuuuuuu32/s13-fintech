package com.ssafy.BlueMarble.domain.auth.repository;


import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.concurrent.TimeUnit;

@Repository
@RequiredArgsConstructor
public class KakaoRepository {
    private final RedisTemplate redisTemplate;

    public void saveAccessToken(String key, String token, long timeout) {
        redisTemplate.opsForValue().set(key, token, timeout, TimeUnit.SECONDS);
    }

    public String getAccessToken(String key) {
        return redisTemplate.opsForValue().get(key).toString();
    }
}
