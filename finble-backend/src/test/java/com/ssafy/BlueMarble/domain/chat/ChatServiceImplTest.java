//package com.ssafy.mafia.domain.chat;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.ssafy.mafia.domain.chat.dto.request.ChatMessageRequest;
//import com.ssafy.mafia.domain.chat.service.ChatServiceImpl;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Test;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.MockitoAnnotations;
//import org.springframework.data.redis.connection.MessageListener;
//import org.springframework.data.redis.core.RedisTemplate;
//import org.springframework.data.redis.core.StringRedisTemplate;
//import org.springframework.data.redis.core.ValueOperations;
//import org.springframework.data.redis.listener.RedisMessageListenerContainer;
//import org.springframework.data.redis.listener.Topic;
//
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.Mockito.*;
//import org.springframework.data.redis.core.SetOperations;
//
//class ChatServiceImplTest {
//    @Mock
//    private StringRedisTemplate stringRedisTemplate;
//    @Mock
//    private RedisTemplate<String, Object> redisTemplate;
//    @Mock
//    private ObjectMapper objectMapper;
//    @Mock
//    private RedisMessageListenerContainer redisMessageListenerContainer;
//    @Mock
//    private ValueOperations<String, Object> valueOperations;
//    @Mock
//    private SetOperations<String, Object> setOperations;
//    @InjectMocks
//    private ChatServiceImpl chatService;
//
//    @BeforeEach
//    void setUp() {
//        MockitoAnnotations.openMocks(this);
//        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
//        when(redisTemplate.opsForSet()).thenReturn(setOperations);
//    }
//
//    @Test
//    @DisplayName("채팅방 생성시 Redis에 방 정보가 저장되는지 테스트")
//    void testCreateChatChannel() {
//        String roomId = "room1";
//        chatService.createChatChannel(roomId);
//        verify(redisTemplate, times(1)).opsForValue();
//        verify(valueOperations, times(1)).set("chat:" + roomId, roomId);
//    }
//
//    @Test
//    @DisplayName("방 생성시 서브 채널이 모두 생성되는지 테스트")
//    void testCreateRoom() {
//        ChatServiceImpl spyService = spy(chatService);
//        doNothing().when(spyService).createChatChannel(any());
//        spyService.createRoom("room2");
//        verify(spyService, times(1)).createChatChannel("chat:room2:WAITING");
//        verify(spyService, times(1)).createChatChannel("chat:room2:MAFIA");
//        verify(spyService, times(1)).createChatChannel("chat:room2:GENERAL");
//    }
//
//    @Test
//    @DisplayName("메시지 발행시 Redis로 메시지가 전송되는지 테스트")
//    void testPublishMessage() throws Exception {
//        String roomId = "room1";
//        String chatId = "GENERAL";
//        String message = "hello";
//        String senderId = "user123";
//        String senderName = "user1";
//        ChatMessageRequest chatMessage = new ChatMessageRequest();
//        chatMessage.setMessage(message);
//        chatMessage.setSenderId(senderId);
//        chatMessage.setSenderName(senderName);
//        when(objectMapper.writeValueAsString(any())).thenReturn("{\"message\":\"hello\",\"senderId\":\"user123\",\"senderName\":\"user1\"}");
//
//        chatService.publishMessage(roomId, chatId, message, senderId, senderName);
//        verify(stringRedisTemplate, times(1)).convertAndSend(eq("chat:" + roomId + ":" + chatId), anyString());
//    }
//
//    @Test
//    @DisplayName("특정 채널 구독 해제시 RedisMessageListenerContainer에서 리스너가 제거되는지 테스트")
//    void testUnsubscribeChatChannel() {
//        Long roomId = 1L;
//        String chatId = "GENERAL";
//        String sessionKey = roomId; // roomId와 동일하게 맞춤
//        // 구독 등록
//        chatService.subscribeChatChannel(roomId, chatId, sessionKey);
//        // 구독 해제
//        chatService.unsubscribeChatChannel(roomId, chatId);
//        // 정상적으로 removeMessageListener가 호출되는지 확인
//        verify(redisMessageListenerContainer, atLeastOnce()).removeMessageListener(any(MessageListener.class), any(Topic.class));
//    }
//
//    @Test
//    @DisplayName("전체 채널 구독 해제시 모든 리스너가 제거되는지 테스트")
//    void testUnsubscribeAllChatChannels() {
//        Long roomId = 1L;
//        String chatId1 = "GENERAL";
//        String chatId2 = "MAFIA";
//        Long sessionKey = roomId; // roomId와 동일하게
//        // 여러 채널 구독 등록
//        chatService.subscribeChatChannel(roomId, chatId1, sessionKey);
//        chatService.subscribeChatChannel(roomId, chatId2, sessionKey);
//        // 전체 구독 해제
//        chatService.unsubscribeAllChatChannels(roomId);
//        // 정상적으로 removeMessageListener가 여러 번 호출되는지 확인
//        verify(redisMessageListenerContainer, atLeastOnce())
//            .removeMessageListener(any(MessageListener.class), any(Topic.class));
//    }
//
//    @Test
//    @DisplayName("채팅방 폭파시 Redis에서 방 및 하위 채널 정보가 삭제되는지 테스트")
//    void testDeleteRoom() {
//        String roomId = "room3";
//        chatService.deleteRoom(roomId);
//        verify(redisTemplate, times(1)).delete("chat:" + roomId);
//        verify(redisTemplate, times(1)).delete("chat:" + roomId + ":GENERAL");
//        verify(redisTemplate, times(1)).delete("chat:" + roomId + ":MAFIA");
//        verify(redisTemplate, times(1)).delete("chat:" + roomId + ":WAITING");
//        verify(redisTemplate.opsForSet(), times(1)).remove("chat:rooms", roomId);
//    }
//}