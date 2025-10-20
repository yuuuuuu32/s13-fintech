package com.ssafy.BlueMarble.domain.game.dto;

import com.ssafy.BlueMarble.domain.game.entity.Card;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CardResponse {
    
    private Long id;
    private String cardName;
    private String cardType;
    private String description;
    private Integer effectValue;
    
    public static CardResponse from(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .cardName(card.getName())
                .cardType(card.getCardType().name())
                .description(card.getDescription())
                .effectValue(card.getEffectValue())
                .build();
    }
    
    @Data
    @Builder
    public static class DrawResult {
        private String userName;
        private String cardName;
        private String cardType;
        private String description;
        // private boolean isAngelCard; // 천사카드 비활성화됨
    }
    
    @Data
    @Builder
    public static class UseResult {
        private boolean success;
        private String message;
        private String cardName;
        private String effectDescription;
    }
}