import { useNavigate } from "react-router-dom";
import { TUTORIALS } from "../data/content";
import { useGame } from "../store/GameProvider";
import { useState } from "react";

export function TutorialPage() {
  const { start, markTutorial } = useGame();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const t = TUTORIALS[i];
  const last = i === TUTORIALS.length - 1;
  return (
    <div className="min-h-dvh bg-black px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-[11px] tracking-[0.25em] text-mute">
          TUTORIAL 0{i + 1} / 0{TUTORIALS.length}
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{t.title}</h1>
        <p className="mt-6 text-base leading-7 text-white/80">{t.body}</p>
        <div className="mt-8 flex gap-1">
          {TUTORIALS.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full ${idx <= i ? "bg-brand" : "bg-white/10"}`} />
          ))}
        </div>
        <button
          className="mt-8 w-full rounded-2xl bg-brand py-4 font-semibold"
          onClick={() => {
            if (!last) setI(i + 1);
            else {
              markTutorial();
              start({ mode: "tutorial", difficulty: "easy" });
              nav("/play");
            }
          }}
        >
          {last ? "START TRADING" : "NEXT"}
        </button>
        <button className="mt-3 w-full py-3 text-sm text-mute" onClick={() => nav("/")}>
          나중에 하기
        </button>
      </div>
    </div>
  );
}
