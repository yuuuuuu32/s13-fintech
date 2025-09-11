package com.ssafy.BlueMarble.domain.auth.service;

import com.ssafy.BlueMarble.domain.auth.dto.OAuthUserInfo;
import com.ssafy.BlueMarble.domain.auth.dto.request.GoogleLoginRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.TokenResponse;
import com.ssafy.BlueMarble.domain.auth.security.JwtTokenProvider;
import com.ssafy.BlueMarble.domain.user.entity.User;
import com.ssafy.BlueMarble.domain.user.repository.UserRepository;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.user.service.UserService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserService userService;
    private final UserRedisService userRedisService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, String> redisTemplate;
    private final GoogleOAuthService googleOAuthService;

    @Transactional
    public TokenResponse googleLogin(GoogleLoginRequest request) {
        OAuthUserInfo userInfo = googleOAuthService.verifyIDToken(request.getIdToken());

        User user = userRepository.findByEmail(userInfo.getEmail())
                .orElseGet(() -> createGoogleUser(userInfo));

        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtTokenProvider.generateToken(user, sessionId);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail(), user.getRole(), sessionId);

        redisTemplate.opsForValue().set(
                "RT:" + user.getEmail(),
                refreshToken,
                jwtTokenProvider.getRefreshTokenExpiration(),
                TimeUnit.MILLISECONDS
        );

        return new TokenResponse(accessToken, refreshToken, jwtTokenProvider.getEmail(accessToken));
    }

    private User createGoogleUser(OAuthUserInfo userInfo) {
        String nickname = userService.generateNickname();
        User user = User.createOAuthUser(
                userInfo.getEmail(),
                userInfo.getName(),
                nickname,
                User.Provider.GOOGLE
        );

        User savedUser = userRepository.save(user);
        userRedisService.putNickname(user.getId().toString(), user.getNickname(), "null");




        return savedUser;
    }

    public TokenResponse reissue(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(BusinessError.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getEmail(refreshToken);
        String roleString = jwtTokenProvider.getRole(refreshToken);

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new BusinessException(BusinessError.USER_EMAIL_NOT_FOUND);
        }

        String savedRefreshToken = redisTemplate.opsForValue().get("RT:" + email);

        if (!savedRefreshToken.equals(refreshToken)) {
            throw new BusinessException(BusinessError.INVALID_TOKEN);
        }

        String sessionId = jwtTokenProvider.getSessionId(refreshToken);
        String newAccessToken = jwtTokenProvider.generateToken(userOpt.get(), sessionId);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email, userOpt.get().getRole(), sessionId);
        redisTemplate.opsForValue().set(
                "RT:" + email,
                newRefreshToken,
                jwtTokenProvider.getRefreshTokenExpiration(),
                TimeUnit.MILLISECONDS
        );
        return new TokenResponse(newAccessToken, newRefreshToken, email);
    }

    public TokenResponse tempLogin() {
        User user = userRepository.findById(1L)
                .orElseThrow(() -> new BusinessException(BusinessError.USER_ID_NOT_FOUND));

        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtTokenProvider.generateToken(user, sessionId);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail(), user.getRole(), sessionId);

        redisTemplate.opsForValue().set(
                "RT:" + user.getEmail(),
                refreshToken,
                jwtTokenProvider.getRefreshTokenExpiration(),
                TimeUnit.MILLISECONDS
        );

        return new TokenResponse(accessToken, refreshToken, jwtTokenProvider.getEmail(accessToken));
    }


}