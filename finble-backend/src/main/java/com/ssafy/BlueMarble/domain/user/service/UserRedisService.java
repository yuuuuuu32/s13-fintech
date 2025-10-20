package com.ssafy.BlueMarble.domain.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserRedisService {
    private final String USERID_TO_NICKNAME = "user:nickname";
    private final String NICKNAME_TO_USERID = "user:userId";
    private final String USER_TO_ICON = "user:icon";
    private final String USER_TO_NAME_TAG = "user:nameTag";

    private final RedisTemplate<String, String> redisTemplate;

    public void putNickname(String userId, String nickname, String icon) {
        redisTemplate.opsForHash().put(USERID_TO_NICKNAME, userId, nickname);
        redisTemplate.opsForHash().put(NICKNAME_TO_USERID, nickname, userId );
        redisTemplate.opsForHash().put(USER_TO_ICON, userId, icon);
    }

    public String getNickname(String userId) {
        return (String) redisTemplate.opsForHash().get(USERID_TO_NICKNAME, userId);
    }

    public String getUserIdByNickname(String nickname) {
        return (String) redisTemplate.opsForHash().get(NICKNAME_TO_USERID, nickname);
    }

    public void exit(String userId, String nickname) {
        redisTemplate.opsForHash().delete(USERID_TO_NICKNAME, userId);
        redisTemplate.opsForHash().delete(NICKNAME_TO_USERID, nickname);
        redisTemplate.opsForHash().delete(USER_TO_ICON, userId);
        redisTemplate.opsForHash().delete(USER_TO_NAME_TAG, userId);
    }
}
