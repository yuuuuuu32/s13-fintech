import { useGameStore } from '../store/useGameStore';

export default function GameGuard({ children }: { children: React.ReactNode }) {
  const gamePhase = useGameStore(s => s.gamePhase);

  // 잘못된 'GAME_OVER' 상태는 그냥 무시
  const isFakeGameOver = gamePhase === 'GAME_OVER' && /* 원하는 추가 조건 */
                         true; // 지금은 무조건 true로 차단

  if (isFakeGameOver) {
    // 🚫 아무것도 안 띄우고, 기존 children(UI)만 유지
    return <div style={{ position:'relative', zIndex:0 }}>{children}</div>;
  }

  return <>{children}</>;
}
