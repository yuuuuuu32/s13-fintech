package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.ChanceCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChanceCardRepository extends JpaRepository<ChanceCard, Long> {

    /**
     * 카드 타입으로 조회
     */
    List<ChanceCard> findByCardType(ChanceCard.CardType cardType);
    
    /**
     * 즉발 카드만 조회
     */
    List<ChanceCard> findByIsImmediateTrue();
    
    /**
     * 보유 가능한 카드만 조회 (천사카드 등)
     */
    List<ChanceCard> findByIsImmediateFalse();
    
    /**
     * 천사카드 조회
     */
    Optional<ChanceCard> findByCardTypeAndIsImmediateFalse(ChanceCard.CardType cardType);
    
    /**
     * 랜덤 찬스카드 조회 (천사카드 제외)
     */
    @Query("SELECT c FROM ChanceCard c WHERE c.cardType != 'ANGEL' ORDER BY RAND() LIMIT 1")
    Optional<ChanceCard> findRandomCard();
}