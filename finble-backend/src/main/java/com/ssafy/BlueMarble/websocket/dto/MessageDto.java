package com.ssafy.BlueMarble.websocket.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private MessageType type;
    private JsonNode payload; // 다양한 형식을 지원하기 위해 JsonNode 사용
}