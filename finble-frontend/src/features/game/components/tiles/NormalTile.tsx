import { Text } from '@react-three/drei'; // 이것도 삭제 가능
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import Building from '../Building';

interface NormalTileProps {
  tileIndex: number;
}

export function NormalTile({ tileIndex }: NormalTileProps) {
  const tile = useGameStore(state => state.board[tileIndex]);

  return (
    <>
            {tile?.type === 'NORMAL' && tile.buildings && tile.buildings.level > 0 && (
                <Building level={tile.buildings.level as 1 | 2 | 3} tileIndex={tileIndex} />
            )}    </>
  );
}
