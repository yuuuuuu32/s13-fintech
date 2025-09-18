package com.ssafy.BlueMarble.domain.room.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.room.dto.FastStartResponse;
import com.ssafy.BlueMarble.domain.room.dto.RoomListDTO;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import org.springframework.context.ApplicationEventPublisher;
import com.ssafy.BlueMarble.global.common.event.RoomDeletedEvent;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.dto.UserListDto;
import com.ssafy.BlueMarble.websocket.dto.payload.room.*;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import com.ssafy.BlueMarble.websocket.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {
    private final String roomIdKey = "room:id"; //room id들 관리하는 키
    private final String ROOM_NUMBER_KEY = "room:number"; //roomId관리하는 키
    private final String SESSIONID_TO_ROOM_KEY = "session:room";  // sessionId -> roomNum

    private final RedisTemplate<String, String> redisTemplate;
    private final SessionMessageService sessionMessageService;
    private final UserRedisService userRedisService;
    private final ObjectMapper objectMapper;
    private final WebSocketSessionService webSocketSessionService;
    private final ApplicationEventPublisher eventPublisher;
    private final int MAX_USER_LIMIT = 4;

    //대기방 만들기₩
    public void createRoom(WebSocketSession session, CreateRoomPayload createRoomPayload) {
        log.info("createRoom 메서드 시작");

        //방 인원제한 체크
        if(createRoomPayload.getUserLimit() > MAX_USER_LIMIT){
            sessionMessageService.sendMessage(
                    session,
                    new MessageDto(
                            MessageType.CREATE_ROOM_FAIL,
                            objectMapper.createObjectNode().put("message", "방의 최대 인원 제한은 4명입니다.")
                    )
            );
            return;
        }

        if(createRoomPayload.getRoomName() == null){
            throw new BusinessException(BusinessError.ROOM_NAME_NULL);
        }

        //방 id -> 유저 리스트
        String sessionId = session.getId();
        String userId = webSocketSessionService.getUserIdBySessionId(sessionId);
        log.info("세션 정보 확인: sessionId={}, userId={}", sessionId, userId);
        if("null".equals(userId))
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);

        String roomId = makeRoomNumber();
        log.info("방 번호 생성 완료: {}", roomId);
        redisTemplate.opsForValue().set("room:" + roomId + ":channel", "normal");

        String usersKey = "room:" + roomId + ":users";
        redisTemplate.opsForSet().add(usersKey, userId);
        log.info("유저 추가 완료");

        //방장이 누구인지
        String ownerKey = "room:" + roomId + ":owner";
        redisTemplate.opsForValue().set(ownerKey, userId);
        log.info("방장 설정 완료");

        //방의 정보(이름 등)
        String roomInfoKey = "room:" + roomId + ":info";
        redisTemplate.opsForHash().put(roomInfoKey, "roomName", createRoomPayload.getRoomName());
        log.info("방 정보 설정 완료");

        //방 아이디 -> 상태 관리
        String stateKey = "room:" + roomId + ":state";
        redisTemplate.opsForValue().set(stateKey, GameState.WAITING.name());
        log.info("방 상태 설정 완료");

        String userLimitKey = "room:" + roomId + ":userLimit";
        redisTemplate.opsForValue().set(userLimitKey, String.valueOf(createRoomPayload.getUserLimit()));
        log.info("유저 제한 설정 완료");

        //방 아이디 관리
        redisTemplate.opsForSet().add(roomIdKey, String.valueOf(roomId));
        log.info("방 ID 관리 설정 완료");

        //session -> roomId
        log.info("addRoom 호출 - roomId: {}, sessionId: {}", roomId, sessionId);
        addRoom(sessionId, roomId);

        // 생성 성공 응답 전송
        JsonNode okPayload = objectMapper.createObjectNode().put("roomId", roomId);
        MessageDto okMessage = new MessageDto(MessageType.CREATE_ROOM_OK, okPayload);
        sessionMessageService.sendMessage(session, okMessage);

    }

    public Page<RoomListDTO> getRoomList(Pageable pageable, String searchKey) {
        Set<String> roomIdSet = redisTemplate.opsForSet().members(roomIdKey);
        List<RoomListDTO> allRooms = new ArrayList<>();

        for (String roomId : roomIdSet) {
            String roomInfoKey = "room:" + roomId + ":info";
            String stateKey = "room:" + roomId + ":state";
            GameState state = GameState.valueOf(redisTemplate.opsForValue().get(stateKey));
            if(state != GameState.WAITING)
                continue;
            String roomName = (String) redisTemplate.opsForHash().get(roomInfoKey, "roomName");
            if(searchKey!=null && !roomName.contains(searchKey) )
                continue;
            String usersKey = "room:" + roomId + ":users";
            Long cnt = redisTemplate.opsForSet().size(usersKey);

            String userLimitKey = "room:" + roomId + ":userLimit";
            Long userLimit = Long.parseLong(redisTemplate.opsForValue().get(userLimitKey));

            String ownerKey = "room:" + roomId + ":owner";
            String ownerUserId = redisTemplate.opsForValue().get(ownerKey);
            String ownerNickname = userRedisService.getNickname(ownerUserId);

            allRooms.add(
                    RoomListDTO.builder()
                            .roomId(roomId)
                            .roomName(roomName)
                            .roomState(state)
                            .userCnt(cnt)
                            .userLimit(userLimit)
                            .ownerNickname(ownerNickname)
                            .build()
            );
        }

        // 정렬이 필요하다면 Pageable.getSort()에 맞춰 추가
        // 예: allRooms.sort(Comparator.comparing(RoomListDTO::getRoomId));

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allRooms.size());
        List<RoomListDTO> pagedRooms = (start > end) ? Collections.emptyList() : allRooms.subList(start, end);

        return new PageImpl<>(pagedRooms, pageable, allRooms.size());
    }

    public void enterRoom(WebSocketSession session, EnterRoomPayload enterRoomPayload) throws IOException {
        String roomId = enterRoomPayload.getRoomId();
        String sessionId = session.getId();
        String userId = webSocketSessionService.getUserIdBySessionId(sessionId);
        if(roomId == null)
            throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
        if("null".equals(userId))
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);

        log.info("방 입장 시도 - roomId: {}, sessionId: {}, userId: {}", roomId, sessionId, userId);

        //"room:id"에 방이 존재하는지 체크하기
        //없으면 방이없어졌다는 메시지 리턴
        Set<String> roomIdSet = redisTemplate.opsForSet().members(roomIdKey);
        log.info("현재 존재하는 방 목록: {}", roomIdSet);

        if (!roomIdSet.contains(roomId)) {
            log.warn("존재하지 않는 방 입장 시도 - roomId: {}", roomId);
            throw new BusinessException(BusinessError.ENTER_ROOM_FAIL);
        }

        log.info("방 존재 확인 완료 - roomId: {}", roomId);
        String stateKey = "room:" + roomId + ":state";
        GameState state = GameState.valueOf(redisTemplate.opsForValue().get(stateKey));
        if (state != GameState.WAITING) {
            log.warn("대기중인 방 아님");
            throw new BusinessException(BusinessError.ENTER_ROOM_FAIL);
        }

        //방 아이디를 바탕으로 유저 정보 가져오기
        String usersKey = "room:" + roomId + ":users";
        Set<String> userSet = redisTemplate.opsForSet().members(usersKey);

        String userLimitKey = "room:" + roomId + ":userLimit";
        Long userLimit = Long.parseLong(redisTemplate.opsForValue().get(userLimitKey));

        //있으면 인원수 체크해서 12명이상이면 꽉찼다는 메시지
        if (userSet.size() > userLimit) {
            log.warn("인원 꽉 참");
            throw new BusinessException(BusinessError.ENTER_ROOM_FAIL);
        }

        //참여 가능하면 사람들 정보 가져와서 List<UserListResponse>로 바꿔서 담아 return
        List<UserListDto> userList = new ArrayList<>();
        for (String roomUserId : userSet) {
            String nickname = userRedisService.getNickname(roomUserId);
            boolean owner = isOwner(roomId, roomUserId);
            userList.add(new UserListDto(roomUserId, nickname, owner));
        }

        JsonNode userJson = objectMapper.valueToTree(userList);
        MessageDto message = new MessageDto(MessageType.ENTER_ROOM_OK, userJson);
        sessionMessageService.sendMessage(session, message);

        //이후 roomId에 속한 session들에게 새로운 유저 정보 전달
        String nickname = userRedisService.getNickname(userId);

        JsonNode jsonNode = objectMapper.valueToTree(new NewUserPayload(userId, nickname));
        message = new MessageDto(MessageType.ENTER_NEW_USER, jsonNode);
        for (String oldUserId : userSet) {
            WebSocketSession session2 = webSocketSessionService.getSessionByUserId(oldUserId);
            sessionMessageService.sendMessage(session2, message);
        }

        //redis방에 사람 추가
        redisTemplate.opsForSet().add(usersKey, userId);
        addRoom(sessionId, roomId);

    }

    public void exitRoom(WebSocketSession session) {
        String roomId = getRoom(session.getId());
        String sessionId = session.getId();
        String userId = webSocketSessionService.getUserIdBySessionId(sessionId);
        String userNickName = userRedisService.getNickname(userId);
        //세션->방번호 삭제
        redisTemplate.opsForHash().delete(SESSIONID_TO_ROOM_KEY, sessionId);
        //
        webSocketSessionService.removeSession(sessionId);

        //방 번호 -> 유저 id 삭제
        String usersKey = "room:" + roomId + ":users";
        redisTemplate.opsForSet().remove(usersKey, userId);

        //방에 아무도 없다면 방을 삭제하기
        Set<String> userSet = redisTemplate.opsForSet().members(usersKey);
        if (userSet.isEmpty()) {
            deleteRoom(roomId);
            return;
        }

        //방장이라면 다른사람에게 새로운 방장 골라
        String ownerKey = "room:" + roomId + ":owner";
        String ownerId = redisTemplate.opsForValue().get(ownerKey);
        String newOwnerId = ownerId;
        String ownerNickname;
        if (ownerId.equals(userId)) {
            newOwnerId = redisTemplate.opsForSet().randomMember(usersKey);
            redisTemplate.opsForValue().set(ownerKey, newOwnerId);
        }

        // fix : 방장 닉네임으로 바꿔서 보내줌
        ownerNickname = userRedisService.getNickname(newOwnerId);
        //남은 방 사람들에게 나갔다는 신호 보내기
        JsonNode jsonNode = objectMapper.valueToTree(new ExitRoomPayload(userNickName, ownerNickname));
        MessageDto message = new MessageDto(MessageType.EXIT_USER, jsonNode);
        for (String leftUser : userSet) {
            WebSocketSession leftUserSession = webSocketSessionService.getSessionByUserId(leftUser);
            sessionMessageService.sendMessage(leftUserSession, message);
        }
        userRedisService.exit(userId, userNickName);
    }

    public void deleteRoom(String roomId) {
        // 방 관련 데이터 정리
        String usersKey = "room:" + roomId + ":users";
        redisTemplate.delete(usersKey);
        redisTemplate.opsForSet().remove(roomIdKey, String.valueOf(roomId));
        String infoKey = "room:" + roomId + ":info";
        redisTemplate.delete(infoKey);
        String stateKey = "room:" + roomId + ":state";
        redisTemplate.delete(stateKey);
        String ownerKey = "room:" + roomId + ":owner";
        redisTemplate.delete(ownerKey);
        String userLimitKey = "room:" + roomId + ":userLimit";
        redisTemplate.delete(userLimitKey);
        String missionKey = "room:" + roomId + ":mission";
        redisTemplate.delete(missionKey);
        redisTemplate.delete("room:" + roomId + ":channel");
        
        // 게임 관련 데이터 정리를 위한 이벤트 발행
        eventPublisher.publishEvent(new RoomDeletedEvent(this, roomId));
        
        log.info("방 삭제 완료: roomId={}", roomId);
    }

    public void kick(WebSocketSession session, KickRoomPayload kickRoomPayload) {
        String sessionId = session.getId();
        String kickedUserNickname = kickRoomPayload.getUserNickname();
        String kickedUserId = userRedisService.getUserIdByNickname(kickedUserNickname);
        String roomId = getRoom(sessionId);

        String usersKey = "room:" + roomId + ":users";
        redisTemplate.opsForSet().remove(usersKey, kickedUserId);

        //강제 퇴장 된 유저를 남은 유저에게 알리기
        Set<String> users = redisTemplate.opsForSet().members(usersKey);
        JsonNode jsonNode = objectMapper.valueToTree(kickRoomPayload);
        MessageDto message = new MessageDto(MessageType.KICK_USER, jsonNode);
        for (String userId : users) {
            WebSocketSession leftUserSession = webSocketSessionService.getSessionByUserId(userId);
            sessionMessageService.sendMessage(leftUserSession, message);
        }

        //강제 퇴장 된 유저에게 알리기
        WebSocketSession kickedUserSession = webSocketSessionService.getSessionByUserId(kickedUserId);
        message = new MessageDto(MessageType.KICKED, objectMapper.nullNode());
        sessionMessageService.sendMessage(kickedUserSession, message);
        try {
            kickedUserSession.close();
        } catch (IOException e) {
            throw new RuntimeException("세션이 비정상 종료됨");
        }
    }

    public String makeRoomNumber() {
        Long roomId;
        do {
            roomId = redisTemplate.opsForValue().increment(ROOM_NUMBER_KEY);
            if (roomId > 99999) {
                redisTemplate.opsForValue().set(ROOM_NUMBER_KEY, "1");
                roomId = 1L;
            }
        } while (redisTemplate.opsForSet().isMember(roomIdKey, String.valueOf(roomId)));
        return String.valueOf(roomId);
    }

    //방장인지 체크해줌
    public boolean isOwner(String roomId, String userId) {
        String ownerKey = "room:" + roomId + ":owner";
        String ownerId = redisTemplate.opsForValue().get(ownerKey);

        return userId.equals(ownerId);
    }

    public void addRoom(String sessionId, String roomId) {
        log.info("addRoom 메서드 시작 - sessionId: {}, roomId: {}", sessionId, roomId);
        redisTemplate.opsForHash().put(SESSIONID_TO_ROOM_KEY, sessionId, String.valueOf(roomId));
        log.info("addRoom 메서드 완료 - sessionId: {}, roomId: {}", sessionId, roomId);
    }

    public String getRoom(String sessionId) {
        return (String) redisTemplate.opsForHash().get(SESSIONID_TO_ROOM_KEY, sessionId);
    }

    public FastStartResponse fastStart()  {
        Set<String> roomIdSet = redisTemplate.opsForSet().members(roomIdKey);

        for (String roomId : roomIdSet) {
            String stateKey = "room:" + roomId + ":state";
            GameState state = GameState.valueOf(redisTemplate.opsForValue().get(stateKey));
            if(state != GameState.WAITING)continue;

            String usersKey = "room:" + roomId + ":users";
            Long cnt = redisTemplate.opsForSet().size(usersKey);

            String userLimitKey = "room:" + roomId + ":userLimit";
            long userLimit = Long.parseLong(redisTemplate.opsForValue().get(userLimitKey));
            if(cnt >= userLimit) continue;

            return new FastStartResponse(roomId);
        }
        throw new BusinessException(BusinessError.ROOM_NOT_EXIST);
    }
}
