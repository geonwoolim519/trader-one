import type { GameState } from "../types";

export function availableCash(state: GameState) {
  return Math.max(0, state.cash - (state.reservedBuyKrw ?? 0));
}

export function reservedSellQty(state: GameState, assetId: string) {
  return (state.openOrders ?? [])
    .filter((o) => o.status === "open" && o.side === "sell" && o.assetId === assetId)
    .reduce((s, o) => s + o.qty, 0);
}

export function availableQty(state: GameState, assetId: string) {
  return Math.max(0, (state.holdings[assetId]?.qty ?? 0) - reservedSellQty(state, assetId));
}
