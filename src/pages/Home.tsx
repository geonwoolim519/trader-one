import { Navigate, useNavigate } from "react-router-dom";
import { MISSIONS } from "../data/content";
import { CONDITIONS } from "../data/scenarios";
import { SCENARIOS } from "../data/scenarios";
import { useGame } from "../store/GameProvider";
import { indexProxy } from "../utils/gameEngine";
import { changePct } from "../utils/priceEngine";
import { totalValue } from "../utils/portfolioCalculator";
import { INITIAL_CASH } from "../types";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";
import { getAsset } from "../data/assets";
import { Card, InfoTip, Label, ReliabilityBadge, Sparkline } from "../components/ui";

export function HomePage() {
  const { state, nextDay } = useGame();
  const nav = useNavigate();
  if (!state) return <Navigate to="/" replace />;
  const value = totalValue(state);
  const ret = (value - INITIAL_CASH) / INITIAL_CASH;
  const today = state.valueHistory.length > 1
    ? (value - state.valueHistory[state.valueHistory.length - 1]) / state.valueHistory[state.valueHistory.length - 1]
    : 0;
  const prog = state.day / state.totalDays;
  const scenario = state.scenarioId ? SCENARIOS.find((s) => s.id === state.scenarioId) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <Label>TOTAL ASSETS</Label>
              <div className="mt-2 text-4xl font-semibold tabular tracking-tight">{formatKrw(value)}</div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className={pnlClass(ret)}>{formatPct(ret)}</span>
                <span className="text-mute">since start</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-[0.2em] text-mute">DAY</div>
              <div className="text-2xl font-semibold tabular">
                {state.day}
                <span className="text-sm text-mute"> / {state.totalDays}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-brand" style={{ width: `${prog * 100}%` }} />
          </div>
          <div className="mt-4 flex justify-between text-xs text-mute">
            <span>오늘의 수익률 {formatPct(today)}</span>
            <span>
              {CONDITIONS[state.condition].label}
              <InfoTip id="시장심리" />
            </span>
          </div>
          {scenario && <div className="mt-3 text-xs tracking-wider text-brand">{scenario.title} · {scenario.name}</div>}
        </Card>

        <div>
          <Label>MARKET</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {indexProxy().map((ix) => {
              const a = getAsset(ix.id);
              const st = state.assets[ix.id];
              const ch = changePct(st);
              return (
                <Card key={ix.id} className="p-3" onClick={() => nav(`/play/market/${ix.id}`)}>
                  <div className="text-[11px] text-mute">{ix.label}</div>
                  <div className="mt-1 tabular text-sm">{formatPrice(st.price, a.currency, a.id)}</div>
                  <div className="mt-1 flex items-end justify-between">
                    <span className={`text-xs tabular ${pnlClass(ch)}`}>{formatPct(ch)}</span>
                    <Sparkline data={st.history.slice(-16).map((h) => h.price)} positive={ch >= 0} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>TODAY'S BRIEFING</Label>
            <button className="text-xs text-mute" onClick={() => nav("/play/news")}>
              ALL NEWS
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {state.pendingNews.map((n) => (
              <Card key={n.id} className="p-4" onClick={() => nav("/play/news")}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-mute">{n.time}</span>
                  <ReliabilityBadge r={n.reliability} />
                  {n.special && <span className="text-[11px] text-brand">BREAKING</span>}
                </div>
                <div className="mt-2 font-medium">{n.headline}</div>
                <p className="mt-1 line-clamp-2 text-sm text-white/65">{n.description}</p>
                <div className="mt-2 text-[11px] text-mute">
                  관련 {n.related.map((id) => getAsset(id).ticker).join(" · ")}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <button
          disabled={state.phase === "settling"}
          onClick={() => {
            if (state.phase === "ended") nav("/play/result");
            else nextDay();
          }}
          className="w-full rounded-2xl bg-brand py-4 text-sm font-semibold tracking-wide disabled:opacity-40"
        >
          {state.phase === "ended" ? "VIEW RESULT" : "NEXT DAY"}
        </button>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <Label>MISSIONS</Label>
          <div className="mt-3 space-y-3">
            {MISSIONS.map((m) => {
              const p = state.missions.find((x) => x.id === m.id);
              return (
                <div key={m.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-sm ${p?.done ? "text-white" : "text-white/80"}`}>{m.title}</div>
                    <div className="text-xs text-mute">{m.detail}</div>
                  </div>
                  <div className={`text-xs ${p?.done ? "text-up" : "text-mute"}`}>{p?.done ? "DONE" : `${m.xp} XP`}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <Label>SESSION</Label>
          <div className="mt-2 text-sm text-white/80">REGULAR · {state.pendingNews[0]?.time ?? "09:00"} KST</div>
          <p className="mt-2 text-xs leading-5 text-mute">
            뉴스를 먼저 읽고 거래한 뒤 NEXT DAY를 누르면 시장이 반응합니다. 정답을 알려주지 않습니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
