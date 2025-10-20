package com.ssafy.BlueMarble.websocket.dto.payload.room;


public record NewUserPayload(
        String userId,
        String nickname
) {
}
