package com.ssafy.BlueMarble.websocket.dto.payload.room;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class KickRoomPayload {
    String userNickname;
}
