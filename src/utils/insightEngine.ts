import { ASSETS } from "../data/assets";
import type { GameState } from "../types";
import { cashRatio, concentration } from "./portfolioCalculator";

export function traderInsight(state: GameState): string[] {
  const buys = state.trades.filter((t) => t.side === "buy");
  const sells = state.trades.filter((t) => t.side === "sell" && t.pnl !== undefined);
  if (state.trades.length < 4) {
    return ["거래 기록이 더 쌓이면 행동 패턴을 분석할 수 있습니다. 몇 번의 매매와 복기를 남겨 보세요."];
  }
  const lines: string[] = [];

  const byAsset: Record<string, number> = {};
  for (const t of state.trades) byAsset[t.assetId] = (byAsset[t.assetId] ?? 0) + t.krwAmount;
  const top = Object.entries(byAsset).sort((a, b) => b[1] - a[1])[0];
  if (top && concentration(state) > 0.45) {
    const name = ASSETS.find((a) => a.id === top[0])?.nameKo ?? top[0];
    lines.push(`${name}에 거래 금액이 몰렸습니다. 그 자산의 뉴스가 곧 포트폴리오 뉴스가 됩니다.`);
  }

  const lossHolds = sells.filter((t) => (t.pnl ?? 0) < 0).map((t) => (t.closeDay ?? t.day) - t.day);
  const winHolds = sells.filter((t) => (t.pnl ?? 0) >= 0).map((t) => (t.closeDay ?? t.day) - t.day);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  if (lossHolds.length >= 2 && winHolds.length >= 2 && avg(lossHolds) > avg(winHolds) + 1) {
    lines.push(
      `손실 거래를 이익 거래보다 길게 보유하는 경향이 있습니다. 처분효과일 수 있으니 청산 계획을 진입 시점에 적어 보세요.`,
    );
  }

  const fee = state.trades.reduce((s, t) => s + t.fee, 0);
  const avgFee = fee / Math.max(1, state.trades.length);
  if (state.trades.length > state.totalDays * 0.9) {
    lines.push(`거래 빈도가 높습니다. 평균 수수료는 약 ₩${Math.round(avgFee).toLocaleString("ko-KR")}입니다. 잦은 매매가 성과를 깎는지 확인해 보세요.`);
  }

  const cashPath = state.valueHistory.length >= 3;
  if (cashPath && cashRatio(state) < 0.08 && state.mdd < -0.12) {
    lines.push("현금 비중이 낮은 상태에서 낙폭이 커졌습니다. 다음엔 버퍼를 남긴 채 포지션 크기를 정해 보세요.");
  }

  const afterNews = buys.filter((t) => (t.relatedNews?.length ?? 0) > 0).length;
  if (afterNews >= 3) {
    lines.push("뉴스 발생 후 매수가 잦았습니다. 이미 가격에 반영된 뉴스인지, 뜻밖의 재료인지 구분해 보세요.");
  }

  const dip = buys.filter((t) => t.reason === "dip");
  if (dip.length >= 2) {
    lines.push(
      "가격이 크게 하락한 자산을 매수하는 행동이 자주 나타났습니다. 이 전략은 반등 구간에서 유리할 수 있지만, 하락 추세가 이어지면 손실이 커질 수 있습니다. 다음 게임에서는 경기 국면, 실적, 거래 규모를 함께 확인해 보세요.",
    );
  }

  const sizes = buys.map((t) => t.krwAmount);
  const lossDays = new Set(sells.filter((t) => (t.pnl ?? 0) < 0).map((t) => t.day));
  const afterLoss = buys.filter((t) => lossDays.has(t.day) || lossDays.has(t.day - 1));
  if (afterLoss.length >= 2 && avg(afterLoss.map((t) => t.krwAmount)) > avg(sizes) * 1.15) {
    lines.push("손실 이후 거래 규모가 커진 기록이 있습니다. 만회하려는 마음이 포지션을 키웠을 수 있습니다.");
  }

  const byReason: Record<string, { n: number; pnl: number }> = {};
  for (const t of sells) {
    const r = t.reason ?? "none";
    byReason[r] = byReason[r] ?? { n: 0, pnl: 0 };
    byReason[r].n += 1;
    byReason[r].pnl += t.pnl ?? 0;
  }
  const gut = byReason.gut;
  if (gut && gut.n >= 2 && gut.pnl < 0) {
    lines.push("직감으로 기록한 거래의 실현 손익이 마이너스 쪽입니다. 이유를 적는 습관은 훈수가 아니라 점검용입니다.");
  }

  if (!lines.length) {
    lines.push("뚜렷한 편향 신호는 적었습니다. 같은 원칙을 다른 시나리오에서도 검증해 보세요.");
  }
  return lines.slice(0, 5);
}

export function compareAssets(state: GameState, ids: string[]) {
  const unique = [...new Set(ids)].slice(0, 4);
  const series = unique.map((id) => {
    const h = state.assets[id]?.history ?? [];
    const start = h[0]?.price || 1;
    const idx = h.map((p) => (p.price / start) * 100);
    const rets: number[] = [];
    for (let i = 1; i < h.length; i++) rets.push((h[i].price - h[i - 1].price) / h[i - 1].price);
    const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
    const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length));
    let peak = idx[0] ?? 100;
    let mdd = 0;
    for (const v of idx) {
      peak = Math.max(peak, v);
      mdd = Math.min(mdd, (v - peak) / peak);
    }
    const ret = (idx.at(-1)! - 100) / 100;
    return { id, idx, rets, vol, mdd, ret };
  });

  const corr: { a: string; b: string; v: number | null }[] = [];
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      corr.push({ a: series[i].id, b: series[j].id, v: pearson(series[i].rets, series[j].rets) });
    }
  }
  return { series, corr };
}

function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 8) return null;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  if (dx < 1e-12 || dy < 1e-12) return null;
  return num / Math.sqrt(dx * dy);
}
