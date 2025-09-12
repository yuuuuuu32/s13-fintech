package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TileType type;
    
    @Column(nullable = false)
    private int landPrice;
    
    @Column(nullable = false)
    private int housePrice;
    
    @Column(nullable = false)
    private int buildingPrice;
    
    @Column(nullable = false)
    private int hotelPrice;
    
    @Column(columnDefinition = "TEXT")
    private String description;

    // 게임 중 상태 변경을 위한 메서드들
    // 게임 중 동적으로 변경되는 필드들 (DB에는 저장하지 않음)
    @Setter
    @Transient
    private int cellNumber; // 맵상의 위치
    
    @Transient
    private String ownerName;
    
    @Transient
    private int toll;
    
    @Setter
    @Transient
    private BuildingType buildingType;
    
    @Builder
    public Tile(Long id, String name, TileType type, int landPrice,
                int housePrice, int buildingPrice, int hotelPrice, String description) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.landPrice = landPrice;
        this.housePrice = housePrice;
        this.buildingPrice = buildingPrice;
        this.hotelPrice = hotelPrice;
        this.description = description;
        this.ownerName = null;
        this.toll = landPrice; // 초기 통행료는 땅 값
        this.buildingType = BuildingType.FIELD;
    }

    public void setOwner(String ownerName) {
        this.ownerName = ownerName;
    }

    public void updateToll(int toll) {
        this.toll = toll;
    }

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
        EXHIBITION("박람회"),
        AIRPLANE("비행기");
        
        private final String description;
        
        TileType(String description) {
            this.description = description;
        }

    }
}