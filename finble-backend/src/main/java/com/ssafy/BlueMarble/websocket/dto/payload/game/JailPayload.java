package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class JailPayload {
    private Boolean result;
    private String userName;
    private ConstructPayload.Asset updatedAsset;
    private int turns;

}
