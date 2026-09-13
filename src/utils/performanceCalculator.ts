import { MISSIONS } from "../data/content";
import { ASSETS, getAsset } from "../data/assets";
import { getEvent } from "../data/events";
import type { GameState, Trade, TradeReason } from "../types";
import { INITIAL_CASH } from "../types";
import { cashRatio, concentration, holdingCount, totalValue } from "./portfolioCalculator";

export function updateMdd(state: GameState, value: number) {
  const peak = Math.max(state.peakValue, value);
  const dd = peak > 0 ? (value - peak) / peak : 0;
  return { peakValue: peak, mdd: Math.min(state.mdd, dd) };
}

export function closedTrades(state: GameState): Trade[] {
  return state.trades.filter((t) => t.side === "sell" && t.pnl !== undefined);
}

export function winRate(state: GameState) {
  const closed = closedTrades(state);
  if (!closed.length) return 0;
  return closed.filter((t) => (t.pnl ?? 0) > 0).length / closed.length;
}

export interface StyleResult {
  id: string;
  title: string;
  blurb: string;
}

export function analyzeStyle(state: GameState): StyleResult {
  const trades = state.trades.filter((t) => t.side === "buy");
  const conc = concentration(state);
  const cash = cashRatio(state);
  const n = trades.length;
  const newsFollow = trades.filter((t) => (t.relatedNews?.length ?? 0) > 0).length;
  const dip = trades.filter((t) => t.reason === "dip").length;
  const avgHold = n < 2 ? 8 : 6;

  if (state.mdd < -0.18 && conc > 0.45) {
    return { id: "high_risk", title: "고위험 집중투자형", blurb: "소수 자산에 크게 베팅하며 낙폭도 함께 키웠습니다." };
  }
  if (n >= state.totalDays * 0.7) {
    return { id: "short", title: "단기 매매형", blurb: "잦은 거래로 시장에 반응했습니다. 수수료가 성과를 깎았을 수 있습니다." };
  }
  if (n <= Math.max(3, state.totalDays / 10) && cash < 0.5) {
    return { id: "long", title: "장기 투자형", blurb: "거래 횟수를 아끼고 포지션을 길게 가져갔습니다." };
  }
  if (newsFollow > n * 0.45 && n > 2) {
    return { id: "news", title: "뉴스 추종형", blurb: "당일 뉴스와 맞춘 거래가 많았습니다. 선반영 함정에 주의하세요." };
  }
  if (dip > n * 0.35 && n > 2) {
    return { id: "contra", title: "역발상 투자형", blurb: "하락한 자산을 저가 매수로 접근하는 경향이 있습니다." };
  }
  if (holdingCount(state) >= 4 && conc < 0.4) {
    return { id: "div", title: "분산투자형", blurb: "여러 자산에 나누어 개별 충격을 줄이려 했습니다." };
  }
  if (cash > 0.45) {
    return { id: "stable", title: "안정형 트레이더", blurb: "현금 비중을 높게 유지하며 변동성을 피했습니다." };
  }
  if (conc > 0.5) {
    return { id: "agg", title: "공격형 트레이더", blurb: "확신이 있는 자산에 무게를 실었습니다." };
  }
  void avgHold;
  return { id: "balanced", title: "BALANCED STRATEGIST", blurb: "수익, 방어, 분산 사이에서 균형을 찾으려 했습니다." };
}

export function insights(state: GameState) {
  const buys = state.trades.filter((t) => t.side === "buy");
  const lines: string[] = [];
  const dip = buys.filter((t) => t.reason === "dip");
  const dipBad = dip.filter((t) => {
    const last = state.assets[t.assetId];
    return last && last.price < t.price;
  });
  if (dip.length >= 2 && dipBad.length >= dip.length / 2) {
    lines.push("최근 하락한 자산을 저평가로 보는 경향이 있습니다. 추가 하락 재료가 남았는지 먼저 보세요.");
  }
  const gut = buys.filter((t) => t.reason === "gut");
  if (gut.length >= 3) {
    lines.push("직감 거래가 잦았습니다. 뉴스의 신뢰도와 이미 반영된 기대를 점검해 보세요.");
  }
  const news = buys.filter((t) => t.reason === "news");
  if (news.length >= 3) {
    lines.push("뉴스 직후 매수가 많았습니다. '이미 가격에 들어 있는 뉴스'인지 구분해 보세요.");
  }
  if (!lines.length) {
    lines.push("거래 이유와 결과가 크게 어긋나지는 않았습니다. 같은 원칙을 다음 게임에서도 검증해 보세요.");
  }
  return lines;
}

export function goodsAndBads(state: GameState) {
  const goods: string[] = [];
  const bads: string[] = [];
  const ret = (totalValue(state) - INITIAL_CASH) / INITIAL_CASH;
  if (state.mdd > -0.1) goods.push("최대 낙폭을 비교적 잘 통제했습니다.");
  if (holdingCount(state) >= 3) goods.push("특정 자산에 지나치게 집중하지 않았습니다.");
  if (cashRatio(state) > 0.2 && state.mdd > -0.12) goods.push("불확실성 구간에서 현금 버퍼를 남겼습니다.");
  const semiDays = state.newsLog.filter((n) => ["ai_boom", "semi_demand", "semi_beat"].includes(n.eventId));
  if (semiDays.length && (state.holdings.nvidia || state.holdings.skhynix || state.holdings.samsung)) {
    goods.push("반도체 사이클 구간을 포지션에 반영했습니다.");
  }
  const hike = state.newsLog.some((n) => n.eventId === "us_hike");
  if (hike && cashRatio(state) > 0.25) goods.push("금리 상승 재료 전후로 현금 비중을 의식했습니다.");
  if (ret > 0.08) goods.push("초기 자본 대비 의미 있는 수익을 만들었습니다.");

  if (state.trades.length > state.totalDays * 1.2) bads.push("거래가 잦아 수수료가 성과를 잠식했을 수 있습니다.");
  if (concentration(state) > 0.55) bads.push("한 자산 비중이 높아 개별 뉴스에 크게 노출됐습니다.");
  if (state.mdd < -0.2) bads.push("낙폭이 깊었습니다. 포지션 크기와 손절 기준을 점검하세요.");
  const noNewsBuys = state.trades.filter((t) => t.side === "buy" && t.reason === "gut").length;
  if (noNewsBuys >= 2) bads.push("일부 거래에서 뉴스·지표보다 직감에 의존했습니다.");
  const oilNews = state.newsLog.some((n) => n.eventId === "oil_spike");
  if (oilNews && (state.holdings.hyundai?.qty || state.holdings.tesla?.qty)) {
    bads.push("유가 급등 재료가 있는 날 운송·자동차 노출이 남아 있었습니다.");
  }
  if (!goods.length) goods.push("시장에 계속 참여하며 의사결정 기록을 남겼습니다.");
  if (!bads.length) bads.push("큰 실수는 적었습니다. 다음엔 다른 시나리오에서 같은 원칙이 통하는지 보세요.");
  return { goods: goods.slice(0, 3), bads: bads.slice(0, 3) };
}

export function learnedConcepts(state: GameState) {
  const set = new Set(state.learned);
  for (const n of state.newsLog) {
    const ev = getEvent(n.eventId);
    ev.concepts.forEach((c) => set.add(c));
  }
  if (holdingCount(state) >= 3) set.add("분산투자");
  if (state.trades.length) set.add("시장심리");
  return [...set];
}

export function tradeReview(state: GameState) {
  const sells = closedTrades(state).slice().sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
  const best = sells.slice(0, 3);
  const worst = sells.slice(-3).reverse();
  const describe = (t: Trade) => {
    const name = getAsset(t.assetId).nameKo;
    const news = t.relatedNews?.[0];
    const why = t.reason ? reasonLabel(t.reason) : "이유 미기록";
    const happened = news ? getEvent(news).headline : "뚜렷한 개별 뉴스 없이 가격이 움직였습니다.";
    const result =
      (t.pnl ?? 0) >= 0
        ? `약 ${Math.round(t.pnl ?? 0).toLocaleString("ko-KR")}원 이익`
        : `약 ${Math.round(Math.abs(t.pnl ?? 0)).toLocaleString("ko-KR")}원 손실`;
    const next =
      (t.pnl ?? 0) >= 0
        ? "성공 요인이 운인지 논리인지 한 문장으로 남겨 보세요."
        : "진입 전에 반대 시나리오와 최대 손실을 정해 두면 같은 실수를 줄일 수 있습니다.";
    return { t, name, why, happened, result, next };
  };
  return { best: best.map(describe), worst: worst.map(describe) };
}

export function reasonLabel(r: TradeReason) {
  const map: Record<TradeReason, string> = {
    macro: "경제지표가 개선될 것 같다",
    earnings: "기업 실적이 좋아질 것 같다",
    dip: "가격이 너무 많이 떨어졌다",
    news: "뉴스가 긍정적이다",
    relative: "다른 자산보다 매력적이다",
    gut: "그냥 직감이다",
  };
  return map[r];
}

export function evalMissions(state: GameState) {
  const value = totalValue(state);
  const ret = (value - INITIAL_CASH) / INITIAL_CASH;
  const hikeToday = state.lastReport?.news.some((n) => n.eventId === "us_hike" || n.eventId === "kr_hike");
  const defended = Boolean(hikeToday) && (state.lastReport?.dailyReturn ?? 0) >= -0.005;
  const newsTrade = state.trades.some(
    (t) => t.day === (state.lastReport?.day ?? -1) && (t.relatedNews?.length ?? 0) > 0,
  );
  const flags: Record<string, boolean> = {
    return10: ret >= 0.1,
    diversify: holdingCount(state) >= 3,
    rate_defense: defended,
    mdd10: state.mdd >= -0.1,
    cash20: cashRatio(state) >= 0.2,
    news_trade: newsTrade || state.trades.some((t) => (t.relatedNews?.length ?? 0) > 0),
  };
  return state.missions.map((m) => ({
    ...m,
    done: m.done || !!flags[m.id],
  }));
}

export function missionXp(state: GameState) {
  return state.missions.filter((m) => m.done).reduce((s, m) => {
    const def = MISSIONS.find((d) => d.id === m.id);
    return s + (def?.xp ?? 0);
  }, 0);
}

export function volOfReturns(state: GameState) {
  const h = state.valueHistory;
  if (h.length < 3) return 0;
  const rets = [];
  for (let i = 1; i < h.length; i++) rets.push((h[i] - h[i - 1]) / h[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(v);
}

export function riskAdjusted(state: GameState) {
  const ret = (totalValue(state) - INITIAL_CASH) / INITIAL_CASH;
  const vol = volOfReturns(state);
  if (vol < 0.0001) return ret > 0 ? 2 : 0;
  return ret / (vol * Math.sqrt(Math.max(1, state.valueHistory.length)));
}

export function categoryLabel(id: string) {
  return ASSETS.find((a) => a.id === id)?.category ?? "";
}
