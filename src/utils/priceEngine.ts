import { ASSETS } from "../data/assets";
import { CONDITIONS } from "../data/scenarios";
import type { AssetState, Factor, GameState, Sensitivity } from "../types";
import { FACTORS } from "../types";
import { clamp, rngFor, round } from "./randomEngine";

export function shockFromFactors(sens: Sensitivity, factors: Partial<Record<Factor, number>>) {
  let s = 0;
  for (const f of FACTORS) {
    const v = factors[f] ?? 0;
    if (!v) continue;
    s += (sens[f] ?? 0) * v;
  }
  return s;
}

export function makeHistory(seed: number, days = 60): Record<string, AssetState> {
  const out: Record<string, AssetState> = {};
  for (const def of ASSETS) {
    const rng = rngFor(seed, 0, def.id.length * 97 + def.startPrice);
    const history = [];
    let price = def.startPrice;
    for (let d = -days; d <= 0; d++) {
      const noise = (rng() - 0.48) * 2 * def.volatility;
      const drift = def.baseTrend;
      price = Math.max(def.startPrice * 0.35, price * (1 + drift + noise));
      if (def.currency === "KRW" && def.id !== "jpykrw" && def.id !== "usdkrw" && def.id !== "eurkrw") {
        price = round(price, 0);
      } else if (def.id === "jpykrw") price = round(price, 3);
      else if (def.id === "usdkrw" || def.id === "eurkrw") price = round(price, 2);
      else price = round(price, 2);
      history.push({
        day: d,
        price,
        volume: Math.round(def.baseVolume * (0.7 + rng() * 0.8)),
      });
    }
    const last = history[history.length - 1];
    const prev = history[history.length - 2] ?? last;
    out[def.id] = {
      id: def.id,
      price: last.price,
      prevPrice: prev.price,
      volume: last.volume,
      history,
      intraday: makeIntraday(last.price, prev.price, rng),
    };
  }
  return out;
}

export function makeIntraday(end: number, start: number, rng: () => number) {
  const pts: number[] = [];
  let p = start;
  for (let i = 0; i < 24; i++) {
    const t = (i + 1) / 24;
    const target = start + (end - start) * t;
    p = p * 0.4 + target * 0.6 + (rng() - 0.5) * end * 0.003;
    pts.push(p);
  }
  pts[pts.length - 1] = end;
  return pts;
}

export function stepMarket(state: GameState, actual: Partial<Record<Factor, number>>, salt = 1) {
  const cond = CONDITIONS[state.condition];
  const rng = rngFor(state.seed, state.day, salt);
  const next: Record<string, AssetState> = { ...state.assets };
  const whyBits: Record<string, string[]> = {};

  for (const def of ASSETS) {
    const cur = state.assets[def.id];
    const eventShock = shockFromFactors(def.sensitivity, actual) * 0.42;
    const regimeShock = shockFromFactors(def.sensitivity, cond.factors as Partial<Record<Factor, number>>) * 0.5;
    const sentiment = state.sentiment * (def.sensitivity.riskOff * -0.35 + def.beta * 0.15);
    const noise = (rng() - 0.5) * 2 * def.volatility * cond.vol;
    const reversion = -0.015 * Math.log(Math.max(0.2, cur.price / def.startPrice));
    let change = def.baseTrend + cond.trend * def.beta + eventShock + regimeShock * 0.35 + sentiment + noise + reversion;
    change = clamp(change, -def.maxMove, def.maxMove);

    let price = cur.price * (1 + change);
    if (def.currency === "KRW" && !["jpykrw", "usdkrw", "eurkrw"].includes(def.id)) price = round(price, 0);
    else if (def.id === "jpykrw") price = round(price, 3);
    else if (def.id === "usdkrw" || def.id === "eurkrw") price = round(price, 2);
    else price = round(price, def.id === "copper" ? 3 : 2);
    price = Math.max(def.startPrice * 0.15, price);

    const volume = Math.round(def.baseVolume * (0.75 + Math.abs(change) * 14 + rng() * 0.4));
    const hist = [...cur.history, { day: state.day, price, volume }];
    next[def.id] = {
      id: def.id,
      price,
      prevPrice: cur.price,
      volume,
      history: hist.slice(-180),
      intraday: makeIntraday(price, cur.price, rng),
    };

    const reasons: string[] = [];
    if (Math.abs(eventShock) > 0.004) reasons.push("event");
    if (Math.abs(noise) > def.volatility) reasons.push("noise");
    whyBits[def.id] = reasons;
  }

  return { assets: next, whyBits };
}

export function changePct(asset: AssetState) {
  if (!asset.prevPrice) return 0;
  return (asset.price - asset.prevPrice) / asset.prevPrice;
}
