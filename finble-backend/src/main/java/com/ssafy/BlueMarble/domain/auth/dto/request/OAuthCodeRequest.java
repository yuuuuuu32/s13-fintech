package com.ssafy.BlueMarble.domain.auth.dto.request;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.util.UriComponentsBuilder;

@Getter
@Builder
@RequiredArgsConstructor
public class OAuthCodeRequest {
    private final String clientId;
    private final String redirectUri;
    private final String responseType;
    private final String state;
    private final String scope;
    public String toUriString(String baseAuthorizeUrl) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseAuthorizeUrl)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", responseType);

        if (state != null) builder.queryParam("state", state);
        if (scope != null) builder.queryParam("scope", scope);

        return builder.toUriString();
    }
}