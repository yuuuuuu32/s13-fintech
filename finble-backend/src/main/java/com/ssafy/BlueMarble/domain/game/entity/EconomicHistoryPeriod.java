package com.ssafy.BlueMarble.domain.game.entity;

/**
 * 경제역사 시대 열거형
 */
public enum EconomicHistoryPeriod {
    MODERN("근대사", "산업혁명 시기로 건설 비용이 저렴하고 임금이 낮습니다.", 0),
    CONTEMPORARY("근현대사", "전쟁과 복구 시기로 모든 비용이 불안정하고 높습니다.", 1),
    RECENT("현대사", "경제성장 시기로 모든 수익과 비용이 증가합니다.", 2),
    FUTURE("미래", "디지털 경제로 거래는 빠르지만 변동성이 극심합니다.", 3);

    private final String displayName;
    private final String description;
    private final int order;

    EconomicHistoryPeriod(String displayName, String description, int order) {
        this.displayName = displayName;
        this.description = description;
        this.order = order;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public int getOrder() {
        return order;
    }

    /**
     * 다음 경제 시대를 반환 (순환)
     */
    public EconomicHistoryPeriod getNext() {
        EconomicHistoryPeriod[] values = values();
        int nextIndex = (this.order + 1) % values.length;
        for (EconomicHistoryPeriod period : values) {
            if (period.order == nextIndex) {
                return period;
            }
        }
        return MODERN; // fallback
    }

    /**
     * 순서로 시대 찾기
     */
    public static EconomicHistoryPeriod getByOrder(int order) {
        for (EconomicHistoryPeriod period : values()) {
            if (period.order == order) {
                return period;
            }
        }
        return MODERN; // fallback
    }
}