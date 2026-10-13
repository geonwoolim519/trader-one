import { useNavigate } from "react-router-dom";
import { ACHIEVEMENTS } from "../data/achievements";
import { CAREER_RANKS } from "../data/career";
import { Card, Label } from "../components/ui";
import { useGame } from "../store/GameProvider";

export function CareerPage() {
  const { state, meta, completeCareer } = useGame();
  const nav = useNavigate();
  const rank = CAREER_RANKS.find((r) => r.rank === (meta.careerRank || 1)) ?? CAREER_RANKS[0];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play")}>
        ← HOME
      </button>
      <h1 className="text-2xl font-semibold tracking-wide">CAREER</h1>
      <p className="text-sm text-mute">커리어는 게임 자금을 바꾸지 않습니다. 기록으로만 승급합니다.</p>
      <Card className="p-5">
        <Label>LEVEL {rank.rank}</Label>
        <div className="mt-1 text-2xl font-semibold">{rank.name}</div>
        <p className="mt-2 text-sm text-white/75">{rank.goal}</p>
      </Card>
      <div className="space-y-2">
        {rank.tasks.map((t) => {
          const done = meta.careerDone.includes(t.id);
          const ready = state ? t.check(state, meta) : false;
          return (
            <Card key={t.id} className="p-4">
              <div className="font-medium">{t.title}</div>
              <p className="mt-1 text-sm text-mute">{t.detail}</p>
              <button
                disabled={done || !state}
                onClick={() => completeCareer(t.id)}
                className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                {done ? "DONE" : ready ? "기록 확인" : "조건 미달"}
              </button>
            </Card>
          );
        })}
      </div>
      <div>
        <Label>PATH</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {CAREER_RANKS.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                r.rank === rank.rank ? "border-brand bg-brand/15" : "border-white/10 text-mute"
              }`}
            >
              L{r.rank} {r.name}
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>BADGES</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const on = meta.achievements.includes(a.id);
            return (
              <Card key={a.id} className={`p-3 ${on ? "" : "opacity-45"}`}>
                <div className="text-xs tracking-widest text-brand">{on ? "UNLOCKED" : "LOCKED"}</div>
                <div className="mt-1 font-medium">{a.name}</div>
                <div className="text-xs text-mute">{a.detail}</div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
