package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.entity.Card;
import com.ssafy.BlueMarble.domain.game.repository.CardRepository;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.DrawCardPayload;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class CardService {
    
    private static final String PLAYER_CARDS_PREFIX = "player:cards:";
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final GameRedisService gameRedisService;
    private final CardRepository cardRepository;
    private final EventService eventService;
    private final SessionMessageService sessionMessageService;
    private final Random random = new Random();
    
    /**
     * 카드 사용
     */
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
            
            Card card = cardRepository.findByName(cardName).orElse(null);
            if (card == null) {
                log.error("카드 정의를 찾을 수 없음: cardName={}", cardName);
                return false;
            }
            
            if (card.getCardType() == Card.CardType.ANGEL) {
                log.info("천사카드는 USE_CARD로 직접 사용할 수 없음: roomId={}, userName={}", roomId, userName);
                return false;
            }
            
            if (card.isImmediate()) {
                return applyInstantCardEffect(roomId, userId, cardName, gameMapState);
            } else {
                log.error("즉발형이 아닌 카드는 USE_CARD로 사용할 수 없음: cardName={}", cardName);
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
                return objectMapper.readValue(cardsJson, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
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
    
    /**
     * 카드 추가
     */
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
    
    /**
     * 천사카드 방어 사용
     */
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
    
    /**
     * 카드 뽑기 및 결과 메시지 전송
     */
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
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            
            // 효과 적용 전 상태 저장
            int beforeMoney = player.getMoney();
            int beforePosition = player.getPosition();
            boolean beforeJail = player.isInJail();
            
            if (drawnCard.getCardType() == Card.CardType.ANGEL) {
                handleAngelCardDrawn(roomId, userId, gameMapState);
            } else {
                applyInstantCardEffectFromDB(roomId, userName, drawnCard, player);
                gameRedisService.saveGameMapState(roomId, gameMapState);
            }
            
            // 효과 적용 후 상태 확인
            int afterMoney = player.getMoney();
            int afterPosition = player.getPosition();
            boolean afterJail = player.isInJail();
            
            // 변화량 계산
            Integer moneyChange = (afterMoney != beforeMoney) ? (afterMoney - beforeMoney) : null;
            Integer newPosition = (afterPosition != beforePosition) ? afterPosition : null;
            Boolean jailStatus = (afterJail != beforeJail) ? afterJail : null;
            String effectDescription = drawnCard.getDescription();
            
            log.info("카드 뽑기 성공: roomId={}, userName={}, cardName={}", roomId, userName, drawnCard.getName());
            
            boolean hasAngelCard = player.isAnglecard();

            DrawCardPayload.DrawCardResult result = DrawCardPayload.DrawCardResult.builder()
                    .userName(userName)
                    .cardName(drawnCard.getName())
                    .anglecard(hasAngelCard)
                    .moneyChange(moneyChange)
                    .newPosition(newPosition)
                    .jailStatus(jailStatus)
                    .effectDescription(effectDescription)
                    .build();

            // 찬스 카드 결과 메시지 전송
            DrawCardPayload cardPayload = DrawCardPayload.builder()
                    .userName(userName)
                    .result(result)
                    .build();

            var cardPayloadNode = objectMapper.valueToTree(cardPayload);
            MessageDto cardMessage = new MessageDto(MessageType.DRAW_CARD, cardPayloadNode);
            sessionMessageService.sendMessageToRoom(roomId, cardMessage);

            log.info("찬스 카드 결과 메시지 전송 완료: userName={}, cardName={}", userName, drawnCard.getName());

            return result;
                    
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
    
    
    private void applyInstantCardEffectFromDB(String roomId, String userName, Card card, CreateMapPayload.PlayerState player) {
        try {
            String effectType = card.getEffectType();
            Integer effectValue = card.getEffectValue();
            String description = card.getDescription();
            
            if (effectType == null) {
                log.warn("효과 타입이 없는 카드: cardName={}", card.getName());
                return;
            }
            
            switch (effectType) {
                case "MONEY":
                    applyMoneyEffect(player, effectValue != null ? effectValue : 0);
                    log.info("즉발카드 효과 적용 - 돈: cardName={}, amount={}, description={}", card.getName(), effectValue, description);
                    break;
                case "MONEY_PERCENT":
                    applyMoneyPercentEffectSimple(player, effectValue != null ? effectValue : 0);
                    log.info("즉발카드 효과 적용 - 돈(퍼센트): cardName={}, percent={}, description={}", card.getName(), effectValue, description);
                    break;
                case "JAIL":
                    applyJailEffect(roomId, userName);
                    log.info("즉발카드 효과 적용 - 감옥: cardName={}, description={}", card.getName(), description);
                    break;
                case "MOVE":
                    applyPositionEffect(player, effectValue != null ? effectValue : 0);
                    log.info("즉발카드 효과 적용 - 이동: cardName={}, steps={}, description={}", card.getName(), effectValue, description);
                    break;
                case "POSITION":
                    applyAbsolutePositionEffect(player, effectValue != null ? effectValue : 0);
                    log.info("즉발카드 효과 적용 - 위치: cardName={}, position={}, description={}", card.getName(), effectValue, description);
                    break;
                default:
                    log.warn("지원되지 않는 효과 타입: cardName={}, effectType={}", card.getName(), effectType);
            }
            
        } catch (Exception e) {
            log.error("즉발카드 효과 적용 실패: cardName={}", card.getName(), e);
        }
    }
    
    private boolean applyInstantCardEffect(String roomId, String userId, String cardName, CreateMapPayload gameMapState) {
        try {
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null) {
                log.error("플레이어를 찾을 수 없음: userId={}", userId);
                return false;
            }
            
            Card card = cardRepository.findByName(cardName).orElse(null);
            if (card == null) {
                log.error("DB에서 카드를 찾을 수 없음: cardName={}", cardName);
                return false;
            }
            
            String userName = player.getNickname(); // PlayerState에서 nickname 추출
            applyInstantCardEffectFromDB(roomId, userName, card, player);
            
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
        int newPosition = (currentPosition + move) % 32; // 게임 보드는 32칸
        if (newPosition < 0) {
            newPosition += 32;
        }
        player.setPosition(newPosition);
    }
    
    private void applyJailEffect(String roomId, String userName) {
        // EventService의 기존 감옥 로직 재활용
        eventService.sendPlayerToJail(roomId, userName, 3);
    }
    
    private void applyMoneyPercentEffectSimple(CreateMapPayload.PlayerState player, int percent) {
        int currentMoney = player.getMoney();
        int change = (currentMoney * percent) / 100;
        // 퍼센트 효과는 기본적으로 차감으로 처리 (세금납부)
        int newMoney = Math.max(0, currentMoney - change);
        player.setMoney(newMoney);
    }
    
    private void applyAbsolutePositionEffect(CreateMapPayload.PlayerState player, int position) {
        player.setPosition(position);
        // 시작점(0번)으로 이동하면 월급 지급 (EventService와 통일)
        if (position == 0) {
            int currentMoney = player.getMoney();
            player.setMoney(currentMoney + 1000); // 월급 1,000원 (EventService와 동일)
        }
    }
    
    private void applyMoneyEffectFromData(CreateMapPayload.PlayerState player, String effectData) {
        try {
            var data = objectMapper.readTree(effectData);
            int amount = data.get("amount").asInt();
            int newMoney = Math.max(0, player.getMoney() + amount);
            player.setMoney(newMoney);
        } catch (Exception e) {
            log.error("돈 효과 적용 실패: effectData={}", effectData, e);
        }
    }
    
    private void applyMoneyPercentEffect(CreateMapPayload.PlayerState player, String effectData) {
        try {
            var data = objectMapper.readTree(effectData);
            int percent = data.get("percent").asInt();
            String type = data.get("type").asText();
            
            int currentMoney = player.getMoney();
            int change = (currentMoney * percent) / 100;
            
            if ("deduct".equals(type)) {
                change = -change;
            }
            
            int newMoney = Math.max(0, currentMoney + change);
            player.setMoney(newMoney);
        } catch (Exception e) {
            log.error("퍼센트 돈 효과 적용 실패: effectData={}", effectData, e);
        }
    }
    
    private void applyJailEffectFromData(CreateMapPayload.PlayerState player, String effectData) {
        try {
            var data = objectMapper.readTree(effectData);
            int position = data.get("position").asInt();
            int turns = data.get("turns").asInt();
            
            player.setPosition(position);
            player.setInJail(true);
            player.setJailTurns(turns);
        } catch (Exception e) {
            log.error("감옥 효과 적용 실패: effectData={}", effectData, e);
        }
    }
    
    private void applyMoveEffectFromData(CreateMapPayload.PlayerState player, String effectData) {
        try {
            var data = objectMapper.readTree(effectData);
            int steps = data.get("steps").asInt();
            
            int currentPosition = player.getPosition();
            int newPosition = (currentPosition + steps) % 40;
            if (newPosition < 0) {
                newPosition += 40;
            }
            player.setPosition(newPosition);
        } catch (Exception e) {
            log.error("이동 효과 적용 실패: effectData={}", effectData, e);
        }
    }
    
    private void applyPositionEffectFromData(CreateMapPayload.PlayerState player, String effectData) {
        try {
            var data = objectMapper.readTree(effectData);
            int position = data.get("position").asInt();
            boolean salary = data.has("salary") && data.get("salary").asBoolean();
            
            player.setPosition(position);
            
            if (salary) {
                // 시작점 이동 시 월급 지급
                int currentMoney = player.getMoney();
                player.setMoney(currentMoney + 1000); // 월급 1,000원 (EventService와 동일)
            }
        } catch (Exception e) {
            log.error("위치 효과 적용 실패: effectData={}", effectData, e);
        }
    }


    /**
     * 천사카드 자동 방어
     */
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