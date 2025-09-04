package com.ssafy.BlueMarble.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OAuthUserInfo {
    private String email;
    private String name;
    private String picture;
}