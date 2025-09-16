package com.ssafy.BlueMarble.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Getter
@RequiredArgsConstructor
public class KakoAuthTokenResponse {
    private final String token_type;
    private final String access_token;
    private final String expires_in;
    private final String refresh_token;
    private final String refresh_token_expires_in;
    private final String scope;
    private final String id_token;
}
