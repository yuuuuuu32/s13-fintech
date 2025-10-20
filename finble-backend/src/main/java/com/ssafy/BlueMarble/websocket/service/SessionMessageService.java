package com.ssafy.BlueMarble.websocket.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.websocket.dto.ErrorMessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionMessageService {
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;
    private final WebSocketSessionService webSocketSessionService;
    private ExecutorService executorService;

    @PostConstruct
    public void init() {
        // 고정된 10개의 스레드를 가진 풀을 생성 (필요에 따라 조정 가능)
        executorService = Executors.newFixedThreadPool(10);
    }

    @PreDestroy
    public void shutdown() {
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }

    public void sendMessage(WebSocketSession session, ErrorMessageDto message) {
        try {
            String jsonString = objectMapper.writeValueAsString(message);
            send(session, new TextMessage(jsonString));
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

    public void sendMessage(WebSocketSession session, MessageDto message) {
        try {
            String jsonString = objectMapper.writeValueAsString(message);
            System.out.println(jsonString);
            send(session, new TextMessage(jsonString));
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

    /**
     * 방의 모든 플레이어에게 메시지 전송
     *
     * @param roomId    방 ID
     * @param message   전송할 메시지
     */
    public void sendMessageToRoom(String roomId, MessageDto message) {
        try {
            String usersKey = "room:" + roomId + ":users";
            Set<String> userIds = redisTemplate.opsForSet().members(usersKey);

            for (String userId : userIds) {
                WebSocketSession session = webSocketSessionService.getSessionByUserId(userId);
                if (session != null && session.isOpen()) {
                    sendMessage(session, message);
                } else {
                    log.warn("사용자 {}의 세션을 찾을 수 없거나 연결이 닫혀있음", userId);
                }
            }
        } catch (Exception e) {
            log.error("전송 실패: {}", roomId, e);
        }
    }

    private void send(WebSocketSession session, TextMessage message) {
        executorService.submit(() -> {
            if (session != null && session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    // 예외 처리 로깅
                    e.printStackTrace();
                }
            }
        });
    }

    public void sendError(WebSocketSession session, TextMessage textMessage) {
        send(session, textMessage);
    }
}
