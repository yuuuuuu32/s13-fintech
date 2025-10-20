package com.ssafy.BlueMarble.domain.auth.service;

import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoUserInfoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class kakaoAuthService {

    private final RestTemplate restTemplate;

    private String kakaoUserUrl = "https://kapi.kakao.com/v2/user/me";

    /**
     * 서비스 서버 -> 카카오 서버
     * AccessToken을 사용하여 사용자 정보를 받아온다.
     *
     * @param accessToken : 카카오 서버로부터 받아온 accessToken
     * @return KakaoUserInfoResponse : 사용자의 이름, 이메일 등을 받아옴
     *
     */
    public KakaoUserInfoResponse getKakaoUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<KakaoUserInfoResponse> response = restTemplate.exchange(
                kakaoUserUrl,
                HttpMethod.GET,
                entity,
                KakaoUserInfoResponse.class
        );
        return response.getBody();
    }
}
