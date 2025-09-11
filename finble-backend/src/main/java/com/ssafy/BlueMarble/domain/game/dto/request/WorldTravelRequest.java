package com.ssafy.BlueMarble.domain.game.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorldTravelRequest {
    private String nickname;
    private Integer destination;
}
