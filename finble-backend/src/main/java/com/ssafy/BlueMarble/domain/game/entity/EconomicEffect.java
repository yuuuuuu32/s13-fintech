package com.ssafy.BlueMarble.domain.game.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EconomicEffect {

    MODERN_BOOM(
            EconomicPeriod.MODERN,
            true,
            "산업혁명",
            "산업혁명과 2차 산업혁명으로 공업화, 철강·화학·전기 산업 발달, 세계 무역이 확대되고 있습니다.",
            1.06, 1.04, 1.03   // 급여, 부동산, 건설비
    ),

    MODERN_RECESSION(
            EconomicPeriod.MODERN,
            false,
            "1873년 장기불황",
            "경기 침체로 소비가 둔화되고 투자 심리가 위축되고 있습니다.",
            0.97, 1.01, 0.99
    ),

    CONTEMPORARY_BOOM(
            EconomicPeriod.CONTEMPORARY,
            true,
            "광란의 20년대",
            "대량생산·대량소비 확대로 생산성과 고용이 늘고 있습니다.",
            1.08, 1.06, 1.04
    ),

    CONTEMPORARY_RECESSION(
            EconomicPeriod.CONTEMPORARY,
            false,
            "1929년 대공황",
            "금융 불안으로 신용이 경색되고 실물 경기가 급격히 위축되고 있습니다.",
            0.94, 1.02, 0.97
    ),

    RECENT_BOOM(
            EconomicPeriod.RECENT,
            true,
            "세계화와 IT혁명",
            "글로벌 밸류체인과 ICT 혁신이 생산성 향상을 견인하고 있습니다.",
            1.10, 1.08, 1.05
    ),

    RECENT_RECESSION(
            EconomicPeriod.RECENT,
            false,
            "글로벌 금융위기",
            "신용 경색과 자산 조정으로 투자가 위축되고 있습니다.",
            0.92, 1.03, 0.95
    ),

    FUTURE_BOOM(
            EconomicPeriod.FUTURE,
            true,
            "4차 산업혁명",
            "AI·로봇·바이오 등 범용기술이 새로운 성장 동력을 제공합니다.",
            1.12, 1.10, 1.06   // 급여, 부동산, 건설비
    ),

    FUTURE_RECESSION(
            EconomicPeriod.FUTURE,
            false,
            "기후·자원 위기",
            "자원 제약과 공급망 불안으로 비용 압력이 커지고 있습니다.",
            0.90, 1.04, 0.93
    );
    
    private final EconomicPeriod period;
    private final boolean isBoom;
    private final String effectName;
    private final String description;
    private final double salaryMultiplier;
    private final double propertyPriceMultiplier;
    private final double buildingCostMultiplier;

    public static EconomicEffect[] getTemplatesByPeriodAndBoom(EconomicPeriod period, boolean isBoom) {
        return java.util.Arrays.stream(values())
                .filter(template -> template.period == period && template.isBoom == isBoom)
                .toArray(EconomicEffect[]::new);
    }
    
    /**
     * 랜덤 템플릿 선택
     */
    public static EconomicEffect getRandomTemplate(EconomicPeriod period, boolean isBoom) {
        EconomicEffect[] templates = getTemplatesByPeriodAndBoom(period, isBoom);
        if (templates.length == 0) {
            throw new IllegalStateException("템플릿을 찾을 수 없습니다: period=" + period + ", isBoom=" + isBoom);
        }
        
        int randomIndex = (int) (Math.random() * templates.length);
        return templates[randomIndex];
    }
    
    /**
     * 게임 턴으로부터 현재 시대 계산 (2턴마다 변경)
     */
    public static EconomicPeriod calculatePeriodFromTurn(int gameTurn) {
        return EconomicPeriod.fromGameTurn(gameTurn);
    }
    
    /**
     * 다음 시대까지 남은 턴 수 계산
     */
    public static int getTurnsUntilNextPeriod(int gameTurn) {
        return EconomicPeriod.getTurnsUntilNextPeriod(gameTurn);
    }
    
    /**
     * 전체 효과명 반환
     */
    public String getFullEffectName() {
        return effectName + " - " + (isBoom ? "호황" : "불황");
    }
    
    /**
     * 월급에 배수 적용
     */
    public int applySalaryMultiplier(int baseSalary) {
        return (int) (baseSalary * salaryMultiplier);
    }
    
    /**
     * 부동산 가격에 배수 적용
     */
    public Long applyPropertyPriceMultiplier(Long basePrice) {
        return (long) (basePrice * propertyPriceMultiplier);
    }
    
    /**
     * 건물 건설비에 배수 적용
     */
    public Long applyBuildingCostMultiplier(Long baseCost) {
        return (long) (baseCost * buildingCostMultiplier);
    }

    @Getter
    @RequiredArgsConstructor
    public enum EconomicPeriod {
        MODERN("근대사"),
        CONTEMPORARY("근현대사"),
        RECENT("현대사"),
        FUTURE("미래");
        
        private final String displayName;

        /**
         * 게임 턴으로부터 현재 시대 계산 (2턴마다 변경)
         * 턴 0-1: MODERN, 턴 2-3: CONTEMPORARY, 턴 4-5: RECENT, 턴 6-7: FUTURE
         */
        public static EconomicPeriod fromGameTurn(int gameTurn) {
            int periodIndex = (gameTurn / 2) % 4;
            EconomicPeriod[] periods = values();
            return periods[periodIndex];
        }
        
        /**
         * 다음 시대까지 남은 턴 수 계산
         */
        public static int getTurnsUntilNextPeriod(int gameTurn) {
            int turnsInCurrentPeriod = (gameTurn % 2);
            return 2 - turnsInCurrentPeriod;
        }
    }
}
