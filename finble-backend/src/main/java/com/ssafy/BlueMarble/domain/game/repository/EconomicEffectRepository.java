package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EconomicEffectRepository extends JpaRepository<EconomicEffect, Long> {

    Optional<EconomicEffect> findByRoomId(String roomId);

    void deleteByRoomId(String roomId);

    boolean existsByRoomId(String roomId);

    List<EconomicEffect> findByCurrentPeriodAndIsBoomAndRoomIdStartingWith(String currentPeriod, boolean isBoom, String roomIdPrefix);
}