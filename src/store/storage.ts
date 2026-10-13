import { defaultRegions } from "../data/macro";
import { ASSETS } from "../data/assets";
import type { GameState, PlayerMeta } from "../types";
import { conditionToCycle } from "../utils/macroEngine";
import { makeHistory } from "../utils/priceEngine";

const GAME_KEY = "trader-one-save";
const META_KEY = "trader-one-meta";
const BACKUP_KEY = "trader-one-save-backup";

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number } & Partial<GameState>;
    const migrated = migrateGame(parsed);
    if (!migrated) {
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, raw);
      return null;
    }
    return migrated;
  } catch {
    return null;
  }
}

export function migrateGame(parsed: Partial<Omit<GameState, "version">> & { version?: number }): GameState | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.version !== 1 && parsed.version !== 2) return null;
  if (parsed.cash == null || !parsed.assets || parsed.day == null) return null;
  try {
    const seed = parsed.seed ?? 1;
    const fresh = makeHistory(seed);
    const assets = { ...fresh, ...parsed.assets };
    for (const a of ASSETS) {
      if (!assets[a.id]) assets[a.id] = fresh[a.id];
    }
    const condition = parsed.condition ?? "sideways";
    const next: GameState = {
      version: 2,
      seed,
      mode: parsed.mode ?? "standard",
      difficulty: parsed.difficulty ?? "normal",
      scenarioId: parsed.scenarioId,
      day: parsed.day,
      totalDays: parsed.totalDays ?? 30,
      cash: Math.max(0, parsed.cash),
      assets,
      holdings: parsed.holdings ?? {},
      pendingNews: parsed.pendingNews ?? [],
      newsLog: parsed.newsLog ?? [],
      dayReports: parsed.dayReports ?? [],
      trades: parsed.trades ?? [],
      economy: parsed.economy ?? {
        gdp: 2.1,
        cpi: 2.4,
        usRate: 4.5,
        krRate: 3.0,
        unemployment: 3.6,
        pmi: 50.8,
        exports: 3.2,
        imports: 2.1,
        tradeBalance: 1.8,
        csi: 98,
      },
      sentiment: parsed.sentiment ?? 0,
      condition,
      cyclePhase: parsed.cyclePhase ?? 0,
      pricedIn: parsed.pricedIn ?? {},
      peakValue: parsed.peakValue ?? parsed.cash,
      mdd: parsed.mdd ?? 0,
      valueHistory: parsed.valueHistory?.length ? parsed.valueHistory : [parsed.cash],
      missions: parsed.missions ?? [],
      phase: parsed.phase ?? "playing",
      lastReport: parsed.lastReport,
      learned: parsed.learned ?? [],
      toast: undefined,
      xpGranted: parsed.xpGranted,
      regions: parsed.regions ?? defaultRegions(),
      cycle: parsed.cycle ?? conditionToCycle(condition),
      openOrders: parsed.openOrders ?? [],
      reservedBuyKrw: Math.max(0, parsed.reservedBuyKrw ?? 0),
      causality: parsed.causality ?? [],
      challengeDone: parsed.challengeDone ?? [],
      newsOpened: parsed.newsOpened ?? [],
    };
    for (const [id, h] of Object.entries(next.holdings)) {
      if (!h || h.qty < 0) delete next.holdings[id];
    }
    if (next.cash < 0) next.cash = 0;
    return next;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState | null) {
  if (!state) localStorage.removeItem(GAME_KEY);
  else localStorage.setItem(GAME_KEY, JSON.stringify(state));
}

export function defaultMeta(): PlayerMeta {
  return {
    xp: 0,
    level: 1,
    gamesPlayed: 0,
    bestReturn: 0,
    tutorialDone: false,
    careerRank: 1,
    careerDone: [],
    achievements: [],
    watchlist: [],
    scenariosCompleted: [],
    learningDone: [],
    journalReviews: 0,
    newsRead: 0,
    compared: false,
    limitFills: 0,
  };
}

export function loadMeta(): PlayerMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaultMeta();
    return { ...defaultMeta(), ...JSON.parse(raw) };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: PlayerMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function clearAll() {
  localStorage.removeItem(GAME_KEY);
  localStorage.removeItem(META_KEY);
}
