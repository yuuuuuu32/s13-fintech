package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.request.JailRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.WorldTravelRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.UseDiceRequest;
import com.ssafy.BlueMarble.domain.game.dto.request.NtsRequest;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import com.ssafy.BlueMarble.domain.Timer.Service.TimerService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.JailPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.ConstructPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.WorldTravelPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.UseDicePayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.NtsPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.EconomicHistoryPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final GameRedisService gameRedisService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;
    private final SessionMessageService sessionMessageService;
    private final CardService cardService;
    private final UserRedisService userRedisService;
    private final TimerService timerService;
    private final EconomicHistoryService economicHistoryService;
    private final VictoryService victoryService;
    private final Random random = new Random();

    // 찬스 칸 위치 정의 (data.sql 참고)
    private static final int[] CHANCE_POSITIONS = {3, 11, 19, 27};

    /**
     * 해당 위치가 찬스 칸인지 확인
     */
    private boolean isChancePosition(int position) {
        log.debug("🎲 isChancePosition 확인: position={}, CHANCE_POSITIONS={}", position, java.util.Arrays.toString(CHANCE_POSITIONS));
        for (int chancePos : CHANCE_POSITIONS) {
            if (chancePos == position) {
                log.debug("🎲 찬스 칸 매치됨: position={}", position);
                return true;
            }
        }
        log.debug("🎲 찬스 칸 아님: position={}", position);
        return false;
    }

    /**
     * 감옥 이벤트 처리
     */
    public void handleJailEvent(WebSocketSession session, JailRequest jailRequest) {
        String roomId = roomService.getRoom(session.getId());
        log.info("roomId={}", roomId);
        // 1. 플레이어 상태 조회
        String userId = userRedisService.getUserIdByNickname(jailRequest.getNickname());
        log.info("userId={}", userId);

        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        CreateMapPayload.PlayerState user = gameState.getPlayers().get(userId);
        log.info("TEST: !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!user={}", user);

        if (user == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        // 2. 감옥에 있는지 확인
        if (!user.isInJail()) {
            throw new BusinessException(BusinessError.INVALID_JAIL_STATE);
        }

        boolean escapeSuccess = false;
        int remainingTurns = user.getJailTurns();

        if (jailRequest.isEscape()) {
            // 3. 보석금으로 탈출 시도
            Long bailMoney = 500000L; // 보석금

            if (user.getMoney() >= bailMoney) {
                // 보석금 지불 가능
                user.setMoney(user.getMoney() - bailMoney);
                user.setInJail(false);
                user.setJailTurns(0);
                escapeSuccess = true;
                remainingTurns = 0;
            } else {
                // 보석금 부족
                escapeSuccess = false;
            }
        }

//        // 4. 게임 상태 업데이트
//        if (gameState.getPlayers() != null) {
//            gameState.getPlayers().put(userId, user);
//
//        }
        gameRedisService.saveGameMapState(roomId, gameState);

        // 6. 결과 메시지 전송
        JailPayload payload = JailPayload.builder()
                .result(escapeSuccess)
                .userName(jailRequest.getNickname())
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(user.getMoney())
                                .lands(user.getOwnedProperties() != null ? user.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .turns(remainingTurns)
                .build();

        log.info("payload={}", payload);

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.JAIL_EVENT, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }

    /**
     * 세계여행 이벤트 처리
     */
    public void handleWorldTravelEvent(WebSocketSession session, WorldTravelRequest worldTravelRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 게임 맵 정보
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);

        // 2. 여행 하려는 사람 정보
        String userId = userRedisService.getUserIdByNickname(worldTravelRequest.getNickname());
        CreateMapPayload.PlayerState traveler = gameState.getPlayers().get(userId);
        if (traveler == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }
        //3. 출발지 도착지 정보
        int startPosition = traveler.getPosition();
        int endPosition = worldTravelRequest.getDestination();

        // 4. 도착지점의 땅 정보 확인
        String landOwner = null;
        Long tollAmount = 0L;
        CreateMapPayload.PlayerState owner = null;

        //2.1 TODO : 현재 여행 하려는 사람이 세계여행 칸에 있는지 체크해야함
        if (gameState.getCurrentMap().getCells().get(traveler.getPosition()).getType() != Tile.TileType.AIRPLANE) {
            throw new BusinessException(BusinessError.INVALID_BEHAVIOR);
        }

        // 4.1 만약 해당 땅에 주인이 있다면
        if (gameState.getCurrentMap().getCells().get(endPosition).getOwnerName() != null) {
            landOwner = gameState.getCurrentMap().getCells().get(endPosition).getOwnerName();
            tollAmount = gameState.getCurrentMap().getCells().get(endPosition).getToll();
            String ownerUserId = userRedisService.getUserIdByNickname(landOwner);
            if (ownerUserId != null) {
                owner = gameState.getPlayers().get(ownerUserId);
            }
        }

        // 5. 통행료 처리 및 위치 업데이트
        if (landOwner != null && owner != null) {
            // 통행료 지불
            if (traveler.getMoney() >= tollAmount) {
                traveler.setMoney(traveler.getMoney() - tollAmount);
                owner.setMoney(owner.getMoney() + tollAmount);
                // 여행자 위치 업데이트
                traveler.setPosition(endPosition);
            } else {
                // TODO: 파산 로직 구현 필요
                return;
            }
        } else {
            // 땅 주인이 없으면 바로 이동
            traveler.setPosition(endPosition);
        }

        // 6. 게임 상태 저장
        gameRedisService.saveGameMapState(roomId, gameState);


        // 8. 결과 메시지 전송
        WorldTravelPayload payload = WorldTravelPayload.builder()
                .result(true)
                .nickname(worldTravelRequest.getNickname())
                .startLand(startPosition)
                .endLand(endPosition)
                .landOwner(landOwner)
                .tollAmount(tollAmount)
                .travelerAsset(
                        ConstructPayload.Asset.builder()
                                .money(traveler.getMoney())
                                .lands(traveler.getOwnedProperties() != null ? traveler.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .ownerAsset(
                        owner != null ? ConstructPayload.Asset.builder()
                                .money(owner.getMoney())
                                .lands(owner.getOwnedProperties() != null ? owner.getOwnedProperties() : new ArrayList<>())
                                .build()
                                : null
                )
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.WORLD_TRAVEL_EVENT, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);
    }

    /**
     * 국세청 이벤트 처리 (현금의 15% 세금 부과)
     */
    public void handleNtsEvent(WebSocketSession session, NtsRequest ntsRequest) {
        String roomId = roomService.getRoom(session.getId());
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        if (gameState == null) {
            throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
        }

        String userId = userRedisService.getUserIdByNickname(ntsRequest.getNickname());
        if (userId == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        CreateMapPayload.PlayerState player = gameState.getPlayers().get(userId);
        if (player == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }

        // 현재 현금의 15% 계산
        Long currentMoney = player.getMoney();
        Long taxAmount = (long) (currentMoney * 0.15);

        // 세금 차감 (최소 0원까지만)
        Long newMoney = Math.max(0, currentMoney - taxAmount);
        player.setMoney(newMoney);

        // 게임 상태 저장
        gameRedisService.saveGameMapState(roomId, gameState);

        // 결과 메시지 전송
        NtsPayload payload = NtsPayload.builder()
                .nickname(ntsRequest.getNickname())
                .taxAmount(taxAmount)
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(player.getMoney())
                                .lands(player.getOwnedProperties() != null ? player.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.NTS_EVENT, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);

        log.info("국세청 세금 처리: player={}, taxAmount={}, remainingMoney={}",
                ntsRequest.getNickname(), taxAmount, player.getMoney());
    }

    /**
     * 주사위 사용 이벤트 처리
     */
    public void handleUseDiceEvent(WebSocketSession session, UseDiceRequest useDiceRequest) {
        String roomId = roomService.getRoom(session.getId());

        // 1. 게임 맵 정보
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);

        // 2. 주사위 사용자 정보
        String userId = userRedisService.getUserIdByNickname(useDiceRequest.getUserName());
        if (userId == null) throw new BusinessException(BusinessError.USER_NOT_FOUND);

        // 예외처리
        //TODO : 본인의 턴에만 주사위를 던질 수 있었야함
        String currentTurnUserName = gameState.getPlayerOrder().get(gameState.getCurrentPlayerIndex());
        if (!currentTurnUserName.equals(useDiceRequest.getUserName())) {
            throw new BusinessException(BusinessError.INVALID_TURN);
        }
        CreateMapPayload.PlayerState player = gameState.getPlayers().get(userId);

        if (player == null) {
            throw new BusinessException(BusinessError.USER_NOT_FOUND);
        }
        // 감옥에 있다면 던질 수 없음.
        if (player.isInJail()) {
            throw new BusinessException(BusinessError.INVALID_TURN);
        }

        // 3. 주사위 던지기
        int diceNum1 = random.nextInt(6) + 1;
        int diceNum2 = random.nextInt(6) + 1;
        int diceNumSum = diceNum1 + diceNum2;
        // 4. 위치 계산
        int currentPosition = player.getPosition();
        int newPosition = (currentPosition + diceNumSum) % 32; // 32개 칸 순환

        // 5. 시작점 통과 여부 (경제역사 효과 적용)
        int salaryBonus = 0;
        if (newPosition < currentPosition) { // 시작점을 통과했는지 확인
            int baseSalary = 1000000; // 기본 월급
            salaryBonus = economicHistoryService.calculateSalaryWithEffect(baseSalary, gameState.getGameTurn());
            player.setMoney(player.getMoney() + salaryBonus);
        }

        //5.1 감옥 자리라면 사용자 상태 업데이트 해야함
        if (gameState.getCurrentMap().getCells().get(newPosition).getType().equals(Tile.TileType.JAIL)) {
            player.setInJail(true);
            player.setJailTurns(3);
            gameRedisService.saveGameMapState(roomId, gameState);
            log.info("현재 플레이어가 감옥에 갔나요? : {}", player.isInJail());
        }
        // 6. 새로운 위치로 이동
        player.setPosition(newPosition);

        // 7. 도착한 땅 정보 확인 (찬스칸이 아닌 경우에만)
        String landOwner = null;
        Long tollAmount = 0L;
        boolean canBuyLand = false;

        // 찬스칸은 특별칸이므로 통행료 없음 - 찬스칸이 아닌 경우에만 통행료 처리
        if (!isChancePosition(newPosition)) {
            var targetCell = gameState.getCurrentMap().getCells().get(newPosition);

            // 일반땅인 경우에만 통행료 처리
            if (targetCell.getType() == com.ssafy.BlueMarble.domain.game.entity.Tile.TileType.NORMAL) {
                if (targetCell.getOwnerName() != null && !targetCell.getOwnerName().equals(useDiceRequest.getUserName())) {
                    // 다른 플레이어의 땅 - 통행료 지불 (기본 통행료 사용)
                    landOwner = targetCell.getOwnerName();
                    tollAmount = targetCell.getToll();

                    // 8. 통행료 지불
                    if (player.getMoney() >= tollAmount) {
                        player.setMoney(player.getMoney() - tollAmount);

                        // 소유자에게 통행료 지급
                        String ownerUserId = userRedisService.getUserIdByNickname(landOwner);
                        if (ownerUserId != null) {
                            CreateMapPayload.PlayerState owner = gameState.getPlayers().get(ownerUserId);
                            if (owner != null) {
                                owner.setMoney(owner.getMoney() + tollAmount);
                                log.info("통행료 지불: player={}, owner={}, amount={}",
                                        useDiceRequest.getUserName(), landOwner, tollAmount);
                            }
                        }
                    } else {
                        log.warn("통행료 부족: player={}, required={}, available={}",
                                useDiceRequest.getUserName(), tollAmount, player.getMoney());
                    }
                } else if (targetCell.getOwnerName() == null) {
                    // 비어있는 일반땅 - 구매 가능
                    canBuyLand = true;
                    log.info("구매 가능한 땅 도착: player={}, position={}, price={}",
                            useDiceRequest.getUserName(), newPosition, targetCell.getToll());
                }
            }
        }

        // 9. 찬스 칸 확인 및 자동 카드 뽑기 (턴 종료 전에 먼저 처리)
        boolean isChance = isChancePosition(newPosition);
        log.info("찬스 칸 확인: position={}, isChance={}, userName={}", newPosition, isChance, useDiceRequest.getUserName());

        if (isChance) {
            log.info("🎲 플레이어가 찬스 칸에 도착: position={}, userName={}", newPosition, useDiceRequest.getUserName());
            // 카드 뽑기 및 효과 적용 (gameState를 넘겨서 턴 상태 유지)
            cardService.drawCard(roomId, useDiceRequest.getUserName(), gameState);
        } else {
            log.info("일반 칸 도착: position={}, userName={}", newPosition, useDiceRequest.getUserName());
            // 찬스 칸이 아니면, 주사위 이동 및 통행료 결과만 저장
            gameRedisService.saveGameMapState(roomId, gameState);
        }

        // 10. 결과 메시지 전송 (찬스카드로 이동했을 수 있으므로 실제 플레이어 위치 사용)
        UseDicePayload payload = UseDicePayload.builder()
                .userName(useDiceRequest.getUserName())
                .diceNum1(diceNum1)
                .diceNum2(diceNum2)
                .curTurn(gameState.getGameTurn())
                .diceNumSum(diceNumSum)
                .currentPosition(player.getPosition()) // 실제 플레이어 위치 사용 (찬스카드 이동 반영)
                .salaryBonus(salaryBonus)
                .canBuyLand(canBuyLand)
                .tollAmount(tollAmount)
                .updatedAsset(
                        ConstructPayload.Asset.builder()
                                .money(player.getMoney())
                                .lands(player.getOwnedProperties() != null ? player.getOwnedProperties() : new ArrayList<>())
                                .build()
                )
                .build();

        JsonNode payloadNode = objectMapper.valueToTree(payload);
        MessageDto message = new MessageDto(MessageType.USE_DICE, payloadNode);
        sessionMessageService.sendMessageToRoom(roomId, message);

        // 11. 주사위 사용 후 승리 조건 체크 (모든 승리 조건 통합 체크)
        victoryService.checkAllVictoryConditions(roomId, gameState);
    }
}
