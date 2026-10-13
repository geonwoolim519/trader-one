import { ASSETS } from "./assets";
import type { GameState, PlayerMeta } from "../types";
import { cashRatio, holdingCount } from "../utils/portfolioCalculator";

export const ACHIEVEMENTS = [
  { id: "first_trade", name: "First Trade", detail: "첫 거래 완료" },
  { id: "diversification", name: "Diversification", detail: "서로 다른 자산군 4개 이상 보유" },
  { id: "risk_manager", name: "Risk Manager", detail: "최대 낙폭 -10% 이내 유지" },
  { id: "macro_reader", name: "Macro Reader", detail: "경제 이벤트 10개 해석" },
  { id: "scenario_survivor", name: "Scenario Survivor", detail: "위기 시나리오 완료" },
  { id: "limit_pro", name: "Limit Order Pro", detail: "지정가 주문 체결 경험" },
  { id: "global_thinker", name: "Global Thinker", detail: "4개 경제권이 등장하는 시나리오 완료" },
  { id: "long_planner", name: "Long-term Planner", detail: "90일 게임 완료" },
  { id: "trade_reviewer", name: "Trade Reviewer", detail: "거래 복기 10회" },
  { id: "crisis_analyst", name: "Crisis Analyst", detail: "금융위기 시나리오 학습 목표 달성" },
];

const CRISIS = ["financial_crisis", "bank_credit", "em_fx_crisis", "stagflation", "disaster_supply"];
const GLOBAL = ["trade_war", "fx_conflict", "em_fx_crisis", "strong_dollar", "supply_reconfig", "semi_export_ban"];

export function achievementUnlocked(id: string, state: GameState, meta: PlayerMeta) {
  if (id === "first_trade") return state.trades.length >= 1;
  if (id === "diversification") {
    const cats = new Set(
      Object.keys(state.holdings)
        .filter((k) => (state.holdings[k]?.qty ?? 0) > 0)
        .map((k) => ASSETS.find((a) => a.id === k)?.category),
    );
    return cats.size >= 4;
  }
  if (id === "risk_manager") return state.day >= 8 && state.mdd >= -0.1 && cashRatio(state) >= 0.1;
  if (id === "macro_reader") return state.newsLog.length + (state.newsOpened?.length ?? 0) >= 10;
  if (id === "scenario_survivor")
    return (
      (state.phase === "ended" && CRISIS.includes(state.scenarioId ?? "")) ||
      meta.scenariosCompleted.some((s) => CRISIS.includes(s))
    );
  if (id === "limit_pro")
    return meta.limitFills >= 1 || state.trades.some((t) => t.orderType === "limit") || (state.openOrders ?? []).some((o) => o.status === "filled" && o.type === "limit");
  if (id === "global_thinker")
    return (
      (state.phase === "ended" && GLOBAL.includes(state.scenarioId ?? "")) ||
      meta.scenariosCompleted.some((s) => GLOBAL.includes(s))
    );
  if (id === "long_planner") return state.phase === "ended" && state.totalDays >= 90;
  if (id === "trade_reviewer") return meta.journalReviews >= 10;
  if (id === "crisis_analyst")
    return (
      state.scenarioId === "financial_crisis" &&
      state.phase === "ended" &&
      state.mdd >= -0.18 &&
      holdingCount(state) + (cashRatio(state) > 0.2 ? 1 : 0) >= 2
    );
  return false;
}

export function mergeAchievements(state: GameState, meta: PlayerMeta): PlayerMeta {
  const have = new Set(meta.achievements ?? []);
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.id) && achievementUnlocked(a.id, state, meta)) {
      have.add(a.id);
      changed = true;
    }
  }
  if (!changed) return meta;
  return { ...meta, achievements: [...have] };
}
