package com.ssafy.BlueMarble.domain.game.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class TradeLandRequest {
    private Integer landNum;
    private String buyerName;
}