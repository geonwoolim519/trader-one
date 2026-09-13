import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { ASSETS, getAsset } from "../data/assets";
import { useGame } from "../store/GameProvider";
import { TRADE_REASONS, type TradeReason, type TradeSide } from "../types";
import { FEE_RATE } from "../types";
import { maxBuyQty } from "../utils/gameEngine";
import { unitValueKrw } from "../utils/portfolioCalculator";
import { changePct } from "../utils/priceEngine";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";

export function TradePage() {
  const { assetId } = useParams();
  const [sp] = useSearchParams();
  const { state } = useGame();
  const nav = useNavigate();
  if (!state) return null;

  if (!assetId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-wide">TRADE</h1>
        <p className="mt-2 text-sm text-mute">종목을 선택해 매수/매도하세요. 수수료 0.1%가 적용됩니다.</p>
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
  const { state, trade } = useGame();
  const nav = useNavigate();
  const def = getAsset(assetId);
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [qty, setQty] = useState(def.lot);
  const [reason, setReason] = useState<TradeReason>("news");
  if (!state) return null;
  const st = state.assets[assetId];
  const hold = state.holdings[assetId]?.qty ?? 0;
  const unit = unitValueKrw(assetId, state.assets);
  const gross = unit * qty;
  const fee = gross * FEE_RATE;
  const total = side === "buy" ? gross + fee : gross - fee;
  const max = side === "buy" ? maxBuyQty(state, assetId) : hold;
  const can = qty > 0 && qty <= max + 1e-9 && state.phase === "playing";

  const step = (d: number) => {
    const n = Math.max(def.lot, Math.round((qty + d * def.lot) / def.lot) * def.lot);
    setQty(Math.min(n, Math.max(def.lot, max || def.lot)));
  };

  const quick = [0.25, 0.5, 1];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play/trade")}>
        ← 종목 선택
      </button>
      <div>
        <div className="text-xs text-mute">{def.ticker}</div>
        <h1 className="text-2xl font-semibold">{side === "buy" ? "BUY" : "SELL"} {def.nameKo}</h1>
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
      <Card className="p-4">
        <Label>보유 현금</Label>
        <div className="tabular text-xl">{formatKrw(state.cash)}</div>
        <div className="mt-1 text-xs text-mute">보유 수량 {hold}</div>
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
          {quick.map((q) => (
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
        <Row k={side === "buy" ? "총 지급" : "예상 수령"} v={formatKrw(total)} />
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
      <button
        disabled={!can}
        className={`w-full rounded-2xl py-4 font-semibold disabled:opacity-40 ${
          side === "buy" ? "bg-brand" : "bg-down"
        }`}
        onClick={() => {
          trade(assetId, side, qty, side === "buy" ? reason : undefined);
          nav("/play/portfolio");
        }}
      >
        {side === "buy" ? "BUY" : "SELL"}
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
