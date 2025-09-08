package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.entity.Card;
import com.ssafy.BlueMarble.domain.game.repository.CardRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@Slf4j
@RequiredArgsConstructor
public class CardService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final GameRedisService gameRedisService;
    private final CardRepository cardRepository;
    private final Random random = new Random();
    
    private static final String PLAYER_CARDS_PREFIX = "player:cards:";
    
    public boolean useCard(String roomId, String userName, String cardName) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return false;
            }
            
            String userId = getUserIdByNickname(gameMapState, userName);
            if (userId == null) {
                log.error("플레이어를 찾을 수 없음: userName={}", userName);
                return false;
            }
            
            Card.CardType cardType = getCardType(cardName);
            if (cardType == null) {
                log.error("카드 정의를 찾을 수 없음: cardName={}", cardName);
                return false;
            }
            
            switch (cardType) {
                case ANGEL:
                    log.info("천사카드는 USE_CARD로 직접 사용할 수 없음: roomId={}, userName={}", roomId, userName);
                    return false;
                
                case INSTANT:
                    return applyInstantCardEffect(roomId, userId, cardName, gameMapState);
                    
                default:
                    log.error("알 수 없는 카드 타입: cardType={}", cardType);
                    return false;
            }
            
        } catch (Exception e) {
            log.error("카드 사용 중 오류 발생: roomId={}, userName={}, cardName={}", roomId, userName, cardName, e);
            return false;
        }
    }
    
    private String getUserIdByNickname(CreateMapPayload gameMapState, String userName) {
        return gameMapState.getPlayers().entrySet().stream()
                .filter(entry -> userName.equals(entry.getValue().getNickname()))
                .map(entry -> entry.getKey())
                .findFirst()
                .orElse(null);
    }
    
    private boolean hasCard(String roomId, String userId, String cardName) {
        List<String> cards = getPlayerCards(roomId, userId);
        return cards.contains(cardName);
    }
    
    private List<String> getPlayerCards(String roomId, String userId) {
        try {
            String key = PLAYER_CARDS_PREFIX + roomId + ":" + userId;
            String cardsJson = redisTemplate.opsForValue().get(key);
            
            if (cardsJson != null) {
                return objectMapper.readValue(cardsJson, List.class);
            }
            
            return new ArrayList<>();
        } catch (JsonProcessingException e) {
            log.error("플레이어 카드 조회 실패: roomId={}, userId={}", roomId, userId, e);
            return new ArrayList<>();
        }
    }
    
    private boolean removeCard(String roomId, String userId, String cardName) {
        try {
            List<String> cards = getPlayerCards(roomId, userId);
            if (cards.remove(cardName)) {
                String key = PLAYER_CARDS_PREFIX + roomId + ":" + userId;
                String updatedCardsJson = objectMapper.writeValueAsString(cards);
                redisTemplate.opsForValue().set(key, updatedCardsJson);
                return true;
            }
            return false;
        } catch (JsonProcessingException e) {
            log.error("카드 제거 실패: roomId={}, userId={}, cardName={}", roomId, userId, cardName, e);
            return false;
        }
    }
    
    public void addCard(String roomId, String userId, String cardName) {
        try {
            if ("천사카드".equals(cardName)) {
                handleAngelCardAcquisition(roomId, userId);
                return;
            }
            
            log.info("즉발형 카드 효과 적용: roomId={}, userId={}, cardName={}", roomId, userId, cardName);
            
        } catch (Exception e) {
            log.error("카드 추가 실패: roomId={}, userId={}, cardName={}", roomId, userId, cardName, e);
        }
    }
    
    private void handleAngelCardAcquisition(String roomId, String userId) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return;
            }
            
            if (!gameMapState.isAngelCardInDeck()) {
                log.warn("천사카드가 이미 다른 플레이어가 보유중: roomId={}", roomId);
                return;
            }
            
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player != null) {
                player.setAnglecard(true);
                gameMapState.setAngelCardInDeck(false);
                gameRedisService.saveGameMapState(roomId, gameMapState);
                log.info("천사카드 획득: roomId={}, userId={}", roomId, userId);
            }
            
        } catch (Exception e) {
            log.error("천사카드 획득 처리 실패: roomId={}, userId={}", roomId, userId, e);
        }
    }
    
    public boolean useAngelCardDefense(String roomId, String userId) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return false;
            }
            
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null || !player.isAnglecard()) {
                return false;
            }
            
            player.setAnglecard(false);
            gameMapState.setAngelCardInDeck(true);
            gameRedisService.saveGameMapState(roomId, gameMapState);
            
            log.info("천사카드 방어 사용: roomId={}, userId={}", roomId, userId);
            return true;
            
        } catch (Exception e) {
            log.error("천사카드 방어 사용 실패: roomId={}, userId={}", roomId, userId, e);
            return false;
        }
    }
    
    public DrawCardPayload.DrawCardResult drawCard(String roomId, String userName) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return null;
            }
            
            String userId = getUserIdByNickname(gameMapState, userName);
            if (userId == null) {
                log.error("플레이어를 찾을 수 없음: userName={}", userName);
                return null;
            }
            
            List<Card> availableCards = getAvailableCardsFromDB(gameMapState);
            if (availableCards.isEmpty()) {
                log.error("뽑을 수 있는 카드가 없음: roomId={}", roomId);
                return null;
            }
            
            Card drawnCard = availableCards.get(random.nextInt(availableCards.size()));
            
            if (drawnCard.getCardType() == Card.CardType.ANGEL) {
                handleAngelCardDrawn(roomId, userId, gameMapState);
            } else {
                applyInstantCardEffectFromDB(drawnCard, gameMapState.getPlayers().get(userId));
                gameRedisService.saveGameMapState(roomId, gameMapState);
            }
            
            log.info("카드 뽑기 성공: roomId={}, userName={}, cardName={}", roomId, userName, drawnCard.getCardName());
            
            return DrawCardPayload.DrawCardResult.builder()
                    .userName(userName)
                    .cardName(drawnCard.getCardName())
                    .build();
                    
        } catch (Exception e) {
            log.error("카드 뽑기 중 오류 발생: roomId={}, userName={}", roomId, userName, e);
            return null;
        }
    }
    
    private List<Card> getAvailableCardsFromDB(CreateMapPayload gameMapState) {
        try {
            List<Card> allCards = cardRepository.findAll();
            
            if (!gameMapState.isAngelCardInDeck()) {
                allCards = allCards.stream()
                        .filter(card -> card.getCardType() != Card.CardType.ANGEL)
                        .toList();
            }
            
            return allCards;
        } catch (Exception e) {
            log.error("DB에서 카드 목록 조회 실패", e);
            return new ArrayList<>();
        }
    }
    
    private void handleAngelCardDrawn(String roomId, String userId, CreateMapPayload gameMapState) {
        try {
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player != null) {
                player.setAnglecard(true);
                gameMapState.setAngelCardInDeck(false);
                gameRedisService.saveGameMapState(roomId, gameMapState);
                log.info("천사카드 즉시 부여: roomId={}, userId={}", roomId, userId);
            }
        } catch (Exception e) {
            log.error("천사카드 부여 실패: roomId={}, userId={}", roomId, userId, e);
        }
    }
    
    private Card.CardType getCardType(String cardName) {
        try {
            Card card = cardRepository.findByCardName(cardName).orElse(null);
            return card != null ? card.getCardType() : null;
        } catch (Exception e) {
            log.error("카드 타입 조회 실패: cardName={}", cardName, e);
            return null;
        }
    }
    
    private void applyInstantCardEffectFromDB(Card card, CreateMapPayload.PlayerState player) {
        try {
            Integer effectValue = card.getEffectValue();
            String description = card.getDescription();
            
            if (effectValue == null) {
                log.warn("효과값이 없는 카드: cardName={}", card.getCardName());
                return;
            }
            
            if (effectValue == 10) {
                applyJailEffect(player);
                log.info("즉발카드 효과 적용 - 감옥: cardName={}, description={}", card.getCardName(), description);
            } else if (Math.abs(effectValue) >= 10000) {
                applyMoneyEffect(player, effectValue);
                log.info("즉발카드 효과 적용 - 돈: cardName={}, amount={}, description={}", card.getCardName(), effectValue, description);
            } else {
                applyPositionEffect(player, effectValue);
                log.info("즉발카드 효과 적용 - 이동: cardName={}, move={}, description={}", card.getCardName(), effectValue, description);
            }
            
        } catch (Exception e) {
            log.error("즉발카드 효과 적용 실패: cardName={}", card.getCardName(), e);
        }
    }
    
    private boolean applyInstantCardEffect(String roomId, String userId, String cardName, CreateMapPayload gameMapState) {
        try {
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null) {
                log.error("플레이어를 찾을 수 없음: userId={}", userId);
                return false;
            }
            
            Card card = cardRepository.findByCardName(cardName).orElse(null);
            if (card == null) {
                log.error("DB에서 카드를 찾을 수 없음: cardName={}", cardName);
                return false;
            }
            
            applyInstantCardEffectFromDB(card, player);
            
            gameRedisService.saveGameMapState(roomId, gameMapState);
            log.info("즉발카드 효과 적용 완료: roomId={}, userId={}, cardName={}", roomId, userId, cardName);
            return true;
            
        } catch (Exception e) {
            log.error("즉발카드 효과 적용 실패: roomId={}, userId={}, cardName={}", roomId, userId, cardName, e);
            return false;
        }
    }
    
    private void applyMoneyEffect(CreateMapPayload.PlayerState player, int amount) {
        int newMoney = Math.max(0, player.getMoney() + amount);
        player.setMoney(newMoney);
    }
    
    private void applyPositionEffect(CreateMapPayload.PlayerState player, int move) {
        int currentPosition = player.getPosition();
        int newPosition = (currentPosition + move) % 40;
        if (newPosition < 0) {
            newPosition += 40;
        }
        player.setPosition(newPosition);
    }
    
    private void applyJailEffect(CreateMapPayload.PlayerState player) {
        player.setPosition(10);
        player.setInJail(true);
        player.setJailTurns(3);
    }
    
    public boolean autoApplyAngelCardDefense(String roomId, String userId, int negativeAmount) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return false;
            }
            
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null || !player.isAnglecard()) {
                return false;
            }
            
            player.setAnglecard(false);
            gameMapState.setAngelCardInDeck(true);
            gameRedisService.saveGameMapState(roomId, gameMapState);
            
            log.info("천사카드 자동 방어 발동: roomId={}, userId={}, 차단된 피해={}", roomId, userId, negativeAmount);
            return true;
            
        } catch (Exception e) {
            log.error("천사카드 자동 방어 실패: roomId={}, userId={}", roomId, userId, e);
            return false;
        }
    }
}