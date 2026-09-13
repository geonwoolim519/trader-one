import { ALL_EVENTS, EVENTS, SPECIAL_EVENTS, getEvent } from "../data/events";
import { CONDITIONS, LONG_CYCLE, SCENARIOS } from "../data/scenarios";
import type { Difficulty, Factor, GameState, PendingNews } from "../types";
import { FACTORS } from "../types";
import { pick, rngFor, shuffle } from "./randomEngine";

const TIMES = ["08:32", "09:00", "09:15", "10:40", "13:05", "14:20", "15:50"];

function surpriseMult(difficulty: Difficulty) {
  if (difficulty === "easy") return 0.18;
  if (difficulty === "normal") return 0.42;
  if (difficulty === "hard") return 0.78;
  return 0.95;
}

function eventCount(state: GameState) {
  if (state.difficulty === "easy") return 1;
  if (state.difficulty === "expert") return 2 + (state.day % 3 === 0 ? 1 : 0);
  if (state.difficulty === "hard") return state.day % 4 === 0 ? 2 : 1;
  return 1;
}

export function eventPool(state: GameState) {
  if (state.scenarioId) {
    const sc = SCENARIOS.find((s) => s.id === state.scenarioId);
    if (sc) {
      const biased = sc.bias.map((id) => ALL_EVENTS.find((e) => e.id === id)).filter(Boolean);
      return [...biased, ...EVENTS] as typeof EVENTS;
    }
  }
  const cond = CONDITIONS[state.condition];
  const preferred = EVENTS.filter((e) => {
    const keys = Object.keys(e.expected);
    return keys.some((k) => (cond.factors as Record<string, number>)[k]);
  });
  return preferred.length ? [...preferred, ...EVENTS] : EVENTS;
}

export function realizeEvent(state: GameState, eventId: string, index: number): PendingNews {
  const ev = getEvent(eventId);
  const rng = rngFor(state.seed, state.day, 400 + index * 17);
  const sm = surpriseMult(state.difficulty);
  const actual: Partial<Record<Factor, number>> = {};
  let pricedNote: string | undefined;

  for (const f of FACTORS) {
    const exp = ev.expected[f];
    if (exp === undefined) continue;
    const priced = state.pricedIn[f] ?? 0;
    const surpriseRoll = (rng() - 0.5) * 2 * ev.surprise * sm;
    let v = exp * (1 + surpriseRoll);
    if (priced > 0.55 && rng() < 0.45 + sm * 0.2) {
      v *= 0.15 - rng() * 0.55;
      pricedNote = "시장이 이미 상당 부분 선반영하고 있었습니다.";
    }
    if (state.difficulty !== "easy" && rng() < 0.08 + sm * 0.08) {
      v *= -0.55 - rng() * 0.5;
      pricedNote = pricedNote ?? "다른 재료와 기대가 겹치며 예상과 다른 흐름이 나타났습니다.";
    }
    actual[f] = v;
  }

  if (ev.reliability === "rumor" && rng() < 0.45) {
    for (const f of Object.keys(actual) as Factor[]) actual[f] = (actual[f] ?? 0) * (rng() * 0.4);
    pricedNote = "루머의 확인이 늦어지며 영향이 제한적이었습니다.";
  }

  return {
    id: `${state.day}_${eventId}_${index}`,
    eventId,
    day: state.day,
    time: TIMES[index % TIMES.length],
    reliability: ev.reliability,
    title: ev.title,
    headline: ev.headline,
    description: ev.description,
    related: ev.related,
    expected: ev.expected,
    actual,
    pricedInNote: pricedNote,
    special: SPECIAL_EVENTS.some((s) => s.id === eventId),
  };
}

export function pickDailyNews(state: GameState): PendingNews[] {
  const rng = rngFor(state.seed, state.day, 77);
  const pool = shuffle(rng, eventPool(state));
  const used = new Set(state.newsLog.slice(-8).map((n) => n.eventId));
  const chosen: string[] = [];
  const n = eventCount(state);
  for (const ev of pool) {
    if (chosen.length >= n) break;
    if (used.has(ev.id) && rng() < 0.7) continue;
    chosen.push(ev.id);
  }
  while (chosen.length < n) chosen.push(pick(rng, EVENTS).id);

  if (state.day > 4 && rng() < (state.difficulty === "easy" ? 0.03 : 0.06)) {
    chosen.push(pick(rng, SPECIAL_EVENTS).id);
  }

  return chosen.map((id, i) => realizeEvent(state, id, i));
}

export function mergeShocks(news: PendingNews[]) {
  const out: Partial<Record<Factor, number>> = {};
  for (const n of news) {
    for (const f of FACTORS) {
      const v = n.actual[f];
      if (!v) continue;
      out[f] = (out[f] ?? 0) + v * (news.length > 1 ? 0.72 : 1);
    }
  }
  return out;
}

export function decayPricedIn(prev: Partial<Record<Factor, number>>, news: PendingNews[]) {
  const next: Partial<Record<Factor, number>> = {};
  for (const f of FACTORS) {
    const d = (prev[f] ?? 0) * 0.72;
    next[f] = d > 0.02 ? d : 0;
  }
  for (const n of news) {
    for (const f of FACTORS) {
      if (!n.expected[f]) continue;
      next[f] = Math.min(0.95, (next[f] ?? 0) + 0.28);
    }
  }
  return next;
}

export function nextCondition(state: GameState) {
  if (state.mode !== "long") return { condition: state.condition, cyclePhase: state.cyclePhase };
  const phaseLen = Math.max(10, Math.floor(state.totalDays / LONG_CYCLE.length));
  const phase = Math.min(LONG_CYCLE.length - 1, Math.floor((state.day - 1) / phaseLen));
  return { condition: LONG_CYCLE[phase], cyclePhase: phase };
}

export function economyStep(state: GameState, shock: Partial<Record<Factor, number>>) {
  const e = { ...state.economy };
  e.gdp = clampNum(e.gdp + (shock.growth ?? 0) * 8, 0.5, 6);
  e.cpi = clampNum(e.cpi + (shock.inflation ?? 0) * 10, -0.5, 8);
  e.usRate = clampNum(e.usRate + (shock.usRates ?? 0) * 12, 0, 8);
  e.krRate = clampNum(e.krRate + (shock.krRates ?? 0) * 12, 0, 6);
  e.unemployment = clampNum(e.unemployment - (shock.growth ?? 0) * 6, 2.5, 9);
  e.pmi = clampNum(e.pmi + (shock.growth ?? 0) * 40 + (shock.china ?? 0) * 15, 38, 62);
  e.exports = clampNum(e.exports + (shock.koreaExport ?? 0) * 40, -12, 18);
  e.imports = clampNum(e.imports + (shock.consumption ?? 0) * 20 + (shock.oil ?? 0) * 10, -10, 16);
  e.tradeBalance = e.exports - e.imports * 0.6;
  e.csi = clampNum(e.csi + (shock.consumption ?? 0) * 50 - (shock.inflation ?? 0) * 20, 60, 130);
  return e;
}

function clampNum(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function sentimentStep(state: GameState, shock: Partial<Record<Factor, number>>) {
  const delta = -(shock.riskOff ?? 0) * 4 + (shock.growth ?? 0) * 3 + (shock.ai ?? 0) * 1.5;
  return Math.max(-1, Math.min(1, state.sentiment * 0.82 + delta));
}

export function whyForAsset(assetId: string, news: PendingNews[], changePct: number) {
  const related = news.filter((n) => n.related.includes(assetId));
  const top = related[0];
  if (!top || Math.abs(changePct) < 0.004) {
    if (changePct > 0.004) return "수급과 투자심리가 가격을 소폭 밀어 올렸습니다.";
    if (changePct < -0.004) return "뚜렷한 재료 없이 차익 실현과 관망이 나타났습니다.";
    return "특별한 충격 없이 좁은 범위에서 거래됐습니다.";
  }
  const ev = getEvent(top.eventId);
  const factor = (Object.keys(top.actual) as Factor[])
    .sort((a, b) => Math.abs(top.actual[b] ?? 0) - Math.abs(top.actual[a] ?? 0))[0];
  const text = ev.why[factor];
  const note = top.pricedInNote ? ` ${top.pricedInNote}` : "";
  if (text) return text + note;
  return `${top.headline} 소식이 관련 자산 가격에 반영됐습니다.` + note;
}
