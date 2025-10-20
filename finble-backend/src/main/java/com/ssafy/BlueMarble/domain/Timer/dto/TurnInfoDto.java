package com.ssafy.BlueMarble.domain.Timer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class TurnInfoDto {
    private String roomId;
    private Long gameTurn;
    private String curPlayer;
}
