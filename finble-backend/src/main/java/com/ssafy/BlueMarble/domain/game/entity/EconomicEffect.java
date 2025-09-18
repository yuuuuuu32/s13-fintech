package com.ssafy.BlueMarble.domain.game.entity;

import lombok.Getter;

/**
 * 경제역사 시대별 효과 클래스
 */
@Getter
public class EconomicEffect {
    private final EconomicHistoryPeriod period;
    private final String name;
    private final String description;
    private final boolean isBoom; // 호황/불황 여부 (true: 호황, false: 불황)
    private final double salaryMultiplier;      // 월급 배수
    private final double tollMultiplier;        // 통행료 배수
    private final double propertyPriceMultiplier; // 부동산 가격 배수
    private final double buildingCostMultiplier; // 건물 건설 비용 배수
    private final double chanceCardBonusMultiplier; // 찬스카드 보너스 배수
    private final double chanceCardPenaltyMultiplier; // 찬스카드 페널티 배수

    public EconomicEffect(EconomicHistoryPeriod period, String name, String description, boolean isBoom,
                         double salaryMultiplier, double tollMultiplier, double propertyPriceMultiplier,
                         double buildingCostMultiplier, double chanceCardBonusMultiplier, double chanceCardPenaltyMultiplier) {
        this.period = period;
        this.name = name;
        this.description = description;
        this.isBoom = isBoom;
        this.salaryMultiplier = salaryMultiplier;
        this.tollMultiplier = tollMultiplier;
        this.propertyPriceMultiplier = propertyPriceMultiplier;
        this.buildingCostMultiplier = buildingCostMultiplier;
        this.chanceCardBonusMultiplier = chanceCardBonusMultiplier;
        this.chanceCardPenaltyMultiplier = chanceCardPenaltyMultiplier;
    }

    /**
     * 호황/불황 상태를 포함한 전체 이름 반환
     */
    public String getFullName() {
        return name + " - " + (isBoom ? "호황" : "불황");
    }

    /**
     * 금액에 배수를 적용하여 반환
     */
    public int applySalaryMultiplier(int baseSalary) {
        return (int) (baseSalary * salaryMultiplier);
    }

    public int applyTollMultiplier(int baseToll) {
        return (int) (baseToll * tollMultiplier);
    }

    public int applyPropertyPriceMultiplier(int basePrice) {
        return (int) (basePrice * propertyPriceMultiplier);
    }

    public int applyBuildingCostMultiplier(int baseCost) {
        return (int) (baseCost * buildingCostMultiplier);
    }

    public int applyChanceCardBonusMultiplier(int baseAmount) {
        return (int) (baseAmount * chanceCardBonusMultiplier);
    }

    public int applyChanceCardPenaltyMultiplier(int baseAmount) {
        return (int) (baseAmount * chanceCardPenaltyMultiplier);
    }
}