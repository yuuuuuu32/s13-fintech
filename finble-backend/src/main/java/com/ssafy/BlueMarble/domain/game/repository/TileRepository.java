package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.Tile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TileRepository extends JpaRepository<Tile, Integer> {

    /**
     * 타일 타입으로 조회
     */
    List<Tile> findByType(Tile.TileType type);
    
    /**
     * 타일 이름으로 조회
     */
    Optional<Tile> findByName(String name);
    
    /**
     * 특별땅만 조회
     */
    List<Tile> findByTypeOrderById(Tile.TileType type);
    
    /**
     * ID 순으로 모든 타일 조회 (맵 순서대로)
     */
    List<Tile> findAllByOrderById();
}