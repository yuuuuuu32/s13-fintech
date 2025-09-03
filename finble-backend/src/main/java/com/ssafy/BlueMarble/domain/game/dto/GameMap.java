package com.ssafy.BlueMarble.domain.game.dto;

import lombok.Data;

import java.util.List;

@Data
public class GameMap {
    private List<MapCell> cells;
}
