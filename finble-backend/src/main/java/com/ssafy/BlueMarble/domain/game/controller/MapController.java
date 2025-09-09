package com.ssafy.BlueMarble.domain.game.controller;

import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.entity.ChanceCard;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.domain.game.repository.ChanceCardRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/map")
public class MapController {
    
    private final TileRepository tileRepository;
    private final ChanceCardRepository chanceCardRepository;
    
    public MapController(TileRepository tileRepository, ChanceCardRepository chanceCardRepository) {
        this.tileRepository = tileRepository;
        this.chanceCardRepository = chanceCardRepository;
    }
    
    @GetMapping("/tiles")
    public List<Tile> getAllTiles() {
        return tileRepository.findAll();
    }
    
    @GetMapping("/chance-cards")
    public List<ChanceCard> getAllChanceCards() {
        return chanceCardRepository.findAll();
    }
    
    @GetMapping("/test")
    public String test() {
        return "맵 DB 테스트 성공! Tiles: " + tileRepository.count() + ", ChanceCards: " + chanceCardRepository.count();
    }
}