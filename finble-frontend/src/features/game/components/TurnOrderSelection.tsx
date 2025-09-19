// src/features/game/components/TurnOrderSelection.tsx

import React from 'react';
import { useGameStore } from '../store/useGameStore';
import './TurnOrderSelection.css'; // ✅ CSS 파일을 여기에 import 합니다.

const TurnOrderSelection: React.FC = () => {
  const { players, gamePhase } = useGameStore();

  if (gamePhase !== 'SELECTING_ORDER') {
    return null;
  }

  return (
    <div className="turn-order-overlay">
      <div className="turn-order-container">
        <h2>플레이어 순서</h2>
        <div className="player-cards-container">
          {players.map((player, index) => (
            // ✅ 각 카드에 애니메이션 지연을 위한 인덱스 변수(--i)를 전달합니다.
            <div key={player.id} className="turn-order-card-wrapper" style={{ '--i': index } as React.CSSProperties}>
              <div className="turn-order-card">
                <div className="turn-order-card-inner">
                  <div className="turn-order-card-front">
                    <span className="turn-order-player-name">{player.name}</span>
                  </div>
                  <div className="turn-order-card-back">
                    <span className="order-number">{index + 1}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TurnOrderSelection;