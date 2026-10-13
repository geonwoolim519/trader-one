import { useNavigate } from "react-router-dom";
import { AllocChart } from "../components/charts";
import { Card, InfoTip, Label } from "../components/ui";
import { ASSETS, CATEGORY_LABEL, getAsset } from "../data/assets";
import { useGame } from "../store/GameProvider";
import { INITIAL_CASH } from "../types";
import {
  allocation,
  cashRatio,
  concentration,
  holdingValue,
  investedValue,
  riskLabel,
  totalValue,
  unrealizedPnl,
} from "../utils/portfolioCalculator";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";

export function PortfolioPage() {
  const { state, flag } = useGame();
  const nav = useNavigate();
  if (!state) return null;
  const value = totalValue(state);
  const ret = (value - INITIAL_CASH) / INITIAL_CASH;
  const alloc = allocation(state);
  const pie = Object.entries(alloc).map(([k, v]) => ({
    name: k === "cash" ? "현금" : CATEGORY_LABEL[k] ?? k,
    value: v.value,
  }));
  const rows = Object.entries(state.holdings).filter(([, h]) => h.qty > 0);
  const risk = riskLabel(state);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-wide">PORTFOLIO</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <Label>총 자산</Label>
          <div className="mt-2 text-3xl tabular font-semibold">{formatKrw(value)}</div>
          <div className={`mt-1 tabular ${pnlClass(ret)}`}>{formatPct(ret)}</div>
        </Card>
        <Card className="p-4">
          <Label>현금 / 투자자산</Label>
          <div className="mt-2 text-xl tabular">{formatKrw(state.cash)}</div>
          <div className="text-sm text-mute">
            투자 {formatKrw(investedValue(state))} · 주문 예약 {formatKrw(state.reservedBuyKrw ?? 0)}
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <Label>ALLOCATION</Label>
        <AllocChart items={pie} />
        <div className="grid grid-cols-3 gap-2 text-xs">
          {pie.map((p) => (
            <div key={p.name} className="text-mute">
              {p.name} {((p.value / Math.max(1, value)) * 100).toFixed(0)}%
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <Label>RISK</Label>
        <button className="mt-1 text-[11px] text-mute" onClick={() => flag(`d${state.day}:risk`)}>
          위험 확인 기록
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            Portfolio Risk
            <InfoTip id="변동성" />
            <div className="text-lg font-semibold">{risk}</div>
          </div>
          <div>
            Concentration
            <div className="tabular text-lg">{(concentration(state) * 100).toFixed(0)}%</div>
          </div>
          <div>
            Cash Ratio
            <div className="tabular text-lg">{(cashRatio(state) * 100).toFixed(0)}%</div>
          </div>
          <div>
            MDD
            <div className={`tabular text-lg ${pnlClass(state.mdd)}`}>{formatPct(state.mdd)}</div>
          </div>
        </div>
      </Card>
      <div>
        <Label>HOLDINGS</Label>
        <div className="mt-2 divide-y divide-white/6 rounded-2xl border border-white/8 bg-card">
          {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-mute">보유 자산이 없습니다.</div>}
          {rows.map(([id, h]) => {
            const a = getAsset(id);
            const pnl = unrealizedPnl(id, h, state.assets);
            const val = holdingValue(id, h, state.assets);
            return (
              <button
                key={id}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => nav(`/play/market/${id}`)}
              >
                <div>
                  <div className="font-medium">{a.nameKo}</div>
                  <div className="text-xs text-mute">
                    {h.qty} · 평단 {formatKrw(h.avgCostKrw)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm">{formatKrw(val)}</div>
                  <div className={`tabular text-xs ${pnlClass(pnl)}`}>{formatKrw(pnl)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>TRADES</Label>
        <div className="mt-2 space-y-2">
          {[...state.trades].reverse().slice(0, 12).map((t) => {
            const a = ASSETS.find((x) => x.id === t.assetId);
            return (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm">
                <div>
                  <span className={t.side === "buy" ? "text-up" : "text-down"}>{t.side.toUpperCase()}</span>{" "}
                  {a?.nameKo} · DAY {t.day}
                </div>
                <div className="tabular text-mute">
                  {t.qty} @ {a ? formatPrice(t.price, a.currency, a.id) : t.price}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
