package com.ssafy.BlueMarble.domain.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KakaoUserInfoResponse {
    private Long id;
    @JsonProperty("kakao_account")
    private KakaoAccount kakaoAccount;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KakaoAccount {
        private String email;
        private KakaoProfile profile;
    }
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KakaoProfile {
        private String nickname;
        private String profileImageUrl;
    }
}