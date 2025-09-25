package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.dto.GameMap;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.game.entity.Tile;
import com.ssafy.BlueMarble.domain.game.repository.TileRepository;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.domain.Timer.Service.TimerService;
import com.ssafy.BlueMarble.global.common.event.RoomDeletedEvent;
import org.springframework.context.event.EventListener;
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
    private final TimerService timerService;

    private static final int MAP_SIZE = 32;
    private static final Random random = new Random(System.nanoTime());

    // 이벤트 칸 위치와 타입을 매핑하는 Map (위치 -> 타일 정보)
    private static final Map<Integer, Tile> EVENT_CELLS;

    static {
        Map<Integer, Tile> cells = new HashMap<>();
        cells.put(0, Tile.builder().id(0L).name("시작").type(Tile.TileType.START).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("지나가거나 도착하면 월급 받음").build());
        cells.put(3, Tile.builder().id(3L).name("찬스").type(Tile.TileType.CHANCE).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("찬스카드 뽑기").build());
        cells.put(5, Tile.builder().id(5L).name("광주").type(Tile.TileType.SPECIAL).landPrice(2000000L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("싸피특별땅 - 건설 불가").build());
        cells.put(8, Tile.builder().id(8L).name("감옥").type(Tile.TileType.JAIL).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("3턴간 이동 불가, 보석금으로 탈출 가능").build());
        cells.put(11, Tile.builder().id(11L).name("찬스").type(Tile.TileType.CHANCE).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("찬스카드 뽑기").build());
        cells.put(13, Tile.builder().id(13L).name("대전").type(Tile.TileType.SPECIAL).landPrice(3000000L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("싸피특별땅 - 건설 불가").build());
        cells.put(16, Tile.builder().id(16L).name("세계여행").type(Tile.TileType.AIRPLANE).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("일정 금액 지불하고 원하는 땅으로 이동").build());
        cells.put(19, Tile.builder().id(19L).name("찬스").type(Tile.TileType.CHANCE).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("찬스카드 뽑기").build());
        cells.put(21, Tile.builder().id(21L).name("구미").type(Tile.TileType.SPECIAL).landPrice(4000000L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("싸피특별땅 - 건설 불가").build());
        cells.put(24, Tile.builder().id(24L).name("국세청").type(Tile.TileType.NTS).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("일정 금액을 납부").build());
        cells.put(27, Tile.builder().id(27L).name("찬스").type(Tile.TileType.CHANCE).landPrice(0L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("찬스카드 뽑기").build());
        cells.put(28, Tile.builder().id(28L).name("부산").type(Tile.TileType.SPECIAL).landPrice(5000000L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("싸피특별땅 - 건설 불가").build());
        cells.put(31, Tile.builder().id(31L).name("서울").type(Tile.TileType.SPECIAL).landPrice(6000000L).housePrice(0L).buildingPrice(0L).hotelPrice(0L).description("싸피특별땅 - 건설 불가").build());
        EVENT_CELLS = Collections.unmodifiableMap(cells);
    }

    /**
     * 새로운 게임 맵 상태 생성 (방에서 게임 시작할 때 호출)
     */
    public void createNewGameMapState(String roomId) {
        if (roomId == null) {
            throw new BusinessException(BusinessError.ROOM_ID_NOT_FOUND);
        }
        // 게임상태 업데이트
        String stateKey = "room:" + roomId + ":state";
        redisTemplate.opsForValue().set(stateKey, GameState.PLAYING.name());

        String usersKey = "room:" + roomId + ":users";
        Set<String> playerIds = redisTemplate.opsForSet().members(usersKey);
        if (playerIds == null || playerIds.isEmpty()) {
            throw new BusinessException(BusinessError.USER_ID_NOT_FOUND);
        }

        // 맵 생성
        GameMap gameMap = createMap();

        // 플레이어 순서 랜덤 결정
        List<String> shuffledPlayers = new ArrayList<>(playerIds);
        List<String> playerNames = new ArrayList<>();
        Collections.shuffle(shuffledPlayers, random);

        // 플레이어 상태 초기화
        Map<String, CreateMapPayload.PlayerState> players = new ConcurrentHashMap<>();
        for (String playerId : shuffledPlayers) {
            String playerName = getPlayerNickname(playerId);
            CreateMapPayload.PlayerState playerState = CreateMapPayload.PlayerState.builder()
                    .userId(playerId)
                    .nickname(playerName)
                    .position(0) // 시작 위치
                    .money(20000000L) // 초기 자금
                    .ownedProperties(new ArrayList<>())
                    .isInJail(false)
                    .jailTurns(0)
                    .isActive(true)
                    // .anglecard(false) // 게임 시작 시 천사카드 미보유 (비활성화됨)
                    .build();
            players.put(playerId, playerState);
            playerNames.add(playerName);
        }

        // 게임 상태 생성
        CreateMapPayload gameState = CreateMapPayload.builder()
                .roomId(roomId)
                .gameState(GameState.PLAYING)
                .currentMap(gameMap)
                .gameTurn(1L)
                .playerOrder(playerNames)
                .players(players)
                .currentPlayerIndex(0)
                .economicPeriodName("근대사")
                .economicEffectName("산업혁명")
                .economicDescription("산업화로 부동산 가격이 상승하고 있습니다.")
                .economicFullName("산업혁명 - 호황")
                .salaryMultiplier(1.6)
                .buildingCostMultiplier(1.3)
                .propertyPriceMultiplier(1.3)
                .isBoom(true)
                .remainingTurns(1)
                // .angelCardInDeck(true) // 게임 시작 시 천사카드는 덱에 포함 (비활성화됨)
                .build();
        
        // Redis에 저장
        gameRedisService.saveGameMapState(roomId, gameState);
        
        JsonNode mapState = objectMapper.valueToTree(gameState);
        MessageDto message = new MessageDto(MessageType.START_GAME_OBSERVE, mapState);
        sessionMessageService.sendMessageToRoom(roomId, message);

        // TODO : 게임을 시작하자마자 타이머를 돌려야함 (이때 5초 딜레이 필요)
        // 10. 타이머 시작 (턴을 즉시 종료하지 않음)
        String firstUserId = shuffledPlayers.get(0);
        timerService.startTurnTimer(roomId, 35L);

        log.info("새로운 게임 맵 상태 생성: roomId={}, players={}",
                roomId, shuffledPlayers.size());
    }

    /**
     * 게임 종료
     */
    public void endGame(String roomId) {
        CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
        gameState.setGameState(GameState.FINISHED);
        gameRedisService.saveGameMapState(roomId, gameState);

        // 게임 종료 시 타이머 정리
        timerService.clearGameTimer(roomId);

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
     * 방 삭제 이벤트 리스너
     */
    @EventListener
    public void handleRoomDeletedEvent(RoomDeletedEvent event) {
        String roomId = event.getRoomId();
        log.info("방 삭제 이벤트 수신: roomId={}", roomId);
        
        // 게임 관련 데이터 정리
        deleteGameMapState(roomId);
        timerService.clearGameTimer(roomId);
    }

    /**
     * map 생성 함수
     */
    public GameMap createMap() {
        GameMap gameMap = new GameMap();
        List<Tile> mapCells = new ArrayList<>(Collections.nCopies(MAP_SIZE, null));

        // 이벤트 칸 고정 배치
        for (Map.Entry<Integer, Tile> entry : EVENT_CELLS.entrySet()) {
            int position = entry.getKey();
            Tile eventTile = entry.getValue();
            // 위치 정보를 포함한 새로운 Tile 객체 생성
            Tile positionedTile = Tile.builder()
                    .name(eventTile.getName())
                    .type(eventTile.getType())
                    .landPrice(eventTile.getLandPrice())
                    .housePrice(eventTile.getHousePrice())
                    .buildingPrice(eventTile.getBuildingPrice())
                    .hotelPrice(eventTile.getHotelPrice())
                    .description(eventTile.getDescription())
                    .build();
            positionedTile.setCellNumber(position);
            positionedTile.setOwnerName(null);
            positionedTile.setToll(eventTile.getLandPrice());
            positionedTile.setBuildingType(Tile.BuildingType.FIELD);
            mapCells.set(position, positionedTile);
        }

        // 도시 칸 배치 (랜덤하게 배치함)
        List<Tile> allCities = tileRepository.findAll();
        List<Tile> cityPool = new ArrayList<>(allCities);
        Collections.shuffle(cityPool, random);

        int tileIdx = 0;
        for (int i = 0; i < MAP_SIZE; i++) {
            if (mapCells.get(i) == null && tileIdx < cityPool.size()) {
                Tile tile = cityPool.get(tileIdx++);
                // 일반 도시 타일 생성
                Tile cityTile = Tile.builder()
                        .name(tile.getName())
                        .type(Tile.TileType.NORMAL)
                        .landPrice(tile.getLandPrice())
                        .housePrice(tile.getHousePrice())
                        .buildingPrice(tile.getBuildingPrice())
                        .hotelPrice(tile.getHotelPrice())
                        .description(tile.getDescription())
                        .build();
                cityTile.setCellNumber(i);
                cityTile.setOwnerName(null);
                cityTile.setToll(tile.getLandPrice());
                cityTile.setBuildingType(Tile.BuildingType.FIELD);
                mapCells.set(i, cityTile);
            }
        }

        gameMap.setCells(mapCells);
        return gameMap;
    }

    /**
     * 플레이어 닉네임 조회
     */
    private String getPlayerNickname(String playerId) {
        return userRedisService.getNickname(playerId);
    }
}
