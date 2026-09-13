import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ASSETS, getAsset } from "../data/assets";
import { CONDITIONS } from "../data/scenarios";
import { useGame } from "../store/GameProvider";
import { changePct } from "../utils/priceEngine";
import { totalValue } from "../utils/portfolioCalculator";
import { formatKrw, formatPct, formatPrice, pnlClass } from "../utils/randomEngine";
import { IconGear, IconHome, IconMarket, IconNews, IconPort, IconTrade, Label } from "./ui";

const NAV = [
  { to: "/play", label: "HOME", icon: IconHome, end: true },
  { to: "/play/market", label: "MARKET", icon: IconMarket },
  { to: "/play/news", label: "NEWS", icon: IconNews },
  { to: "/play/portfolio", label: "PORTFOLIO", icon: IconPort },
  { to: "/play/trade", label: "TRADE", icon: IconTrade },
];

export function Layout() {
  const { state, ready } = useGame();
  if (!ready || !state) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-mute">
        LOADING MARKET…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <Ticker />
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-white/8 px-4 py-6 lg:flex">
          <Brand />
          <nav className="mt-8 space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm tracking-wide ${
                    isActive ? "bg-white/10 text-white" : "text-mute hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <n.icon />
                {n.label}
              </NavLink>
            ))}
            <NavLink
              to="/play/result"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  isActive ? "bg-white/10 text-white" : "text-mute hover:text-white"
                }`
              }
            >
              RESULT
            </NavLink>
          </nav>
          <div className="mt-auto space-y-3 text-xs text-mute">
            <div>
              DAY {state.day} / {state.totalDays}
            </div>
            <div className="tabular text-white">{formatKrw(totalValue(state))}</div>
            <div>{CONDITIONS[state.condition].label}</div>
            <NavLink to="/play/settings" className="inline-flex items-center gap-2 text-mute hover:text-white">
              <IconGear /> SETTINGS
            </NavLink>
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">
          <Header />
          <div className="px-4 py-4 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <DayModal />
      <Toast />
      <p className="px-4 pb-28 text-center text-[10px] leading-4 text-white/30 lg:pb-6">
        TRADER ONE is a fictional market simulation for educational and entertainment purposes.
      </p>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-9 w-9 rounded-xl" />
      <div>
        <div className="text-sm font-semibold tracking-[0.18em]">TRADER ONE</div>
        <div className="text-[10px] tracking-widest text-mute">TRADE. THINK. DECIDE.</div>
      </div>
    </div>
  );
}

function Header() {
  const { state } = useGame();
  const nav = useNavigate();
  if (!state) return null;
  const v = totalValue(state);
  const prev = state.valueHistory.at(-2) ?? v;
  const ch = (v - prev) / (prev || 1);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-black/85 px-4 py-3 backdrop-blur lg:hidden">
      <button onClick={() => nav("/play")} className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-8 w-8 rounded-lg" />
        <div>
          <div className="text-xs tracking-[0.2em]">TRADER ONE</div>
          <div className="text-[10px] text-mute">
            DAY {state.day}/{state.totalDays}
          </div>
        </div>
      </button>
      <div className="text-right">
        <div className="tabular text-sm font-medium">{formatKrw(v, true)}</div>
        <div className={`text-[11px] tabular ${pnlClass(ch)}`}>{formatPct(ch)}</div>
      </div>
      <button onClick={() => nav("/play/settings")} className="text-mute">
        <IconGear />
      </button>
    </header>
  );
}

function Ticker() {
  const { state } = useGame();
  if (!state) return null;
  const row = [...ASSETS, ...ASSETS].map((a, i) => {
    const st = state.assets[a.id];
    const ch = changePct(st);
    return (
      <span key={`${a.id}-${i}`} className="mx-6 inline-flex items-center gap-2 text-xs">
        <span className="text-mute">{a.ticker}</span>
        <span className="tabular">{formatPrice(st.price, a.currency, a.id)}</span>
        <span className={`tabular ${pnlClass(ch)}`}>{formatPct(ch)}</span>
      </span>
    );
  });
  return (
    <div className="hidden overflow-hidden border-b border-white/8 bg-[#080808] py-2 lg:block">
      <div className="ticker flex w-max whitespace-nowrap">{row}</div>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wider ${
                isActive ? "text-white" : "text-mute"
              }`
            }
          >
            <n.icon />
            {n.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function DayModal() {
  const { state, ackDay } = useGame();
  const nav = useNavigate();
  if (!state || state.phase !== "settling" || !state.lastReport) return null;
  const r = state.lastReport;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
        <Label>TODAY'S MARKET · DAY {r.day}</Label>
        <div className={`mt-2 text-2xl font-semibold tabular ${pnlClass(r.dailyReturn)}`}>
          {formatPct(r.dailyReturn)}
        </div>
        <div className="text-sm text-mute">
          {formatKrw(r.portfolioBefore)} → {formatKrw(r.portfolioAfter)}
        </div>
        <div className="mt-5 space-y-3">
          {r.movers.slice(0, 5).map((m) => {
            const a = getAsset(m.assetId);
            return (
              <div key={m.assetId} className="rounded-xl border border-white/8 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.nameKo}</div>
                  <div className={`tabular ${pnlClass(m.changePct)}`}>{formatPct(m.changePct)}</div>
                </div>
                <div className="mt-1 text-[11px] tracking-widest text-brand">WHY?</div>
                <p className="mt-1 text-sm leading-5 text-white/75">{m.reason}</p>
              </div>
            );
          })}
        </div>
        <button
          className="mt-5 w-full rounded-xl bg-brand py-3.5 text-sm font-semibold"
          onClick={() => {
            const ended = r.day >= state.totalDays;
            ackDay();
            if (ended) nav("/play/result");
          }}
        >
          {r.day >= state.totalDays ? "MARKET CLOSED" : "CONTINUE"}
        </button>
      </div>
    </div>
  );
}

function Toast() {
  const { state } = useGame();
  if (!state?.toast) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-[#111] px-4 py-2 text-sm shadow-xl lg:bottom-8">
      {state.toast}
    </div>
  );
}
