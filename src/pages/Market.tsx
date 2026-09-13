import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ASSETS, CATEGORY_LABEL, getAsset } from "../data/assets";
import { CONCEPTS } from "../data/content";
import { AssetChart, RangeTabs } from "../components/charts";
import { Card, InfoTip, Label, Pct, ReliabilityBadge, Sparkline } from "../components/ui";
import { useGame } from "../store/GameProvider";
import type { AssetCategory } from "../types";
import { changePct } from "../utils/priceEngine";
import { holdingValue, unrealizedPnl } from "../utils/portfolioCalculator";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";

const CATS: (AssetCategory | "all" | "economy")[] = ["all", "stock", "etf", "commodity", "fx", "bond", "economy"];

export function MarketPage() {
  const { state } = useGame();
  const nav = useNavigate();
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  if (!state) return null;

  const list = ASSETS.filter((a) => cat === "all" || cat === "economy" || a.category === cat).sort(
    (a, b) => Math.abs(changePct(state.assets[b.id])) - Math.abs(changePct(state.assets[a.id])),
  );

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-wide">MARKET</h1>
        <div className="text-xs text-mute">가상 시세 · 시뮬레이션</div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${
              cat === c ? "border-white bg-white text-black" : "border-white/15 text-mute"
            }`}
          >
            {c === "all" ? "ALL" : c === "economy" ? "ECONOMY" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {cat === "economy" ? (
        <Economy />
      ) : (
        <div className="mt-2 divide-y divide-white/6 rounded-2xl border border-white/8 bg-card">
          {list.map((a) => {
            const st = state.assets[a.id];
            const ch = changePct(st);
            return (
              <button
                key={a.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => nav(`/play/market/${a.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.nameKo}</span>
                    <span className="text-[11px] text-mute">{a.ticker}</span>
                  </div>
                  <div className="text-xs text-mute">{CATEGORY_LABEL[a.category]}</div>
                </div>
                <Sparkline data={st.history.slice(-18).map((h) => h.price)} positive={ch >= 0} />
                <div className="w-28 text-right">
                  <div className="tabular text-sm">{formatPrice(st.price, a.currency, a.id)}</div>
                  <Pct n={ch} className="text-xs" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Economy() {
  const { state } = useGame();
  if (!state) return null;
  const e = state.economy;
  const rows = [
    { k: "GDP 성장", v: `${e.gdp.toFixed(1)}%`, id: "경기" },
    { k: "CPI", v: `${e.cpi.toFixed(1)}%`, id: "CPI" },
    { k: "미국 기준금리", v: `${e.usRate.toFixed(2)}%`, id: "기준금리" },
    { k: "한국 기준금리", v: `${e.krRate.toFixed(2)}%`, id: "기준금리" },
    { k: "실업률", v: `${e.unemployment.toFixed(1)}%`, id: "경기" },
    { k: "PMI", v: e.pmi.toFixed(1), id: "경기" },
    { k: "수출", v: `${e.exports.toFixed(1)}%`, id: "수출" },
    { k: "수입", v: `${e.imports.toFixed(1)}%`, id: "무역수지" },
    { k: "무역수지", v: e.tradeBalance.toFixed(1), id: "무역수지" },
    { k: "소비자심리지수", v: e.csi.toFixed(0), id: "소비" },
  ];
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r) => (
        <Card key={r.k} className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <span>{r.k}</span>
            <InfoTip id={CONCEPTS[r.id] ? r.id : "경기"} />
          </div>
          <div className="tabular font-medium">{r.v}</div>
        </Card>
      ))}
      <p className="px-1 text-xs leading-5 text-mute">
        지표는 게임 내부 가상 데이터입니다. 금리·물가·수출이 바뀌면 관련 자산 민감도를 통해 가격에 스며듭니다.
      </p>
    </div>
  );
}

export function AssetDetailPage() {
  const { assetId = "" } = useParams();
  const { state } = useGame();
  const nav = useNavigate();
  const [range, setRange] = useState<"1D" | "5D" | "1M" | "GAME">("1M");
  if (!state || !ASSETS.some((a) => a.id === assetId)) return <div>종목을 찾을 수 없습니다.</div>;
  const def = getAsset(assetId);
  const st = state.assets[assetId];
  const ch = changePct(st);
  const hold = state.holdings[assetId];
  const news = state.pendingNews.filter((n) => n.related.includes(assetId));
  const pnl = hold ? unrealizedPnl(assetId, hold, state.assets) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button className="text-sm text-mute" onClick={() => nav(-1)}>
        ← MARKET
      </button>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-mute">{def.ticker}</div>
          <h1 className="text-2xl font-semibold">{def.nameKo}</h1>
        </div>
        <div className="text-right">
          <div className="text-2xl tabular">{formatPrice(st.price, def.currency, def.id)}</div>
          <div className={`tabular ${pnlClass(ch)}`}>{formatPct(ch)}</div>
        </div>
      </div>
      <Card className="p-3">
        <RangeTabs value={range} onChange={setRange} />
        <AssetChart asset={st} range={range} />
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Stat k="거래량" v={st.volume.toLocaleString()} />
        <Stat k="변동성" v={`${(def.volatility * 100).toFixed(1)}%`} />
        <Stat k="보유량" v={hold ? String(hold.qty) : "0"} />
        <Stat k="평균 매수가" v={hold ? formatKrw(hold.avgCostKrw) : "-"} />
        <Stat k="평가금액" v={hold ? formatKrw(holdingValue(assetId, hold, state.assets)) : "-"} />
        <Stat k="평가손익" v={hold ? formatKrw(pnl) : "-"} up={pnl} />
      </div>
      <Card className="p-4">
        <Label>관련 경제 민감도</Label>
        <p className="mt-2 text-sm leading-6 text-white/70">
          이 자산은 {def.tags.join(", ")} 요인에 반응합니다. 금리가 오르면 성장 민감 자산은 부담을, 국채는 가격 하락 압력을
          받을 수 있습니다.
          <InfoTip id={def.tags.includes("gold") ? "금" : def.tags.includes("semi") ? "반도체" : "환율"} />
        </p>
      </Card>
      {news.length > 0 && (
        <div>
          <Label>관련 뉴스</Label>
          <div className="mt-2 space-y-2">
            {news.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex gap-2">
                  <ReliabilityBadge r={n.reliability} />
                  <span className="text-xs text-mute">{n.time}</span>
                </div>
                <div className="mt-2 font-medium">{n.headline}</div>
                <p className="mt-1 text-sm text-white/65">{n.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          className="rounded-2xl bg-brand py-4 font-semibold"
          onClick={() => nav(`/play/trade/${assetId}?side=buy`)}
        >
          BUY
        </button>
        <button
          className="rounded-2xl border border-down py-4 font-semibold text-down"
          onClick={() => nav(`/play/trade/${assetId}?side=sell`)}
        >
          SELL
        </button>
      </div>
    </div>
  );
}

function Stat({ k, v, up }: { k: string; v: string; up?: number }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] text-mute">{k}</div>
      <div className={`mt-1 tabular text-sm ${up !== undefined ? pnlClass(up) : ""}`}>{v}</div>
    </Card>
  );
}