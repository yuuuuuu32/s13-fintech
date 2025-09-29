package com.ssafy.BlueMarble.websocket.dto.payload.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class TradeLandPayload {
    private Boolean result;
    private Map<String , CreateMapPayload.PlayerState> players;
    private Long actualPrice;        // 경제역사 효과가 적용된 실제 지불 가격
    private Long basePrice;          // 기본 가격
    private String buyerName;           // 구매자 이름
    private Integer landNum;            // 토지 번호
}
