package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Card {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardType cardType;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column
    private String effectType;
    
    @Column
    private Integer effectValue;
    
    
    @Column(nullable = false)
    private boolean isImmediate;
    
    @Builder
    public Card(CardType cardType, String name, String description, 
                String effectType, Integer effectValue, boolean isImmediate) {
        this.cardType = cardType;
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.isImmediate = isImmediate;
    }
    
    public enum CardType {
        FINANCIAL_POLICY("금융정책"),
        ISSUE("이슈"),
        GAME_CARD("게임카드"),
        ANGEL("천사카드"); // 비활성화됨 - DB에서 사용 안 함
        
        private final String description;
        
        CardType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}