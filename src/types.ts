export type AssetCategory = "stock" | "etf" | "commodity" | "fx" | "bond";
export type QuoteCurrency = "KRW" | "USD";
export type Difficulty = "easy" | "normal" | "hard" | "expert";
export type GameMode = "quick" | "standard" | "long" | "scenario" | "tutorial";
export type Reliability = "official" | "press" | "analysis" | "expert" | "rumor";
export type TradeSide = "buy" | "sell";
export type ScreenPhase = "playing" | "settling" | "ended";
export type Factor =
  | "usRates"
  | "krRates"
  | "usd"
  | "jpy"
  | "eur"
  | "oil"
  | "gold"
  | "copper"
  | "semi"
  | "ai"
  | "china"
  | "trade"
  | "growth"
  | "inflation"
  | "riskOff"
  | "geopolitics"
  | "koreaExport"
  | "consumption"
  | "tech"
  | "auto"
  | "bonds"
  | "supplyChain";

export type TradeReason =
  | "macro"
  | "earnings"
  | "dip"
  | "news"
  | "relative"
  | "gut";

export type MarketConditionId =
  | "bull"
  | "bear"
  | "sideways"
  | "highVol"
  | "lowVol"
  | "rateUp"
  | "rateDown"
  | "inflation"
  | "deflation"
  | "boom"
  | "recession"
  | "fxShock"
  | "oilSpike"
  | "oilCrash"
  | "semiBoom"
  | "semiBust"
  | "tradeWar"
  | "supplyCrisis"
  | "geopolitical"
  | "calm";

export interface Sensitivity {
  usRates: number;
  krRates: number;
  usd: number;
  jpy: number;
  eur: number;
  oil: number;
  gold: number;
  copper: number;
  semi: number;
  ai: number;
  china: number;
  trade: number;
  growth: number;
  inflation: number;
  riskOff: number;
  geopolitics: number;
  koreaExport: number;
  consumption: number;
  tech: number;
  auto: number;
  bonds: number;
  supplyChain: number;
}

export interface PricePoint {
  day: number;
  price: number;
  volume: number;
}

export interface AssetDef {
  id: string;
  ticker: string;
  name: string;
  nameKo: string;
  category: AssetCategory;
  currency: QuoteCurrency;
  startPrice: number;
  volatility: number;
  baseTrend: number;
  beta: number;
  maxMove: number;
  lot: number;
  baseVolume: number;
  sensitivity: Sensitivity;
  tags: string[];
}

export interface AssetState {
  id: string;
  price: number;
  prevPrice: number;
  volume: number;
  history: PricePoint[];
  intraday: number[];
}

export interface Holding {
  qty: number;
  avgCostKrw: number;
}

export interface EventDef {
  id: string;
  title: string;
  headline: string;
  description: string;
  category: string;
  reliability: Reliability;
  expected: Partial<Record<Factor, number>>;
  surprise: number;
  related: string[];
  why: Partial<Record<Factor, string>>;
  concepts: string[];
  region?: RegionId | "GLOBAL";
  industry?: string;
  indirect?: string[];
  duration?: number;
  intensity?: number;
  lesson?: string;
}

export interface PendingNews {
  id: string;
  eventId: string;
  day: number;
  time: string;
  reliability: Reliability;
  title: string;
  headline: string;
  description: string;
  related: string[];
  expected: Partial<Record<Factor, number>>;
  actual: Partial<Record<Factor, number>>;
  pricedInNote?: string;
  special?: boolean;
}

export interface MoverWhy {
  assetId: string;
  changePct: number;
  reason: string;
}

export interface DayReport {
  day: number;
  news: PendingNews[];
  movers: MoverWhy[];
  portfolioBefore: number;
  portfolioAfter: number;
  dailyReturn: number;
}

export interface Trade {
  id: string;
  day: number;
  assetId: string;
  side: TradeSide;
  qty: number;
  price: number;
  krwAmount: number;
  fee: number;
  reason?: TradeReason;
  relatedNews?: string[];
  closeDay?: number;
  closePrice?: number;
  pnl?: number;
  orderType?: OrderType;
  expectedDir?: "up" | "down" | "range";
  horizon?: "day" | "swing" | "position";
  riskNote?: "low" | "mid" | "high";
  confidence?: number;
  reviewed?: boolean;
  note?: string;
}

export type OrderType = "market" | "limit" | "stop_loss" | "take_profit" | "scheduled";
export type OrderStatus = "open" | "filled" | "cancelled" | "expired";

export interface Order {
  id: string;
  assetId: string;
  type: OrderType;
  side: TradeSide;
  qty: number;
  limitPrice?: number;
  triggerPrice?: number;
  activateDay?: number;
  expireDay: number;
  createdDay: number;
  status: OrderStatus;
  reservedKrw: number;
  fillPrice?: number;
  fillDay?: number;
  slippage?: number;
  reason?: TradeReason;
  expectedDir?: "up" | "down" | "range";
  horizon?: "day" | "swing" | "position";
  riskNote?: "low" | "mid" | "high";
  confidence?: number;
  note?: string;
}

export type CyclePhase =
  | "recovery"
  | "expansion"
  | "overheat"
  | "inflation"
  | "tightening"
  | "slowdown"
  | "recession"
  | "easing"
  | "early_recovery";

export type RegionId = "US" | "KR" | "CN" | "EU";

export interface RegionState {
  id: RegionId;
  phase: CyclePhase;
  rate: number;
  inflation: number;
  growth: number;
  currency: number;
  exports: number;
  imports: number;
  risk: number;
}

export interface CausalityLink {
  from: string;
  to: string;
  expected: "up" | "down" | "mixed";
  actual: "up" | "down" | "flat";
  intensity: number;
  note: string;
}

export type MarketRegime = "risk_on" | "risk_off" | "inflationary" | "deflationary" | "high_vol" | "low_vol";

export interface MissionDef {
  id: string;
  title: string;
  detail: string;
  xp: number;
}

export interface MissionProgress {
  id: string;
  done: boolean;
  claimed: boolean;
}

export interface Economy {
  gdp: number;
  cpi: number;
  usRate: number;
  krRate: number;
  unemployment: number;
  pmi: number;
  exports: number;
  imports: number;
  tradeBalance: number;
  csi: number;
}

export interface PlayerMeta {
  xp: number;
  level: number;
  gamesPlayed: number;
  bestReturn: number;
  tutorialDone: boolean;
  careerRank: number;
  careerDone: string[];
  achievements: string[];
  watchlist: string[];
  scenariosCompleted: string[];
  learningDone: string[];
  journalReviews: number;
  newsRead: number;
  compared: boolean;
  limitFills: number;
}

export interface GameState {
  version: 1 | 2;
  seed: number;
  mode: GameMode;
  difficulty: Difficulty;
  scenarioId?: string;
  day: number;
  totalDays: number;
  cash: number;
  assets: Record<string, AssetState>;
  holdings: Record<string, Holding>;
  pendingNews: PendingNews[];
  newsLog: PendingNews[];
  dayReports: DayReport[];
  trades: Trade[];
  economy: Economy;
  sentiment: number;
  condition: MarketConditionId;
  cyclePhase: number;
  pricedIn: Partial<Record<Factor, number>>;
  peakValue: number;
  mdd: number;
  valueHistory: number[];
  missions: MissionProgress[];
  phase: ScreenPhase;
  lastReport?: DayReport;
  learned: string[];
  toast?: string;
  xpGranted?: boolean;
  regions: Record<RegionId, RegionState>;
  cycle: CyclePhase;
  openOrders: Order[];
  reservedBuyKrw: number;
  causality: CausalityLink[];
  challengeDone: string[];
  newsOpened: string[];
}

export const FEE_RATE = 0.001;
export const INITIAL_CASH = 10_000_000;

export const FACTORS: Factor[] = [
  "usRates",
  "krRates",
  "usd",
  "jpy",
  "eur",
  "oil",
  "gold",
  "copper",
  "semi",
  "ai",
  "china",
  "trade",
  "growth",
  "inflation",
  "riskOff",
  "geopolitics",
  "koreaExport",
  "consumption",
  "tech",
  "auto",
  "bonds",
  "supplyChain",
];

export const TRADE_REASONS: { id: TradeReason; label: string }[] = [
  { id: "macro", label: "경제지표가 개선될 것 같다" },
  { id: "earnings", label: "기업 실적이 좋아질 것 같다" },
  { id: "dip", label: "가격이 너무 많이 떨어졌다" },
  { id: "news", label: "뉴스가 긍정적이다" },
  { id: "relative", label: "다른 자산보다 매력적이다" },
  { id: "gut", label: "그냥 직감이다" },
];
