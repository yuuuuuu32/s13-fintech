package com.ssafy.BlueMarble.domain.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.ssafy.BlueMarble.domain.auth.dto.OAuthUserInfo;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class GoogleOAuthService {

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    public OAuthUserInfo verifyIDToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(clientId))
                    .build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken != null) {
                Payload payload = googleIdToken.getPayload();

                return OAuthUserInfo.builder()
                        .email(payload.getEmail())
                        .name((String) payload.get("name"))
                        .picture((String) payload.get("picture"))
                        .build();
            }
            throw new BusinessException(BusinessError.INVALID_TOKEN);
        } catch (Exception e) {
            throw new BusinessException(BusinessError.INVALID_GOOGLE_TOKEN);
        }
    }
}