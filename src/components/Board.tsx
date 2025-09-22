import React, { useEffect, useState } from "react";
import styled from "styled-components";

const BoardContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Tile = styled.div<{ left: number; top: number; zIndex: number }>`
  position: absolute;
  width: 128px;
  height: 64px;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translate(-50%, -50%);
  left: ${({ left }) => left}px;
  top: ${({ top }) => top}px;
  z-index: ${({ zIndex }) => zIndex};
`;

interface TilePosition {
  left: number;
  top: number;
  zIndex: number;
}

const Board: React.FC = () => {
  const boardSize = 11; // 보드 한 변의 타일 수 (코너 포함)
  const [tilePositions, setTilePositions] = useState<TilePosition[]>([]);

  const gridToIso = (gridX: number, gridY: number) => {
    const tileWidth = 128; // 타일 이미지의 너비 (조정 필요)
    const tileHeight = 64; // 타일 이미지의 높이 (조정 필요)
    const isoX = (gridX - gridY) * (tileWidth / 2);
    const isoY = (gridX + gridY) * (tileHeight / 2);
    return { isoX, isoY };
  };

  useEffect(() => {
    const positions: TilePosition[] = [];
    const path = [];

    // --- 보드 레이아웃 수정 영역 ---
    // 현재는 11x11 사각형 테두리 모양으로 경로를 생성합니다.
    // 이 부분을 수정하여 보드의 모양을 변경할 수 있습니다.
    // 예를 들어, 십자 모양이나 다른 복잡한 경로를 만들 수 있습니다.
    for (let i = 0; i < boardSize; i++) path.push({ x: i, y: 0 }); // 상단
    for (let i = 1; i < boardSize; i++) path.push({ x: boardSize - 1, y: i }); // 우측
    for (let i = boardSize - 2; i >= 0; i--) path.push({ x: i, y: boardSize - 1 }); // 하단
    for (let i = boardSize - 2; i > 0; i--) path.push({ x: 0, y: i }); // 좌측
    // --- 보드 레이아웃 수정 영역 끝 ---

    path.forEach((p, index) => {
      const totalTiles = boardSize * 4 - 4; // 총 타일 수 (현재는 테두리만 계산)
      if (index < totalTiles) {
        const { isoX, isoY } = gridToIso(p.x, p.y);
        positions.push({
          // 화면 중앙에 배치하기 위한 오프셋 추가 (값 조정 필요)
          left: isoX + window.innerWidth / 2 - 64,
          top: isoY + window.innerHeight / 2 - 300,
          zIndex: p.x + p.y,
        });
      }
    });

    setTilePositions(positions);
  }, [boardSize]);

  return (
    <BoardContainer>
      {tilePositions.map((pos, index) => (
        <Tile
          key={index}
          left={pos.left}
          top={pos.top}
          zIndex={pos.zIndex}
        />
      ))}
    </BoardContainer>
  );
};

export default Board;