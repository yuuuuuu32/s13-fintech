package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    Optional<Card> findByName(String name);
    List<Card> findByCardType(Card.CardType cardType);
    List<Card> findByIsImmediate(boolean isImmediate);
}