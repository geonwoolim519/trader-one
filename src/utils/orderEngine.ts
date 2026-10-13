import { getAsset } from "../data/assets";
import type { GameState, Order, OrderType, TradeSide } from "../types";
import { FEE_RATE } from "../types";
import { availableCash, availableQty } from "./orderMath";
import { usdkrw, unitValueKrw } from "./portfolioCalculator";
import { rngFor, uid } from "./randomEngine";
import { executeTrade, type TradeExtra } from "./tradeEngine";

export type PlaceOrderOpts = TradeExtra & {
  type: OrderType;
  limitPrice?: number;
  triggerPrice?: number;
  activateDay?: number;
  expireDay?: number;
};

export { availableCash, availableQty } from "./orderMath";

export function estimateKrw(state: GameState, assetId: string, qty: number, px: number) {
  const def = getAsset(assetId);
  const unit = def.currency === "USD" ? px * usdkrw(state) : px;
  return unit * qty * (1 + FEE_RATE);
}

export function placeOrder(state: GameState, opts: PlaceOrderOpts): GameState {
  if (state.phase !== "playing") return { ...state, toast: "지금은 주문할 수 없습니다." };
  const def = getAsset(opts.assetId);
  const qty = Math.max(0, Math.round(opts.qty / def.lot) * def.lot);
  if (qty <= 0) return { ...state, toast: "수량을 확인하세요." };

  if ((opts.type === "stop_loss" || opts.type === "take_profit") && opts.side !== "sell") {
    return { ...state, toast: "손절·익절은 보유 자산 매도 주문입니다." };
  }
  if (opts.type === "market") {
    return executeTrade(state, { ...opts, qty, orderType: "market" });
  }

  const px = state.assets[opts.assetId].price;
  const limit = opts.limitPrice ?? px;
  const trigger = opts.triggerPrice ?? px;
  const expireDay = opts.expireDay ?? Math.min(state.totalDays, state.day + 12);
  let reservedKrw = 0;

  if (opts.side === "buy") {
    reservedKrw = estimateKrw(state, opts.assetId, qty, opts.type === "stop_loss" ? px : limit);
    if (reservedKrw > availableCash(state) + 0.5) {
      return { ...state, toast: "예약할 현금이 부족합니다. 미체결 지정가는 현금을 차감하지 않습니다." };
    }
  } else if (qty > availableQty(state, opts.assetId) + 1e-9) {
    return { ...state, toast: "대기 중인 매도 주문과 보유 수량을 확인하세요." };
  }

  const order: Order = {
    id: uid("o"),
    assetId: opts.assetId,
    type: opts.type,
    side: opts.side,
    qty,
    limitPrice: opts.type === "limit" || opts.type === "scheduled" ? limit : undefined,
    triggerPrice: opts.type === "stop_loss" || opts.type === "take_profit" ? trigger : undefined,
    activateDay: opts.type === "scheduled" ? opts.activateDay ?? state.day + 1 : undefined,
    expireDay,
    createdDay: state.day,
    status: "open",
    reservedKrw,
    reason: opts.reason,
    expectedDir: opts.expectedDir,
    horizon: opts.horizon,
    riskNote: opts.riskNote,
    confidence: opts.confidence,
    note: opts.note,
  };

  return {
    ...state,
    openOrders: [...(state.openOrders ?? []), order],
    reservedBuyKrw: (state.reservedBuyKrw ?? 0) + reservedKrw,
    toast: `주문 접수 · ${def.nameKo} ${orderLabel(opts.type)}`,
  };
}

export function cancelOrder(state: GameState, id: string): GameState {
  const orders = state.openOrders ?? [];
  const order = orders.find((o) => o.id === id);
  if (!order || order.status !== "open") return { ...state, toast: "취소할 주문이 없습니다." };
  return {
    ...state,
    openOrders: orders.map((o) => (o.id === id ? { ...o, status: "cancelled" as const } : o)),
    reservedBuyKrw: Math.max(0, (state.reservedBuyKrw ?? 0) - order.reservedKrw),
    toast: "주문을 취소했습니다. 예약 현금이 복원됐습니다.",
  };
}

export function matchOrders(state: GameState): GameState {
  let next = state;
  for (const order of [...(state.openOrders ?? [])]) {
    if (order.status !== "open") continue;
    const live = next.openOrders.find((o) => o.id === order.id);
    if (!live || live.status !== "open") continue;
    if (next.day > live.expireDay) {
      next = expire(next, live.id);
      continue;
    }
    const st = next.assets[live.assetId];
    if (!st) continue;
    if (live.type === "scheduled" && (live.activateDay ?? 0) > next.day) continue;

    const low = Math.min(st.prevPrice, st.price);
    const high = Math.max(st.prevPrice, st.price);
    const rng = rngFor(next.seed, next.day, live.id.length + 41);
    const guarantee = rng() > 0.18;
    let hit = false;

    if (live.type === "limit") {
      hit = live.side === "buy" ? low <= (live.limitPrice ?? 0) && guarantee : high >= (live.limitPrice ?? 0) && guarantee;
    } else if (live.type === "stop_loss") {
      hit = live.side === "sell" && low <= (live.triggerPrice ?? 0);
    } else if (live.type === "take_profit") {
      hit = live.side === "sell" && high >= (live.triggerPrice ?? 0);
    } else if (live.type === "scheduled") {
      if (live.limitPrice != null) {
        hit = live.side === "buy" ? low <= live.limitPrice && guarantee : high >= live.limitPrice && guarantee;
      } else hit = true;
    }

    if (hit) next = fillOrder(next, live.id);
  }
  return next;
}

function expire(state: GameState, id: string): GameState {
  const order = state.openOrders.find((o) => o.id === id);
  if (!order || order.status !== "open") return state;
  return {
    ...state,
    openOrders: state.openOrders.map((o) => (o.id === id ? { ...o, status: "expired" as const } : o)),
    reservedBuyKrw: Math.max(0, (state.reservedBuyKrw ?? 0) - order.reservedKrw),
  };
}

function fillOrder(state: GameState, id: string): GameState {
  const order = state.openOrders.find((o) => o.id === id);
  if (!order || order.status !== "open") return state;
  const slip = slippage(state, order.assetId, order.side);
  const px = state.assets[order.assetId].price * (order.side === "buy" ? 1 + slip : 1 - slip);
  const released: GameState = {
    ...state,
    openOrders: state.openOrders.map((o) =>
      o.id === id ? { ...o, status: "filled", fillDay: state.day, fillPrice: px, slippage: slip } : o,
    ),
    reservedBuyKrw: Math.max(0, (state.reservedBuyKrw ?? 0) - order.reservedKrw),
  };
  const filled = executeTrade(released, {
    assetId: order.assetId,
    side: order.side,
    qty: order.qty,
    reason: order.reason,
    expectedDir: order.expectedDir,
    horizon: order.horizon,
    riskNote: order.riskNote,
    confidence: order.confidence,
    note: order.note,
    orderType: order.type,
    fillPrice: px,
  });
  if (filled.toast?.includes("부족")) {
    return { ...state, toast: "체결 조건은 닿았지만 잔액·수량이 맞지 않아 대기 주문을 유지합니다." };
  }
  return filled;
}

export function slippage(state: GameState, assetId: string, side: TradeSide) {
  const def = getAsset(assetId);
  const rng = rngFor(state.seed, state.day, assetId.length + (side === "buy" ? 3 : 9));
  let s = def.volatility * 0.12 + Math.abs(state.sentiment) * 0.004;
  if (def.baseVolume < 3_000_000) s += 0.003;
  const a = state.assets[assetId];
  const ch = a?.prevPrice ? Math.abs(a.price - a.prevPrice) / a.prevPrice : 0;
  if (ch > def.maxMove * 0.6) s += 0.006;
  s *= 0.35 + rng();
  return Math.min(0.025, s);
}

export function orderLabel(t: OrderType) {
  if (t === "market") return "시장가";
  if (t === "limit") return "지정가";
  if (t === "stop_loss") return "손절";
  if (t === "take_profit") return "익절";
  return "예약";
}

export function maxBuyQty(state: GameState, assetId: string) {
  const def = getAsset(assetId);
  const unit = unitValueKrw(assetId, state.assets) * (1 + FEE_RATE);
  if (unit <= 0) return 0;
  const raw = Math.floor(availableCash(state) / unit);
  return Math.floor(raw / def.lot) * def.lot;
}
