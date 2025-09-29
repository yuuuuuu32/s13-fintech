package com.ssafy.BlueMarble.domain.user.service;

import com.ssafy.BlueMarble.domain.auth.security.JwtTokenProvider;
import com.ssafy.BlueMarble.domain.user.dto.request.UpdateUserInfoRequest;
import com.ssafy.BlueMarble.domain.user.dto.response.UserInfoResponse;
import com.ssafy.BlueMarble.domain.user.dto.response.UserSearchResponseDTO;
import com.ssafy.BlueMarble.domain.user.entity.User;
import com.ssafy.BlueMarble.domain.user.repository.UserRepository;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRedisService userRedisService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, String> redisTemplate;
    private final Random random = new Random();

    public UserInfoResponse getUserInfo(User user) {
        return UserInfoResponse.builder()
                .nickname(user.getNickname())
                .build();
    }

    public String generateNickname() {
        String nickname;
        do {
            nickname = "Player" + (10000 + random.nextInt(90000));
        } while (userRepository.existsByNickname(nickname));

        return nickname;
    }

    @Transactional
    public boolean updateUserInfo(User user, UpdateUserInfoRequest request) {
        // 닉네임 중복 체크
        if (userRepository.existsByNickname(request.getNickname()))
            throw new BusinessException(BusinessError.NICKNAME_DUPLICATED);

        request.applyTo(user);

        userRepository.save(user);

        return true;
    }

    public void logOut(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(BusinessError.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getEmail(refreshToken);
        String redisKey = "RT:" + email;

        Boolean isDeleted = redisTemplate.delete(redisKey);

        if (!(isDeleted)) {
            throw new BusinessException(BusinessError.TOKEN_DELETE_FAIL);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(BusinessError.USER_EMAIL_NOT_FOUND));

        userRepository.save(user);
    }

    public void deleteUser(User user) {
        userRepository.delete(user);
    }

    public UserSearchResponseDTO searchUser(String userName) {
        return userRepository.findByNickname(userName);
    }

    public String getUserIdByNickname(CreateMapPayload gameMapState, String userName) {
        return gameMapState.getPlayers().entrySet().stream()
                .filter(entry -> userName.equals(entry.getValue().getNickname()))
                .map(entry -> entry.getKey())
                .findFirst()
                .orElse(null);
    }
}