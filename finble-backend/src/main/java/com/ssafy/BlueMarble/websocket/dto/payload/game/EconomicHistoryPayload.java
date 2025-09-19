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
    private double tollMultiplier;       // 통행료 배수
    private double propertyAssetMultiplier; // 부동산 자산 가치 배수 (소유 땅 개수 기반)
    private int remainingTurns;       // 다음 시대까지 남은 턴 수
}