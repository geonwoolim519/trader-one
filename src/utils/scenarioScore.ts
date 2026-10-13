import { SCENARIOS } from "../data/scenarios";
import type { GameState } from "../types";
import { INITIAL_CASH } from "../types";
import { cashRatio, holdingCount } from "./portfolioCalculator";
import { totalValue } from "./portfolioCalculator";

export function scoreScenario(state: GameState) {
  const sc = SCENARIOS.find((s) => s.id === state.scenarioId);
  const w = {
    ret: 20,
    mdd: 20,
    cash: 15,
    div: 15,
    cost: 10,
    goal: 20,
    ...sc?.weights,
  };
  const ret = (totalValue(state) - INITIAL_CASH) / INITIAL_CASH;
  const fee = state.trades.reduce((s, t) => s + t.fee, 0);
  const retScore = clamp01((ret + 0.08) / 0.2) * w.ret;
  const mddScore = clamp01((state.mdd + 0.2) / 0.2) * w.mdd;
  const cashScore = clamp01(cashRatio(state) / 0.3) * w.cash;
  const divScore = clamp01(holdingCount(state) / 4) * w.div;
  const costScore = clamp01(1 - fee / (INITIAL_CASH * 0.02)) * w.cost;
  const goalHits = (sc?.goals ?? []).length ? goalHitsOf(state) : 0.6;
  const goalScore = goalHits * w.goal;
  const total = Math.round(retScore + mddScore + cashScore + divScore + costScore + goalScore);
  const rows = [
    { k: "수익률", w: w.ret, v: retScore, note: `${(ret * 100).toFixed(1)}%` },
    { k: "최대 낙폭", w: w.mdd, v: mddScore, note: `${(state.mdd * 100).toFixed(1)}%` },
    { k: "현금 유동성", w: w.cash, v: cashScore, note: `${(cashRatio(state) * 100).toFixed(0)}%` },
    { k: "분산", w: w.div, v: divScore, note: `${holdingCount(state)} 종목` },
    { k: "거래 비용", w: w.cost, v: costScore, note: `수수료 ₩${Math.round(fee).toLocaleString("ko-KR")}` },
    { k: "목표 부합", w: w.goal, v: goalScore, note: sc?.goals?.[0] ?? "일반 운용" },
  ];
  return {
    total: Math.max(0, Math.min(100, total)),
    rows,
    endNote: sc?.endNote ?? "한 가지 전략만 정답은 아닙니다.",
    strategies: sc?.strategies ?? [],
  };
}

function goalHitsOf(state: GameState) {
  let n = 0.4;
  if (state.mdd >= -0.15) n += 0.2;
  if (cashRatio(state) >= 0.15) n += 0.2;
  if (holdingCount(state) >= 2) n += 0.2;
  return Math.min(1, n);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
