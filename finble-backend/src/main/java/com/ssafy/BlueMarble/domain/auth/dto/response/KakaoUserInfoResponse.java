package com.ssafy.BlueMarble.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class KakaoUserInfoResponse {
    private Long id;
    private KakaoAccount kakaoAccount;

    @Getter
    public static class KakaoAccount {
        private String email;
        private KakaoProfile profile;
    }
    @Getter
    public static class KakaoProfile {
        private String nickname;
        private String profileImageUrl;
    }
}