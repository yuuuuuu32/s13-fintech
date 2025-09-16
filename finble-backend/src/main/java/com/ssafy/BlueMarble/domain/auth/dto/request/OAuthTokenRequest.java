package com.ssafy.BlueMarble.domain.auth.dto.request;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Getter
@Setter
@Builder
@RequiredArgsConstructor
public class OAuthTokenRequest {
    private final String grant_type;
    private final String client_id;
    private final String redirect_uri;
    private final String code;
    private final String client_secret;

    public MultiValueMap<String, String> toMultiValueMap() {
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", grant_type);
        map.add("client_id", client_id);
        map.add("redirect_uri", redirect_uri);
        map.add("code", code);

        if (!(client_secret == null)) {
            map.add("client_secret", client_secret);
        }
        return map;
    }
}