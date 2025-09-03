package com.ssafy.BlueMarble.domain.game.service;

import com.ssafy.BlueMarble.domain.game.dto.Map;
import com.ssafy.BlueMarble.domain.game.dto.MapCell;
import com.ssafy.BlueMarble.websocket.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@Slf4j
@RequiredArgsConstructor
public class map {

    private final WebSocketSessionService webSocketSessionService;
    final int MAP_SIZE = 32;
    private static final Random random = new Random();

    /**
     * map 생성 함수
     *
     */
    public Map createMap(MapCell mapCell) {
        Map map = new Map();
        List<MapCell> mapCells = new ArrayList<>();
        MapCell.City[] cities = MapCell.City.values();
        int index = random.nextInt(cities.length);

        for (int i = 0; i < MAP_SIZE; i++) {
            MapCell cell = MapCell.builder()
                    .cellName(cities[index].getKoreanName())
                    .cellNumber(i)
                    .toll(cities[index].getPrice())
                    .buildingType(null)
                    .eventType(null)
                    .ownerName(null)
                    .build();
            mapCells.add(cell);
        }
        map.setCells(mapCells);
        return map;
    }

}
