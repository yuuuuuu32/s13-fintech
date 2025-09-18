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

import lombok.AllArgsConstructor;
import lombok.Data;

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

    // 메모리에 로딩된 카드 리스트
    private List<Card> chanceCards;

    private void loadCardsFromDB() {
        try {
            this.chanceCards = cardRepository.findAll();
            log.info("DB에서 찬스카드 {}개 로딩 완료", chanceCards.size());
        } catch (Exception e) {
            log.error("DB에서 카드 로딩 실패", e);
            this.chanceCards = new ArrayList<>();
        }
    }
    
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
                LandingResultHolder resultHolder = new LandingResultHolder();
                applyInstantCardEffectFromDB(roomId, userName, card, player, gameMapState, resultHolder);

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
            
            List<Card> availableCards = getAvailableCardsFromMemory();
            if (availableCards.isEmpty()) {
                log.error("뽑을 수 있는 카드가 없음: roomId={}", roomId);
                return null;
            }

            Card drawnCard = availableCards.get(random.nextInt(availableCards.size()));
            CreateMapPayload.PlayerState player = gameMapState.getPlayers().get(userId);

            if (player == null) {
                log.error("플레이어 상태를 찾을 수 없음: userId={}", userId);
                return null;
            }

            // 효과 적용 전 상태 저장
            int beforeMoney = player.getMoney();
            int beforePosition = player.getPosition();
            boolean beforeJail = player.isInJail();
            
            // 이동 효과 결과를 저장할 홀더
            LandingResultHolder resultHolder = new LandingResultHolder();

            // 천사카드는 DB에 없으므로 모든 카드가 즉발형 처리
            applyInstantCardEffectFromDB(roomId, userName, drawnCard, player, gameMapState, resultHolder);

            // 금융정책 카드가 아닌 경우에만 상태 저장 (금융정책 카드는 내부에서 이미 저장함)
            if (!isFinancialPolicyCard(drawnCard)) {
                gameRedisService.saveGameMapState(roomId, gameMapState);
            }

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

            // 이동 카드로 인한 통행료 정보 설정
            Integer tollAmount = null;
            String landOwner = null;
            Boolean canBuyLand = null;

            if (resultHolder.result != null) {
                tollAmount = resultHolder.result.getTollAmount() > 0 ? resultHolder.result.getTollAmount() : null;
                landOwner = resultHolder.result.getLandOwner();
                canBuyLand = resultHolder.result.isCanBuyLand() ? true : null;
            }

            DrawCardPayload.DrawCardResult result = DrawCardPayload.DrawCardResult.builder()
                    .userName(userName)
                    .cardName(drawnCard.getName())
                    .anglecard(hasAngelCard)
                    .moneyChange(moneyChange)
                    .newPosition(newPosition)
                    .jailStatus(jailStatus)
                    .effectDescription(effectDescription)
                    .isFinancialPolicy(isFinancialPolicyCard(drawnCard))
                    .tollAmount(tollAmount)
                    .landOwner(landOwner)
                    .canBuyLand(canBuyLand)
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
    
    /**
     * 메모리에서 카드 가져오기 (DB 조회 없음)
     */
    private List<Card> getAvailableCardsFromMemory() {
        if (chanceCards == null || chanceCards.isEmpty()) {
            log.warn("메모리에 로딩된 카드가 없음. DB에서 다시 로딩 시도.");
            loadCardsFromDB();
        }
        return new ArrayList<>(chanceCards); // 복사본 반환 (Thread-safe)
    }

    
    private void applyInstantCardEffectFromDB(String roomId, String userName, Card card, CreateMapPayload.PlayerState player, CreateMapPayload gameMapState, LandingResultHolder resultHolder) {
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
                    applyJailEffectDirect(player);
                    log.info("즉발카드 효과 적용 - 감옥: cardName={}, description={}", card.getName(), description);
                    break;
                case "MOVE":
                    resultHolder.result = applyPositionEffect(player, effectValue != null ? effectValue : 0, gameMapState);
                    log.info("즉발카드 효과 적용 - 이동: cardName={}, steps={}, description={}", card.getName(), effectValue, description);
                    break;
                case "POSITION":
                    resultHolder.result = applyAbsolutePositionEffect(player, effectValue != null ? effectValue : 0, gameMapState);
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
            LandingResultHolder resultHolder = new LandingResultHolder();
            applyInstantCardEffectFromDB(roomId, userName, card, player, gameMapState, resultHolder);

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
    
    private LandingResult applyPositionEffect(CreateMapPayload.PlayerState player, int move, CreateMapPayload gameMapState) {
        int currentPosition = player.getPosition();
        int newPosition = (currentPosition + move) % 32; // 게임 보드는 32칸
        if (newPosition < 0) {
            newPosition += 32;
        }

        // 시작점 통과 여부 확인 및 월급 지급
        if (newPosition < currentPosition && move > 0) { // 시작점을 통과했는지 확인
            player.setMoney(player.getMoney() + 1000); // 월급 지급
            log.info("시작점 통과로 월급 지급: player={}, 월급=1000", player.getNickname());
        }

        // 위치 업데이트
        player.setPosition(newPosition);

        // 도착한 땅 처리 (통행료/구매 가능 여부)
        return handleLandingOnTile(player, newPosition, gameMapState);
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
                player.setPosition(8); // 감옥 위치 (MapService의 EVENT_CELLS와 일치)
                gameRedisService.saveGameMapState(roomId, gameMapState);
                log.info("플레이어 감옥 송치: roomId={}, userName={}", roomId, userName);
            }
        } catch (Exception e) {
            log.error("감옥 송치 실패: roomId={}, userName={}", roomId, userName, e);
        }
    }

    private void applyJailEffectDirect(CreateMapPayload.PlayerState player) {
        player.setInJail(true);
        player.setJailTurns(3);
        player.setPosition(8); // 감옥 위치 (MapService의 EVENT_CELLS와 일치)
        log.info("플레이어 감옥 송치: userName={}", player.getNickname());
    }
    
    private void applyMoneyPercentEffectSimple(CreateMapPayload.PlayerState player, int percent) {
        int currentMoney = player.getMoney();
        int change = (currentMoney * percent) / 100;
        // 퍼센트 효과는 기본적으로 차감으로 처리 (세금납부)
        int newMoney = Math.max(0, currentMoney - change);
        player.setMoney(newMoney);
    }
    
    private LandingResult applyAbsolutePositionEffect(CreateMapPayload.PlayerState player, int position, CreateMapPayload gameMapState) {
        // 위치 업데이트
        player.setPosition(position);

        // 시작점(0번)으로 이동하면 월급 지급 (EventService와 통일)
        if (position == 0) {
            int currentMoney = player.getMoney();
            player.setMoney(currentMoney + 1000); // 월급 1,000원 (EventService와 동일)
            log.info("시작점 도착으로 월급 지급: player={}, 월급=1000", player.getNickname());
        }

        // 도착한 땅 처리 (통행료/구매 가능 여부)
        return handleLandingOnTile(player, position, gameMapState);
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
            int newPosition = (currentPosition + steps) % 32; // 32칸 맵으로 수정
            if (newPosition < 0) {
                newPosition += 32;
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

            // 금융정책 카드 효과 적용 후 모든 플레이어에게 게임 상태 업데이트 메시지 전송
            CreateMapPayload gameStateUpdate = CreateMapPayload.builder()
                    .players(gameMapState.getPlayers())
                    .currentMap(gameMapState.getCurrentMap())
                    .gameTurn(gameMapState.getGameTurn())
                    .gameState(gameMapState.getGameState())
                    .playerOrder(gameMapState.getPlayerOrder())
                    .currentPlayerIndex(gameMapState.getCurrentPlayerIndex())
                    .build();

            MessageDto gameStateMessage = new MessageDto(
                    MessageType.GAME_STATE_CHANGE,
                    objectMapper.valueToTree(gameStateUpdate)
            );

            sessionMessageService.sendMessageToRoom(roomId, gameStateMessage);
            log.info("금융정책 카드 효과 전체 적용 및 게임 상태 업데이트 메시지 전송 완료: cardName={}, roomId={}", card.getName(), roomId);

        } catch (Exception e) {
            log.error("금융정책 카드 효과 적용 실패: cardName={}, roomId={}", card.getName(), roomId, e);
        }
    }

    /**
     * 토지 가치 변동 정책 효과 적용 (즉시 모든 타일 가격 변경)
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

            // 즉시 모든 타일의 가격을 변경
            if (gameMapState.getCurrentMap() != null && gameMapState.getCurrentMap().getCells() != null) {
                for (var cell : gameMapState.getCurrentMap().getCells().values()) {
                    // 일반 타일만 가격 변동 적용 (특별칸 제외)
                    if (cell.getType() == com.ssafy.BlueMarble.domain.game.entity.Tile.TileType.NORMAL) {
                        int currentPrice = cell.getLandPrice();
                        int change = (currentPrice * effectValue) / 100;

                        if (!isIncrease) {
                            change = -change;
                        }

                        int newPrice = currentPrice + change;
                        cell.setLandPrice(newPrice);

                        // 건물 가격도 함께 변동
                        if (cell.getHousePrice() > 0) {
                            int newHousePrice = cell.getHousePrice() + (cell.getHousePrice() * change / currentPrice);
                            cell.setHousePrice(newHousePrice);
                        }
                        if (cell.getBuildingPrice() > 0) {
                            int newBuildingPrice = cell.getBuildingPrice() + (cell.getBuildingPrice() * change / currentPrice);
                            cell.setBuildingPrice(newBuildingPrice);
                        }
                        if (cell.getHotelPrice() > 0) {
                            int newHotelPrice = cell.getHotelPrice() + (cell.getHotelPrice() * change / currentPrice);
                            cell.setHotelPrice(newHotelPrice);
                        }

                        log.info("토지 가격 변동: 타일={}, 기존가격={}, 새가격={}, 변동률={}%",
                                cell.getName(), currentPrice, newPrice, effectValue);
                    }
                }
            }

            // 변경된 게임 상태를 Redis에 저장
            gameRedisService.saveGameMapState(roomId, gameMapState);

            log.info("토지 가치 정책 적용: cardName={}, 변동타입={}, 변동률={}%, roomId={}",
                    card.getName(), changeType, effectValue, roomId);

            // 토지 가치 정책 적용 후 모든 플레이어에게 게임 상태 업데이트 메시지 전송
            CreateMapPayload gameStateUpdate = CreateMapPayload.builder()
                    .players(gameMapState.getPlayers())
                    .currentMap(gameMapState.getCurrentMap())
                    .gameTurn(gameMapState.getGameTurn())
                    .gameState(gameMapState.getGameState())
                    .playerOrder(gameMapState.getPlayerOrder())
                    .currentPlayerIndex(gameMapState.getCurrentPlayerIndex())
                    .build();

            MessageDto gameStateMessage = new MessageDto(
                    MessageType.GAME_STATE_CHANGE,
                    objectMapper.valueToTree(gameStateUpdate)
            );

            sessionMessageService.sendMessageToRoom(roomId, gameStateMessage);
            log.info("토지 가치 정책 적용 및 게임 상태 업데이트 메시지 전송 완료: cardName={}, roomId={}", card.getName(), roomId);

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

    /**
     * 도착한 땅 처리 (통행료/구매 가능 여부) - EventService 로직 참고
     * @return LandingResult 도착 결과 정보
     */
    private LandingResult handleLandingOnTile(CreateMapPayload.PlayerState player, int position, CreateMapPayload gameMapState) {
        LandingResult result = new LandingResult(0, null, false);

        try {
            if (gameMapState == null || gameMapState.getCurrentMap() == null ||
                gameMapState.getCurrentMap().getCells() == null ||
                position < 0 || position >= gameMapState.getCurrentMap().getCells().size()) {
                log.warn("도착한 땅 처리 불가: 잘못된 맵 상태 또는 위치 - position={}", position);
                return result;
            }

            var targetCell = gameMapState.getCurrentMap().getCells().get(position);
            if (targetCell == null) {
                log.warn("도착한 땅 정보가 없음: position={}", position);
                return result;
            }

            String landOwner = targetCell.getOwnerName();

            // 특별칸 (시작점, 찬스, 감옥, 세계여행, 싸피 특별땅)은 통행료 없음
            if (targetCell.getType() != com.ssafy.BlueMarble.domain.game.entity.Tile.TileType.NORMAL) {
                log.info("특별칸 도착: player={}, position={}, type={}", player.getNickname(), position, targetCell.getType());
                return result;
            }

            if (landOwner != null && !landOwner.equals(player.getNickname())) {
                // 다른 플레이어의 땅에 도착 - 통행료 지불
                int tollAmount = targetCell.getToll();

                if (player.getMoney() >= tollAmount) {
                    // 통행료 지불
                    player.setMoney(player.getMoney() - tollAmount);

                    // 소유자에게 통행료 지급
                    String ownerUserId = userRedisService.getUserIdByNickname(landOwner);
                    if (ownerUserId != null) {
                        CreateMapPayload.PlayerState owner = gameMapState.getPlayers().get(ownerUserId);
                        if (owner != null) {
                            owner.setMoney(owner.getMoney() + tollAmount);
                            log.info("통행료 지불: player={}, owner={}, amount={}",
                                   player.getNickname(), landOwner, tollAmount);
                        }
                    }
                    result = new LandingResult(tollAmount, landOwner, false);
                } else {
                    // 통행료 부족 - 파산 처리 필요 (향후 구현)
                    log.warn("통행료 부족: player={}, required={}, available={}",
                           player.getNickname(), tollAmount, player.getMoney());
                    result = new LandingResult(tollAmount, landOwner, false);
                }
            } else if (landOwner == null) {
                // 구매 가능한 땅에 도착
                log.info("구매 가능한 땅 도착: player={}, position={}, price={}",
                       player.getNickname(), position, targetCell.getToll());
                result = new LandingResult(0, null, true);
            } else {
                // 자신의 땅에 도착
                log.info("자신의 땅 도착: player={}, position={}", player.getNickname(), position);
                result = new LandingResult(0, landOwner, false);
            }

        } catch (Exception e) {
            log.error("도착한 땅 처리 중 오류: player={}, position={}", player.getNickname(), position, e);
        }

        return result;
    }

    /**
     * 땅 도착 결과 정보
     */
    @Data
    @AllArgsConstructor
    private static class LandingResult {
        private int tollAmount;      // 지불한 통행료
        private String landOwner;    // 땅 주인
        private boolean canBuyLand;  // 구매 가능 여부
    }

    /**
     * 이동 효과 결과를 전달하기 위한 홀더 클래스 (Thread-safe)
     */
    private static class LandingResultHolder {
        LandingResult result;
    }

}