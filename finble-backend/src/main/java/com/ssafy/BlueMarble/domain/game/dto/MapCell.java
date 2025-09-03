package com.ssafy.BlueMarble.domain.game.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

@Data
@Builder
public class MapCell {
    private int cellNumber;    // 칸 번호
    private String cellName;   // 칸 이름 (예: 서울)
    private String ownerName;  // 소유자 이름, 없으면 null
    private int toll;          // 통행료
    private BuildingType buildingType;
    private EventType eventType;   // 이벤트 칸 여부

    public enum EventType {
        JAIL,
        WORLD_TRAVEL,
        SPECIAL,
        START_ZONE
    }

    public enum BuildingType {
        FIELD,
        VILLA,
        BUILDING,
        HOTEL
    }

    // 이벤트 칸 정보를 담는 레코드
    public record EventCellInfo(int position, String name, EventType eventType) {}

}
