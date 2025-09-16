import type { Player } from "../types/gameTypes.ts";

export const BAIL_AMOUNT = 500000;

export const chanceCards = [
  {
    text: "정부 지원금 10만원을 받습니다.",
    action: (player: Player) => ({ ...player, money: player.money + 100000 }),
  },
  {
    text: "세금 15만원을 내세요.",
    action: (player: Player) => ({ ...player, money: player.money - 150000 }),
  },
  {
    text: "뒤로 3칸 이동하세요.",
    action: (player: Player) => ({
      ...player,
      position:
        (player.position - 3 + 32) % 32, // boardData.length는 32로 가정
    }),
  },
  {
    text: "은행에서 20만원을 빌립니다.",
    action: (player: Player) => ({ ...player, money: player.money + 200000 }),
  },
  {
    text: "가장 비싼 도시로 이동합니다. (통행료 면제)",
    action: (player: Player) => ({ ...player, position: 28 }),
  }, // 송파
];

export const CHARACTER_PREFABS = ["cone", "sphere", "box", "torus"];