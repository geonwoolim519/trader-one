import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { levelFromXp } from "../data/content";
import type { Difficulty, GameMode, GameState, PlayerMeta, TradeReason } from "../types";
import { INITIAL_CASH } from "../types";
import { acknowledgeDay, advanceDay, createGame, executeTrade } from "../utils/gameEngine";
import { missionXp } from "../utils/performanceCalculator";
import { totalValue } from "../utils/portfolioCalculator";
import { loadGame, loadMeta, saveGame, saveMeta, clearAll } from "./storage";

interface StartOpts {
  mode: GameMode;
  difficulty: Difficulty;
  scenarioId?: string;
}

interface GameCtx {
  ready: boolean;
  state: GameState | null;
  meta: PlayerMeta;
  start: (opts: StartOpts) => GameState;
  trade: (assetId: string, side: "buy" | "sell", qty: number, reason?: TradeReason) => void;
  nextDay: () => void;
  ackDay: () => void;
  resetGame: () => void;
  resetAll: () => void;
  clearToast: () => void;
  markTutorial: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready] = useState(true);
  const [state, setState] = useState<GameState | null>(() => loadGame());
  const [meta, setMeta] = useState<PlayerMeta>(() => loadMeta());
  const xpLock = useRef(false);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    saveMeta(meta);
  }, [meta]);

  useEffect(() => {
    if (!state?.toast) return;
    const t = setTimeout(() => setState((s) => (s ? { ...s, toast: undefined } : s)), 2400);
    return () => clearTimeout(t);
  }, [state?.toast]);

  const start = useCallback((opts: StartOpts) => {
    const g = createGame(opts);
    xpLock.current = false;
    setState(g);
    return g;
  }, []);

  const trade = useCallback((assetId: string, side: "buy" | "sell", qty: number, reason?: TradeReason) => {
    setState((s) => (s ? executeTrade(s, { assetId, side, qty, reason }) : s));
  }, []);

  const nextDay = useCallback(() => {
    setState((s) => (s ? advanceDay(s) : s));
  }, []);

  const ackDay = useCallback(() => {
    setState((s) => (s ? acknowledgeDay(s) : s));
  }, []);

  useEffect(() => {
    if (!state || state.phase !== "ended" || state.xpGranted || xpLock.current) return;
    xpLock.current = true;
    const ret = (totalValue(state) - INITIAL_CASH) / INITIAL_CASH;
    const xp = 200 + missionXp(state) + (ret > 0 ? 120 : 40) + (state.mdd > -0.1 ? 80 : 0);
    setState((s) => (s ? { ...s, xpGranted: true } : s));
    setMeta((m) => {
      const xp2 = m.xp + xp;
      return {
        ...m,
        xp: xp2,
        level: levelFromXp(xp2).level,
        gamesPlayed: m.gamesPlayed + 1,
        bestReturn: Math.max(m.bestReturn, ret),
      };
    });
  }, [state]);

  const resetGame = useCallback(() => setState(null), []);

  const resetAll = useCallback(() => {
    clearAll();
    setState(null);
    setMeta(loadMeta());
  }, []);

  const clearToast = useCallback(() => setState((s) => (s ? { ...s, toast: undefined } : s)), []);
  const markTutorial = useCallback(() => setMeta((m) => ({ ...m, tutorialDone: true })), []);

  const value = useMemo(
    () => ({
      ready,
      state,
      meta,
      start,
      trade,
      nextDay,
      ackDay,
      resetGame,
      resetAll,
      clearToast,
      markTutorial,
    }),
    [ready, state, meta, start, trade, nextDay, ackDay, resetGame, resetAll, clearToast, markTutorial],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame");
  return ctx;
}
