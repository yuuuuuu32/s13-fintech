package com.ssafy.BlueMarble.websocket.handler;

import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;


@Component
@Slf4j
public class ExceptionHandlingWebSocketHandler extends WebSocketHandlerDecorator {
    private final SessionMessageService sessionMessageService;

    public ExceptionHandlingWebSocketHandler(WebSocketHandler delegate, SessionMessageService sessionMessageService) {
        super(delegate);
        this.sessionMessageService = sessionMessageService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            super.afterConnectionEstablished(session);
        } catch (BusinessException e) {
            e.printStackTrace();
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (Exception e) {
            e.printStackTrace();
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        try {
            getDelegate().handleMessage(session, message);  // 실제 핸들러 호출
        } catch (BusinessException e) {
            e.printStackTrace();
            sendError(session, e.getBusinessError().name(), e.getBusinessError().getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            sendError(session, "INTERNAL_SERVER_ERROR", "서버 내부 오류");
        }
    }

    private void sendError(WebSocketSession session, String type, String message) {
        String json = "{\"type\":\"" + type + "\", \"message\":\"" + message + "\"}";
        sessionMessageService.sendError(session, new TextMessage(json));
    }
}