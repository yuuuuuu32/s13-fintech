package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DrawCardPayload {
    private String userName;
    private DrawCardResult result;
    
    @Data
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DrawCardResult {
        private String userName;
        private String cardName;
    }
}