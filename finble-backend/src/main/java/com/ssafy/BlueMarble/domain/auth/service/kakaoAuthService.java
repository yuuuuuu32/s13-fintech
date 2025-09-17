package com.ssafy.BlueMarble.domain.auth.service;

import com.ssafy.BlueMarble.domain.auth.dto.request.OAuthTokenRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakaoUserInfoResponse;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakoAuthTokenResponse;
import com.ssafy.BlueMarble.domain.auth.repository.KakaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class kakaoAuthService {

    private final KakaoRepository kakaoRepository;

    //    @Value("${KAKAO_TOKEN_URL}")
    private String kakaoTokenUrl = "https://kauth.kakao.com/oauth/token";

    private final RestTemplate restTemplate;

//    @Value("${KAKAO_REST_API_KEY}")
    private String kakaoClientId = "409725197be3c8a40abff4791c2ac7e6";

    private String kakaoUserUrl = "https://kapi.kakao.com/v2/user/me";

    // authorization code 기반 플로우는 사용하지 않음

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

    // state 검증 로직도 사용하지 않음

}
