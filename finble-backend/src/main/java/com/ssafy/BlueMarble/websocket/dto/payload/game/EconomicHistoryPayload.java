package com.ssafy.BlueMarble.websocket.dto.payload.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EconomicHistoryPayload {
    private String periodName;        // 시대 이름 (예: "근대사")
    private String effectName;        // 효과 이름 (예: "산업혁명")
    private String description;       // 효과 설명
    private boolean isBoom;           // 호황/불황 여부
    private String fullName;          // 전체 이름 (예: "근대사 - 산업혁명 - 호황")
    private double salaryMultiplier;     // 월급 배수
    private double propertyPriceMultiplier; // 부동산 가격 배수
    private double buildingCostMultiplier;  // 건물 건설 비용 배수
    private int remainingTurns;       // 다음 시대까지 남은 턴 수
}