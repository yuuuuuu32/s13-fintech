package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "economic_effects")
@Getter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class EconomicEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false, unique = true)
    private String roomId;

    @Column(name = "current_period", nullable = false)
    private String currentPeriod;

    @Column(name = "effect_name", nullable = false)
    private String effectName;

    @Column(name = "description")
    private String description;

    @Column(name = "is_boom", nullable = false)
    private boolean isBoom;

    @Column(name = "salary_multiplier", nullable = false)
    private double salaryMultiplier;

    @Column(name = "property_price_multiplier", nullable = false)
    private double propertyPriceMultiplier;

    @Column(name = "building_cost_multiplier", nullable = false)
    private double buildingCostMultiplier;


    @Column(name = "game_turn", nullable = false)
    private Long gameTurn;

    @Column(name = "remaining_turns", nullable = false)
    private int remainingTurns;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public EconomicEffect(String roomId, String currentPeriod, String effectName,
                         String description, boolean isBoom, double salaryMultiplier,
                         double propertyPriceMultiplier, double buildingCostMultiplier,
                         Long gameTurn, int remainingTurns) {
        this.roomId = roomId;
        this.currentPeriod = currentPeriod;
        this.effectName = effectName;
        this.description = description;
        this.isBoom = isBoom;
        this.salaryMultiplier = salaryMultiplier;
        this.propertyPriceMultiplier = propertyPriceMultiplier;
        this.buildingCostMultiplier = buildingCostMultiplier;
        this.gameTurn = gameTurn;
        this.remainingTurns = remainingTurns;
    }

    public void updateEconomicEffect(String effectName, String description, boolean isBoom,
                                   double salaryMultiplier, double propertyPriceMultiplier,
                                   double buildingCostMultiplier, Long gameTurn, int remainingTurns) {
        this.effectName = effectName;
        this.description = description;
        this.isBoom = isBoom;
        this.salaryMultiplier = salaryMultiplier;
        this.propertyPriceMultiplier = propertyPriceMultiplier;
        this.buildingCostMultiplier = buildingCostMultiplier;
        this.gameTurn = gameTurn;
        this.remainingTurns = remainingTurns;
    }

    public void updatePeriod(String newPeriod) {
        this.currentPeriod = newPeriod;
    }

    public String getFullEffectName() {
        return effectName + " - " + (isBoom ? "호황" : "불황");
    }

    /**
     * 금액에 배수를 적용하여 반환
     */
    public int applySalaryMultiplier(int baseSalary) {
        return (int) (baseSalary * salaryMultiplier);
    }


    public int applyPropertyPriceMultiplier(int basePrice) {
        return (int) (basePrice * propertyPriceMultiplier);
    }

    public int applyBuildingCostMultiplier(int baseCost) {
        return (int) (baseCost * buildingCostMultiplier);
    }

    /**
     * 경제 시대 정보 반환
     */
    public String getCurrentPeriodDisplayName() {
        switch (currentPeriod) {
            case "MODERN": return "근대사";
            case "CONTEMPORARY": return "근현대사";
            case "RECENT": return "현대사";
            case "FUTURE": return "미래";
            default: return "알 수 없음";
        }
    }
}