package com.ssafy.BlueMarble.domain.auth.service;

import com.ssafy.BlueMarble.domain.auth.dto.OAuthUserInfo;
import com.ssafy.BlueMarble.domain.auth.dto.request.GoogleLoginRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoUserInfoResponse;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
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

    @Transactional
    public TokenResponse kakaoLoginWithTokenReuse(KakaoUserInfoResponse kakaoUserInfo, String existingToken) {
        // 디버깅을 위한 로그 추가
        log.info("카카오 사용자 정보: {}", kakaoUserInfo);

        String email = kakaoUserInfo.getKakaoAccount().getEmail();
        String nickname = kakaoUserInfo.getKakaoAccount().getProfile().getNickname();

        log.info("추출된 이메일: {}, 닉네임: {}", email, nickname);

        // 이메일이 null인 경우 처리
        final String finalEmail;
        if (email == null || email.isEmpty()) {
            // 카카오 ID를 기반으로 임시 이메일 생성
            finalEmail = "kakao_" + kakaoUserInfo.getId() + "@kakao.com";
            log.warn("카카오 이메일이 null이므로 임시 이메일 생성: {}", finalEmail);
        } else {
            finalEmail = email;
        }

        // 닉네임이 null인 경우 처리
        final String finalNickname;
        if (nickname == null || nickname.isEmpty()) {
            finalNickname = "카카오사용자_" + kakaoUserInfo.getId();
            log.warn("카카오 닉네임이 null이므로 임시 닉네임 생성: {}", finalNickname);
        } else {
            finalNickname = nickname;
        }

        // 기존 사용자 조회 또는 신규 사용자 생성
        User user = userRepository.findByEmail(finalEmail)
                .orElseGet(() -> createKakaoUserFromKakaoInfo(finalEmail, finalNickname));

        // 기존 토큰이 있고 유효한 경우 재사용
        if (existingToken != null && existingToken.startsWith("Bearer ")) {
            String token = existingToken.substring(7);
            if (jwtTokenProvider.validateToken(token)) {
                String tokenEmail = jwtTokenProvider.getEmail(token);
                if (finalEmail.equals(tokenEmail)) {
                    log.info("기존 유효한 토큰 재사용: {}", tokenEmail);

                    // 기존 토큰의 refreshToken도 함께 반환
                    String savedRefreshToken = redisTemplate.opsForValue().get("RT:" + finalEmail);
                    if (savedRefreshToken != null) {
                        return new TokenResponse(token, savedRefreshToken, finalEmail);
                    }
                }
            }
        }

        // 기존 토큰이 없거나 유효하지 않은 경우 새로 발급
        log.info("새로운 토큰 발급: {}", finalEmail);
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

    @Transactional
    public TokenResponse kakaoLogin(KakaoUserInfoResponse kakaoUserInfo) {
        return kakaoLoginWithTokenReuse(kakaoUserInfo, null);
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


    private User createKakaoUserFromKakaoInfo(String email, String nickname) {
        log.info("카카오 사용자 생성 - 이메일: {}, 닉네임: {}", email, nickname);

        // null 체크 및 기본값 설정
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("이메일이 null이거나 비어있습니다.");
        }

        if (nickname == null || nickname.isEmpty()) {
            nickname = "카카오사용자";
        }

        User user = User.createOAuthUser(
                email,
                nickname, // 카카오에서는 name 대신 nickname 사용
                nickname,
                User.Provider.KAKAO
        );

        log.info("생성된 사용자: {}", user);

        User savedUser = userRepository.save(user);
        userRedisService.putNickname(user.getId().toString(), user.getNickname(), "null");

        return savedUser;
    }

    public TokenResponse reissue(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(BusinessError.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getEmail(refreshToken);

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