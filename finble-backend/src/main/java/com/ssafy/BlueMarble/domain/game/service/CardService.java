package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.entity.Card;
import com.ssafy.BlueMarble.domain.game.repository.CardRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.UseCardPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

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
    private static final String ANGEL_CARD = "ANGEL";
    private static final List<String> CHANCE_CARDS = Arrays.asList(
        "ANGEL", "INSTANT_CARD_1", "INSTANT_CARD_2", "INSTANT_CARD_3", "INSTANT_CARD_4", "INSTANT_CARD_5"
    );
    
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
            // 천사카드인 경우 특별 처리
            if ("천사카드".equals(cardName)) {
                handleAngelCardAcquisition(roomId, userId);
                return;
            }
            
            // 일반 카드는 즉발형이므로 저장하지 않고 즉시 효과 적용
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
            
            // 천사카드가 덱에 없으면 획득 불가
            if (!gameMapState.isAngelCardInDeck()) {
                log.warn("천사카드가 이미 다른 플레이어가 보유중: roomId={}", roomId);
                return;
            }
            
            // 플레이어에게 천사카드 부여
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player != null) {
                player.setAnglecard(true);
                
                // 덱에서 천사카드 제거
                gameMapState.setAngelCardInDeck(false);
                
                // 게임 상태 저장
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
                return false; // 천사카드 미보유
            }
            
            // 천사카드 사용: 플레이어에게서 제거
            player.setAnglecard(false);
            
            // 덱에 천사카드 복귀
            gameMapState.setAngelCardInDeck(true);
            
            // 게임 상태 저장
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
            
            List<String> availableCards = getAvailableCards(gameMapState);
            if (availableCards.isEmpty()) {
                log.error("뽑을 수 있는 카드가 없음: roomId={}", roomId);
                return null;
            }
            
            String drawnCard = availableCards.get(random.nextInt(availableCards.size()));
            
            if (ANGEL_CARD.equals(drawnCard)) {
                handleAngelCardDrawn(roomId, userId, gameMapState);
            }
            
            log.info("카드 뽑기 성공: roomId={}, userName={}, cardName={}", roomId, userName, drawnCard);
            
            return DrawCardPayload.DrawCardResult.builder()
                    .userName(userName)
                    .cardName(drawnCard)
                    .build();
                    
        } catch (Exception e) {
            log.error("카드 뽑기 중 오류 발생: roomId={}, userName={}", roomId, userName, e);
            return null;
        }
    }
    
    private List<String> getAvailableCards(CreateMapPayload gameMapState) {
        List<String> availableCards = new ArrayList<>(CHANCE_CARDS);
        
        if (!gameMapState.isAngelCardInDeck()) {
            availableCards.remove(ANGEL_CARD);
        }
        
        return availableCards;
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
    
    // ========== 샘플 코드 시작 ==========
    private Card.CardType getCardType(String cardName) {
        try {
            Card card = cardRepository.findByCardName(cardName).orElse(null);
            return card != null ? card.getCardType() : null;
        } catch (Exception e) {
            log.error("카드 타입 조회 실패: cardName={}", cardName, e);
            return null;
        }
    }
    
    private boolean applyInstantCardEffect(String roomId, String userId, String cardName, CreateMapPayload gameMapState) {
        try {
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null) {
                log.error("플레이어를 찾을 수 없음: userId={}", userId);
                return false;
            }
            
            switch (cardName) {
                case "INSTANT_CARD_1":
                    applyMoneyEffect(player, 100000);
                    log.info("즉발카드 효과 적용 - 돈 획득: roomId={}, userId={}, amount={}", roomId, userId, 100000);
                    break;
                    
                case "INSTANT_CARD_2":
                    applyMoneyEffect(player, -50000);
                    log.info("즉발카드 효과 적용 - 돈 차감: roomId={}, userId={}, amount={}", roomId, userId, -50000);
                    break;
                    
                case "INSTANT_CARD_3":
                    applyPositionEffect(player, 5);
                    log.info("즉발카드 효과 적용 - 위치 이동: roomId={}, userId={}, move={}", roomId, userId, 5);
                    break;
                    
                case "INSTANT_CARD_4":
                    applyPositionEffect(player, -3);
                    log.info("즉발카드 효과 적용 - 위치 후진: roomId={}, userId={}, move={}", roomId, userId, -3);
                    break;
                    
                case "INSTANT_CARD_5":
                    applyJailEffect(player);
                    log.info("즉발카드 효과 적용 - 감옥 이동: roomId={}, userId={}", roomId, userId);
                    break;
                    
                default:
                    log.warn("정의되지 않은 즉발카드: cardName={}", cardName);
                    return false;
            }
            
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
    // ========== 샘플 코드 끝 ==========
}