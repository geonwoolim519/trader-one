import { useState, type ReactNode } from "react";
import { CONCEPTS } from "../data/content";
import type { Reliability } from "../types";
import { pnlClass } from "../utils/randomEngine";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`rounded-2xl border border-white/8 bg-card text-left ${onClick ? "active:scale-[0.99] transition" : ""} ${className}`}
    >
      {children}
    </Comp>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] tracking-[0.18em] uppercase text-mute">{children}</div>
  );
}

export function Pct({ n, className = "" }: { n: number; className?: string }) {
  const sign = n > 0 ? "+" : "";
  return (
    <span className={`tabular ${pnlClass(n)} ${className}`}>
      {sign}
      {(n * 100).toFixed(2)}%
    </span>
  );
}

export function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return <div className="h-7 w-16" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 88;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "#ff2a2a" : "#3b82f6";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function ReliabilityBadge({ r }: { r: Reliability }) {
  const map: Record<Reliability, { label: string; cls: string }> = {
    official: { label: "OFFICIAL", cls: "text-up border-up/40 bg-up/10" },
    press: { label: "PRESS", cls: "text-white border-white/20 bg-white/5" },
    analysis: { label: "ANALYSIS", cls: "text-amber-300 border-amber-300/30 bg-amber-300/10" },
    expert: { label: "EXPERT", cls: "text-mute border-white/15 bg-white/5" },
    rumor: { label: "RUMOR", cls: "text-mute border-white/10 bg-transparent" },
  };
  const m = map[r];
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] tracking-[0.14em] ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function InfoTip({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const c = CONCEPTS[id];
  if (!c) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-mute"
        aria-label={`${c.title} 설명`}
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] tracking-[0.18em] text-mute">GLOSSARY</div>
            <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/80">{c.detail}</p>
            <button
              className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function IconHome() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function IconMarket() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
export function IconNews() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M5 5h14v14H5zM8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function IconPort() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12 12 4A8 8 0 0 1 20 12Z" fill="currentColor" opacity=".35" />
    </svg>
  );
}
export function IconTrade() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M7 7h13l-3-3M17 17H4l3 3M4 7h3M17 17h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
export function IconGear() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM4.5 12.8l-1.3-.8.8-1.9 1.5.2a7.7 7.7 0 0 1 1.2-1.2l-.2-1.5 1.9-.8.8 1.3c.4-.1.8-.1 1.2 0l.8-1.3 1.9.8-.2 1.5c.4.3.8.7 1.2 1.2l1.5-.2.8 1.9-1.3.8c.1.4.1.8 0 1.2l1.3.8-.8 1.9-1.5-.2a7.7 7.7 0 0 1-1.2 1.2l.2 1.5-1.9.8-.8-1.3c-.4.1-.8.1-1.2 0l-.8 1.3-1.9-.8.2-1.5a7.7 7.7 0 0 1-1.2-1.2l-1.5.2-.8-1.9 1.3-.8a5 5 0 0 1 0-1.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export const REL_HINT: Record<Reliability, string> = {
  official: "공식 발표",
  press: "주요 언론",
  analysis: "시장 분석",
  expert: "전문가 전망",
  rumor: "루머",
};
