import apiClient from './client';
import type { GameRoom } from '../features/lobby/store/useLobbyStore';

// 백엔드에서 오는 Page 객체에 대한 타입
interface Page<T> {
  content: T[];
  // 필요하다면 다른 페이지 관련 속성들을 추가할 수 있습니다.
  // (totalPages, totalElements 등)
}

interface RoomResponseDTO {
  roomId: string;
  roomName: string;
  roomState: string;
  userCnt: number;
  userLimit: number;
}

export const getRoomList = async (): Promise<GameRoom[]> => {
  const token = localStorage.getItem('jwt');
  if (!token) {
    throw new Error('인증 토큰을 찾을 수 없습니다.');
  }

  try {
    const response = await apiClient.get<Page<GameRoom>>('/api/room/list', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // 캐시 방지를 위해 타임스탬프를 쿼리 파라미터로 추가
      params: {
        _: new Date().getTime(),
        size: 100, // 페이지 크기를 100으로 설정
      },
    });
    
    // API 응답(content)을 프론트엔드에서 사용할 GameRoom[] 형태로 변환합니다.
    // 현재는 백엔드 DTO와 GameRoom 타입이 거의 일치하지만,
    // status처럼 프론트엔드에만 필요한 값을 추가하는 등의 처리를 여기서 할 수 있습니다.
    console.log('Raw API response:', response.data.content);
    const mappedRooms = response.data.content.map((room: RoomResponseDTO) => ({
      id: room.roomId,
      name: room.roomName,
      // roomState가 유효한 문자열인 경우에만 toLowerCase()를 호출하고, 아닐 경우 기본값 'waiting'을 사용합니다.
      status: typeof room.roomState === 'string' ? room.roomState.toLowerCase() : 'waiting',
      playerCount: room.userCnt,
      maxPlayers: room.userLimit,
    }));
    console.log('Mapped rooms for frontend:', mappedRooms);
    return mappedRooms;
  } catch (error) {
    // 여기서 발생한 에러는 이 함수를 호출한 곳(예: Zustand 스토어)에서 처리합니다.
    console.error('방 목록 API 호출에 실패했습니다:', error);
    // 에러를 다시 던져서 호출한 쪽에서 알 수 있도록 합니다.
    throw error;
  }
};
