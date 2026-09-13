import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { useGame } from "../store/GameProvider";
import { CONDITIONS } from "../data/scenarios";

export function SettingsPage() {
  const { state, resetGame, resetAll } = useGame();
  const nav = useNavigate();
  const [ask, setAsk] = useState<"game" | "all" | null>(null);
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-wide">SETTINGS</h1>
      {state && (
        <Card className="space-y-2 p-4 text-sm">
          <Label>SESSION</Label>
          <div>MODE {state.mode.toUpperCase()}</div>
          <div>DIFFICULTY {state.difficulty.toUpperCase()}</div>
          <div>DAY {state.day} / {state.totalDays}</div>
          <div>SEED {state.seed}</div>
          <div>MARKET {CONDITIONS[state.condition].label}</div>
        </Card>
      )}
      <button
        className="w-full rounded-2xl border border-brand/40 py-4 text-brand"
        onClick={() => setAsk("game")}
      >
        RESET GAME
      </button>
      <button className="w-full rounded-2xl border border-white/15 py-4 text-mute" onClick={() => setAsk("all")}>
        RESET ALL DATA
      </button>
      <button className="w-full py-3 text-sm text-mute" onClick={() => nav("/")}>
        MAIN MENU
      </button>
      {ask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm p-5">
            <div className="text-lg font-semibold">정말 초기화할까요?</div>
            <p className="mt-2 text-sm text-white/70">모든 게임 데이터가 초기화됩니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-white/15 py-3" onClick={() => setAsk(null)}>
                취소
              </button>
              <button
                className="rounded-xl bg-brand py-3"
                onClick={() => {
                  if (ask === "all") resetAll();
                  else resetGame();
                  setAsk(null);
                  nav("/");
                }}
              >
                초기화
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
