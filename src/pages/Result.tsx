import { Navigate, useNavigate } from "react-router-dom";
import { Card, InfoTip, Label } from "../components/ui";
import { CONCEPTS } from "../data/content";
import { useGame } from "../store/GameProvider";
import { INITIAL_CASH } from "../types";
import { SCENARIOS } from "../data/scenarios";
import { traderInsight } from "../utils/insightEngine";
import {
  analyzeStyle,
  goodsAndBads,
  learnedConcepts,
  riskAdjusted,
  tradeReview,
  winRate,
} from "../utils/performanceCalculator";
import { scoreScenario } from "../utils/scenarioScore";
import { totalValue } from "../utils/portfolioCalculator";
import { formatKrw, formatPct, pnlClass } from "../utils/randomEngine";

export function ResultPage() {
  const { state, start } = useGame();
  const nav = useNavigate();
  if (!state) return <Navigate to="/" replace />;
  const value = totalValue(state);
  const ret = (value - INITIAL_CASH) / INITIAL_CASH;
  const style = analyzeStyle(state);
  const { goods, bads } = goodsAndBads(state);
  const review = tradeReview(state);
  const concepts = learnedConcepts(state);
  const ended = state.phase === "ended";
  const sc = state.scenarioId ? SCENARIOS.find((s) => s.id === state.scenarioId) : null;
  const scored = sc ? scoreScenario(state) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="text-[11px] tracking-[0.25em] text-brand">{ended ? "MARKET CLOSED" : "LIVE SNAPSHOT"}</div>
        <h1 className="mt-2 text-3xl font-semibold">Final Assets</h1>
        <div className="mt-3 text-4xl tabular font-semibold">{formatKrw(value)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric k="Return" v={formatPct(ret)} n={ret} />
        <Metric k="MDD" v={formatPct(state.mdd)} n={state.mdd} />
        <Metric k="Trades" v={String(state.trades.length)} />
        <Metric k="Win Rate" v={`${(winRate(state) * 100).toFixed(1)}%`} />
      </div>
      <Card className="p-5">
        <Label>YOUR TRADING STYLE</Label>
        <div className="mt-2 text-2xl font-semibold">{style.title}</div>
        <p className="mt-2 text-sm leading-6 text-white/75">{style.blurb}</p>
        <div className="mt-3 text-xs text-mute">위험 대비 수익 {riskAdjusted(state).toFixed(2)}</div>
      </Card>
      <Card className="p-5">
        <Label>잘한 점</Label>
        <ul className="mt-2 space-y-2 text-sm leading-6">
          {goods.map((g) => (
            <li key={g}>· {g}</li>
          ))}
        </ul>
        <Label>개선할 점</Label>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-white/75">
          {bads.map((g) => (
            <li key={g}>· {g}</li>
          ))}
        </ul>
      </Card>
      {scored && (
        <Card className="p-5">
          <Label>SCENARIO SCORE</Label>
          <div className="mt-2 text-3xl font-semibold">{scored.total}</div>
          <p className="mt-1 text-sm text-white/70">{sc?.name}</p>
          <div className="mt-3 space-y-1 text-sm">
            {scored.rows.map((r) => (
              <div key={r.k} className="flex justify-between">
                <span className="text-mute">
                  {r.k} ({r.w})
                </span>
                <span>
                  {r.v.toFixed(0)} · {r.note}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-white/75">{scored.endNote}</p>
          {scored.strategies.length > 0 && (
            <p className="mt-2 text-xs text-mute">가능했던 전략: {scored.strategies.join(" / ")}</p>
          )}
        </Card>
      )}
      <Card className="p-5">
        <Label>TRADER INSIGHT</Label>
        <div className="mt-2 space-y-2 text-sm leading-6 text-white/80">
          {traderInsight(state).map((x) => (
            <p key={x}>{x}</p>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Label>TRADE REVIEW</Label>
        <div className="mt-3 text-xs tracking-widest text-mute">BEST</div>
        {review.best.length === 0 && <p className="mt-2 text-sm text-mute">아직 청산된 거래가 없습니다.</p>}
        {review.best.map((b) => (
          <Review key={b.t.id} {...b} />
        ))}
        <div className="mt-4 text-xs tracking-widest text-mute">WORST</div>
        {review.worst.map((b) => (
          <Review key={b.t.id} {...b} />
        ))}
      </Card>
      <Card className="p-5">
        <Label>경제학 학습 리포트</Label>
        <p className="mt-2 text-sm text-mute">이번 게임에서 경험한 개념</p>
        <div className="mt-3 space-y-3">
          {concepts.map((c) => {
            const info = CONCEPTS[c];
            return (
              <div key={c}>
                <div className="flex items-center font-medium">
                  ✓ {c}
                  <InfoTip id={c} />
                </div>
                {info && <p className="text-sm text-white/65">{info.short}</p>}
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="rounded-2xl bg-brand py-4 font-semibold"
          onClick={() => {
            start({ mode: state.mode === "tutorial" ? "quick" : state.mode, difficulty: state.difficulty, scenarioId: state.scenarioId });
            nav("/play");
          }}
        >
          PLAY AGAIN
        </button>
        <button className="rounded-2xl border border-white/15 py-4" onClick={() => nav("/")}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}

function Metric({ k, v, n }: { k: string; v: string; n?: number }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] text-mute">{k}</div>
      <div className={`mt-1 text-xl tabular ${n !== undefined ? pnlClass(n) : ""}`}>{v}</div>
    </Card>
  );
}

function Review({
  name,
  why,
  happened,
  result,
  next,
}: {
  name: string;
  why: string;
  happened: string;
  result: string;
  next: string;
}) {
  const a = name;
  return (
    <div className="mt-2 rounded-xl border border-white/8 p-3 text-sm">
      <div className="font-medium">{a}</div>
      <div className="mt-1 text-white/70">왜 샀는가: {why}</div>
      <div className="text-white/70">무엇이 발생했는가: {happened}</div>
      <div>결과는: {result}</div>
      <div className="text-mute">다음에는: {next}</div>
    </div>
  );
}
