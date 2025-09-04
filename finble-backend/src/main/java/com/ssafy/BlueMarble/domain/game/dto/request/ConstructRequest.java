package com.ssafy.BlueMarble.domain.game.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConstructRequest {
    private String username;
    private Integer landNum;
}
