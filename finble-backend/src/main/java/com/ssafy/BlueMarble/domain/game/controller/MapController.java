package com.ssafy.BlueMarble.domain.game.controller;

import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.entity.Card;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.domain.game.repository.CardRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/map")
public class MapController {
    
    private final TileRepository tileRepository;
    private final CardRepository cardRepository;
    
    public MapController(TileRepository tileRepository, CardRepository cardRepository) {
        this.tileRepository = tileRepository;
        this.cardRepository = cardRepository;
    }
    
    @GetMapping("/tiles")
    public List<Tile> getAllTiles() {
        return tileRepository.findAll();
    }
    
    @GetMapping("/cards")
    public List<Card> getAllCards() {
        return cardRepository.findAll();
    }
    
    @GetMapping("/test")
    public String test() {
        return "맵 DB 테스트 성공! Tiles: " + tileRepository.count() + ", Cards: " + cardRepository.count();
    }
}