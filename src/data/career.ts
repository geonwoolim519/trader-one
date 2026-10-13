import { ASSETS } from "./assets";
import type { GameState, PlayerMeta } from "../types";
import { cashRatio, concentration, holdingCount } from "../utils/portfolioCalculator";

export interface CareerTask {
  id: string;
  title: string;
  detail: string;
  check: (state: GameState, meta: PlayerMeta) => boolean;
}

export interface CareerRank {
  rank: number;
  id: string;
  name: string;
  goal: string;
  tasks: CareerTask[];
}

export const CAREER_RANKS: CareerRank[] = [
  {
    rank: 1,
    id: "rookie",
    name: "Rookie Trader",
    goal: "기초 매매와 수익률 이해",
    tasks: [
      {
        id: "c1_trade",
        title: "시장가 매매 1회",
        detail: "실제로 한 번 체결해 보세요.",
        check: (s) => s.trades.length >= 1,
      },
      {
        id: "c1_news",
        title: "당일 뉴스 읽기",
        detail: "매매 전에 뉴스를 열어 확인합니다.",
        check: (s) => (s.newsOpened?.length ?? 0) >= 1 || s.newsLog.length >= 1,
      },
    ],
  },
  {
    rank: 2,
    id: "junior",
    name: "Junior Analyst",
    goal: "기업 실적과 경제 뉴스 분석",
    tasks: [
      {
        id: "c2_news3",
        title: "뉴스 3건 열람",
        detail: "헤드라인만 보지 말고 본문을 엽니다.",
        check: (s, m) => (s.newsOpened?.length ?? 0) >= 3 || m.newsRead >= 3,
      },
      {
        id: "c2_reason",
        title: "매수 이유 기록",
        detail: "직감이 아닌 이유를 남깁니다.",
        check: (s) => s.trades.some((t) => t.side === "buy" && t.reason && t.reason !== "gut"),
      },
    ],
  },
  {
    rank: 3,
    id: "equity",
    name: "Equity Trader",
    goal: "주식시장과 산업 분석",
    tasks: [
      {
        id: "c3_stock",
        title: "주식 1종목 보유",
        detail: "개별 주식의 뉴스 민감도를 경험합니다.",
        check: (s) => Object.keys(s.holdings).some((id) => ASSETS.find((a) => a.id === id)?.category === "stock"),
      },
      {
        id: "c3_div",
        title: "서로 다른 자산 2개 이상",
        detail: "한 종목에만 기대지 않습니다.",
        check: (s) => holdingCount(s) >= 2,
      },
    ],
  },
  {
    rank: 4,
    id: "fx",
    name: "FX Specialist",
    goal: "환율과 국제경제 분석",
    tasks: [
      {
        id: "c4_fx",
        title: "환율 또는 달러 자산 거래",
        detail: "USD/KRW, 달러 현금성 자산 등을 다룹니다.",
        check: (s) =>
          s.trades.some((t) => ["usdkrw", "eurkrw", "jpykrw", "usdmmf", "em_etf"].includes(t.assetId)),
      },
      {
        id: "c4_read",
        title: "환율 관련 뉴스 확인",
        detail: "달러·원화 뉴스를 엽니다.",
        check: (s) =>
          [...s.pendingNews, ...s.newsLog].some(
            (n) => n.related.includes("usdkrw") && (s.newsOpened ?? []).includes(n.id),
          ) || s.newsLog.some((n) => n.related.includes("usdkrw")),
      },
    ],
  },
  {
    rank: 5,
    id: "macro",
    name: "Macro Strategist",
    goal: "금리와 경기 사이클 분석",
    tasks: [
      {
        id: "c5_bond",
        title: "채권 거래 또는 보유",
        detail: "금리와 반대로 움직이는 채권을 경험합니다.",
        check: (s) =>
          s.trades.some((t) => ["usbond", "krbond", "ustbill"].includes(t.assetId)) ||
          Boolean(s.holdings.usbond || s.holdings.krbond || s.holdings.ustbill),
      },
      {
        id: "c5_cycle",
        title: "ECONOMY 화면에서 국면 확인",
        detail: "경기 국면 카드를 열어 인과를 봅니다.",
        check: (s) => (s.challengeDone ?? []).includes("opened_economy"),
      },
    ],
  },
  {
    rank: 6,
    id: "gpm",
    name: "Global Portfolio Manager",
    goal: "다양한 자산을 조합해 운용",
    tasks: [
      {
        id: "c6_div4",
        title: "자산군 3개 이상 분산",
        detail: "주식·채권·원자재 등 서로 다른 카테고리.",
        check: (s) => {
          const cats = new Set(
            Object.keys(s.holdings)
              .filter((id) => (s.holdings[id]?.qty ?? 0) > 0)
              .map((id) => ASSETS.find((a) => a.id === id)?.category),
          );
          return cats.size >= 3;
        },
      },
      {
        id: "c6_conc",
        title: "한 자산 집중도 55% 미만",
        detail: "집중투자 위험을 낮춥니다.",
        check: (s) => holdingCount(s) >= 3 && concentration(s) < 0.55,
      },
    ],
  },
  {
    rank: 7,
    id: "strategist",
    name: "Market Strategist",
    goal: "복합 위기와 글로벌 변화에 대응",
    tasks: [
      {
        id: "c7_crisis",
        title: "위기 시나리오 완료",
        detail: "금융위기·신용위기·외환위기 중 하나를 끝까지 플레이합니다.",
        check: (s, m) =>
          (["financial_crisis", "bank_credit", "em_fx_crisis", "stagflation"].includes(s.scenarioId ?? "") &&
            s.phase === "ended") ||
          m.scenariosCompleted.some((id) =>
            ["financial_crisis", "bank_credit", "em_fx_crisis", "stagflation"].includes(id),
          ),
      },
      {
        id: "c7_mdd",
        title: "위기에서 MDD -15% 이내",
        detail: "수익률보다 낙폭 통제.",
        check: (s) => s.phase === "ended" && s.mdd >= -0.15 && cashRatio(s) >= 0.15,
      },
    ],
  },
];

export function careerProgress(meta: PlayerMeta, state: GameState | null) {
  const done = new Set(meta.careerDone ?? []);
  const rank = CAREER_RANKS.find((r) => r.rank === (meta.careerRank || 1)) ?? CAREER_RANKS[0];
  const complete = rank.tasks.filter((t) => done.has(t.id) || (state ? t.check(state, meta) : false));
  return { rank, done, ready: complete.length === rank.tasks.length };
}
