package com.ssafy.BlueMarble.domain.game.entity;

import lombok.Getter;

/**
 * 경제역사 효과 템플릿 Enum
 * DB 의존성을 제거하고 코드로 관리하여 성능 최적화
 */
@Getter
public enum EconomicEffectTemplate {
    
    // ========== 근대사 (MODERN) ==========
    
    /**
     * 근대사 호황: 산업혁명
     * 산업혁명과 2차 산업혁명으로 공업화, 철강·화학·전기 산업 발달, 세계 무역이 확대되고 있습니다.
     */
    MODERN_BOOM(
        EconomicPeriod.MODERN,
        true,
        "산업혁명",
        "산업혁명과 2차 산업혁명으로 공업화, 철강·화학·전기 산업 발달, 세계 무역이 확대되고 있습니다.",
        1.5, 1.2, 1.2
    ),
    
    /**
     * 근대사 불황: 1873년 장기불황
     * 경기침체로 안전자산인 부동산으로 자금이 몰리고 있습니다.
     */
    MODERN_RECESSION(
        EconomicPeriod.MODERN,
        false,
        "1873년 장기불황",
        "경기침체로 안전자산인 부동산으로 자금이 몰리고 있습니다.",
        1.0, 1.1, 0.9
    ),
    
    // ========== 근현대사 (CONTEMPORARY) ==========
    
    /**
     * 근현대사 호황: 광란의 20년대
     * 1920년대 미국 중심의 대량생산과 소비 호황으로 경제가 급성장하고 있습니다.
     */
    CONTEMPORARY_BOOM(
        EconomicPeriod.CONTEMPORARY,
        true,
        "광란의 20년대",
        "1920년대 미국 중심의 대량생산과 소비 호황으로 경제가 급성장하고 있습니다.",
        1.6, 1.3, 1.3
    ),
    
    /**
     * 근현대사 불황: 1929년 대공황
     * 경제 불안으로 금과 부동산 등 안전자산 수요가 급증하고 있습니다.
     */
    CONTEMPORARY_RECESSION(
        EconomicPeriod.CONTEMPORARY,
        false,
        "1929년 대공황",
        "경제 불안으로 금과 부동산 등 안전자산 수요가 급증하고 있습니다.",
        0.5, 1.2, 0.8
    ),
    
    // ========== 현대사 (RECENT) ==========
    
    /**
     * 현대사 호황: 세계화와 IT혁명
     * 1980~90년대 세계화와 IT혁명으로 정보통신과 금융자유화가 경제성장을 이끌고 있습니다.
     */
    RECENT_BOOM(
        EconomicPeriod.RECENT,
        true,
        "세계화와 IT혁명",
        "1980~90년대 세계화와 IT혁명으로 정보통신과 금융자유화가 경제성장을 이끌고 있습니다.",
        1.7, 1.4, 1.4
    ),
    
    /**
     * 현대사 불황: 글로벌 금융위기
     * 금융위기로 투자자들이 안전자산인 부동산으로 몰리고 있습니다.
     */
    RECENT_RECESSION(
        EconomicPeriod.RECENT,
        false,
        "글로벌 금융위기",
        "금융위기로 투자자들이 안전자산인 부동산으로 몰리고 있습니다.",
        0.5, 1.3, 0.7
    ),
    
    // ========== 미래 (FUTURE) ==========
    
    /**
     * 미래 호황: 4차 산업혁명
     * AI, 로봇, 바이오 혁신으로 4차 산업혁명이 새로운 경제성장을 이끌고 있습니다.
     */
    FUTURE_BOOM(
        EconomicPeriod.FUTURE,
        true,
        "4차 산업혁명",
        "AI, 로봇, 바이오 혁신으로 4차 산업혁명이 새로운 경제성장을 이끌고 있습니다.",
        1.8, 1.5, 1.5
    ),
    
    /**
     * 미래 불황: 기후·자원 위기
     * 자원 부족으로 실물자산인 부동산 가치가 상승하고 있습니다.
     */
    FUTURE_RECESSION(
        EconomicPeriod.FUTURE,
        false,
        "기후·자원 위기",
        "자원 부족으로 실물자산인 부동산 가치가 상승하고 있습니다.",
        0.5, 1.4, 0.7
    );
    
    // ========== 필드 ==========
    
    private final EconomicPeriod period;
    private final boolean isBoom;
    private final String effectName;
    private final String description;
    private final double salaryMultiplier;
    private final double propertyPriceMultiplier;
    private final double buildingCostMultiplier;
    
    // ========== 생성자 ==========
    
    EconomicEffectTemplate(EconomicPeriod period, boolean isBoom, String effectName, String description,
                          double salaryMultiplier, double propertyPriceMultiplier, double buildingCostMultiplier) {
        this.period = period;
        this.isBoom = isBoom;
        this.effectName = effectName;
        this.description = description;
        this.salaryMultiplier = salaryMultiplier;
        this.propertyPriceMultiplier = propertyPriceMultiplier;
        this.buildingCostMultiplier = buildingCostMultiplier;
    }
    
    // ========== 정적 메서드 ==========
    
    /**
     * 시대와 호황/불황에 맞는 템플릿들을 필터링
     */
    public static EconomicEffectTemplate[] getTemplatesByPeriodAndBoom(EconomicPeriod period, boolean isBoom) {
        return java.util.Arrays.stream(values())
                .filter(template -> template.period == period && template.isBoom == isBoom)
                .toArray(EconomicEffectTemplate[]::new);
    }
    
    /**
     * 랜덤 템플릿 선택
     */
    public static EconomicEffectTemplate getRandomTemplate(EconomicPeriod period, boolean isBoom) {
        EconomicEffectTemplate[] templates = getTemplatesByPeriodAndBoom(period, isBoom);
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
    
    // ========== 인스턴스 메서드 ==========
    
    /**
     * 전체 효과명 반환 (예: "산업혁명 - 호황")
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
    public int applyPropertyPriceMultiplier(int basePrice) {
        return (int) (basePrice * propertyPriceMultiplier);
    }
    
    /**
     * 건물 건설비에 배수 적용
     */
    public int applyBuildingCostMultiplier(int baseCost) {
        return (int) (baseCost * buildingCostMultiplier);
    }
    
    // ========== 중첩 Enum: 경제 시대 ==========
    
    /**
     * 경제 시대 Enum
     */
    public enum EconomicPeriod {
        MODERN("근대사"),
        CONTEMPORARY("근현대사"),
        RECENT("현대사"),
        FUTURE("미래");
        
        private final String displayName;
        
        EconomicPeriod(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        /**
         * 게임 턴으로부터 현재 시대 계산 (2턴마다 변경)
         * 턴 1-2: MODERN, 턴 3-4: CONTEMPORARY, 턴 5-6: RECENT, 턴 7-8: FUTURE
         */
        public static EconomicPeriod fromGameTurn(int gameTurn) {
            int periodIndex = ((gameTurn - 1) / 2) % 4;
            EconomicPeriod[] periods = values();
            return periods[periodIndex];
        }
        
        /**
         * 다음 시대까지 남은 턴 수 계산
         */
        public static int getTurnsUntilNextPeriod(int gameTurn) {
            int turnsInCurrentPeriod = ((gameTurn - 1) % 2) + 1;
            return 2 - turnsInCurrentPeriod;
        }
    }
}
