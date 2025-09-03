package com.ssafy.BlueMarble.domain.game.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class MapState {
    private String roomId;                       // 방 ID
    private GameState gameState;                 // 게임 상태
    private GameMap currentMap;                  // 현재 맵
    private List<String> playerOrder;            // 플레이어 순서
    private Map<String, PlayerState> players;    // 플레이어별 상태
    private int currentPlayerIndex;               // 현재 플레이어 인덱스

    @Data
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlayerState {
        private String userId;                   // 사용자 ID
        private String nickname;                 // 닉네임
        private int position;                    // 현재 위치
        private int money;                       // 보유 금액
        private List<Integer> ownedProperties;   // 소유한 부동산 목록
        private boolean isInJail;                // 감옥에 있는지 여부
        private int jailTurns;                   // 감옥 남은 턴 수
        private boolean isActive;                // 활성 상태 여부
    }
}
