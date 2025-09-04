package com.ssafy.BlueMarble.websocket.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.service.CardService;
import com.ssafy.BlueMarble.domain.game.service.MapService;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;

import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.UseCardPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.room.CreateRoomPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.room.EnterRoomPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.room.KickRoomPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import com.ssafy.BlueMarble.websocket.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;


/**
 * 텍스트 기반의 WebSocket 메시지를 처리를 수행하는 Handler 입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketHandler extends TextWebSocketHandler {
    private final WebSocketSessionService webSocketSessionService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final UserRedisService userRedisService;
    private final MapService mapService;
    private final CardService cardService;
    private final SessionMessageService sessionMessageService;

    /**
     * [연결 성공] WebSocket 협상이 성공적으로 완료되고 WebSocket 연결이 열려 사용할 준비가 된 후 호출됩니다.
     * - 성공을 하였을 경우 session 값을 추가합니다.
     *
     * @param session
     * @throws Exception
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("[+] afterConnectionEstablished :: " + session.getId());
        log.info("[WebSocket] afterConnectionEstablished 시작 - sessionId: {}", session.getId());

        String userId = (String) session.getAttributes().get("userId");
        String nickname = (String) session.getAttributes().get("nickname");
        String icon = String.valueOf(session.getAttributes().get("icon"));
        String nameTag = String.valueOf(session.getAttributes().get("nameTag"));

        log.info("새로운 WebSocket 연결: sessionId={}, userId={}, nickname={} icon={}, nameTag={}",
                session.getId(), userId, nickname, icon, nameTag);

        webSocketSessionService.addSession(userId, session);
        userRedisService.putNickname(userId, nickname, icon, nameTag);
        log.info("[WebSocket] afterConnectionEstablished 완료 - sessionId: {}", session.getId());
    }

    /**
     * [메시지 전달] 새로운 WebSocket 메시지가 도착했을 때 호출됩니다.
     * - 전달 받은 메시지를 순회하면서 메시지를 전송합니다.
     * - message.getPayload()를 통해 메시지가 전달이 됩니다.
     *
     * @param session
     * @param message
     * @throws Exception
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        System.out.println("=== WebSocketHandler.handleTextMessage 호출됨 ===");
        System.out.println("[+] handleTextMessage :: " + session);
        System.out.println("[+] handleTextMessage :: " + message.getPayload());


        log.info("[WebSocket] handleTextMessage 시작 - sessionId: {}, payload: {}", session.getId(), message.getPayload());

        MessageDto chatMessageDto = objectMapper.readValue(message.getPayload(), MessageDto.class);
        log.info("[WebSocket] 메시지 수신: type={}, sessionId={}", chatMessageDto.getType(), session.getId());

        // 중복코드 방지
        String roomId = null;
        String userId = null;

        if (needsRoomIdAndUserId(chatMessageDto.getType())) {
            roomId = roomService.getRoom(session.getId());
            userId = webSocketSessionService.getUserIdBySessionId(session.getId());
        } else if (needsRoomId(chatMessageDto.getType())) {
            roomId = roomService.getRoom(session.getId());
        }

        log.info("[WebSocket] switch 문 시작 - type: {}", chatMessageDto.getType());
        switch (chatMessageDto.getType()) {
            case CREATE_ROOM:
                log.info("[WebSocket] CREATE_ROOM 처리 시작 - sessionId: {}", session.getId());
                CreateRoomPayload createRoomPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), CreateRoomPayload.class);
                roomService.createRoom(session, createRoomPayload);
                log.info("[WebSocket] CREATE_ROOM 처리 완료 - sessionId: {}", session.getId());
                break;
            case ENTER_ROOM:
                EnterRoomPayload enterRoomPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), EnterRoomPayload.class);
                roomService.enterRoom(session, enterRoomPayload);
                break;
            case EXIT_ROOM:
                session.close();
                break;
            case KICK:
                KickRoomPayload kickRoomPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), KickRoomPayload.class);
                roomService.kick(session, kickRoomPayload);
                break;
            case START_GAME:
                log.info("[WebSocket] 게임 시작 요청: roomId={}, sessionId={}", roomId, session.getId());
                if ("null".equals(roomId))
                    throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
                CreateMapPayload createMapPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), CreateMapPayload.class);
                mapService.createNewGameMapState(session, createMapPayload);
                break;
            case USE_CARD:
                log.info("[WebSocket] 카드 사용 요청: roomId={}, sessionId={}", roomId, session.getId());
                if ("null".equals(roomId))
                    throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
                UseCardPayload useCardPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), UseCardPayload.class);
                boolean cardUsed = cardService.useCard(roomId, useCardPayload.getUserName(), useCardPayload.getCardName());
                
                UseCardPayload responsePayload = UseCardPayload.builder()
                        .result(cardUsed)
                        .build();
                
                MessageDto responseMessage = MessageDto.builder()
                        .type(MessageType.USE_CARD)
                        .payload(objectMapper.valueToTree(responsePayload))
                        .build();
                        
                sessionMessageService.sendMessageToRoom(roomId, responseMessage);
                log.info("[WebSocket] 카드 사용 결과 전송 완료: roomId={}, result={}", roomId, cardUsed);
                break;
            case DRAW_CARD:
                log.info("[WebSocket] 카드 뽑기 요청: roomId={}, sessionId={}", roomId, session.getId());
                if ("null".equals(roomId))
                    throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
                DrawCardPayload drawCardPayload = objectMapper.treeToValue(chatMessageDto.getPayload(), DrawCardPayload.class);
                DrawCardPayload.DrawCardResult drawResult = cardService.drawCard(roomId, drawCardPayload.getUserName());
                
                if (drawResult != null) {
                    DrawCardPayload drawResponsePayload = DrawCardPayload.builder()
                            .result(drawResult)
                            .build();
                    
                    MessageDto drawResponseMessage = MessageDto.builder()
                            .type(MessageType.DRAW_CARD)
                            .payload(objectMapper.valueToTree(drawResponsePayload))
                            .build();
                            
                    sessionMessageService.sendMessageToRoom(roomId, drawResponseMessage);
                    log.info("[WebSocket] 카드 뽑기 결과 전송 완료: roomId={}, userName={}, cardName={}", 
                            roomId, drawResult.getUserName(), drawResult.getCardName());
                } else {
                    log.error("[WebSocket] 카드 뽑기 실패: roomId={}, userName={}", roomId, drawCardPayload.getUserName());
                }
                break;

        }

        log.info("[WebSocket] handleTextMessage 종료 - sessionId: {}", session.getId());

    }


    //     roomId와 uid가 필요한 메시지 타입들을 체크하는 헬퍼 메서드
    private boolean needsRoomIdAndUserId(MessageType messageType) {
//        return messageType == MessageType.NIGHT_VOTE ||
//                messageType == MessageType.DAY_VOTE ||
//                messageType == MessageType.PF_VOTE;
        return true;
    }

    private boolean needsRoomId(MessageType messageType) {
        return messageType == MessageType.START_GAME;
    }

    /**
     * [소켓 종료 및 전송 오류] WebSocket 연결이 어느 쪽에서든 종료되거나 전송 오류가 발생한 후 호출됩니다.
     * - 종료 및 실패하였을 경우 해당 세션을 제거합니다.
     *
     * @param session
     * @param status
     * @throws Exception
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        roomService.exitRoom(session);
        log.info("[+] afterConnectionClosed - Session: " + session.getId() + ", CloseStatus: " + status);
    }
}