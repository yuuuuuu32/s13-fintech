package com.ssafy.BlueMarble.domain.auth.controller;

import com.ssafy.BlueMarble.domain.auth.dto.request.GoogleLoginRequest;
import com.ssafy.BlueMarble.domain.auth.dto.request.TokenRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.TokenResponse;
import com.ssafy.BlueMarble.domain.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@Tag(name = "01.Auth", description = "사용자 인증 관련 API")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/google-login")
    @Operation(summary = "Google 로그인", description = "Google ID 토큰을 통한 로그인/회원가입 처리")
    public ResponseEntity<TokenResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        TokenResponse token = authService.googleLogin(request);
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

