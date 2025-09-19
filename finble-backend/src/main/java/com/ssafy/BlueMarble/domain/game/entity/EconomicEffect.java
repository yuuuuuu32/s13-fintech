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
    private final double propertyAssetMultiplier; // 부동산 자산 가치 배수 (소유 땅 개수에 따른 가중치)

    public EconomicEffect(EconomicHistoryPeriod period, String name, String description, boolean isBoom,
                         double salaryMultiplier, double tollMultiplier, double propertyAssetMultiplier) {
        this.period = period;
        this.name = name;
        this.description = description;
        this.isBoom = isBoom;
        this.salaryMultiplier = salaryMultiplier;
        this.tollMultiplier = tollMultiplier;
        this.propertyAssetMultiplier = propertyAssetMultiplier;
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

    /**
     * 부동산 자산 가치 변동 적용 (소유 땅 개수에 따른 금액 증감)
     * @param ownedLandCount 소유 땅 개수
     * @param baseLandValue 기본 땅 가치 (예: 100만원)
     * @return 변동된 금액
     */
    public int applyPropertyAssetChange(int ownedLandCount, int baseLandValue) {
        if (ownedLandCount <= 0) return 0;

        // 소유 땅 개수 * 기본 땅 가치 * 배수
        double totalChange = ownedLandCount * baseLandValue * (propertyAssetMultiplier - 1.0);
        return (int) totalChange;
    }
}