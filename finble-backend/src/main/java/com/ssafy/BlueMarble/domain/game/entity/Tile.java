package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "tiles")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Tile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TileType type;
    
    @Column(nullable = false)
    private Long landPrice;
    
    @Column(nullable = false)
    private Long housePrice;
    
    @Column(nullable = false)
    private Long buildingPrice;
    
    @Column(nullable = false)
    private Long hotelPrice;
    
    @Column(columnDefinition = "TEXT")
    private String description;

    // 게임 중 상태 변경을 위한 메서드들
    // 게임 중 동적으로 변경되는 필드들 (DB에는 저장하지 않음)
    @Setter
    @Transient
    private int cellNumber; // 맵상의 위치
    
    @Transient
    @Setter
    private String ownerName;
    
    @Transient
    @Setter
    private Long toll;
    
    @Setter
    @Transient
    private BuildingType buildingType;

    // BuildingType enum 추가
    public enum BuildingType {
        FIELD,
        VILLA,
        BUILDING,
        HOTEL
    }
    
    @Getter
    public enum TileType {
        START("시작"),
        NORMAL("일반땅"),
        CHANCE("찬스"),
        SPECIAL("싸피특별땅"),
        JAIL("감옥"),
        AIRPLANE("비행기"),
        NTS("국세청");

        private final String description;

        TileType(String description) {
            this.description = description;
        }

    }
}