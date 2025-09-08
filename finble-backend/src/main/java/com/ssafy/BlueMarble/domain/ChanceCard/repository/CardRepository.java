package com.ssafy.BlueMarble.domain.chanceCard.repository;

import com.ssafy.BlueMarble.domain.chanceCard.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    Optional<Card> findByCardName(String cardName);
}