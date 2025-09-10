package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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