import type { CyclePhase, Factor, MarketRegime, RegionId, RegionState } from "../types";

export const CYCLE_LABEL: Record<CyclePhase, string> = {
  recovery: "경기 회복",
  expansion: "경기 확장",
  overheat: "경기 과열",
  inflation: "인플레이션 심화",
  tightening: "통화긴축",
  slowdown: "경기 둔화",
  recession: "경기침체",
  easing: "통화완화",
  early_recovery: "회복 초기",
};

export const REGION_LABEL: Record<RegionId, string> = {
  US: "미국",
  KR: "한국",
  CN: "중국",
  EU: "유로존",
};

export function defaultRegions(): Record<RegionId, RegionState> {
  return {
    US: { id: "US", phase: "expansion", rate: 4.5, inflation: 2.6, growth: 2.1, currency: 0.2, exports: 1.2, imports: 2.0, risk: 0.3 },
    KR: { id: "KR", phase: "recovery", rate: 3.0, inflation: 2.3, growth: 1.8, currency: -0.1, exports: 3.2, imports: 2.1, risk: 0.35 },
    CN: { id: "CN", phase: "slowdown", rate: 3.2, inflation: 1.4, growth: 4.4, currency: -0.05, exports: 2.8, imports: 1.6, risk: 0.4 },
    EU: { id: "EU", phase: "recovery", rate: 3.4, inflation: 2.2, growth: 1.1, currency: 0.05, exports: 1.5, imports: 1.4, risk: 0.32 },
  };
}

/** Not a fixed sequence — each phase can jump. */
export const CYCLE_NEXT: Record<CyclePhase, CyclePhase[]> = {
  recovery: ["expansion", "slowdown", "early_recovery"],
  expansion: ["overheat", "expansion", "slowdown"],
  overheat: ["inflation", "tightening", "expansion"],
  inflation: ["tightening", "slowdown", "overheat"],
  tightening: ["slowdown", "recession", "inflation"],
  slowdown: ["recession", "easing", "recovery"],
  recession: ["easing", "recession", "early_recovery"],
  easing: ["early_recovery", "recovery", "slowdown"],
  early_recovery: ["recovery", "expansion", "slowdown"],
};

export const CAUSAL_EDGES: {
  from: Factor;
  to: string;
  expected: "up" | "down" | "mixed";
  note: string;
}[] = [
  { from: "usRates", to: "usd", expected: "up", note: "미국 금리 상승은 달러 수요를 키울 수 있습니다." },
  { from: "usd", to: "usdkrw", expected: "up", note: "달러 강세는 원/달러 상승 압력으로 이어질 수 있습니다." },
  { from: "usd", to: "koreaExport", expected: "mixed", note: "원화 약세는 수출 채산성에는 도움이 될 수 있으나 수입 비용을 올립니다." },
  { from: "oil", to: "inflation", expected: "up", note: "유가 상승은 물가 압력과 운송 비용을 키울 수 있습니다." },
  { from: "oil", to: "auto", expected: "down", note: "에너지 비용 상승은 운송·자동차 마진을 압박할 수 있습니다." },
  { from: "usRates", to: "bonds", expected: "down", note: "금리 상승은 기존 고정금리 채권 가격에 하방 압력입니다." },
  { from: "usRates", to: "tech", expected: "down", note: "할인율 상승은 성장주 가치에 부담이 될 수 있습니다." },
  { from: "semi", to: "koreaExport", expected: "up", note: "반도체 수요는 한국 수출과 직결됩니다." },
  { from: "china", to: "copper", expected: "up", note: "중국 경기는 산업금속 수요의 핵심 변수입니다." },
  { from: "growth", to: "consumption", expected: "up", note: "성장 회복은 소비와 기업 실적 기대로 이어질 수 있습니다." },
  { from: "riskOff", to: "gold", expected: "up", note: "위험회피는 금·국채 같은 방어 자산 수요를 자극합니다." },
  { from: "trade", to: "supplyChain", expected: "mixed", note: "무역 환경 변화는 공급망과 수출 경로를 동시에 흔듭니다." },
];

export const REGIME_HINT: Record<MarketRegime, { label: string; reasons: string[] }> = {
  risk_on: { label: "RISK-ON", reasons: ["위험선호가 상대적으로 높습니다", "성장·위험자산 민감도가 살아 있습니다"] },
  risk_off: { label: "RISK-OFF", reasons: ["글로벌 위험회피도가 상승했습니다", "안전자산 선호가 확대될 수 있습니다"] },
  inflationary: { label: "INFLATIONARY", reasons: ["물가 압력이 지표에 나타나 있습니다", "금리 부담 재료가 남아 있을 수 있습니다"] },
  deflationary: { label: "DEFLATIONARY", reasons: ["물가·수요 둔화 신호가 있습니다", "성장 민감 자산의 눈높이가 낮아질 수 있습니다"] },
  high_vol: { label: "HIGH VOLATILITY", reasons: ["가격 변동 폭이 큰 구간입니다", "체결 가격과 예상 가격의 차이가 커질 수 있습니다"] },
  low_vol: { label: "LOW VOLATILITY", reasons: ["변동성이 상대적으로 낮습니다", "재료 없는 횡보 가능성이 있습니다"] },
};
