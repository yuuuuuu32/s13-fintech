package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class UseDicePayload {
    private String userName;                    // 주사위 던진 사람의 이름
    private int diceNumSum;                     // 주사위 결과 1,2의 합
    private int diceNum1;                       // 주사위 결과로 1~6 사이의 값
    private int diceNum2;                       // 주사위 결과로 1~6 사이의 값
    private Long curTurn;                       // 현재 게임의 턴
    private int currentPosition;                // 주사위 사용 후 이동하게 되는 위치
    private int salaryBonus;                    // 만약에 시작 위치를 통과했다면 월급 지급 아니라면 0
    private boolean canBuyLand;                 // 이동한 땅을 살 수 있는지 true, false
    private Long tollAmount;                     // 상대방의 땅이라면 내야하는 톨비
    private ConstructPayload.Asset updatedAsset; // 주사위 던진 사람의 자산 정보 변동내역
}