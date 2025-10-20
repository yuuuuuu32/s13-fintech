package com.ssafy.BlueMarble.global.common.game.Aspect;

import com.ssafy.BlueMarble.domain.game.entity.GameState;
import com.ssafy.BlueMarble.domain.game.service.VictoryService;
import com.ssafy.BlueMarble.global.common.game.service.BankruptcyService;
import com.ssafy.BlueMarble.websocket.dto.payload.game.CreateMapPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.Map;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class BankruptcyCheckAspect {

    private final BankruptcyService bankruptcyService;
    private final VictoryService victoryService;

    @After("execution(* com.ssafy.BlueMarble.domain.game.service.GameRedisService.saveGameMapState(..))")
    public void checkBankruptcyAfterSave(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            String roomId = (String) args[0];  // 첫 번째 파라미터
            CreateMapPayload state = (CreateMapPayload) args[1];  // 두 번째 파라미터

            log.debug("AOP 파산 & 종료조건 체크 시작: roomId={}", roomId);

            // 모든 플레이어의 자산 체크
            if (state.getGameState().equals(GameState.PLAYING)) {
                for (Map.Entry<String, CreateMapPayload.PlayerState> entry : state.getPlayers().entrySet()) {
                    String userId = entry.getKey();
                    CreateMapPayload.PlayerState player = entry.getValue();

                    // 활성 플레이어만 체크
                    if (player.isActive() && player.getMoney() <= 0) {
                        log.info("플레이어 파산 감지: roomId={}, userId={}, nickname={}, money={}",
                                roomId, userId, player.getNickname(), player.getMoney());

                        bankruptcyService.handleBankruptcy(state);
                    }
                }
                // 파산 후 승리 조건 체크 (VictoryService 통합 승리 조건 사용)
                victoryService.checkAllVictoryConditions(roomId, state);
            }

        } catch (Exception e) {
            log.error("AOP 파산 체크 중 오류", e);
        }
    }
}