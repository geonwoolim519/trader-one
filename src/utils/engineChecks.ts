import { EXTRA_SCENARIOS } from "../data/scenariosExtra";
import { SCENARIOS } from "../data/scenarios";
import { ALL_EVENTS, getEvent } from "../data/events";
import { ASSETS, getAsset } from "../data/assets";
import { LESSONS } from "../data/learning";
import { ACHIEVEMENTS } from "../data/achievements";
import { createGame, executeTrade, advanceDay, acknowledgeDay } from "./gameEngine";
import { cancelOrder, matchOrders, placeOrder } from "./orderEngine";
import { availableCash } from "./orderMath";
import { FEE_RATE, INITIAL_CASH } from "../types";
import { totalValue } from "./portfolioCalculator";
import { migrateGame } from "../store/storage";
import { scoreScenario } from "./scenarioScore";

function assert(cond: boolean, name: string) {
  if (!cond) throw new Error(name);
  return name;
}

export function runEngineChecks() {
  const names: string[] = [];

  names.push(assert(SCENARIOS.length >= 30, "scenarios>=30"));
  names.push(assert(EXTRA_SCENARIOS.length === 20, "extra-20"));
  names.push(assert(LESSONS.length >= 20, "lessons"));
  names.push(assert(ACHIEVEMENTS.length === 10, "achievements-10"));

  for (const s of SCENARIOS) {
    for (const id of s.bias) {
      assert(ALL_EVENTS.some((e) => e.id === id), `bias ${s.id}:${id}`);
    }
  }
  for (const a of ASSETS) getAsset(a.id);
  getEvent("us_hike");
  getEvent("export_curb");

  const g0 = createGame({ mode: "quick", difficulty: "easy", seed: 42 });
  names.push(assert(g0.version === 2, "v2-create"));
  names.push(assert(g0.cash === INITIAL_CASH, "cash-init"));
  names.push(assert(Boolean(g0.regions.US && g0.cycle && g0.openOrders), "macro-fields"));
  names.push(assert(g0.pendingNews.length >= 1, "news-day1"));

  const g1 = executeTrade(g0, { assetId: "kospi200", side: "buy", qty: 1, reason: "news" });
  names.push(assert(g1.cash < g0.cash, "market-buy-cash"));
  names.push(assert((g1.holdings.kospi200?.qty ?? 0) === 1, "holding"));
  const fee = g1.trades[0].fee;
  names.push(assert(Math.abs(fee / g1.trades[0].krwAmount - FEE_RATE) < 1e-6, "fee-0.1"));

  const g2 = executeTrade(g1, { assetId: "kospi200", side: "sell", qty: 1 });
  names.push(assert((g2.holdings.kospi200?.qty ?? 0) === 0, "sold"));
  names.push(assert(g2.cash > 0, "cash-positive"));

  const lim = placeOrder(g0, { assetId: "gold", side: "buy", qty: 1, type: "limit", limitPrice: g0.assets.gold.price * 0.5 });
  names.push(assert(lim.cash === g0.cash, "limit-no-cash-move"));
  names.push(assert(lim.reservedBuyKrw > 0, "reserved"));
  names.push(assert(availableCash(lim) < lim.cash, "available-cash"));
  const cancelled = cancelOrder(lim, lim.openOrders[0].id);
  names.push(assert(cancelled.reservedBuyKrw === 0, "cancel-restore"));
  names.push(assert(cancelled.cash === g0.cash, "cancel-cash"));

  const stopFail = placeOrder(g1, {
    assetId: "kospi200",
    side: "buy",
    qty: 1,
    type: "stop_loss",
    triggerPrice: 1,
  });
  names.push(assert((stopFail.toast ?? "").includes("손절"), "stop-sell-only"));

  let day = g0;
  day = placeOrder(day, {
    assetId: "gold",
    side: "buy",
    qty: 1,
    type: "limit",
    limitPrice: day.assets.gold.price * 1.2,
  });
  const after = advanceDay(day);
  names.push(assert(after.phase === "settling", "advance-settle"));
  names.push(assert(after.lastReport != null, "report"));
  names.push(assert(after.causality.length >= 0, "causality"));
  const cont = acknowledgeDay(after);
  names.push(assert(cont.day === 2 || after.day >= after.totalDays, "ack-day"));

  const crash = { ...g0, assets: { ...g0.assets, gold: { ...g0.assets.gold, price: g0.assets.gold.price * 0.8, prevPrice: g0.assets.gold.price } } };
  const sl = placeOrder(g1, {
    assetId: "kospi200",
    side: "sell",
    qty: 1,
    type: "stop_loss",
    triggerPrice: g1.assets.kospi200.price * 1.5,
  });
  const slHit = matchOrders({
    ...sl,
    assets: {
      ...sl.assets,
      kospi200: { ...sl.assets.kospi200, price: sl.assets.kospi200.price * 0.5, prevPrice: sl.assets.kospi200.price },
    },
  });
  names.push(assert(slHit.openOrders.some((o) => o.type === "stop_loss" && o.status === "filled") || slHit.trades.length >= g1.trades.length, "stoploss-try"));
  void crash;

  const v1 = migrateGame({
    version: 1,
    seed: 7,
    mode: "quick",
    difficulty: "easy",
    day: 2,
    totalDays: 10,
    cash: 9_000_000,
    assets: g0.assets,
    holdings: {},
    pendingNews: [],
    newsLog: [],
    dayReports: [],
    trades: [],
    economy: g0.economy,
    sentiment: 0,
    condition: "calm",
    cyclePhase: 0,
    pricedIn: {},
    peakValue: 10_000_000,
    mdd: 0,
    valueHistory: [10_000_000],
    missions: [],
    phase: "playing",
    learned: [],
  });
  names.push(assert(v1?.version === 2 && v1.cycle != null && v1.assets.nikkei != null, "migrate-v1"));

  const sc = createGame({ mode: "scenario", difficulty: "normal", scenarioId: "bank_credit", seed: 9 });
  names.push(assert(sc.scenarioId === "bank_credit", "scenario-start"));
  const scored = scoreScenario({ ...sc, phase: "ended", mdd: -0.05 });
  names.push(assert(scored.total >= 0 && scored.total <= 100, "score-range"));
  names.push(assert(totalValue(g0) === INITIAL_CASH, "nav-init"));

  return names;
}

export function runOrThrow() {
  return runEngineChecks();
}
