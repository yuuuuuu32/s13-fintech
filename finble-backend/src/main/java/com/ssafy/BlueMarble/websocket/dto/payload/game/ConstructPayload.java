package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConstructPayload {
    private Boolean result;
    private String nickname;
    private Integer landNum;
    private Tile.BuildingType buildingType;
    private Asset updatedAsset;
    private Long actualBuildingCost;  // 경제역사 효과가 적용된 실제 건설 비용
    private Long baseBuildingCost;    // 기본 건설 비용

    @Data
    @Builder
    public static class Asset {
        private Long money;
        private List<Integer> lands;
    }
}
