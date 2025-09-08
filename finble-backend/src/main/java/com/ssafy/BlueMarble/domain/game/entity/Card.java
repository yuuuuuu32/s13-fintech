package com.ssafy.BlueMarble.domain.game.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;

@Entity
@Table(name = "cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Card {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "card_name", unique = true, nullable = false)
    private String cardName;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false)
    private CardType cardType;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "effect_value")
    private Integer effectValue;
    
    public enum CardType {
        ANGEL,      // 천사카드
        INSTANT     // 즉발카드
    }
}