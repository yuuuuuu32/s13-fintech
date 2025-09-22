package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateMapPayload {
    private String roomId;                       // 방 ID
    private GameState gameState;                 // 게임 상태
    private GameMap currentMap;                  // 현재 맵
    private Long gameTurn;                       // 게임 턴
    private List<String> playerOrder;            // 플레이어 순서
    private Map<String , PlayerState> players;    // 플레이어별 상태
    private int currentPlayerIndex;               // 현재 플레이어 인덱스
    // 경제 효과 정보 (간결하게 정리)
    private String economicPeriodName;    // 경제 시대명 (예: "근대사")
    private String economicEffectName;    // 경제 효과명 (예: "산업혁명")
    private String economicDescription;   // 경제 효과 설명
    private String economicFullName;      // 전체 효과명 (예: "산업혁명 - 호황")
    private Double salaryMultiplier;
    private Double propertyPriceMultiplier;
    private Double buildingCostMultiplier;
    private boolean isBoom;               // 호황/불황 여부
    private int remainingTurns;           // 다음 시대까지 남은 턴 수
    
    // private boolean angelCardInDeck;             // 천사카드가 덱에 있는지 여부 (비활성화됨)

    @Data
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlayerState {
        private String userId;                   // 사용자 ID
        private String nickname;                 // 닉네임
        private int position;                    // 현재 위치
        private Long money;                       // 보유 금액
        private List<Integer> ownedProperties;   // 소유한 부동산 목록
        private boolean isInJail;                // 감옥에 있는지 여부
        private int jailTurns;                   // 감옥 남은 턴 수
        private boolean isActive;                // 활성 상태 여부
        // private boolean anglecard;               // 천사카드 보유 여부 (비활성화됨)
    }
}
