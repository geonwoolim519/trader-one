import { CAUSAL_EDGES, CYCLE_LABEL, CYCLE_NEXT, REGIME_HINT, defaultRegions } from "../data/macro";
import type { CausalityLink, CyclePhase, Factor, GameState, MarketRegime, RegionId } from "../types";
import { rngFor } from "./randomEngine";

export function conditionToCycle(id: string): CyclePhase {
  const map: Record<string, CyclePhase> = {
    bull: "expansion",
    bear: "recession",
    boom: "overheat",
    recession: "recession",
    inflation: "inflation",
    deflation: "slowdown",
    rateUp: "tightening",
    rateDown: "easing",
    highVol: "slowdown",
    lowVol: "expansion",
    fxShock: "tightening",
    oilSpike: "inflation",
    oilCrash: "easing",
    semiBoom: "expansion",
    semiBust: "slowdown",
    tradeWar: "slowdown",
    supplyCrisis: "slowdown",
    geopolitical: "recession",
    calm: "recovery",
    sideways: "recovery",
  };
  return map[id] ?? "recovery";
}

export function stepCycle(state: GameState, shock: Partial<Record<Factor, number>>): CyclePhase {
  const rng = rngFor(state.seed, state.day, 901);
  let cur = state.cycle ?? conditionToCycle(state.condition);
  if ((shock.inflation ?? 0) > 0.015 && rng() < 0.45) return "inflation";
  if ((shock.usRates ?? 0) > 0.02 && rng() < 0.4) return "tightening";
  if ((shock.growth ?? 0) < -0.02 && rng() < 0.45) return "recession";
  if ((shock.usRates ?? 0) < -0.02 && rng() < 0.4) return "easing";
  if ((shock.growth ?? 0) > 0.02 && rng() < 0.35) return "expansion";
  const opts = CYCLE_NEXT[cur] ?? ["recovery"];
  if (rng() < 0.22) return opts[Math.floor(rng() * opts.length) % opts.length];
  return cur;
}

export function stepRegions(state: GameState, shock: Partial<Record<Factor, number>>) {
  const regions = { ...(state.regions ?? defaultRegions()) };
  const bump = (id: RegionId, key: keyof Omit<typeof regions.US, "id" | "phase">, d: number, min: number, max: number) => {
    const r = { ...regions[id] };
    const v = Number(r[key]) + d;
    (r as unknown as Record<string, number>)[key] = Math.max(min, Math.min(max, v));
    regions[id] = r;
  };
  bump("US", "rate", (shock.usRates ?? 0) * 10, 0, 8);
  bump("KR", "rate", (shock.krRates ?? 0) * 10, 0, 6);
  bump("US", "inflation", (shock.inflation ?? 0) * 8, -0.5, 8);
  bump("KR", "inflation", (shock.inflation ?? 0) * 5 + (shock.usd ?? 0) * 3, -0.5, 7);
  bump("CN", "growth", (shock.china ?? 0) * 12, -1, 8);
  bump("EU", "growth", (shock.growth ?? 0) * 6, -1, 5);
  bump("KR", "exports", (shock.koreaExport ?? 0) * 20, -15, 20);
  bump("US", "currency", (shock.usd ?? 0) * 8, -2, 3);
  bump("KR", "risk", (shock.riskOff ?? 0) * 4, 0, 1);
  bump("US", "risk", (shock.riskOff ?? 0) * 3, 0, 1);
  const cycle = state.cycle ?? conditionToCycle(state.condition);
  (Object.keys(regions) as RegionId[]).forEach((id) => {
    regions[id] = { ...regions[id], phase: cycle };
  });
  return regions;
}

export function buildCausality(shock: Partial<Record<Factor, number>>): CausalityLink[] {
  return CAUSAL_EDGES.map((e) => {
    const v = shock[e.from] ?? 0;
    const actual: CausalityLink["actual"] = Math.abs(v) < 0.002 ? "flat" : v > 0 ? "up" : "down";
    return {
      from: e.from,
      to: e.to,
      expected: e.expected,
      actual,
      intensity: Math.min(1, Math.abs(v) * 18),
      note: e.note,
    };
  }).filter((l) => l.intensity > 0.04);
}

export function detectRegime(state: GameState): { id: MarketRegime; label: string; reasons: string[] } {
  const vol = recentVol(state);
  const risk = state.sentiment;
  const inf = state.economy.cpi;
  let id: MarketRegime = "risk_on";
  if (risk < -0.15) id = "risk_off";
  else if (inf > 3.5) id = "inflationary";
  else if (inf < 1.2 && state.economy.gdp < 1.4) id = "deflationary";
  else if (vol > 0.025) id = "high_vol";
  else if (vol < 0.008) id = "low_vol";
  else id = "risk_on";
  const hint = REGIME_HINT[id];
  const extra = [
    `경기 국면: ${CYCLE_LABEL[state.cycle ?? conditionToCycle(state.condition)]}`,
    `가상 변동성(최근 수익률): ${(vol * 100).toFixed(2)}%`,
  ];
  return { id, label: hint.label, reasons: [...hint.reasons, ...extra] };
}

function recentVol(state: GameState) {
  const h = state.valueHistory;
  if (h.length < 4) return 0.01;
  const rets = [];
  for (let i = 1; i < h.length; i++) rets.push((h[i] - h[i - 1]) / h[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(v);
}
