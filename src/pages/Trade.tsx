import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { ASSETS, getAsset } from "../data/assets";
import { useGame } from "../store/GameProvider";
import { TRADE_REASONS, type OrderType, type TradeReason, type TradeSide } from "../types";
import { FEE_RATE } from "../types";
import { maxBuyQty, orderLabel } from "../utils/orderEngine";
import { availableCash, availableQty } from "../utils/orderMath";
import { unitValueKrw } from "../utils/portfolioCalculator";
import { changePct } from "../utils/priceEngine";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";

const TYPES: OrderType[] = ["market", "limit", "stop_loss", "take_profit", "scheduled"];

export function TradePage() {
  const { assetId } = useParams();
  const [sp] = useSearchParams();
  const { state } = useGame();
  const nav = useNavigate();
  if (!state) return null;

  if (!assetId) {
    return (
      <div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">TRADE</h1>
            <p className="mt-2 text-sm text-mute">시장가·지정가·손절·익절·예약. 수수료 0.1%.</p>
          </div>
          <button className="text-xs text-mute" onClick={() => nav("/play/orders")}>
            OPEN ORDERS
          </button>
        </div>
        <div className="mt-4 divide-y divide-white/6 rounded-2xl border border-white/8 bg-card">
          {ASSETS.map((a) => {
            const st = state.assets[a.id];
            const ch = changePct(st);
            const qty = state.holdings[a.id]?.qty ?? 0;
            return (
              <button
                key={a.id}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => nav(`/play/trade/${a.id}`)}
              >
                <div>
                  <div className="font-medium">{a.nameKo}</div>
                  <div className="text-xs text-mute">{qty ? `보유 ${qty}` : a.ticker}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm">{formatPrice(st.price, a.currency, a.id)}</div>
                  <div className={`text-xs tabular ${pnlClass(ch)}`}>{formatPct(ch)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <Ticket assetId={assetId} initialSide={(sp.get("side") as TradeSide) || "buy"} />;
}

function Ticket({ assetId, initialSide }: { assetId: string; initialSide: TradeSide }) {
  const { state, place } = useGame();
  const nav = useNavigate();
  const def = getAsset(assetId);
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [qty, setQty] = useState(def.lot);
  const [reason, setReason] = useState<TradeReason>("news");
  const [type, setType] = useState<OrderType>("market");
  const [limit, setLimit] = useState(0);
  const [trigger, setTrigger] = useState(0);
  const [activate, setActivate] = useState(0);
  const [dir, setDir] = useState<"up" | "down" | "range">("up");
  const [horizon, setHorizon] = useState<"day" | "swing" | "position">("swing");
  const [risk, setRisk] = useState<"low" | "mid" | "high">("mid");
  const [conf, setConf] = useState(50);
  const [note, setNote] = useState("");
  if (!state) return null;
  const st = state.assets[assetId];
  const hold = availableQty(state, assetId);
  const px = st.price;
  const limitPx = limit || px;
  const trigPx = trigger || px;
  const unit = unitValueKrw(assetId, state.assets);
  const gross = unit * qty;
  const fee = gross * FEE_RATE;
  const total = side === "buy" ? gross + fee : gross - fee;
  const max = side === "buy" ? maxBuyQty(state, assetId) : hold;
  const can = qty > 0 && qty <= max + 1e-9 && state.phase === "playing";
  const extra = {
    reason: side === "buy" ? reason : undefined,
    expectedDir: dir,
    horizon,
    riskNote: risk,
    confidence: conf,
    note: note || undefined,
  };

  const step = (d: number) => {
    const n = Math.max(def.lot, Math.round((qty + d * def.lot) / def.lot) * def.lot);
    setQty(Math.min(n, Math.max(def.lot, max || def.lot)));
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play/trade")}>
        ← 종목 선택
      </button>
      <div>
        <div className="text-xs text-mute">{def.ticker}</div>
        <h1 className="text-2xl font-semibold">
          {side === "buy" ? "BUY" : "SELL"} {def.nameKo}
        </h1>
        <div className="mt-1 tabular text-lg">{formatPrice(st.price, def.currency, def.id)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`rounded-2xl py-3 font-semibold ${side === "buy" ? "bg-brand" : "border border-white/15 text-mute"}`}
          onClick={() => setSide("buy")}
        >
          BUY
        </button>
        <button
          className={`rounded-2xl py-3 font-semibold ${side === "sell" ? "border border-down bg-down/15 text-down" : "border border-white/15 text-mute"}`}
          onClick={() => setSide("sell")}
        >
          SELL
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              if (t === "stop_loss" || t === "take_profit") setSide("sell");
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] tracking-wider ${
              type === t ? "bg-white text-black" : "border border-white/15 text-mute"
            }`}
          >
            {orderLabel(t)}
          </button>
        ))}
      </div>
      {(type === "limit" || type === "scheduled") && (
        <Card className="p-4">
          <Label>지정 가격</Label>
          <input
            className="mt-2 w-full bg-transparent text-2xl tabular outline-none"
            defaultValue={px}
            onChange={(e) => setLimit(Number(e.target.value) || px)}
          />
        </Card>
      )}
      {(type === "stop_loss" || type === "take_profit") && (
        <Card className="p-4">
          <Label>{type === "stop_loss" ? "손절 트리거" : "익절 트리거"}</Label>
          <input
            className="mt-2 w-full bg-transparent text-2xl tabular outline-none"
            defaultValue={px}
            onChange={(e) => setTrigger(Number(e.target.value) || px)}
          />
          <p className="mt-2 text-xs text-mute">일일 종가 기준으로 판정하며, 잠시 통과했다고 항상 체결되지는 않습니다.</p>
        </Card>
      )}
      {type === "scheduled" && (
        <Card className="p-4">
          <Label>활성화 DAY</Label>
          <input
            className="mt-2 w-full bg-transparent text-2xl tabular outline-none"
            defaultValue={Math.min(state.totalDays, state.day + 1)}
            onChange={(e) => setActivate(Number(e.target.value) || state.day + 1)}
          />
        </Card>
      )}
      <Card className="p-4">
        <Label>사용 가능 현금</Label>
        <div className="tabular text-xl">{formatKrw(availableCash(state))}</div>
        <div className="mt-1 text-xs text-mute">
          보유 현금 {formatKrw(state.cash)} · 예약 {formatKrw(state.reservedBuyKrw ?? 0)} · 가용 수량 {hold}
        </div>
      </Card>
      <Card className="p-4">
        <Label>수량</Label>
        <div className="mt-3 flex items-center justify-between">
          <button className="h-12 w-12 rounded-xl border border-white/15 text-2xl" onClick={() => step(-1)}>
            −
          </button>
          <input
            className="w-32 bg-transparent text-center text-3xl tabular outline-none"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
          />
          <button className="h-12 w-12 rounded-xl border border-white/15 text-2xl" onClick={() => step(1)}>
            +
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0.25, 0.5, 1].map((q) => (
            <button
              key={q}
              className="rounded-xl border border-white/10 py-2 text-xs text-mute"
              onClick={() => setQty(Math.max(def.lot, Math.floor((max * q) / def.lot) * def.lot))}
            >
              {q === 1 ? "MAX" : `${q * 100}%`}
            </button>
          ))}
        </div>
      </Card>
      <Card className="space-y-2 p-4 text-sm">
        <Row k="예상 주문금액" v={formatKrw(gross)} />
        <Row k="수수료 0.1%" v={formatKrw(fee)} />
        <Row k={side === "buy" ? "총 지급(체결 시)" : "예상 수령"} v={formatKrw(total)} />
      </Card>
      {side === "buy" && (
        <Card className="p-4">
          <Label>Why are you buying?</Label>
          <div className="mt-3 space-y-2">
            {TRADE_REASONS.map((r) => (
              <label key={r.id} className="flex items-center gap-3 text-sm">
                <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />
                {r.label}
              </label>
            ))}
          </div>
        </Card>
      )}
      <Card className="space-y-3 p-4">
        <Label>일지 (선택)</Label>
        <div className="flex gap-2 text-xs">
          {(["up", "down", "range"] as const).map((d) => (
            <Chip key={d} on={dir === d} onClick={() => setDir(d)}>
              {d}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          {(["day", "swing", "position"] as const).map((d) => (
            <Chip key={d} on={horizon === d} onClick={() => setHorizon(d)}>
              {d}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          {(["low", "mid", "high"] as const).map((d) => (
            <Chip key={d} on={risk === d} onClick={() => setRisk(d)}>
              {`위험 ${d}`}
            </Chip>
          ))}
        </div>
        <div className="text-xs text-mute">자신감 {conf}%</div>
        <input type="range" min={0} max={100} value={conf} onChange={(e) => setConf(Number(e.target.value))} className="w-full" />
        <input
          className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none"
          placeholder="메모 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Card>
      <button
        disabled={!can}
        className={`w-full rounded-2xl py-4 font-semibold disabled:opacity-40 ${side === "buy" ? "bg-brand" : "bg-down"}`}
        onClick={() => {
          place({
            assetId,
            side,
            qty,
            type,
            limitPrice: limitPx,
            triggerPrice: trigPx,
            activateDay: activate || state.day + 1,
            ...extra,
          });
          nav(type === "market" ? "/play/portfolio" : "/play/orders");
        }}
      >
        {type === "market" ? (side === "buy" ? "BUY" : "SELL") : `${orderLabel(type)} 주문`}
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-mute">{k}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 ${on ? "bg-white text-black" : "border border-white/15 text-mute"}`}>
      {children}
    </button>
  );
}
