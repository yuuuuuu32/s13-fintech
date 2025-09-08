package com.ssafy.BlueMarble.websocket.dto.payload.game;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UseCardPayload {
    
    private String userName;
    private String cardName;
    
}