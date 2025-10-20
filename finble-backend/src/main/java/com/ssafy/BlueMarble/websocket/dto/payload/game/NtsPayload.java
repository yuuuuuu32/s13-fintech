package com.ssafy.BlueMarble.websocket.dto.payload.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NtsPayload {
    private String nickname;
    private Long taxAmount;
    private ConstructPayload.Asset updatedAsset;
}