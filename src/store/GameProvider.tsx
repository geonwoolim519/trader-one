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
import { mergeAchievements } from "../data/achievements";
import { CAREER_RANKS } from "../data/career";
import { challengeKey, dailyChallenges } from "../data/challenges";
import { levelFromXp } from "../data/content";
import type { Difficulty, GameMode, GameState, PlayerMeta } from "../types";
import { INITIAL_CASH } from "../types";
import {
  acknowledgeDay,
  advanceDay,
  createGame,
  markChallengeFlag,
  markNewsOpened,
  reviewTrade as reviewTradeState,
} from "../utils/gameEngine";
import { cancelOrder, placeOrder, type PlaceOrderOpts } from "../utils/orderEngine";
import { missionXp } from "../utils/performanceCalculator";
import { totalValue } from "../utils/portfolioCalculator";
import { executeTrade, type TradeExtra } from "../utils/tradeEngine";
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
  trade: (assetId: string, side: "buy" | "sell", qty: number, extra?: Omit<TradeExtra, "assetId" | "side" | "qty">) => void;
  place: (opts: PlaceOrderOpts) => void;
  cancel: (id: string) => void;
  nextDay: () => void;
  ackDay: () => void;
  resetGame: () => void;
  resetAll: () => void;
  clearToast: () => void;
  markTutorial: () => void;
  toggleWatch: (assetId: string) => void;
  openNews: (id: string) => void;
  markCompared: () => void;
  reviewTrade: (id: string) => void;
  claimChallenge: (id: string) => void;
  completeCareer: (taskId: string) => void;
  completeLesson: (id: string) => void;
  flag: (key: string) => void;
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

  useEffect(() => {
    if (!state) return;
    setMeta((m) => mergeAchievements(state, m));
  }, [state]);

  const start = useCallback((opts: StartOpts) => {
    const g = createGame(opts);
    xpLock.current = false;
    setState(g);
    return g;
  }, []);

  const trade = useCallback(
    (assetId: string, side: "buy" | "sell", qty: number, extra?: Omit<TradeExtra, "assetId" | "side" | "qty">) => {
      setState((s) => (s ? executeTrade(s, { assetId, side, qty, ...extra }) : s));
    },
    [],
  );

  const place = useCallback((opts: PlaceOrderOpts) => {
    setState((s) => (s ? placeOrder(s, opts) : s));
  }, []);

  const cancel = useCallback((id: string) => {
    setState((s) => (s ? cancelOrder(s, id) : s));
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
    const limitFills = state.trades.filter((t) => t.orderType === "limit").length;
    setState((s) => (s ? { ...s, xpGranted: true } : s));
    setMeta((m) => {
      const xp2 = m.xp + xp;
      const scenariosCompleted =
        state.scenarioId && !m.scenariosCompleted.includes(state.scenarioId)
          ? [...m.scenariosCompleted, state.scenarioId]
          : m.scenariosCompleted;
      return mergeAchievements(state, {
        ...m,
        xp: xp2,
        level: levelFromXp(xp2).level,
        gamesPlayed: m.gamesPlayed + 1,
        bestReturn: Math.max(m.bestReturn, ret),
        scenariosCompleted,
        limitFills: m.limitFills + limitFills,
      });
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

  const toggleWatch = useCallback((assetId: string) => {
    setMeta((m) => {
      const has = m.watchlist.includes(assetId);
      return { ...m, watchlist: has ? m.watchlist.filter((id) => id !== assetId) : [...m.watchlist, assetId] };
    });
  }, []);

  const openNews = useCallback((id: string) => {
    setState((s) => {
      if (!s) return s;
      if ((s.newsOpened ?? []).includes(id)) return s;
      setMeta((m) => ({ ...m, newsRead: m.newsRead + 1 }));
      return markNewsOpened(s, id);
    });
  }, []);

  const markCompared = useCallback(() => {
    setMeta((m) => ({ ...m, compared: true }));
    setState((s) => (s ? markChallengeFlag(s, `d${s.day}:compare3`) : s));
  }, []);

  const reviewTrade = useCallback((id: string) => {
    setState((s) => (s ? reviewTradeState(s, id) : s));
    setMeta((m) => ({ ...m, journalReviews: m.journalReviews + 1 }));
  }, []);

  const claimChallenge = useCallback((id: string) => {
    setState((s) => {
      if (!s) return s;
      const key = challengeKey(s.day, id);
      if (s.challengeDone.includes(key)) return { ...s, toast: "이미 받은 과제입니다." };
      const def = dailyChallenges(s.day).find((c) => c.id === id);
      if (!def || !def.check(s, meta)) return { ...s, toast: "아직 조건을 충족하지 않았습니다." };
      setMeta((m) => {
        const xp2 = m.xp + def.xp;
        return { ...m, xp: xp2, level: levelFromXp(xp2).level };
      });
      return { ...s, challengeDone: [...s.challengeDone, key], toast: `과제 완료 · +${def.xp} XP` };
    });
  }, [meta]);

  const completeCareer = useCallback((taskId: string) => {
    setState((s) => {
      if (!s) return s;
      const rank = CAREER_RANKS.find((r) => r.rank === (meta.careerRank || 1)) ?? CAREER_RANKS[0];
      const task = rank.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      if (!task.check(s, meta)) return { ...s, toast: "아직 이 과제를 완료하지 않았습니다. 실제 기록이 필요합니다." };
      setMeta((m) => {
        if (m.careerDone.includes(taskId)) return m;
        const careerDone = [...m.careerDone, taskId];
        const all = rank.tasks.every((t) => careerDone.includes(t.id) || t.check(s, { ...m, careerDone }));
        const careerRank = all ? Math.min(7, (m.careerRank || 1) + 1) : m.careerRank || 1;
        const xpAdd = all ? 150 : 40;
        const xp2 = m.xp + xpAdd;
        return { ...m, careerDone, careerRank, xp: xp2, level: levelFromXp(xp2).level };
      });
      return { ...s, toast: "커리어 과제 인정" };
    });
  }, [meta]);

  const completeLesson = useCallback((id: string) => {
    setMeta((m) => {
      if (m.learningDone.includes(id)) return m;
      const xp2 = m.xp + 30;
      return { ...m, learningDone: [...m.learningDone, id], xp: xp2, level: levelFromXp(xp2).level };
    });
  }, []);

  const flag = useCallback((key: string) => {
    setState((s) => (s ? markChallengeFlag(s, key) : s));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      state,
      meta,
      start,
      trade,
      place,
      cancel,
      nextDay,
      ackDay,
      resetGame,
      resetAll,
      clearToast,
      markTutorial,
      toggleWatch,
      openNews,
      markCompared,
      reviewTrade,
      claimChallenge,
      completeCareer,
      completeLesson,
      flag,
    }),
    [
      ready,
      state,
      meta,
      start,
      trade,
      place,
      cancel,
      nextDay,
      ackDay,
      resetGame,
      resetAll,
      clearToast,
      markTutorial,
      toggleWatch,
      openNews,
      markCompared,
      reviewTrade,
      claimChallenge,
      completeCareer,
      completeLesson,
      flag,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame");
  return ctx;
}
