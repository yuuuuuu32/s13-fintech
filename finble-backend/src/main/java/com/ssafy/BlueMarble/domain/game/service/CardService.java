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
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private final SessionMessageService sessionMessageService;
    private final UserRedisService userRedisService;
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
            
            String userId = userRedisService.getUserIdByNickname(userName);
            if (userId == null) {
                log.error("플레이어를 찾을 수 없음: userName={}", userName);
                return false;
            }
            
            Card card = cardRepository.findByName(cardName).orElse(null);
            if (card == null) {
                log.error("카드 정의를 찾을 수 없음: cardName={}", cardName);
                return false;
            }
            
            // 천사카드는 DB에 없으므로 체크 불필요
            
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
     * 카드 추가 및 효과 적용 (천사카드는 DB에 없으므로 일반 카드만 처리)
     */
    public void addCard(String roomId, String userId, String cardName) {
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return;
            }

            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player == null) {
                log.error("플레이어를 찾을 수 없음: userId={}", userId);
                return;
            }

            Card card = cardRepository.findByName(cardName).orElse(null);
            if (card == null) {
                log.error("카드 정의를 찾을 수 없음: cardName={}", cardName);
                return;
            }

            // 즉발형 카드만 처리
            if (card.isImmediate()) {
                String userName = player.getNickname();
                applyInstantCardEffectFromDB(roomId, userName, card, player, gameMapState);

                // 금융정책 카드가 아닌 경우만 상태 저장
                if (!isFinancialPolicyCard(card)) {
                    gameRedisService.saveGameMapState(roomId, gameMapState);
                }

                log.info("즉발형 카드 효과 적용 완료: roomId={}, userId={}, cardName={}", roomId, userId, cardName);
            } else {
                log.warn("즉발형이 아닌 카드는 addCard로 처리할 수 없음: cardName={}", cardName);
            }

        } catch (Exception e) {
            log.error("카드 추가 실패: roomId={}, userId={}, cardName={}", roomId, userId, cardName, e);
        }
    }
    
    
    /**
     * 카드 뽑기 및 결과 메시지 전송 (수동 요청용 - Redis에서 게임 상태 조회)
     */
    public DrawCardPayload.DrawCardResult drawCard(String roomId, String userName) {
        CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
        return drawCard(roomId, userName, gameMapState);
    }

    /**
     * 카드 뽑기 및 결과 메시지 전송 (자동 요청용 - 게임 상태를 매개변수로 받음)
     */
    public DrawCardPayload.DrawCardResult drawCard(String roomId, String userName, CreateMapPayload gameMapState) {
        try {
            // EventService에서 넘겨받은 gameMapState 사용 (Redis 재조회 안함)
            if (gameMapState == null) {
                log.error("게임 맵 상태가 null: roomId={}", roomId);
                return null;
            }
            
            String userId = userRedisService.getUserIdByNickname(userName);
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
            
            // 천사카드는 DB에 없으므로 모든 카드가 즉발형 처리
            applyInstantCardEffectFromDB(roomId, userName, drawnCard, player, gameMapState);
            // 모든 카드 효과는 Redis에만 저장 (WebSocket으로 상태 push 안 함)
            gameRedisService.saveGameMapState(roomId, gameMapState);
            
            // 효과 적용 후 상태 확인
            int afterMoney = player.getMoney();
            int afterPosition = player.getPosition();
            boolean afterJail = player.isInJail();
            
            // 변화량 계산 (금융정책 카드는 개인 변화만 추적)
            Integer moneyChange = (afterMoney != beforeMoney) ? (afterMoney - beforeMoney) : null;
            Integer newPosition = (afterPosition != beforePosition) ? afterPosition : null;
            Boolean jailStatus = (afterJail != beforeJail) ? afterJail : null;
            String effectDescription = drawnCard.getDescription();

            // 금융정책 카드의 경우 전체 영향을 알림 메시지에 포함
            if (isFinancialPolicyCard(drawnCard)) {
                effectDescription += " (모든 플레이어에게 적용됨)";
            }
            
            log.info("카드 뽑기 성공: roomId={}, userName={}, cardName={}", roomId, userName, drawnCard.getName());

            // 천사카드는 DB에 없으므로 항상 false
            boolean hasAngelCard = false;

            DrawCardPayload.DrawCardResult result = DrawCardPayload.DrawCardResult.builder()
                    .userName(userName)
                    .cardName(drawnCard.getName())
                    .anglecard(hasAngelCard)
                    .moneyChange(moneyChange)
                    .newPosition(newPosition)
                    .jailStatus(jailStatus)
                    .effectDescription(effectDescription)
                    .isFinancialPolicy(isFinancialPolicyCard(drawnCard))
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

            // 천사카드는 DB에 없으므로 필터링 불필요
            // 모든 카드 반환
            return allCards;
        } catch (Exception e) {
            log.error("DB에서 카드 목록 조회 실패", e);
            return new ArrayList<>();
        }
    }
    
    private void applyInstantCardEffectFromDB(String roomId, String userName, Card card, CreateMapPayload.PlayerState player, CreateMapPayload gameMapState) {
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
                case "ALL_MONEY_PERCENT":
                    applyFinancialPolicyEffect(roomId, card, gameMapState);
                    log.info("금융정책 카드 효과 적용 - 전체 플레이어 돈 퍼센트: cardName={}, percent={}, description={}", card.getName(), effectValue, description);
                    break;
                case "LAND_VALUE":
                    applyLandValuePolicyEffect(roomId, card, gameMapState);
                    log.info("금융정책 카드 효과 적용 - 토지 가치 변동: cardName={}, percent={}, description={}", card.getName(), effectValue, description);
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
            applyInstantCardEffectFromDB(roomId, userName, card, player, gameMapState);

            // 금융정책 카드의 경우 이미 내부에서 saveGameMapState와 WebSocket 전송 처리됨
            if (!isFinancialPolicyCard(card)) {
                gameRedisService.saveGameMapState(roomId, gameMapState);
            }

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
        try {
            CreateMapPayload gameMapState = gameRedisService.getGameMapState(roomId);
            if (gameMapState == null) {
                log.error("게임 맵 상태를 찾을 수 없음: roomId={}", roomId);
                return;
            }
            
            String userId = userRedisService.getUserIdByNickname(userName);
            if (userId == null) {
                log.error("플레이어를 찾을 수 없음: userName={}", userName);
                return;
            }
            
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);
            if (player != null) {
                player.setInJail(true);
                player.setJailTurns(3);
                player.setPosition(8); // 감옥 위치 (무인도)
                gameRedisService.saveGameMapState(roomId, gameMapState);
                log.info("플레이어 감옥 송치: roomId={}, userName={}", roomId, userName);
            }
        } catch (Exception e) {
            log.error("감옥 송치 실패: roomId={}, userName={}", roomId, userName, e);
        }
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
     * 금융정책 카드 효과 적용 (모든 플레이어의 돈에 영향)
     */
    private void applyFinancialPolicyEffect(String roomId, Card card, CreateMapPayload gameMapState) {
        try {
            // gameMapState는 매개변수로 받아서 사용 (Redis 재조회 안함)
            if (gameMapState == null) {
                log.error("게임 맵 상태가 null: roomId={}", roomId);
                return;
            }

            Integer effectValue = card.getEffectValue();
            if (effectValue == null) {
                log.warn("금융정책 카드 효과값이 없음: cardName={}", card.getName());
                return;
            }

            boolean isIncrease = card.getName().contains("인하") || card.getName().contains("호황");

            for (CreateMapPayload.PlayerState player : gameMapState.getPlayers().values()) {
                if (player.isActive()) {
                    int currentMoney = player.getMoney();
                    int change = (currentMoney * effectValue) / 100;

                    if (!isIncrease) {
                        change = -change;
                    }

                    int newMoney = Math.max(0, currentMoney + change);
                    player.setMoney(newMoney);

                    log.info("금융정책 효과 적용: userName={}, 기존금액={}, 변동률={}%, 변동액={}, 새금액={}",
                            player.getNickname(), currentMoney, effectValue, change, newMoney);
                }
            }

            gameRedisService.saveGameMapState(roomId, gameMapState);
            log.info("금융정책 카드 효과 전체 적용 완료: cardName={}, roomId={}", card.getName(), roomId);

        } catch (Exception e) {
            log.error("금융정책 카드 효과 적용 실패: cardName={}, roomId={}", card.getName(), roomId, e);
        }
    }

    /**
     * 토지 가치 변동 정책 효과 적용
     */
    private void applyLandValuePolicyEffect(String roomId, Card card, CreateMapPayload gameMapState) {
        try {
            // gameMapState는 매개변수로 받아서 사용 (Redis 재조회 안함)
            if (gameMapState == null) {
                log.error("게임 맵 상태가 null: roomId={}", roomId);
                return;
            }

            Integer effectValue = card.getEffectValue();
            if (effectValue == null) {
                log.warn("토지 가치 정책 카드 효과값이 없음: cardName={}", card.getName());
                return;
            }

            boolean isIncrease = card.getName().contains("호황");
            String changeType = isIncrease ? "상승" : "하락";

            // Redis에 토지 가치 변동 정보 저장
            String landValueKey = "land_value_policy:" + roomId;
            String policyData = String.format("{\"type\":\"%s\",\"percent\":%d,\"cardName\":\"%s\"}",
                    changeType, effectValue, card.getName());

            redisTemplate.opsForValue().set(landValueKey, policyData);

            log.info("토지 가치 정책 적용: cardName={}, 변동타입={}, 변동률={}%, roomId={}",
                    card.getName(), changeType, effectValue, roomId);

            // 실제 토지 가격 변동은 부동산 구매/판매 시점에 적용
            // 현재는 정책 정보만 저장하고, 거래 시 MapService에서 참조하여 적용

        } catch (Exception e) {
            log.error("토지 가치 정책 효과 적용 실패: cardName={}, roomId={}", card.getName(), roomId, e);
        }
    }

    /**
     * 금융정책 카드인지 확인
     */
    private boolean isFinancialPolicyCard(Card card) {
        return card.getCardType() == Card.CardType.FINANCIAL_POLICY;
    }



}