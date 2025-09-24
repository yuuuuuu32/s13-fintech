package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class EconomicEffectUpdatePayload {
    private String economicPeriodName;
    private String economicEffectName;
    private String economicDescription;
    private String economicFullName;
    private Double salaryMultiplier;
    private Double propertyPriceMultiplier;
    private Double buildingCostMultiplier;
    private boolean isBoom;
    private int remainingTurns;

    public static EconomicEffectUpdatePayload fromGameState(CreateMapPayload gameState, EconomicEffect currentEffect) {
        return EconomicEffectUpdatePayload.builder()
                .economicPeriodName(currentEffect.getPeriod().getDisplayName())
                .economicEffectName(currentEffect.getEffectName())
                .economicDescription(currentEffect.getDescription())
                .economicFullName(currentEffect.getFullEffectName())
                .salaryMultiplier(currentEffect.getSalaryMultiplier())
                .propertyPriceMultiplier(currentEffect.getPropertyPriceMultiplier())
                .buildingCostMultiplier(currentEffect.getBuildingCostMultiplier())
                .isBoom(currentEffect.isBoom())
                .remainingTurns(EconomicEffect.getTurnsUntilNextPeriod(gameState.getGameTurn().intValue()))
                .build();
    }
}