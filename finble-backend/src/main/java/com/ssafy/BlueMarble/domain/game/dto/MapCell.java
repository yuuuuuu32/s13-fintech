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

    private enum EventType {
        JAIL,
        WORLD_TRAVEL
    }

    private enum BuildingType {
        FIELD,
        VILLA,
        BUILDING,
        HOTEL
    }

    @Getter
    public enum City {
        SEOUL("서울", 5234),
        BUSAN("부산", 7642),
        DAEGU("대구", 3891),
        INCHEON("인천", 9210),
        GWANGJU("광주", 4578),
        DAEJEON("대전", 6123),
        ULSAN("울산", 2789),
        SUWON("수원", 8394),
        SEONGNAM("성남", 4912),
        GOYANG("고양", 3745),
        YONGIN("용인", 6583),
        CHANGWON("창원", 7104),
        CHEONAN("천안", 1527),
        JEONJU("전주", 4895),
        POHANG("포항", 2674),
        GANGNEUNG("강릉", 3290),
        JEJU("제주", 8763),
        MASAN("마산", 4135);

        private final String koreanName;
        private final int price;

        City(String koreanName, int price) {
            this.koreanName = koreanName;
            this.price = price;
        }
    }


}
