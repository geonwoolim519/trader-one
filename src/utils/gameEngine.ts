import { MISSIONS } from "../data/content";
import { ASSETS } from "../data/assets";
import { SCENARIOS } from "../data/scenarios";
import { CONDITIONS, CONDITION_IDS } from "../data/scenarios";
import { defaultRegions } from "../data/macro";
import type { Difficulty, GameMode, GameState } from "../types";
import { INITIAL_CASH } from "../types";
import {
  decayPricedIn,
  economyStep,
  mergeShocks,
  nextCondition,
  pickDailyNews,
  sentimentStep,
  whyForAsset,
} from "./eventEngine";
import { changePct, makeHistory, stepMarket } from "./priceEngine";
import { investedValue, totalValue } from "./portfolioCalculator";
import { evalMissions, learnedConcepts, updateMdd } from "./performanceCalculator";
import { pick, rngFor } from "./randomEngine";
import { buildCausality, conditionToCycle, detectRegime, stepCycle, stepRegions } from "./macroEngine";
import { matchOrders } from "./orderEngine";
export { executeTrade } from "./tradeEngine";
export { maxBuyQty } from "./orderEngine";
export type { TradeExtra } from "./tradeEngine";

export function createGame(opts: {
  mode: GameMode;
  difficulty: Difficulty;
  scenarioId?: string;
  seed?: number;
}): GameState {
  const seed = opts.seed ?? (Date.now() % 1_000_000_000);
  const scenario = opts.scenarioId ? SCENARIOS.find((s) => s.id === opts.scenarioId) : undefined;
  const rng = rngFor(seed, 0, 1);
  const condition = scenario?.condition ?? pick(rng, CONDITION_IDS);
  const totalDays = scenario?.days ?? (opts.mode === "quick" ? 10 : opts.mode === "long" ? 90 : 30);
  const assets = makeHistory(seed);
  const cash = INITIAL_CASH;
  const cycle = conditionToCycle(condition);
  const state: GameState = {
    version: 2,
    seed,
    mode: opts.mode,
    difficulty: opts.difficulty,
    scenarioId: scenario?.id,
    day: 1,
    totalDays,
    cash,
    assets,
    holdings: {},
    pendingNews: [],
    newsLog: [],
    dayReports: [],
    trades: [],
    economy: {
      gdp: 2.1,
      cpi: 2.4,
      usRate: 4.5,
      krRate: 3.0,
      unemployment: 3.6,
      pmi: 50.8,
      exports: 3.2,
      imports: 2.1,
      tradeBalance: 1.8,
      csi: 98,
    },
    sentiment: CONDITIONS[condition].sentiment,
    condition,
    cyclePhase: 0,
    pricedIn: {},
    peakValue: cash,
    mdd: 0,
    valueHistory: [cash],
    missions: MISSIONS.map((m) => ({ id: m.id, done: false, claimed: false })),
    phase: "playing",
    learned: [],
    regions: defaultRegions(),
    cycle,
    openOrders: [],
    reservedBuyKrw: 0,
    causality: [],
    challengeDone: [],
    newsOpened: [],
  };
  state.pendingNews = pickDailyNews(state);
  return state;
}

export function advanceDay(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  const before = totalValue(state);
  const shock = mergeShocks(state.pendingNews);
  const { assets } = stepMarket(state, shock);
  let next: GameState = { ...state, assets };
  next = matchOrders(next);
  const after = totalValue(next);
  const movers = ASSETS.filter((a) => next.assets[a.id]).map((a) => {
    const ch = changePct(next.assets[a.id]);
    return {
      assetId: a.id,
      changePct: ch,
      reason: whyForAsset(a.id, state.pendingNews, ch),
    };
  }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const report = {
    day: state.day,
    news: state.pendingNews,
    movers: movers.slice(0, 6),
    portfolioBefore: before,
    portfolioAfter: after,
    dailyReturn: before ? (after - before) / before : 0,
  };

  const { peakValue, mdd } = updateMdd(next, after);
  const cycleCond = nextCondition({ ...next, day: next.day + 1 });
  const cycle = stepCycle(next, shock);
  const regions = stepRegions({ ...next, cycle }, shock);
  const causality = buildCausality(shock);
  next = {
    ...next,
    economy: economyStep(next, shock),
    sentiment: sentimentStep(next, shock),
    pricedIn: decayPricedIn(next.pricedIn, state.pendingNews),
    newsLog: [...next.newsLog, ...state.pendingNews],
    dayReports: [...next.dayReports, report],
    lastReport: report,
    peakValue,
    mdd,
    valueHistory: [...next.valueHistory, after],
    condition: cycleCond.condition,
    cyclePhase: cycleCond.cyclePhase,
    cycle,
    regions,
    causality,
    phase: "settling",
    pendingNews: [],
    toast: next.toast,
  };
  next.learned = learnedConcepts(next);
  next.missions = evalMissions(next);
  void detectRegime(next);
  return next;
}

export function acknowledgeDay(state: GameState): GameState {
  if (state.phase !== "settling") return state;
  if (state.day >= state.totalDays) {
    return { ...state, phase: "ended", pendingNews: [] };
  }
  const day = state.day + 1;
  const assets = Object.fromEntries(
    Object.entries(state.assets).map(([id, a]) => [id, { ...a, prevPrice: a.price }]),
  );
  const next: GameState = { ...state, day, phase: "playing", assets, toast: undefined };
  next.pendingNews = pickDailyNews(next);
  return next;
}

export function markNewsOpened(state: GameState, newsId: string): GameState {
  if ((state.newsOpened ?? []).includes(newsId)) return state;
  return { ...state, newsOpened: [...(state.newsOpened ?? []), newsId] };
}

export function markChallengeFlag(state: GameState, flag: string): GameState {
  if ((state.challengeDone ?? []).includes(flag)) return state;
  return { ...state, challengeDone: [...(state.challengeDone ?? []), flag] };
}

export function reviewTrade(state: GameState, tradeId: string): GameState {
  return {
    ...state,
    trades: state.trades.map((t) => (t.id === tradeId ? { ...t, reviewed: true } : t)),
  };
}

export function indexProxy() {
  return [
    { id: "kospi200", label: "KOSPI" },
    { id: "spy", label: "S&P 500" },
    { id: "qqq", label: "NASDAQ" },
    { id: "usdkrw", label: "USD/KRW" },
    { id: "gold", label: "GOLD" },
    { id: "oil", label: "OIL" },
  ];
}

export { investedValue, totalValue };
