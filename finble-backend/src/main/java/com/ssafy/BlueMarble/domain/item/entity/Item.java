package com.ssafy.BlueMarble.domain.item.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
public class Item {

    public enum CategoryType {
        CARD, NAME, ICON
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_category", nullable = false)
    private CategoryType itemCategory;

    @Column(name = "item_icon", nullable = false)
    private String itemIcon;
}
