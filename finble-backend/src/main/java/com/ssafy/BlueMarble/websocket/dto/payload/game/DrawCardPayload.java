package com.ssafy.BlueMarble.websocket.dto.payload.game;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DrawCardPayload {
    
    private String userName;
    
    @Getter
    @Builder
    public static class DrawCardResult {
        private String userName;
        private String cardName;
    }
}