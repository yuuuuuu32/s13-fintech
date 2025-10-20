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
        private Long moneyChange;
        private Integer newPosition;
        private Boolean jailStatus;
        private String effectDescription;
        private Boolean isFinancialPolicy; // 금융정책 카드 여부

        // 이동 카드로 인한 통행료 정보
        private Long tollAmount; // 지불한 통행료
        private String landOwner; // 땅 주인
        private Boolean canBuyLand; // 구매 가능한 땅 여부

        // 부동산 자산 정책 카드 효과 정보
        private Long assetChangeAmount; // 자산 변동액 (양수: 증가, 음수: 감소)
        private Integer effectPercent; // 효과 퍼센트 (5%, 10% 등)
        private Boolean isAssetIncrease; // 자산 증가 여부 (true: 호황, false: 불황)
        private Long baseLandValue; // 기본 땅 가치 (100만원)
        private Integer ownedLandCount; // 소유 땅 개수
    }
}