package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DrawCardPayload {

    private String userName;
    private DrawCardResult result;
    
    @Data
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DrawCardResult {
        private String userName;
        private String cardName;
        private boolean anglecard; // 천사카드 비활성화됨 - 항상 false
        private Integer moneyChange;
        private Integer newPosition;
        private Boolean jailStatus;
        private String effectDescription;
        private Boolean isFinancialPolicy; // 금융정책 카드 여부

        // 이동 카드로 인한 통행료 정보
        private Integer tollAmount; // 지불한 통행료
        private String landOwner; // 땅 주인
        private Boolean canBuyLand; // 구매 가능한 땅 여부
    }
}