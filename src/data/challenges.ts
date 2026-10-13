import type { GameState, PlayerMeta } from "../types";
import { holdingCount } from "../utils/portfolioCalculator";
import { mulberry32 } from "../utils/randomEngine";

export interface ChallengeDef {
  id: string;
  title: string;
  detail: string;
  xp: number;
  check: (state: GameState, meta: PlayerMeta) => boolean;
}

const POOL: ChallengeDef[] = [
  {
    id: "limit1",
    title: "지정가 주문 1회 활용",
    detail: "시장가가 아닌 지정가를 걸어 보세요.",
    xp: 60,
    check: (s) => (s.openOrders ?? []).some((o) => o.type === "limit") || s.trades.some((t) => t.orderType === "limit"),
  },
  {
    id: "compare3",
    title: "서로 다른 자산 비교",
    detail: "MARKET에서 자산을 비교합니다.",
    xp: 50,
    check: (s, m) => m.compared || (s.challengeDone ?? []).some((x) => x.endsWith(":compare3")),
  },
  {
    id: "news3",
    title: "경제 뉴스 3개 읽기",
    detail: "당일 또는 아카이브 뉴스를 엽니다.",
    xp: 50,
    check: (s) => (s.newsOpened?.length ?? 0) >= 3,
  },
  {
    id: "risk",
    title: "포트폴리오 위험 확인",
    detail: "PORTFOLIO에서 위험 등급을 확인합니다.",
    xp: 40,
    check: (s) => (s.challengeDone ?? []).includes(`d${s.day}:risk`) || holdingCount(s) >= 1,
  },
  {
    id: "fee",
    title: "수수료 포함 결과 계산",
    detail: "체결 후 수수료가 기록에 남았는지 확인합니다.",
    xp: 40,
    check: (s) => s.trades.some((t) => t.fee > 0),
  },
  {
    id: "chain",
    title: "연쇄효과 추적",
    detail: "ECONOMY 인과 체인을 엽니다.",
    xp: 70,
    check: (s) => (s.challengeDone ?? []).includes("opened_economy") && (s.causality?.length ?? 0) >= 0,
  },
  {
    id: "mdd",
    title: "최대 낙폭 이해하기",
    detail: "현재 MDD를 확인하고 포지션을 점검합니다.",
    xp: 50,
    check: (s) => s.day >= 2,
  },
  {
    id: "no_force",
    title: "억지 거래 피하기",
    detail: "오늘 거래하지 않아도 됩니다. 이유 없는 매매를 줄이세요.",
    xp: 40,
    check: (s) => s.trades.filter((t) => t.day === s.day && t.reason === "gut").length === 0,
  },
];

export function dailyChallenges(day: number): ChallengeDef[] {
  const rng = mulberry32(day * 1103515245 + 90210);
  const copy = [...POOL];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 3);
}

export function challengeKey(day: number, id: string) {
  return `${day}:${id}`;
}
