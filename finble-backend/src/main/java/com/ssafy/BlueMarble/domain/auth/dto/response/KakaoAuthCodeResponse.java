package com.ssafy.BlueMarble.domain.auth.dto.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class KakaoAuthCodeResponse {
    private final String authorizationUrl;
}
