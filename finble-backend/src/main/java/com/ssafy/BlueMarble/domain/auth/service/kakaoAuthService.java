package com.ssafy.BlueMarble.domain.auth.service;

import com.ssafy.BlueMarble.domain.auth.dto.request.OAuthCodeRequest;
import com.ssafy.BlueMarble.domain.auth.dto.request.OAuthTokenRequest;
import com.ssafy.BlueMarble.domain.auth.dto.response.KakoAuthTokenResponse;
import com.ssafy.BlueMarble.domain.auth.repository.KakaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class kakaoAuthService {

    private final KakaoRepository kakaoRepository;

//    @Value("${KAKAO_AUTHORIZE_URL}")
    private String kakaoAuthorUrl = "http://localhost:8081/auth/kakao/callback";

//    @Value("${KAKAO_TOKEN_URL}")
    private String kakaoTokenUrl = "http://localhost:8081/auth/kakao/token";

    private final RestTemplate restTemplate;

//    @Value("${KAKAO_REDIRECT_URI}")
    private String kakaoRedirectUri = "http://localhost:8081/auth/kakao/oauth/authorize";


//    @Value("${KAKAO_REST_API_KEY}")
    private String kakaoClientId = "409725197be3c8a40abff4791c2ac7e6";

    /**
     * 서비스 서버 -> 카카오 서버
     *
     * @param state : uuid
     * @return redirectUrl
     */
    public String buildAuthorizationUrl(String state) {
        OAuthCodeRequest builder = OAuthCodeRequest.builder()
                .clientId(kakaoClientId)
                .redirectUri(kakaoRedirectUri)
                .responseType("code")
                .state(state)
                .build();

        return builder.toUriString(kakaoAuthorUrl);
    }

    /**
     * 서비스 서버 -> 카카오 서버
     *
     * @param code : 카카오 서버에서 주는 code
     * @return token, refresh token 값 반환
     */
    public KakoAuthTokenResponse requestAccessToken(String code) {
        OAuthTokenRequest oAuthTokenRequest = OAuthTokenRequest.builder()
                .grant_type("authorization_code")
                .client_id(kakaoClientId)
                .redirect_uri(kakaoRedirectUri)
                .code(code)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request =
                new HttpEntity<>(oAuthTokenRequest.toMultiValueMap(), headers);

        ResponseEntity<KakoAuthTokenResponse> response =
                restTemplate.postForEntity(kakaoTokenUrl, request, KakoAuthTokenResponse.class);

        // Redis에 토큰 저장 (만료시간 적용)
        kakaoRepository.saveAccessToken(kakaoClientId, response.getBody().getAccess_token(), Long.parseLong(response.getBody().getExpires_in()));

        //log.info(response.getBody().getAccess_token());

        return response.getBody();
    }

    public boolean validateState(String state) {
        // 서버 세션 또는 DB에 저장된 state 값과 비교해서 검증
        // 여기서는 예시로 항상 true 반환
        return true;
    }

}
