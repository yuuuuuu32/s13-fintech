package com.ssafy.BlueMarble.domain.auth.controller;

import com.ssafy.BlueMarble.domain.auth.dto.request.GoogleLoginRequest;
import com.ssafy.BlueMarble.domain.auth.dto.request.TokenRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoUserInfoResponse;
import com.ssafy.BlueMarble.domain.auth.dto.response.TokenResponse;
import com.ssafy.BlueMarble.domain.auth.service.AuthService;
import com.ssafy.BlueMarble.domain.auth.service.kakaoAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "01.Auth", description = "사용자 인증 관련 API")
public class AuthController {

    private final AuthService authService;
    private final kakaoAuthService kakaoAuthService;

    @PostMapping("/google-login")
    @Operation(summary = "Google 로그인", description = "Google ID 토큰을 통한 로그인/회원가입 처리")
    public ResponseEntity<TokenResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        TokenResponse token = authService.googleLogin(request);
        return ResponseEntity.ok(token);
    }

    // 리다이렉트 기반 카카오 로그인은 사용하지 않음 (SDK 토큰 기반으로 통일)

    @PostMapping("/kakao")
    @Operation(summary = "Kakao 로그인", description = "프론트에서 받은 Kakao accessToken으로 로그인/회원가입 처리")
    public ResponseEntity<TokenResponse> kakaoLoginWithAccessToken(@RequestBody Map<String, String> body) {
        String accessToken = body.get("accessToken");
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("accessToken is required");
        }
        KakaoUserInfoResponse kakaoUserInfoResponse = kakaoAuthService.getKakaoUserInfo(accessToken);
        TokenResponse token = authService.kakaoLogin(kakaoUserInfoResponse);
        return ResponseEntity.ok(token);
    }

    @PostMapping("/reissue")
    @Operation(summary = "토큰 재발급", description = "refresh token을 통해 access token 재발급")
    public ResponseEntity<TokenResponse> reissue(@RequestBody TokenRequest request) {
        TokenResponse token = authService.reissue(request.getRefreshToken());
        return ResponseEntity.ok(token);
    }

    // 테스트용 로그인
    @PostMapping("/temp-login")
    public ResponseEntity<TokenResponse> tempLogin() {
        try {
            TokenResponse token = authService.tempLogin();
            return ResponseEntity.ok(token);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}

