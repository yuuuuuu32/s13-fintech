package com.ssafy.BlueMarble.websocket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.service.CardService;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.UseCardPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketCardService {
    
    private final CardService cardService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService sessionMessageService;
    private final WebSocketSessionService webSocketSessionService;
    private final RoomService roomService;
    
    /**
     * 카드 뽑기 처리
     */
    public void handleDrawCard(WebSocketSession session, DrawCardPayload payload) {
        try {
            String roomId = roomService.getRoom(session.getId());
            String userId = webSocketSessionService.getUserIdBySessionId(session.getId());
            
            log.info("[WebSocket] 카드 뽑기 시작: roomId={}, userName={}", roomId, payload.getUserName());

            if ("null".equals(roomId))
                throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);

            DrawCardPayload.DrawCardResult result = cardService.drawCard(roomId, payload.getUserName());

            if (result != null) {
                DrawCardPayload responsePayload = DrawCardPayload.builder()
                        .result(result)
                        .build();

                MessageDto responseMessage = new MessageDto(
                        MessageType.DRAW_CARD,
                        objectMapper.valueToTree(responsePayload)
                );

                sessionMessageService.sendMessageToRoom(roomId, responseMessage);
                log.info("[WebSocket] 카드 뽑기 성공: roomId={}, cardName={}", roomId, result.getCardName());
            } else {
                log.error("[WebSocket] 카드 뽑기 실패: roomId={}, userName={}", roomId, payload.getUserName());
            }

        } catch (Exception e) {
            log.error("[WebSocket] 카드 뽑기 중 오류 발생: userName={}", payload.getUserName(), e);
        }
    }

    /**
     * 카드 사용 처리
     */
    public void handleUseCard(WebSocketSession session, UseCardPayload payload) {
        try {
            String roomId = roomService.getRoom(session.getId());
            String userId = webSocketSessionService.getUserIdBySessionId(session.getId());
            
            log.info("[WebSocket] 카드 사용 시작: roomId={}, userName={}, cardName={}",
                    roomId, payload.getUserName(), payload.getCardName());

            if ("null".equals(roomId))
                throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);

            boolean success = cardService.useCard(roomId, payload.getUserName(), payload.getCardName());

            UseCardPayload responsePayload = UseCardPayload.builder()
                    .result(success)
                    .build();

            MessageDto responseMessage = new MessageDto(
                    MessageType.USE_CARD,
                    objectMapper.valueToTree(responsePayload)
            );

            sessionMessageService.sendMessageToRoom(roomId, responseMessage);
            log.info("[WebSocket] 카드 사용 완료: roomId={}, success={}", roomId, success);

        } catch (Exception e) {
            log.error("[WebSocket] 카드 사용 중 오류 발생: userName={}, cardName={}",
                    payload.getUserName(), payload.getCardName(), e);
        }
    }

    /**
     * 천사카드 방어 처리 (비활성화됨 - DB에서 천사카드 주석처리)
     */
    public void handleAngelDefense(WebSocketSession session) {
        try {
            String roomId = roomService.getRoom(session.getId());
            String userId = webSocketSessionService.getUserIdBySessionId(session.getId());

            log.info("[WebSocket] 천사카드 방어 요청 (비활성화됨): roomId={}, userId={}", roomId, userId);

            // 천사카드는 DB에서 비활성화되어 있음
            // boolean success = cardService.useAngelCardDefense(roomId, userId);
            boolean success = false; // 항상 실패로 처리

            MessageDto responseMessage = new MessageDto(
                    MessageType.ANGEL_DEFENSE,
                    objectMapper.valueToTree(Map.of(
                            "success", success,
                            "userId", userId,
                            "message", "천사카드 기능이 비활성화되어 있습니다"
                    ))
            );

            sessionMessageService.sendMessageToRoom(roomId, responseMessage);
            log.info("[WebSocket] 천사카드 방어 완료 (비활성화됨): roomId={}, success={}", roomId, success);

        } catch (Exception e) {
            log.error("[WebSocket] 천사카드 방어 중 오류 발생: sessionId={}", session.getId(), e);
        }
    }
}