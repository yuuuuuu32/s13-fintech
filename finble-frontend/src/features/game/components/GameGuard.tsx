import { useGameStore } from '../store/useGameStore';

export default function GameGuard({ children }: { children: React.ReactNode }) {
  const gamePhase = useGameStore(s => s.gamePhase);
  const players = useGameStore(s => s.players);

  // 플레이어 배열 변환
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});
  
  // 로딩 중이거나 정상적인 게임 상태에서는 항상 children 표시
  const isValidGameState = playersArray.length > 0 || 
                          gamePhase === 'SELECTING_ORDER' || 
                          gamePhase === 'WAITING_FOR_ROLL' ||
                          gamePhase === 'ROLLING_DICE' ||
                          gamePhase === 'MOVING_PLAYER' ||
                          gamePhase === 'TILE_EVENT';

  if (!isValidGameState && gamePhase === 'GAME_OVER') {
    // 진짜 게임 오버일 때만 특별한 처리 (현재는 기본 표시)
    return <div style={{ position: 'relative', zIndex: 0 }}>{children}</div>;
  }

  return <>{children}</>;
}
