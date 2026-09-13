import { ASSETS, getAsset } from "../data/assets";
import type { AssetState, GameState, Holding } from "../types";

export function usdkrw(state: GameState) {
  return state.assets.usdkrw?.price ?? 1385;
}

export function unitValueKrw(assetId: string, assets: Record<string, AssetState>) {
  const def = getAsset(assetId);
  const px = assets[assetId]?.price ?? def.startPrice;
  if (def.currency === "USD") return px * (assets.usdkrw?.price ?? 1385);
  return px;
}

export function holdingValue(id: string, holding: Holding, assets: Record<string, AssetState>) {
  return holding.qty * unitValueKrw(id, assets);
}

export function investedValue(state: GameState) {
  return Object.entries(state.holdings).reduce((sum, [id, h]) => {
    if (!h.qty) return sum;
    return sum + holdingValue(id, h, state.assets);
  }, 0);
}

export function totalValue(state: GameState) {
  return state.cash + investedValue(state);
}

export function unrealizedPnl(id: string, holding: Holding, assets: Record<string, AssetState>) {
  return (unitValueKrw(id, assets) - holding.avgCostKrw) * holding.qty;
}

export function allocation(state: GameState) {
  const total = Math.max(1, totalValue(state));
  const buckets: Record<string, number> = {
    stock: 0,
    etf: 0,
    commodity: 0,
    fx: 0,
    bond: 0,
    cash: state.cash,
  };
  for (const [id, h] of Object.entries(state.holdings)) {
    if (!h.qty) continue;
    const cat = getAsset(id).category;
    buckets[cat] += holdingValue(id, h, state.assets);
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, { value: v, weight: v / total }]),
  ) as Record<string, { value: number; weight: number }>;
}

export function herfindahl(state: GameState) {
  const total = Math.max(1, totalValue(state));
  const weights = Object.entries(state.holdings)
    .filter(([, h]) => h.qty > 0)
    .map(([id, h]) => holdingValue(id, h, state.assets) / total);
  const cashW = state.cash / total;
  return weights.reduce((s, w) => s + w * w, 0) + cashW * cashW;
}

export function concentration(state: GameState) {
  const total = Math.max(1, totalValue(state));
  let maxW = state.cash / total;
  for (const [id, h] of Object.entries(state.holdings)) {
    if (!h.qty) continue;
    maxW = Math.max(maxW, holdingValue(id, h, state.assets) / total);
  }
  return maxW;
}

export function holdingCount(state: GameState) {
  return Object.values(state.holdings).filter((h) => h.qty > 0).length;
}

export function cashRatio(state: GameState) {
  return state.cash / Math.max(1, totalValue(state));
}

export function riskLabel(state: GameState) {
  const conc = concentration(state);
  const cash = cashRatio(state);
  const names = Object.keys(state.holdings).filter((id) => (state.holdings[id]?.qty ?? 0) > 0);
  const vol =
    names.reduce((s, id) => s + (ASSETS.find((a) => a.id === id)?.volatility ?? 0.02), 0) /
    Math.max(1, names.length);
  const score = conc * 1.2 + vol * 18 + (1 - cash) * 0.4;
  if (score < 0.55) return "LOW" as const;
  if (score < 0.9) return "MEDIUM" as const;
  return "HIGH" as const;
}

export function dailyReturn(state: GameState, prev: number) {
  const now = totalValue(state);
  return prev <= 0 ? 0 : (now - prev) / prev;
}
