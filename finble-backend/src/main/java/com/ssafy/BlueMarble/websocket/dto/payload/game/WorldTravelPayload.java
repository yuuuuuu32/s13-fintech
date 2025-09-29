package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorldTravelPayload {
    private Boolean result;                    
    private String nickname;
    private int startLand;                    
    private int endLand;                      
    private String landOwner;                 
    private Long tollAmount;
    private ConstructPayload.Asset travelerAsset; 
    private ConstructPayload.Asset ownerAsset; 
}
