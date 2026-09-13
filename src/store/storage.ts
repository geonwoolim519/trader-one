import type { GameState, PlayerMeta } from "../types";

const GAME_KEY = "trader-one-save";
const META_KEY = "trader-one-meta";

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState | null) {
  if (!state) localStorage.removeItem(GAME_KEY);
  else localStorage.setItem(GAME_KEY, JSON.stringify(state));
}

export function defaultMeta(): PlayerMeta {
  return { xp: 0, level: 1, gamesPlayed: 0, bestReturn: 0, tutorialDone: false };
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
