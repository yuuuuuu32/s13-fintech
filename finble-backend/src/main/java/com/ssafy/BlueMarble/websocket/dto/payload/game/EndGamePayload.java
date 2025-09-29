package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class EndGamePayload {
    private String winnerName;         // 기존 호환성 유지
    private String winnerNickname;     // 승리자 닉네임
    private String victoryReason;      // 승리 사유 (예: "스페셜 땅 5개 소유 달성!")
    private Long gameEndTime;          // 게임 종료 시간 (타임스탬프)
}
