package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.dto.MapCell;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConstructPayload {
    private Boolean result;
    private String userName;
    private Integer landNum;
    private MapCell.BuildingType buildingType;
    private Asset updatedAsset;

    @Data
    @Builder
    public static class Asset {
        private int money;
        private List<Integer> lands;
    }
}
