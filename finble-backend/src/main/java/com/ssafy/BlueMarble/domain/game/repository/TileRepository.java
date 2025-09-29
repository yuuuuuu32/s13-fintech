package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.Tile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TileRepository extends JpaRepository<Tile, Long> {

}