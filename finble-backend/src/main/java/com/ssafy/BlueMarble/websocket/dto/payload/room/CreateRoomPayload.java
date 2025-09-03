package com.ssafy.BlueMarble.websocket.dto.payload.room;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomPayload {
    private String roomName;
    private Integer userLimit;
}
