package com.ssafy.BlueMarble.domain.game.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConstructRequest {
    private String nickname;
    private Integer landNum;
    private Tile.BuildingType targetBuildingType; // 목표 건물 타입
}
