package com.ssafy.BlueMarble.websocket.config;

import com.ssafy.BlueMarble.domain.auth.security.JwtTokenProvider;
import com.ssafy.BlueMarble.domain.user.entity.User;
import com.ssafy.BlueMarble.domain.user.repository.UserRepository;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

public class CustomHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public CustomHandshakeInterceptor(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }


    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest req = servletRequest.getServletRequest();
            String token = req.getParameter("token");

            String userId, nickname, icon, nameTag;

            if(token == null){
                userId = java.util.UUID.randomUUID().toString().substring(0, 8);
                nickname = "User" + userId;
                icon="null";
                nameTag="null";
            }
            else if (!jwtTokenProvider.validateToken(token)) {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false; // 연결 거부
            }else{
                // 토큰이 유효하면, 사용자 정보 등 attributes에 저장 가능
                Long uid = jwtTokenProvider.getUserId(token);
                userId = String.valueOf(uid);
                User user = userRepository.findById(uid)
                        .orElseThrow(()->new BusinessException(BusinessError.USER_ID_NOT_FOUND));
                nickname = user.getNickname();
                icon = user.getIconUrl();
                if(icon==null) icon="null";
            }

            attributes.put("userId", userId);
            attributes.put("nickname", nickname);
            attributes.put("icon", icon);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {

    }
}
