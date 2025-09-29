
package com.ssafy.BlueMarble.domain.game.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.game.service.MapService;
import com.ssafy.BlueMarble.domain.user.service.UserRedisService;
import com.ssafy.BlueMarble.websocket.dto.MessageDto;
import com.ssafy.BlueMarble.websocket.dto.MessageType;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import com.ssafy.BlueMarble.websocket.dto.payload.game.EndGamePayload;
import com.ssafy.BlueMarble.websocket.service.SessionMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 게임 승리 조건 체크 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VictoryService {

    private final SessionMessageService sessionMessageService;
    private final GameRedisService gameRedisService;
    private final UserRedisService userRedisService;
    private final ObjectMapper objectMapper;
    private final MapService mapService;

    // 싸피 스페셜 땅 위치 (광주, 대전, 구미, 부산, 서울)
    private static final List<Integer> SPECIAL_LAND_POSITIONS = Arrays.asList(5, 13, 21, 28, 31);

    /**
     * 스페셜 땅 5개 모두 소유 승리 조건 체크
     * @param roomId 방 ID
     * @param gameState 현재 게임 상태
     * @return 승리한 플레이어의 닉네임 (승리자가 없으면 null)
     */
    public String checkSpecialLandVictory(String roomId, CreateMapPayload gameState) {
        try {
            if (gameState == null || gameState.getPlayers() == null) {
                return null;
            }

            // 각 플레이어가 소유한 스페셜 땅 개수 체크
            for (Map.Entry<String, CreateMapPayload.PlayerState> entry : gameState.getPlayers().entrySet()) {
                String userId = entry.getKey();
                CreateMapPayload.PlayerState player = entry.getValue();

                if (!player.isActive() || player.getOwnedProperties() == null) {
                    continue;
                }

                // 플레이어가 소유한 스페셜 땅 개수 카운트
                long specialLandCount = player.getOwnedProperties().stream()
                        .filter(SPECIAL_LAND_POSITIONS::contains)
                        .count();

                log.info("[VICTORY_CHECK] 플레이어 {} 스페셜 땅 소유 개수: {}/5", player.getNickname(), specialLandCount);

                // 스페셜 땅 5개를 모두 소유한 경우 승리
                if (specialLandCount == 5) {
                    log.info("[VICTORY] 스페셜 땅 5개 소유 승리: player={}, userId={}", player.getNickname(), userId);
                    return player.getNickname(); // 승리자만 return, 승리 처리는 상위에서
                }
            }

            return null; // 승리자 없음

        } catch (Exception e) {
            log.error("[VICTORY_CHECK] 스페셜 땅 승리 조건 체크 중 오류: roomId={}", roomId, e);
            return null;
        }
    }

    /**
     * 게임 승리 처리
     * @param roomId 방 ID
     * @param winnerNickname 승리자 닉네임
     * @param victoryReason 승리 사유
     * @param gameState 현재 게임 상태 (동시성 보장을 위해 매개변수로 받음)
     */
    private void handleGameVictory(String roomId, String winnerNickname, String victoryReason, CreateMapPayload gameState) {
        try {
            // 게임 상태를 종료로 변경 (매개변수로 받은 gameState 사용)
            if (gameState != null) {
                gameState.setGameState(GameState.FINISHED);
                gameRedisService.saveGameMapState(roomId, gameState);
            }

            // 승리 메시지 전송
            EndGamePayload endGamePayload = EndGamePayload.builder()
                    .winnerNickname(winnerNickname)
                    .victoryReason(victoryReason)
                    .gameEndTime(System.currentTimeMillis())
                    .build();

            var payloadNode = objectMapper.valueToTree(endGamePayload);
            MessageDto victoryMessage = new MessageDto(MessageType.GAME_END, payloadNode);
            sessionMessageService.sendMessageToRoom(roomId, victoryMessage);

            log.info("[VICTORY] 게임 종료 메시지 전송 완료: roomId={}, winner={}, reason={}",
                    roomId, winnerNickname, victoryReason);

            // 게임 종료 처리 (타이머 정리 포함)
            mapService.endGame(roomId);

            // 게임정보 모두 삭제
            mapService.deleteGameMapState(roomId);

            log.info("[VICTORY] 게임 정리 완료: roomId={}", roomId);

        } catch (Exception e) {
            log.error("[VICTORY] 게임 승리 처리 중 오류 발생: roomId={}, winner={}", roomId, winnerNickname, e);
        }
    }

    /**
     * 부동산 거래 후 승리 조건 체크 (AOP나 이벤트에서 호출)
     * @param roomId 방 ID
     */
    public void checkVictoryAfterLandTrade(String roomId) {
        try {
            CreateMapPayload gameState = gameRedisService.getGameMapState(roomId);
            if (gameState == null) {
                return;
            }

            // 게임이 이미 종료된 경우 체크하지 않음
            if (GameState.FINISHED.equals(gameState.getGameState())) {
                return;
            }

            // 모든 승리 조건 체크 (통합)
            String winner = checkAllVictoryConditions(roomId, gameState);
            if (winner != null) {
                log.info("[VICTORY] 승리자 발견: roomId={}, winner={}", roomId, winner);
            }

        } catch (Exception e) {
            log.error("[VICTORY] 부동산 거래 후 승리 조건 체크 중 오류: roomId={}", roomId, e);
        }
    }

    /**
     * 생존자 승리 조건 체크 (다른 플레이어 모두 파산)
     * @param roomId 방 ID
     * @param gameState 현재 게임 상태
     * @return 승리한 플레이어의 닉네임 (승리자가 없으면 null)
     */
    private String checkLastSurvivorVictory(String roomId, CreateMapPayload gameState) {
        try {
            List<CreateMapPayload.PlayerState> activePlayers = gameState.getPlayers().values().stream()
                    .filter(CreateMapPayload.PlayerState::isActive)
                    .toList();

            int totalPlayers = gameState.getPlayers().size();

            // 최소 2명 이상의 게임에서 활성 플레이어가 1명만 남은 경우 승리
            if (totalPlayers >= 2 && activePlayers.size() == 1) {
                String winnerNickname = activePlayers.get(0).getNickname();
                log.info("[VICTORY] 생존자 승리: player={}, 전체플레이어={}, 생존자={}",
                        winnerNickname, totalPlayers, activePlayers.size());
                return winnerNickname; // 승리자만 return, 승리 처리는 상위에서
            }

            return null; // 승리자 없음

        } catch (Exception e) {
            log.error("[VICTORY_CHECK] 생존자 승리 조건 체크 중 오류: roomId={}", roomId, e);
            return null;
        }
    }

    /**
     * 턴 제한 승리 조건 체크 (20턴 후 최고 자산 플레이어)
     * @param roomId 방 ID
     * @param gameState 현재 게임 상태
     * @return 승리한 플레이어의 닉네임 (승리자가 없으면 null)
     */
    private String checkTurnLimitVictory(String roomId, CreateMapPayload gameState) {
        try {
            // 20턴을 초과한 경우에만 체크
            if (gameState.getGameTurn() <= 20) {
                return null;
            }

            // 활성 플레이어들의 총 자산 계산 (현금 + 보유 부동산 가치)
            Optional<CreateMapPayload.PlayerState> richestPlayer = gameState.getPlayers().values().stream()
                    .filter(CreateMapPayload.PlayerState::isActive)
                    .max(Comparator.comparingLong(this::calculateTotalAssets));

            if (richestPlayer.isPresent()) {
                String winnerNickname = richestPlayer.get().getNickname();
                long totalAssets = calculateTotalAssets(richestPlayer.get());

                log.info("[VICTORY] 20턴 제한 승리: player={}, totalAssets={}", winnerNickname, totalAssets);
                return winnerNickname; // 승리자만 return, 승리 처리는 상위에서
            }

            return null; // 승리자 없음

        } catch (Exception e) {
            log.error("[VICTORY_CHECK] 턴 제한 승리 조건 체크 중 오류: roomId={}", roomId, e);
            return null;
        }
    }

    /**
     * 플레이어의 총 자산 계산 (현금 + 보유 부동산 가치)
     * @param player 플레이어 상태
     * @return 총 자산 금액
     */
    private long calculateTotalAssets(CreateMapPayload.PlayerState player) {
        long totalAssets = player.getMoney(); // 현금

        // 보유 부동산 자산 가치 추가 (기본 땅값으로 계산)
        if (player.getOwnedProperties() != null) {
            for (Integer landNum : player.getOwnedProperties()) {
                totalAssets += getBaseLandPrice(landNum);
            }
        }

        return totalAssets;
    }

    /**
     * 땅 번호에 따른 기본 부동산 자산 가치 반환
     * @param landNum 땅 번호
     * @return 기본 부동산 자산 가치
     */
    private long getBaseLandPrice(Integer landNum) {
        // 스페셜 땅 가격
        return switch (landNum) {
            case 5 -> 2000000;   // 광주
            case 13 -> 3000000;  // 대전
            case 21 -> 4000000;  // 구미
            case 28 -> 5000000;  // 부산
            case 31 -> 6000000;  // 서울
            default -> {
                // 일반 땅 가격 (대략적인 계산, 실제로는 DB에서 가져와야 함)
                if (landNum <= 10) yield 250000;
                else if (landNum <= 20) yield 500000;
                else if (landNum <= 30) yield 750000;
                else yield 1000000;
            }
        };
    }

    /**
     * 모든 승리 조건 체크 (통합) - 공개 메서드
     * @param roomId 방 ID
     * @param gameState 현재 게임 상태
     * @return 승리한 플레이어의 닉네임 (승리자가 없으면 null)
     */
    public String checkAllVictoryConditions(String roomId, CreateMapPayload gameState) {
        try {
            if (gameState == null || gameState.getPlayers() == null) {
                return null;
            }

            // 게임이 이미 종료된 경우 체크하지 않음
            if (GameState.FINISHED.equals(gameState.getGameState())) {
                return null;
            }

            // 1. 스페셜 땅 5개 소유 승리 조건 체크 (최우선)
            String specialLandWinner = checkSpecialLandVictory(roomId, gameState);
            if (specialLandWinner != null) {
                handleGameVictory(roomId, specialLandWinner, "스페셜 땅 5개 소유 달성!", gameState);
                return specialLandWinner;
            }

            // 2. 생존자 승리 조건 체크 (다른 플레이어 모두 파산)
            String lastSurvivorWinner = checkLastSurvivorVictory(roomId, gameState);
            if (lastSurvivorWinner != null) {
                handleGameVictory(roomId, lastSurvivorWinner, "마지막 생존자!", gameState);
                return lastSurvivorWinner;
            }

            // 3. 턴 제한 승리 조건 체크 (20턴 후 최고 자산 플레이어)
            String turnLimitWinner = checkTurnLimitVictory(roomId, gameState);
            if (turnLimitWinner != null) {
                handleGameVictory(roomId, turnLimitWinner, "20턴 후 최고 자산가!", gameState);
                return turnLimitWinner;
            }

            return null; // 승리자 없음

        } catch (Exception e) {
            log.error("[VICTORY_CHECK] 모든 승리 조건 체크 중 오류: roomId={}", roomId, e);
            return null;
        }
    }

    /**
     * 스페셜 땅 위치 목록 반환 (테스트용)
     * @return 스페셜 땅 위치 목록
     */
    public List<Integer> getSpecialLandPositions() {
        return SPECIAL_LAND_POSITIONS;
    }
}