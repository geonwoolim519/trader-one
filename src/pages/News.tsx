import { useNavigate } from "react-router-dom";
import { getAsset } from "../data/assets";
import { Card, Label, REL_HINT, ReliabilityBadge } from "../components/ui";
import { useGame } from "../store/GameProvider";

export function NewsPage() {
  const { state } = useGame();
  const nav = useNavigate();
  if (!state) return null;
  const today = state.pendingNews;
  const past = [...state.newsLog].reverse();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-wide">NEWS</h1>
      <p className="mt-2 text-sm text-mute">정답은 적혀 있지 않습니다. 신뢰도와 이미 반영된 기대를 스스로 판단하세요.</p>

      <div className="mt-6">
        <Label>TODAY</Label>
        <div className="mt-2 space-y-3">
          {today.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-mute">{n.time}</span>
                {n.special && <span className="text-xs text-brand">BREAKING</span>}
                <ReliabilityBadge r={n.reliability} />
                <span className="text-[11px] text-mute">{REL_HINT[n.reliability]}</span>
              </div>
              <h2 className="mt-2 text-lg font-medium">{n.headline}</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">{n.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {n.related.map((id) => (
                  <button
                    key={id}
                    onClick={() => nav(`/play/market/${id}`)}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-mute"
                  >
                    {getAsset(id).nameKo}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {past.length > 0 && (
        <div className="mt-8">
          <Label>ARCHIVE</Label>
          <div className="mt-2 space-y-2">
            {past.map((n) => (
              <div key={n.id} className="rounded-xl border border-white/6 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-mute">
                  DAY {n.day} · {n.time}
                  <ReliabilityBadge r={n.reliability} />
                </div>
                <div className="mt-1 text-sm">{n.headline}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
