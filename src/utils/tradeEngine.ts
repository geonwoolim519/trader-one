import { getAsset } from "../data/assets";
import type { GameState, OrderType, TradeReason } from "../types";
import { FEE_RATE } from "../types";
import { unitValueKrw } from "./portfolioCalculator";
import { uid } from "./randomEngine";
import { availableCash, availableQty } from "./orderMath";

export interface TradeExtra {
  assetId: string;
  side: "buy" | "sell";
  qty: number;
  reason?: TradeReason;
  expectedDir?: "up" | "down" | "range";
  horizon?: "day" | "swing" | "position";
  riskNote?: "low" | "mid" | "high";
  confidence?: number;
  note?: string;
  orderType?: OrderType;
  fillPrice?: number;
}

export function executeTrade(state: GameState, opts: TradeExtra): GameState {
  if (state.phase !== "playing") return { ...state, toast: "지금은 거래할 수 없습니다." };
  const def = getAsset(opts.assetId);
  const qty = Math.max(0, Math.round(opts.qty / def.lot) * def.lot);
  if (qty <= 0) return { ...state, toast: "수량을 확인하세요." };
  const px = opts.fillPrice ?? state.assets[opts.assetId].price;
  const unit =
    opts.fillPrice != null
      ? def.currency === "USD"
        ? px * (state.assets.usdkrw?.price ?? 1385)
        : px
      : unitValueKrw(opts.assetId, state.assets);
  const gross = unit * qty;
  const fee = gross * FEE_RATE;
  const related = state.pendingNews.filter((n) => n.related.includes(opts.assetId)).map((n) => n.eventId);
  const journal = {
    reason: opts.reason,
    expectedDir: opts.expectedDir,
    horizon: opts.horizon,
    riskNote: opts.riskNote,
    confidence: opts.confidence,
    reviewed: false,
    note: opts.note,
    orderType: opts.orderType ?? "market",
  };

  if (opts.side === "buy") {
    const need = gross + fee;
    if (need > availableCash(state) + 0.5) return { ...state, toast: "현금이 부족합니다." };
    const prev = state.holdings[opts.assetId] ?? { qty: 0, avgCostKrw: 0 };
    const newQty = prev.qty + qty;
    const avg = (prev.avgCostKrw * prev.qty + unit * qty + fee) / newQty;
    return sanitize({
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
          relatedNews: related,
          ...journal,
        },
      ],
      toast: `체결 · ${def.nameKo} ${qty} 매수`,
    });
  }

  const prev = state.holdings[opts.assetId];
  const free = opts.orderType && opts.orderType !== "market" ? prev?.qty ?? 0 : availableQty(state, opts.assetId);
  if (!prev || free < qty) return { ...state, toast: "보유 수량이 부족합니다." };
  const proceeds = gross - fee;
  const pnl = (unit - prev.avgCostKrw) * qty - fee;
  const left = prev.qty - qty;
  const holdings = { ...state.holdings };
  if (left <= 0.0001) delete holdings[opts.assetId];
  else holdings[opts.assetId] = { ...prev, qty: left };
  return sanitize({
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
        ...journal,
      },
    ],
    toast: `체결 · ${def.nameKo} ${qty} 매도`,
  });
}

export function sanitize(state: GameState): GameState {
  let cash = Math.max(0, state.cash);
  const holdings = { ...state.holdings };
  for (const [id, h] of Object.entries(holdings)) {
    if (!h || h.qty <= 0) delete holdings[id];
    else holdings[id] = { ...h, qty: Math.max(0, h.qty) };
  }
  const reservedBuyKrw = Math.max(0, Math.min(cash, state.reservedBuyKrw ?? 0));
  return { ...state, cash, holdings, reservedBuyKrw };
}
