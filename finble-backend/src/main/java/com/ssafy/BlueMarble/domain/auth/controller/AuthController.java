package com.ssafy.BlueMarble.domain.auth.controller;

import com.ssafy.BlueMarble.domain.auth.dto.request.GoogleLoginRequest;
import com.ssafy.BlueMarble.domain.auth.dto.request.TokenRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoAuthCodeResponse;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoUserInfoResponse;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakoAuthTokenResponse;
import com.ssafy.BlueMarble.domain.auth.dto.response.TokenResponse;
import com.ssafy.BlueMarble.domain.auth.service.AuthService;
import com.ssafy.BlueMarble.domain.auth.service.kakaoAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

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

    /**
     * kakao 리다이렉트 url 호출하는 API
     * */
    @PostMapping("/kakao-login")
    @Operation(summary = "Kakao 로그인", description = "kakao 로그인 하는거에요")
    public KakaoAuthCodeResponse getAuthorizationUrl() {
        String state = UUID.randomUUID().toString();
        String authorizationUrl = kakaoAuthService.buildAuthorizationUrl(state);
        return new KakaoAuthCodeResponse(authorizationUrl);
    }

    @GetMapping("/kakao/callback")
    @Operation(summary = "Kakao 로그인 콜백", description = "카카오 OAuth 인증 후 콜백 처리 및 토큰 발급")
    public ResponseEntity<TokenResponse> kakaoCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestHeader(value = "Authorization", required = false) String existingToken) {

        try {
            // 1. state 검증 
            // TODO : 현재 검증 안하고 있음
            boolean isValidState = kakaoAuthService.validateState(state);
            if (!isValidState) {
                throw new RuntimeException("Invalid state parameter");
            }

            // 2. 받은 인가 코드(code)를 이용해 토큰 요청을 진행할 수 있도록 다음 처리 호출
            KakoAuthTokenResponse kakoAuthTokenResponse = kakaoAuthService.requestAccessToken(code);

            // 3.AccessToken을 받아와서 유저정보 요청
            KakaoUserInfoResponse kakaoUserInfoResponse = kakaoAuthService.getKakaoUserInfo(kakoAuthTokenResponse.getAccess_token());
            
            // 4. 기존 토큰이 있는 경우 검증 후 재사용, 없으면 새로 발급
            TokenResponse tokenResponse = authService.kakaoLoginWithTokenReuse(kakaoUserInfoResponse, existingToken);
            
            // 5. 토큰 응답 반환
            return ResponseEntity.ok(tokenResponse);
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("카카오 로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @PostMapping("/kakao")
    @Operation(summary = "Kakao 로그인(프론트 SDK 토큰)", description = "프론트에서 받은 Kakao accessToken으로 로그인/회원가입 처리")
    public ResponseEntity<TokenResponse> kakaoLoginWithAccessToken(@RequestBody java.util.Map<String, String> body) {
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

