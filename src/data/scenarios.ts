import type { MarketConditionId } from "../types";

export interface ScenarioDef {
  id: string;
  code: string;
  name: string;
  title: string;
  description: string;
  days: number;
  condition: MarketConditionId;
  bias: string[];
  intro: string;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "rate_hike_era",
    code: "01",
    name: "금리 인상 시대",
    title: "RATE HIKE ERA",
    description: "금리가 오르는 국면에서 성장주와 채권, 현금 비중을 어떻게 나눌지 시험합니다.",
    days: 30,
    condition: "rateUp",
    bias: ["us_hike", "kr_hike", "cpi_hot", "usd_strong", "hold_rates", "earn_shock"],
    intro: "인플레이션을 잡기 위한 금리 인상이 이어집니다. 할인율 상승이 자산 가격을 압박할 수 있습니다.",
  },
  {
    id: "inflation_shock",
    code: "02",
    name: "인플레이션 쇼크",
    title: "INFLATION SHOCK",
    description: "물가가 급등합니다. 원자재, 금리, 실질구매력의 충돌을 경험합니다.",
    days: 30,
    condition: "inflation",
    bias: ["cpi_hot", "oil_spike", "us_hike", "gold_up", "consume_down", "supply_break"],
    intro: "물가가 예상보다 빠르게 오릅니다. 명목 수익과 실질 구매력을 구분해 보세요.",
  },
  {
    id: "semi_cycle",
    code: "03",
    name: "반도체 슈퍼사이클",
    title: "SEMI SUPERCYCLE",
    description: "AI와 반도체 수요가 폭증하는 구간입니다. 과열과 조정을 함께 만납니다.",
    days: 30,
    condition: "semiBoom",
    bias: ["ai_boom", "semi_demand", "semi_beat", "semi_shortage", "capex", "earn_surprise"],
    intro: "AI 투자 사이클이 반도체를 끌어올립니다. 좋은 뉴스만 있는 것은 아닙니다.",
  },
  {
    id: "recession",
    code: "04",
    name: "글로벌 경기침체",
    title: "GLOBAL RECESSION",
    description: "세계 경제가 빠르게 둔화됩니다. 방어 자산과 현금의 가치를 확인합니다.",
    days: 30,
    condition: "recession",
    bias: ["recession", "us_recession", "consume_down", "oil_crash", "us_cut", "flight_safety"],
    intro: "성장이 꺾이는 구간입니다. 손실을 줄이는 것도 실력입니다.",
  },
  {
    id: "trade_war",
    code: "05",
    name: "무역전쟁",
    title: "TRADE WAR",
    description: "미국과 중국의 무역 갈등이 심화됩니다. 공급망과 환율이 핵심입니다.",
    days: 30,
    condition: "tradeWar",
    bias: ["tariff_up", "trade_war", "import_ban", "cn_export_down", "won_weak", "supply_break"],
    intro: "관세와 규제가 기업 실적의 앞길을 가릅니다. 수출 민감도를 보세요.",
  },
  {
    id: "oil_shock",
    code: "06",
    name: "유가 쇼크",
    title: "OIL SHOCK",
    description: "국제유가가 급등합니다. 인플레이션과 운송·자동차 비용을 연결해 보세요.",
    days: 30,
    condition: "oilSpike",
    bias: ["oil_spike", "cpi_hot", "tension_up", "supply_break", "consume_down", "gold_up"],
    intro: "에너지 가격이 모든 비용의 출발점입니다. 누가 이기고 누가 질까요?",
  },
  {
    id: "fx_crisis",
    code: "07",
    name: "환율 위기",
    title: "FX STRESS",
    description: "원/달러 환율이 크게 흔들립니다. 달러 자산과 수출주의 다른 반응을 관찰하세요.",
    days: 30,
    condition: "fxShock",
    bias: ["won_weak", "usd_strong", "us_hike", "jpy_spike", "kr_hike", "cn_export_down"],
    intro: "환율은 주식과 채권을 잇는 다리입니다. 원화 약세의 양면을 경험합니다.",
  },
  {
    id: "tech_bubble",
    code: "08",
    name: "테크 버블",
    title: "TECH BUBBLE",
    description: "기술주가 급등하지만 과열 우려가 커집니다. 언제 내려놓을지가 핵심입니다.",
    days: 30,
    condition: "bull",
    bias: ["euphoria", "ai_boom", "earn_surprise", "product_launch", "cpi_hot", "us_hike"],
    intro: "가격이 먼저 달립니다. 뉴스보다 기대가 앞설 때 버블이 자랍니다.",
  },
  {
    id: "financial_crisis",
    code: "09",
    name: "금융위기",
    title: "FINANCIAL CRISIS",
    description: "주식시장이 급락하고 안전자산 선호가 커집니다. 생존이 목표입니다.",
    days: 30,
    condition: "bear",
    bias: ["black_swan", "bank_fail", "recession", "flight_safety", "usd_strong", "gold_up"],
    intro: "가장 어려운 장입니다. 현금, 금, 국채의 역할을 직접 느껴 보세요.",
  },
  {
    id: "golden_time",
    code: "10",
    name: "골든 타임",
    title: "GOLDEN TIME",
    description: "여러 경제지표가 동시에 개선되며 글로벌 증시가 상승합니다.",
    days: 30,
    condition: "boom",
    bias: ["boom", "kr_recovery", "consume_up", "semi_demand", "fta", "cpi_cool"],
    intro: "좋은 뉴스가 겹칩니다. 그래도 분산과 과열을 잊지 마세요.",
  },
];

export const CONDITIONS: Record<
  MarketConditionId,
  { label: string; vol: number; trend: number; sentiment: number; factors: Partial<Record<string, number>> }
> = {
  bull: { label: "강세장", vol: 1, trend: 0.0012, sentiment: 0.35, factors: { growth: 0.01, riskOff: -0.01 } },
  bear: { label: "약세장", vol: 1.35, trend: -0.0014, sentiment: -0.4, factors: { growth: -0.012, riskOff: 0.016 } },
  sideways: { label: "횡보장", vol: 0.85, trend: 0.0001, sentiment: 0.05, factors: {} },
  highVol: { label: "고변동성", vol: 1.7, trend: 0, sentiment: -0.1, factors: { riskOff: 0.008 } },
  lowVol: { label: "저변동성", vol: 0.65, trend: 0.0003, sentiment: 0.15, factors: {} },
  rateUp: { label: "금리 상승", vol: 1.15, trend: -0.0004, sentiment: -0.15, factors: { usRates: 0.012 } },
  rateDown: { label: "금리 하락", vol: 1.05, trend: 0.0008, sentiment: 0.2, factors: { usRates: -0.01 } },
  inflation: { label: "인플레이션", vol: 1.2, trend: -0.0002, sentiment: -0.1, factors: { inflation: 0.012, oil: 0.008 } },
  deflation: { label: "디플레이션 우려", vol: 1.1, trend: -0.0006, sentiment: -0.2, factors: { inflation: -0.01, growth: -0.008 } },
  boom: { label: "경기 호황", vol: 0.95, trend: 0.0014, sentiment: 0.4, factors: { growth: 0.012, consumption: 0.008 } },
  recession: { label: "경기 침체", vol: 1.4, trend: -0.0016, sentiment: -0.45, factors: { growth: -0.014, riskOff: 0.018 } },
  fxShock: { label: "환율 급변", vol: 1.25, trend: 0, sentiment: -0.15, factors: { usd: 0.012 } },
  oilSpike: { label: "유가 급등", vol: 1.2, trend: -0.0003, sentiment: -0.12, factors: { oil: 0.016, inflation: 0.008 } },
  oilCrash: { label: "유가 급락", vol: 1.15, trend: 0.0002, sentiment: 0.05, factors: { oil: -0.014 } },
  semiBoom: { label: "반도체 호황", vol: 1.15, trend: 0.001, sentiment: 0.3, factors: { semi: 0.014, ai: 0.012 } },
  semiBust: { label: "반도체 침체", vol: 1.2, trend: -0.0008, sentiment: -0.2, factors: { semi: -0.014 } },
  tradeWar: { label: "무역전쟁", vol: 1.3, trend: -0.0007, sentiment: -0.25, factors: { trade: -0.012, china: -0.01 } },
  supplyCrisis: { label: "공급망 위기", vol: 1.25, trend: -0.0005, sentiment: -0.2, factors: { supplyChain: -0.014 } },
  geopolitical: { label: "지정학적 위기", vol: 1.45, trend: -0.0008, sentiment: -0.3, factors: { geopolitics: 0.016, riskOff: 0.014 } },
  calm: { label: "금융시장 안정", vol: 0.7, trend: 0.0004, sentiment: 0.2, factors: { riskOff: -0.008 } },
};

export const CONDITION_IDS = Object.keys(CONDITIONS) as MarketConditionId[];

export const LONG_CYCLE: MarketConditionId[] = [
  "boom",
  "inflation",
  "rateUp",
  "recession",
  "rateDown",
  "bull",
];
