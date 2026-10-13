import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { getAsset } from "../data/assets";
import { useGame } from "../store/GameProvider";
import { reasonLabel } from "../utils/performanceCalculator";
import { traderInsight } from "../utils/insightEngine";
import { formatKrw, formatPrice, pnlClass } from "../utils/randomEngine";

const Qs = [
  "당시 이용할 수 있었던 정보는 무엇이었는가?",
  "예상과 실제 시장 반응은 어떻게 달랐는가?",
  "위험을 충분히 고려했는가?",
  "결과를 알고 나서 과거의 판단을 과도하게 정당화하고 있지는 않은가?",
];

export function JournalPage() {
  const { state, reviewTrade } = useGame();
  const nav = useNavigate();
  const [id, setId] = useState<string | null>(null);
  if (!state) return null;
  const trades = [...state.trades].reverse();
  const t = trades.find((x) => x.id === id);
  const insights = traderInsight(state);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play")}>
        ← HOME
      </button>
      <h1 className="text-2xl font-semibold tracking-wide">TRADE JOURNAL</h1>
      <p className="text-sm text-mute">좋은 결과가 좋은 판단을 증명하지는 않습니다. 과정과 결과를 따로 봅니다.</p>
      <Card className="p-4">
        <Label>TRADER INSIGHT</Label>
        <div className="mt-2 space-y-2 text-sm leading-6 text-white/80">
          {insights.map((x) => (
            <p key={x}>{x}</p>
          ))}
        </div>
      </Card>
      {!t && (
        <div className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-card">
          {trades.length === 0 && <div className="p-4 text-sm text-mute">아직 거래가 없습니다.</div>}
          {trades.map((row) => {
            const a = getAsset(row.assetId);
            return (
              <button key={row.id} className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setId(row.id)}>
                <div>
                  <div className="text-sm">
                    DAY {row.day} · {row.side === "buy" ? "매수" : "매도"} {a.nameKo}
                  </div>
                  <div className="text-xs text-mute">{row.orderType ?? "market"} · {row.reason ? reasonLabel(row.reason) : "이유 미기록"}</div>
                </div>
                <div className={`text-sm tabular ${row.pnl != null ? pnlClass(row.pnl) : "text-mute"}`}>
                  {row.pnl != null ? formatKrw(row.pnl) : formatPrice(row.price, a.currency, a.id)}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {t && (
        <div className="space-y-3">
          <button className="text-sm text-mute" onClick={() => setId(null)}>
            ← 목록
          </button>
          <Card className="space-y-2 p-4 text-sm">
            <div className="text-lg font-semibold">{getAsset(t.assetId).nameKo}</div>
            <Row k="시장 상황" v={`DAY ${t.day} · 국면 ${state.cycle}`} />
            <Row k="관련 뉴스" v={t.relatedNews?.length ? t.relatedNews.join(", ") : "당일 관련 뉴스 없음"} />
            <Row k="진입 가격" v={String(t.price)} />
            <Row k="청산 가격" v={t.closePrice != null ? String(t.closePrice) : "미청산"} />
            <Row k="실현 손익" v={t.pnl != null ? formatKrw(t.pnl) : "-"} />
            <Row k="수수료" v={formatKrw(t.fee)} />
            <Row k="투자 이유" v={t.reason ? reasonLabel(t.reason) : "미기록"} />
            <Row k="예상 방향" v={t.expectedDir ?? "-"} />
            <Row k="보유 기간" v={t.closeDay != null ? `${t.closeDay - t.day}일` : "보유 중"} />
            {t.note && <Row k="메모" v={t.note} />}
          </Card>
          <Card className="p-4">
            <Label>복기 질문</Label>
            <ul className="mt-2 space-y-2 text-sm text-white/80">
              {Qs.map((q) => (
                <li key={q}>· {q}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mute">손실이 났다고 판단이 틀린 것은 아니며, 이익이 났다고 판단이 옳았던 것도 아닙니다.</p>
            <button
              disabled={t.reviewed}
              className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-semibold disabled:opacity-40"
              onClick={() => reviewTrade(t.id)}
            >
              {t.reviewed ? "복기 기록됨" : "복기 완료로 표시"}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-mute">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
