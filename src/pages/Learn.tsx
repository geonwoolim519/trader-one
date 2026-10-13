import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { LESSONS, TRACK_LABEL } from "../data/learning";
import { useGame } from "../store/GameProvider";

export function LearnPage() {
  const { state, meta, completeLesson } = useGame();
  const nav = useNavigate();
  const [id, setId] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const lesson = LESSONS.find((l) => l.id === id);
  const tracks = useMemo(() => [...new Set(LESSONS.map((l) => l.track))], []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play")}>
        ← HOME
      </button>
      <h1 className="text-2xl font-semibold tracking-wide">ADVANCED LEARNING</h1>
      <p className="text-sm text-mute">개념은 게임 기록과 연결됩니다. 용어 사전으로 끝내지 않습니다.</p>
      {!lesson &&
        tracks.map((tr) => (
          <div key={tr}>
            <Label>{TRACK_LABEL[tr]}</Label>
            <div className="mt-2 space-y-2">
              {LESSONS.filter((l) => l.track === tr).map((l) => (
                <button
                  key={l.id}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-card px-4 py-3 text-left"
                  onClick={() => {
                    setId(l.id);
                    setPick(null);
                  }}
                >
                  <span>{l.title}</span>
                  <span className="text-xs text-mute">{meta.learningDone.includes(l.id) ? "DONE" : ""}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      {lesson && (
        <div className="space-y-3">
          <button
            className="text-sm text-mute"
            onClick={() => {
              setId(null);
              setPick(null);
            }}
          >
            ← 목록
          </button>
          <h2 className="text-2xl font-semibold">{lesson.title}</h2>
          <Card className="p-4 text-sm leading-6 text-white/80">{lesson.concept}</Card>
          <Card className="p-4">
            <Label>관련 사례</Label>
            <p className="mt-2 text-sm leading-6 text-white/80">{lesson.caseStudy}</p>
          </Card>
          <Card className="p-4">
            <Label>게임 안에서의 연결</Label>
            <p className="mt-2 text-sm leading-6 text-white/80">{lesson.gameLink}</p>
            {state && (
              <p className="mt-2 text-xs text-mute">
                이번 세션 뉴스 {state.newsLog.length + state.pendingNews.length}건 · 거래 {state.trades.length}회 · 국면 {state.cycle}
              </p>
            )}
          </Card>
          <Card className="p-4">
            <Label>선택</Label>
            <p className="mt-2 text-sm">{lesson.prompt}</p>
            <div className="mt-3 space-y-2">
              {lesson.choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPick(c.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                    pick === c.id ? "border-brand bg-brand/15" : "border-white/10"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {pick && (
              <div className="mt-3 text-sm leading-6 text-white/80">
                {lesson.choices.find((c) => c.id === pick)?.explain}
                <div className="mt-2 text-xs text-mute">{lesson.extra}</div>
              </div>
            )}
            <button
              disabled={!pick}
              className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-semibold disabled:opacity-40"
              onClick={() => completeLesson(lesson.id)}
            >
              {meta.learningDone.includes(lesson.id) ? "학습 기록됨" : "학습 완료 · +30 XP"}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
