package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.dto.MapCell;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.global.common.exception.BusinessError;
import com.ssafy.BlueMarble.global.common.exception.BusinessException;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class MapService {

    private final SessionMessageService sessionMessageService;
    private final TileRepository tileRepository;
    private final GameRedisService gameRedisService;
    private final ObjectMapper objectMapper;
    private final UserRedisService userRedisService;
    private final RedisTemplate<String, String> redisTemplate;

    private static final int MAP_SIZE = 32;
    private static final Random random = new Random();

    // 이벤트 칸 위치와 타입을 매핑하는 배열
    private static final MapCell.EventCellInfo[] EVENT_CELLS = {
            new MapCell.EventCellInfo(0, "Start", MapCell.EventType.START_ZONE),
            new MapCell.EventCellInfo(7, "Special", MapCell.EventType.SPECIAL),
            new MapCell.EventCellInfo(15, "Jail", MapCell.EventType.JAIL),
            new MapCell.EventCellInfo(31, "World Travel", MapCell.EventType.WORLD_TRAVEL)
    };

    /**
     * 새로운 게임 맵 상태 생성 (방에서 게임 시작할 때 호출)
     */
    public void createNewGameMapState(WebSocketSession session, CreateMapPayload createMapPayload) {
        String roomId = createMapPayload.getRoomId();
        String usersKey = "room:" + roomId + ":users";
        Set<String> playerIds = redisTemplate.opsForSet().members(usersKey);

        if (playerIds == null || playerIds.isEmpty()) {
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
        }

        // 맵 생성
        GameMap gameMap = createMap();

        // 플레이어 순서 랜덤 결정
        List<String> shuffledPlayers = new ArrayList<>(playerIds);
        Collections.shuffle(shuffledPlayers, random);

        // 플레이어 상태 초기화
        Map<String, CreateMapPayload.PlayerState> players = new ConcurrentHashMap<>();
        for (String playerId : shuffledPlayers) {
            CreateMapPayload.PlayerState playerState = CreateMapPayload.PlayerState.builder()
                    .userId(playerId)
                    .nickname(getPlayerNickname(playerId))
                    .position(0) // 시작 위치
                    .money(20000) // 초기 자금
                    .ownedProperties(new ArrayList<>())
                    .isInJail(false)
                    .jailTurns(0)
                    .isActive(true)
                    .anglecard(false) // 게임 시작 시 천사카드 미보유
                    .build();
            players.put(playerId, playerState);
        }

        // 게임 상태 생성
        CreateMapPayload gameState = CreateMapPayload.builder()
                .roomId(null)
                .roomId(roomId)
                .gameState(GameState.PLAYING)
                .currentMap(gameMap)
                .playerOrder(shuffledPlayers)
                .players(players)
                .currentPlayerIndex(0)
                .angelCardInDeck(true) // 게임 시작 시 천사카드는 덱에 포함
                .build();

        // Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);

        // 웹소켓
        JsonNode mapState = objectMapper.valueToTree(gameState);
        MessageDto message = new MessageDto(MessageType.START_GAME_OBSERVE, mapState);
        sessionMessageService.sendMessageToRoom(roomId, message);

        log.info("새로운 게임 맵 상태 생성: roomId={}, players={}",
                roomId, shuffledPlayers.size());
    }

    /**
     * 게임 맵 상태 조회
     */
    public CreateMapPayload getGameMapState(String roomId) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        if (gameState != null) {
            // TTL 갱신
            gameRedisService.updateGameStateTTL(roomId);
        }
        return gameState;
    }

    /**
     * 플레이어 이동
     */
    public CreateMapPayload movePlayer(String roomId, String playerId, int steps) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        if (gameState == null) {
            throw new IllegalStateException("게임 맵 상태를 찾을 수 없습니다: " + roomId);
        }

        CreateMapPayload.PlayerState player = gameState.getPlayers().get(playerId);
        if (player == null) {
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
        }

        // 새로운 위치 계산
        int newPosition = (player.getPosition() + steps) % MAP_SIZE;
        player.setPosition(newPosition);

        // 게임 상태 업데이트
        gameRedisService.saveGameMapState(roomId, gameState);

        log.info("플레이어 이동: roomId={}, playerId={}, position={}",
                roomId, playerId, newPosition);

        return gameState;
    }

    /**
     * 게임 종료
     */
    public void endGame(String roomId) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        gameState.setGameState(GameState.FINISHED);
        gameRedisService.saveGameMapState(roomId, gameState);

        log.info("게임 종료: roomId={}", roomId);

    }

    /**
     * 게임 맵 상태 삭제 (방 삭제 시 호출)
     */
    public void deleteGameMapState(String roomId) {
        gameRedisService.deleteGameMapState(roomId);
        log.info("게임 맵 상태 삭제: roomId={}", roomId);
    }

    /**
     * map 생성 함수
     */
    public GameMap createMap() {
        GameMap gameMap = new GameMap();
        List<MapCell> mapCells = new ArrayList<>(Collections.nCopies(MAP_SIZE, null));

        // 이벤트 칸 고정 배치
        for (MapCell.EventCellInfo eventCell : EVENT_CELLS) {
            mapCells.set(eventCell.position(), createEventCell(eventCell.position(), eventCell.name(), eventCell.eventType()));
        }

        // 도시 칸 배치 (랜덤하게 배치함)
        List<Tile> allCities = tileRepository.findAll();
        List<Tile> cityPool = new ArrayList<>(allCities);
        Collections.shuffle(cityPool, random);

        int tileIdx = 0;
        for (int i = 0; i < MAP_SIZE; i++) {
            if (mapCells.get(i) == null && tileIdx < tilePool.size()) {
                Tile tile = tilePool.get(tileIdx++);
                mapCells.set(i, createTileCell(i, tile));
            }
        }

        gameMap.setCells(mapCells);
        return gameMap;
    }

    private MapCell createEventCell(int position, String name, MapCell.EventType eventType) {
        return MapCell.builder()
                .cellNumber(position)
                .cellName(name)
                .ownerName(null)
                .toll(0)
                .buildingType(null)
                .eventType(eventType)
                .build();
    }

    private MapCell createCityCell(int position, Tile tile) {
        return MapCell.builder()
                .cellNumber(position)
                .cellName(tile.getName())
                .ownerName(null)
                .toll(tile.getLandPrice())
                .buildingType(MapCell.BuildingType.FIELD)
                .eventType(null)
                .build();
    }

    /**
     * 플레이어 닉네임 조회
     */
    private String getPlayerNickname(String playerId) {
        return userRedisService.getNickname(playerId);
    }
}
