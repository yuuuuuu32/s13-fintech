package com.ssafy.BlueMarble.domain.game.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class City {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(nullable = false)
    private String koreanName;
    
    @Column(nullable = false)
    private int price;
    
    @Builder
    public City(String name, String koreanName, int price) {
        this.name = name;
        this.koreanName = koreanName;
        this.price = price;
    }
}
