import React from "react";
import "./PlayerGrid.css";

// 의자 PNG(투명), 캐릭터 기본 PNG(투명)
// 파일명만 실제 가지고 계신 걸로 바꿔도 됩니다.
import chairPng from "../../../assets/chair_empty.png";
import defaultCharPng from "../../../assets/character_sitting.png";

type Player = {
  id: string;
  name?: string;
  nickname?: string;
  displayName?: string;
  icon?: string;          // 캐릭터 이미지가 있다면 여기로 들어올 수 있음
  avatarUrl?: string;     // 혹은 avatarUrl
  isOwner?: boolean;
  seat?: number;          // 서버가 좌석을 내려주면 활용
};

type Props = {
  players: Player[];
  currentUserId?: string;
  totalSeats?: number; // 기본 4
  onClickSeat?: (seatIndex: number) => void;
};

// 레퍼런스 기준 좌표 (16:9 화면 가정)
// 필요하면 %만 조정하면 됩니다.
const SEAT_POSITIONS = [
  { left: "18%", bottom: "9%" },
  { left: "41%", bottom: "9%" },
  { left: "63%", bottom: "9%" },
  { left: "86%", bottom: "9%" },
];

export default function PlayerGrid({
  players,
  currentUserId,
  totalSeats = 4,
  onClickSeat,
}: Props) {
  // 서버가 seat 인덱스를 내려주지 않는 경우를 대비해
  // 앞에서부터 채우는 fallback 로직
  const sorted = [...players].sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  const seatToPlayer: Record<number, Player | undefined> = {};
  let fillIdx = 0;
  for (const p of sorted) {
    const seat = typeof p.seat === "number" && p.seat >= 0 ? p.seat : fillIdx++;
    if (seat < totalSeats) seatToPlayer[seat] = p;
  }

  return (
    <div className="seats-layer" aria-label="waiting-room-seats">
      {Array.from({ length: totalSeats }).map((_, i) => {
        const p = seatToPlayer[i];
        const occupied = Boolean(p);
        const pos = SEAT_POSITIONS[i] || { left: `${(i + 1) * (100 / (totalSeats + 1))}%`, bottom: "9%" };

        const displayName =
          p?.displayName || p?.nickname || p?.name || "플레이어";

        const isMe = p?.id && p.id === currentUserId;
        const roleText = p?.isOwner ? "방장" : isMe ? "나" : undefined;

        // 캐릭터 이미지 우선순위: icon → avatarUrl → default
        const charSrc = (p?.icon || p?.avatarUrl || defaultCharPng) as string;

        return (
          <button
            key={i}
            type="button"
            className={`seat ${occupied ? "occupied" : "empty"}`}
            style={pos as React.CSSProperties}
            onClick={() => onClickSeat?.(i)}
          >
            {/* 이름/역할 배지 */}
            <div className="name-tag">
              {occupied ? (
                <>
                  <span className="player-name">{displayName}</span>
                  {roleText && <span className="player-role">({roleText})</span>}
                </>
              ) : (
                <span className="empty-text">빈 자리</span>
              )}
            </div>

            {/* 의자 */}
            <img src={chairPng} alt="chair" className="chair-img" draggable={false} />

            {/* 캐릭터 (의자보다 위 레이어) */}
            {occupied && (
              <img
                src={charSrc}
                alt={`${displayName} 캐릭터`}
                className="character-img"
                draggable={false}
              />
            )}

            {/* 바닥 네온 링 */}
            <div className="neon-ring" />
          </button>
        );
      })}
    </div>
  );
}
