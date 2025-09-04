package com.ssafy.BlueMarble.websocket.config;

import com.ssafy.BlueMarble.domain.auth.security.JwtTokenProvider;
import com.ssafy.BlueMarble.domain.user.repository.UserRepository;
import com.ssafy.BlueMarble.websocket.handler.ExceptionHandlingWebSocketHandler;
import com.ssafy.BlueMarble.websocket.handler.WebSocketHandler;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
    private final WebSocketHandler chatWebSocketHandler;
    private final SessionMessageService sessionMessageService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    /**
     * WebSocket 연결을 위해서 Handler를 구성합니다.
     *
     * @param registry
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {

        registry
                // 클라이언트에서 웹 소켓 연결을 위해 "ws"라는 엔드포인트로 연결을 시도하면 ChatWebSocketHandler 클래스에서 이를 처리합니다.
                .addHandler(new ExceptionHandlingWebSocketHandler(chatWebSocketHandler, sessionMessageService), "/ws")
                .addInterceptors(new CustomHandshakeInterceptor(jwtTokenProvider, userRepository)) // 인터셉터 추가
                .setAllowedOrigins("*");
    }

}