import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ASSETS, CATEGORY_LABEL, getAsset } from "../data/assets";
import { CONCEPTS } from "../data/content";
import { CYCLE_LABEL, REGION_LABEL } from "../data/macro";
import { AssetChart, RangeTabs } from "../components/charts";
import { Card, InfoTip, Label, Pct, ReliabilityBadge, Sparkline } from "../components/ui";
import { useGame } from "../store/GameProvider";
import type { AssetCategory } from "../types";
import { compareAssets } from "../utils/insightEngine";
import { detectRegime } from "../utils/macroEngine";
import { changePct } from "../utils/priceEngine";
import { holdingValue, unrealizedPnl } from "../utils/portfolioCalculator";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";

const CATS: (AssetCategory | "all" | "economy" | "watch" | "compare")[] = [
  "all",
  "stock",
  "etf",
  "commodity",
  "fx",
  "bond",
  "watch",
  "compare",
  "economy",
];

export function MarketPage() {
  const { state } = useGame();
  const nav = useNavigate();
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  if (!state) return null;

  const list = ASSETS.filter((a) => cat === "all" || cat === "economy" || cat === "watch" || cat === "compare" || a.category === cat).sort(
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
            {c === "all" ? "ALL" : c === "economy" ? "ECONOMY" : c === "watch" ? "WATCH" : c === "compare" ? "COMPARE" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {cat === "economy" ? (
        <Economy />
      ) : cat === "watch" ? (
        <Watchlist />
      ) : cat === "compare" ? (
        <Compare />
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
  const { state, flag } = useGame();
  useEffect(() => {
    flag("opened_economy");
  }, [flag]);
  if (!state) return null;
  const e = state.economy;
  const regime = detectRegime(state);
  const oil = state.assets.oil?.price;
  const rows = [
    { k: "GDP 성장", v: `${e.gdp.toFixed(1)}%`, id: "경기 사이클" },
    { k: "CPI", v: `${e.cpi.toFixed(1)}%`, id: "CPI" },
    { k: "미국 기준금리", v: `${e.usRate.toFixed(2)}%`, id: "기준금리" },
    { k: "한국 기준금리", v: `${e.krRate.toFixed(2)}%`, id: "기준금리" },
    { k: "실업률", v: `${e.unemployment.toFixed(1)}%`, id: "경기 사이클" },
    { k: "PMI", v: e.pmi.toFixed(1), id: "경기 사이클" },
    { k: "수출", v: `${e.exports.toFixed(1)}%`, id: "수출" },
    { k: "수입", v: `${e.imports.toFixed(1)}%`, id: "무역수지" },
    { k: "무역수지", v: e.tradeBalance.toFixed(1), id: "무역수지" },
    { k: "소비자심리지수", v: e.csi.toFixed(0), id: "소비" },
    { k: "국제유가(가상)", v: oil ? `$${oil.toFixed(2)}` : "-", id: "원자재" },
  ];
  return (
    <div className="mt-3 space-y-3">
      <Card className="p-4">
        <Label>MARKET REGIME · 가상 분류</Label>
        <div className="mt-2 text-xl font-semibold">{regime.label}</div>
        <ul className="mt-2 space-y-1 text-sm text-white/75">
          {regime.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-mute">확정적인 매매 신호가 아닙니다. 게임 엔진 변수로 분류합니다.</p>
      </Card>
      <Card className="p-4">
        <Label>경기 국면</Label>
        <div className="mt-2 text-lg">{CYCLE_LABEL[state.cycle]}</div>
        <p className="mt-1 text-xs text-mute">국면은 고정 순서로 진행되지 않습니다. 게임마다 경로가 달라집니다.</p>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.values(state.regions ?? {}).map((r) => (
          <Card key={r.id} className="p-3">
            <div className="text-xs text-mute">{REGION_LABEL[r.id]}</div>
            <div className="mt-1 text-sm">{CYCLE_LABEL[r.phase]}</div>
            <div className="mt-1 text-xs text-mute">
              금리 {r.rate.toFixed(1)}% · 물가 {r.inflation.toFixed(1)}% · 성장 {r.growth.toFixed(1)}%
            </div>
            <div className="text-xs text-mute">통화 {r.currency.toFixed(2)} · 수출 {r.exports.toFixed(1)}</div>
          </Card>
        ))}
      </div>
      {rows.map((r) => (
        <Card key={r.k} className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <span>{r.k}</span>
            <InfoTip id={CONCEPTS[r.id] ? r.id : "변동성"} />
          </div>
          <div className="tabular font-medium">{r.v}</div>
        </Card>
      ))}
      <div>
        <Label>인과관계</Label>
        <p className="mt-1 text-xs text-mute">예상 방향과 실제로 나타난 변화를 구분합니다.</p>
        <div className="mt-2 space-y-2">
          {(state.causality ?? []).length === 0 && (
            <p className="text-sm text-mute">NEXT DAY를 진행하면 당일 충격의 연결이 표시됩니다.</p>
          )}
          {(state.causality ?? []).map((c, i) => (
            <Card key={`${c.from}-${c.to}-${i}`} className="p-3">
              <div className="text-sm font-medium">
                {c.from} → {c.to}
              </div>
              <div className="mt-1 text-xs text-mute">
                예상 {c.expected} · 실제 {c.actual} · 강도 {(c.intensity * 100).toFixed(0)}%
              </div>
              <p className="mt-1 text-sm text-white/75">{c.note}</p>
            </Card>
          ))}
        </div>
      </div>
      <p className="px-1 text-xs leading-5 text-mute">
        지표는 게임 내부 가상 데이터입니다. 실제 경제 통계를 가져온 것처럼 표시하지 않습니다.
      </p>
    </div>
  );
}

function Watchlist() {
  const { state, meta, toggleWatch } = useGame();
  const nav = useNavigate();
  if (!state) return null;
  const ids = meta.watchlist.filter((id) => ASSETS.some((a) => a.id === id));
  return (
    <div className="mt-3 space-y-2">
      {ids.length === 0 && <p className="text-sm text-mute">종목 상세에서 별을 눌러 관심 자산을 추가하세요.</p>}
      {ids.map((id) => {
        const a = getAsset(id);
        const st = state.assets[id];
        const ch = changePct(st);
        const news = state.pendingNews.filter((n) => n.related.includes(id));
        const hold = state.holdings[id]?.qty;
        return (
          <Card key={id} className="p-4">
            <button className="w-full text-left" onClick={() => nav(`/play/market/${id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.nameKo}</div>
                  <div className="text-xs text-mute">{hold ? `보유 ${hold}` : "미보유"}</div>
                </div>
                <div className="text-right">
                  <div className="tabular">{formatPrice(st.price, a.currency, a.id)}</div>
                  <div className={`text-xs ${pnlClass(ch)}`}>{formatPct(ch)}</div>
                </div>
              </div>
              <Sparkline data={st.history.slice(-20).map((h) => h.price)} positive={ch >= 0} />
              {news[0] && <div className="mt-2 text-xs text-white/70">{news[0].headline}</div>}
            </button>
            <button className="mt-2 text-xs text-mute" onClick={() => toggleWatch(id)}>
              관심 해제
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function Compare() {
  const { state, markCompared } = useGame();
  const [ids, setIds] = useState<string[]>(["spy", "qqq", "gold", "usbond"]);
  if (!state) return null;
  const picked = ids.filter(Boolean).slice(0, 4);
  const data = compareAssets(state, picked);
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-mute">최대 4개. 시작점을 100으로 맞춘 수익률 지수입니다.</p>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <select
            key={i}
            className="rounded-xl border border-white/15 bg-black px-2 py-2 text-sm"
            value={ids[i] ?? ""}
            onChange={(e) => {
              const next = [...ids];
              next[i] = e.target.value;
              setIds(next);
              markCompared();
            }}
          >
            <option value="">-</option>
            {ASSETS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nameKo}
              </option>
            ))}
          </select>
        ))}
      </div>
      {data.series.map((s) => {
        const a = getAsset(s.id);
        return (
          <Card key={s.id} className="p-3">
            <div className="flex justify-between text-sm">
              <span>{a.nameKo}</span>
              <span className={pnlClass(s.ret)}>{formatPct(s.ret)}</span>
            </div>
            <div className="mt-1 text-xs text-mute">
              변동성 {(s.vol * 100).toFixed(2)}% · MDD {formatPct(s.mdd)}
            </div>
            <Sparkline data={s.idx.slice(-40)} positive={s.ret >= 0} />
          </Card>
        );
      })}
      <Card className="p-3">
        <Label>상관관계</Label>
        {data.corr.length === 0 && <p className="mt-2 text-sm text-mute">자산을 2개 이상 선택하세요.</p>}
        {data.corr.map((c) => (
          <div key={`${c.a}-${c.b}`} className="mt-2 flex justify-between text-sm">
            <span>
              {getAsset(c.a).ticker} · {getAsset(c.b).ticker}
            </span>
            <span>{c.v == null ? "데이터 부족" : c.v.toFixed(2)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function AssetDetailPage() {
  const { assetId = "" } = useParams();
  const { state, meta, toggleWatch } = useGame();
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
          <button className="mt-2 text-xs text-mute" onClick={() => toggleWatch(assetId)}>
            {meta.watchlist.includes(assetId) ? "★ 관심 해제" : "☆ 관심 추가"}
          </button>
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
      {def.category === "bond" && (
        <p className="text-xs leading-5 text-mute">
          채권 ETF는 실제 만기·듀레이션·이자수익을 단순화한 게임용 모델입니다. 금리가 오르면 기존 고정금리 채권 가격에 하방 압력이 있습니다.
        </p>
      )}
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