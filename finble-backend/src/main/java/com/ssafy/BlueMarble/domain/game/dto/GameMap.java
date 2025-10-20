package com.ssafy.BlueMarble.domain.game.dto;

import com.ssafy.BlueMarble.domain.game.entity.Tile;
import lombok.Data;

import java.util.List;

@Data
public class GameMap {
    private List<Tile> cells;
}
