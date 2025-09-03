package com.ssafy.BlueMarble.websocket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketSessionService {
    private final RedisTemplate<String, String> redisTemplate;

    private final String USER_TO_SESSION_KEY = "user:session";     // uid -> sessionId
    private final String SESSION_TO_USER_KEY = "session:user";     // sessionId -> uid
    private static final ConcurrentHashMap<String, WebSocketSession> sessionIdToSession = new ConcurrentHashMap<>();

    public void addSession(String userId, WebSocketSession session) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();

        // userId -> sessionId
        hashOps.put(USER_TO_SESSION_KEY, userId, session.getId());
        // sessionId -> userId
        hashOps.put(SESSION_TO_USER_KEY, session.getId(), userId);

        //sessionId-> session
        sessionIdToSession.put(session.getId(), session);
    }

    public void removeSession(String sessionId) {
        HashOperations<String, String, String> hashOps = redisTemplate.opsForHash();

        String userId = getUserIdBySessionId(sessionId);
        // 삭제: 양방향
        hashOps.delete(USER_TO_SESSION_KEY, userId);
        hashOps.delete(SESSION_TO_USER_KEY, sessionId);
        sessionIdToSession.remove(sessionId);
    }

    public String getSessionIdByUserId(String userId) {
        return (String) redisTemplate.opsForHash().get(USER_TO_SESSION_KEY, userId);
    }

    public String getUserIdBySessionId(String sessionId) {
        return (String) redisTemplate.opsForHash().get(SESSION_TO_USER_KEY, sessionId);
    }

    public WebSocketSession getSessionByUserId(String userId) {
        String sessionId = getSessionIdByUserId(userId);
        return sessionIdToSession.get(sessionId);
    }

    public WebSocketSession getSessionBySessionId(String sessionId) {
        return sessionIdToSession.get(sessionId);
    }


}