import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCENARIOS } from "../data/scenarios";
import { levelFromXp } from "../data/content";
import { useGame } from "../store/GameProvider";
import type { Difficulty, GameMode } from "../types";
import { INITIAL_CASH } from "../types";
import { formatKrw, formatPct } from "../utils/randomEngine";
import { Label } from "../components/ui";

const MODES: { id: GameMode; title: string; sub: string; days: string }[] = [
  { id: "quick", title: "QUICK GAME", sub: "빠르게 체험", days: "10 DAYS" },
  { id: "standard", title: "STANDARD", sub: "기본 게임", days: "30 DAYS" },
  { id: "long", title: "LONG GAME", sub: "경제 사이클", days: "90 DAYS" },
  { id: "scenario", title: "SCENARIO", sub: "특정 경제 상황", days: "30 DAYS" },
  { id: "tutorial", title: "TUTORIAL", sub: "경제·금융 기초", days: "LEARN" },
];

const DIFFS: Difficulty[] = ["easy", "normal", "hard", "expert"];

export function Landing() {
  const { state, meta, start } = useGame();
  const nav = useNavigate();
  const [diff, setDiff] = useState<Difficulty>("normal");
  const lv = levelFromXp(meta.xp);

  return (
    <div className="min-h-dvh bg-black px-5 py-10">
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center text-center">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="TRADER ONE" className="h-28 w-28 rounded-[28px] glow-red" />
          <div className="mt-6 text-xs tracking-[0.4em] text-mute">TRADER ONE</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Trade. Think. Decide.</h1>
          <p className="mt-2 text-sm text-mute">Experience the market.</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
            가상 자금 {formatKrw(INITIAL_CASH)}으로 뉴스와 경제 이벤트를 읽고, 시장이 왜 움직이는지 직접 결정하세요.
          </p>
        </div>

        {state && state.phase !== "ended" && (
          <button
            className="mt-8 w-full rounded-2xl border border-brand/50 bg-brand/15 py-4 text-sm font-semibold"
            onClick={() => nav("/play")}
          >
            CONTINUE · DAY {state.day}/{state.totalDays}
          </button>
        )}

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/8 bg-card px-4 py-3">
          <div>
            <Label>TRADER LEVEL {lv.level}</Label>
            <div className="mt-1 text-sm">{lv.name}</div>
          </div>
          <div className="text-right text-xs text-mute">
            <div>XP {meta.xp.toLocaleString()}</div>
            <div>BEST {formatPct(meta.bestReturn)}</div>
          </div>
        </div>

        <div className="mt-6">
          <Label>DIFFICULTY</Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DIFFS.map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`rounded-xl border py-2 text-[11px] uppercase tracking-wider ${
                  diff === d ? "border-brand bg-brand text-white" : "border-white/10 text-mute"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-card px-4 py-4 text-left"
              onClick={() => {
                if (m.id === "scenario") nav("/scenarios");
                else if (m.id === "tutorial") nav("/tutorial");
                else {
                  start({ mode: m.id, difficulty: diff });
                  nav("/play");
                }
              }}
            >
              <div>
                <div className="text-sm font-semibold tracking-wide">{m.title}</div>
                <div className="text-xs text-mute">{m.sub}</div>
              </div>
              <div className="text-xs tracking-widest text-brand">{m.days}</div>
            </button>
          ))}
        </div>

        <p className="mt-10 text-center text-[10px] text-white/30">
          TRADER ONE is a fictional market simulation for educational and entertainment purposes.
        </p>
      </div>
    </div>
  );
}

export function ScenarioPage() {
  const { start } = useGame();
  const nav = useNavigate();
  const [diff, setDiff] = useState<Difficulty>("normal");
  return (
    <div className="min-h-dvh bg-black px-5 py-8">
      <div className="mx-auto max-w-lg">
        <button className="text-sm text-mute" onClick={() => nav("/")}>
          ← BACK
        </button>
        <h1 className="mt-4 text-2xl font-semibold">SCENARIO MODE</h1>
        <p className="mt-2 text-sm text-mute">특정 경제 상황을 집중 체험합니다.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {DIFFS.map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={`rounded-xl border py-2 text-[11px] uppercase ${
                diff === d ? "border-brand bg-brand" : "border-white/10 text-mute"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="w-full rounded-2xl border border-white/8 bg-card p-4 text-left"
              onClick={() => {
                start({ mode: "scenario", difficulty: diff, scenarioId: s.id });
                nav("/play");
              }}
            >
              <div className="text-[11px] tracking-[0.2em] text-brand">SCENARIO {s.code}</div>
              <div className="mt-1 text-lg font-semibold">{s.name}</div>
              <p className="mt-2 text-sm leading-6 text-white/70">{s.description}</p>
              {s.goals && <p className="mt-2 text-xs text-mute">목표 · {s.goals[0]}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
