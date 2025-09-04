package com.ssafy.BlueMarble.domain.room.dto;

import com.ssafy.BlueMarble.domain.game.entity.GameState;
import lombok.Builder;

@Builder
public record RoomListDTO(
        String roomId,
        String roomName,
        GameState roomState,
        Long userCnt,
        Long userLimit,
        String ownerNickname
) {
}
