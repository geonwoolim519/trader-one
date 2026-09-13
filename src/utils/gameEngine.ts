import { MISSIONS } from "../data/content";
import { ASSETS, getAsset } from "../data/assets";
import { SCENARIOS } from "../data/scenarios";
import { CONDITIONS, CONDITION_IDS } from "../data/scenarios";
import type { Difficulty, GameMode, GameState, TradeReason } from "../types";
import { FEE_RATE, INITIAL_CASH } from "../types";
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
import {
  investedValue,
  totalValue,
  unitValueKrw,
} from "./portfolioCalculator";
import { evalMissions, learnedConcepts, updateMdd } from "./performanceCalculator";
import { pick, rngFor, uid } from "./randomEngine";

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
  const state: GameState = {
    version: 1,
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
  };
  state.pendingNews = pickDailyNews(state);
  return state;
}

export function executeTrade(
  state: GameState,
  opts: { assetId: string; side: "buy" | "sell"; qty: number; reason?: TradeReason },
): GameState {
  if (state.phase !== "playing") return { ...state, toast: "지금은 거래할 수 없습니다." };
  const def = getAsset(opts.assetId);
  const qty = Math.max(0, Math.round(opts.qty / def.lot) * def.lot);
  if (qty <= 0) return { ...state, toast: "수량을 확인하세요." };
  const unit = unitValueKrw(opts.assetId, state.assets);
  const gross = unit * qty;
  const fee = gross * FEE_RATE;
  const px = state.assets[opts.assetId].price;
  const related = state.pendingNews.filter((n) => n.related.includes(opts.assetId)).map((n) => n.eventId);

  if (opts.side === "buy") {
    const need = gross + fee;
    if (need > state.cash + 0.5) return { ...state, toast: "현금이 부족합니다." };
    const prev = state.holdings[opts.assetId] ?? { qty: 0, avgCostKrw: 0 };
    const newQty = prev.qty + qty;
    const avg = (prev.avgCostKrw * prev.qty + unit * qty + fee) / newQty;
    return {
      ...state,
      cash: state.cash - need,
      holdings: { ...state.holdings, [opts.assetId]: { qty: newQty, avgCostKrw: avg } },
      trades: [
        ...state.trades,
        {
          id: uid("t"),
          day: state.day,
          assetId: opts.assetId,
          side: "buy",
          qty,
          price: px,
          krwAmount: gross,
          fee,
          reason: opts.reason,
          relatedNews: related,
        },
      ],
      toast: `체결 · ${def.nameKo} ${qty} 매수`,
    };
  }

  const prev = state.holdings[opts.assetId];
  if (!prev || prev.qty < qty) return { ...state, toast: "보유 수량이 부족합니다." };
  const proceeds = gross - fee;
  const pnl = (unit - prev.avgCostKrw) * qty - fee;
  const left = prev.qty - qty;
  const holdings = { ...state.holdings };
  if (left <= 0.0001) delete holdings[opts.assetId];
  else holdings[opts.assetId] = { ...prev, qty: left };
  return {
    ...state,
    cash: state.cash + proceeds,
    holdings,
    trades: [
      ...state.trades,
      {
        id: uid("t"),
        day: state.day,
        assetId: opts.assetId,
        side: "sell",
        qty,
        price: px,
        krwAmount: gross,
        fee,
        relatedNews: related,
        closeDay: state.day,
        closePrice: px,
        pnl,
      },
    ],
    toast: `체결 · ${def.nameKo} ${qty} 매도`,
  };
}

export function advanceDay(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  const before = totalValue(state);
  const shock = mergeShocks(state.pendingNews);
  const { assets } = stepMarket(state, shock);
  const nextAssetsState = { ...state, assets };
  const after = totalValue(nextAssetsState);
  const movers = ASSETS.map((a) => {
    const ch = changePct(assets[a.id]);
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

  const { peakValue, mdd } = updateMdd(state, after);
  const cycle = nextCondition({ ...state, day: state.day + 1 });
  let next: GameState = {
    ...state,
    assets,
    economy: economyStep(state, shock),
    sentiment: sentimentStep(state, shock),
    pricedIn: decayPricedIn(state.pricedIn, state.pendingNews),
    newsLog: [...state.newsLog, ...state.pendingNews],
    dayReports: [...state.dayReports, report],
    lastReport: report,
    peakValue,
    mdd,
    valueHistory: [...state.valueHistory, after],
    condition: cycle.condition,
    cyclePhase: cycle.cyclePhase,
    phase: "settling",
    pendingNews: [],
    toast: undefined,
  };
  next.learned = learnedConcepts(next);
  next.missions = evalMissions(next);
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
  const next: GameState = { ...state, day, phase: "playing", assets };
  next.pendingNews = pickDailyNews(next);
  return next;
}

export function maxBuyQty(state: GameState, assetId: string) {
  const def = getAsset(assetId);
  const unit = unitValueKrw(assetId, state.assets) * (1 + FEE_RATE);
  if (unit <= 0) return 0;
  const raw = Math.floor(state.cash / unit);
  return Math.floor(raw / def.lot) * def.lot;
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
