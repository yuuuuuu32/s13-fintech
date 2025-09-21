package com.ssafy.BlueMarble.domain.game.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;

/**
 * 게임방별 경제 효과 런타임 상태
 * Redis에 저장되는 게임 진행 중 데이터만 포함
 * 템플릿 데이터는 EconomicEffectTemplate Enum에서 참조
 */
@Getter
@NoArgsConstructor
@ToString
public class RoomEconomicState implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    // ========== 필드 ==========
    
    /**
     * 게임방 식별자 (예: "12345")
     */
    private String roomId;
    
    /**
     * 현재 적용된 템플릿 참조
     */
    private EconomicEffectTemplate currentTemplate;
    
    /**
     * 게임 진행 상태
     */
    private Long gameTurn;
    private int remainingTurns;
    
    // ========== 생성자 ==========
    
    @Builder
    public RoomEconomicState(String roomId, EconomicEffectTemplate currentTemplate, Long gameTurn, int remainingTurns) {
        this.roomId = roomId;
        this.currentTemplate = currentTemplate;
        this.gameTurn = gameTurn;
        this.remainingTurns = remainingTurns;
    }
    
    // ========== 업데이트 메서드 ==========
    
    /**
     * 게임 턴 진행 시 업데이트
     */
    public void updateGameTurn(Long newGameTurn, EconomicEffectTemplate newTemplate) {
        this.gameTurn = newGameTurn;
        this.currentTemplate = newTemplate;
        this.remainingTurns = EconomicEffectTemplate.getTurnsUntilNextPeriod(newGameTurn.intValue());
    }
    
    /**
     * 현재 시대 정보
     */
    @JsonIgnore
    public EconomicEffectTemplate.EconomicPeriod getCurrentPeriod() {
        return currentTemplate != null ? currentTemplate.getPeriod() : null;
    }
    
    /**
     * 현재 시대 표시명
     */
    @JsonIgnore
    public String getCurrentPeriodDisplayName() {
        return getCurrentPeriod() != null ? getCurrentPeriod().getDisplayName() : "알 수 없음";
    }
    
    /**
     * 전체 효과명 반환
     */
    @JsonIgnore
    public String getFullEffectName() {
        return currentTemplate != null ? currentTemplate.getFullEffectName() : "효과 없음";
    }
    
    // ========== 경제 효과 적용 메서드 ==========
    
    /**
     * 월급에 경제 효과 적용
     */
    public int applySalaryMultiplier(int baseSalary) {
        return currentTemplate != null ? currentTemplate.applySalaryMultiplier(baseSalary) : baseSalary;
    }
    
    /**
     * 부동산 가격에 경제 효과 적용
     */
    public int applyPropertyPriceMultiplier(int basePrice) {
        return currentTemplate != null ? currentTemplate.applyPropertyPriceMultiplier(basePrice) : basePrice;
    }
    
    /**
     * 건물 건설비에 경제 효과 적용
     */
    public int applyBuildingCostMultiplier(int baseCost) {
        return currentTemplate != null ? currentTemplate.applyBuildingCostMultiplier(baseCost) : baseCost;
    }
    
    // ========== 상태 확인 메서드 ==========
    
    /**
     * 호황 상태 여부
     */
    @JsonIgnore
    public boolean isBoom() {
        return currentTemplate != null && currentTemplate.isBoom();
    }
    
    /**
     * 효과명
     */
    @JsonIgnore
    public String getEffectName() {
        return currentTemplate != null ? currentTemplate.getEffectName() : "";
    }
    
    /**
     * 효과 설명
     */
    @JsonIgnore
    public String getDescription() {
        return currentTemplate != null ? currentTemplate.getDescription() : "";
    }
    
    /**
     * 월급 배수
     */
    @JsonIgnore
    public double getSalaryMultiplier() {
        return currentTemplate != null ? currentTemplate.getSalaryMultiplier() : 1.0;
    }
    
    /**
     * 부동산 가격 배수
     */
    @JsonIgnore
    public double getPropertyPriceMultiplier() {
        return currentTemplate != null ? currentTemplate.getPropertyPriceMultiplier() : 1.0;
    }
    
    /**
     * 건물 건설비 배수
     */
    @JsonIgnore
    public double getBuildingCostMultiplier() {
        return currentTemplate != null ? currentTemplate.getBuildingCostMultiplier() : 1.0;
    }
    
    /**
     * 게임방 상태가 유효한지 확인
     */
    @JsonIgnore
    public boolean isValid() {
        return roomId != null && currentTemplate != null && gameTurn != null;
    }
}
