export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function round(n: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function formatKrw(n: number, compact = false) {
  if (!Number.isFinite(n)) return "₩0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (compact && abs >= 100_000_000) {
    return `${sign}₩${(abs / 100_000_000).toFixed(2)}억`;
  }
  if (compact && abs >= 10_000) {
    return `${sign}₩${Math.round(abs / 10_000).toLocaleString("ko-KR")}만`;
  }
  return `${sign}₩${Math.round(abs).toLocaleString("ko-KR")}`;
}

export function formatPct(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "0.00%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function formatSigned(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
}

export function formatPrice(price: number, currency: "KRW" | "USD", id?: string) {
  if (currency === "USD") {
    if (id === "oil") return `$${price.toFixed(2)}`;
    if (id === "copper") return `$${price.toFixed(2)}`;
    if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(2)}`;
  }
  if (id === "usdkrw" || id === "eurkrw") {
    return `₩${price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (id === "jpykrw") {
    return `₩${price.toFixed(3)}`;
  }
  if (price >= 1000) return `₩${Math.round(price).toLocaleString("ko-KR")}`;
  return `₩${price.toFixed(2)}`;
}

export function pnlClass(n: number) {
  if (n > 0.0000001) return "text-up";
  if (n < -0.0000001) return "text-down";
  return "text-mute";
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed: number, day: number, salt = 0) {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(day + 1, 0xc2b2ae35) ^ salt) >>> 0;
}

export function rngFor(seed: number, day: number, salt = 0) {
  return mulberry32(hashSeed(seed, day, salt));
}

export function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function shuffle<T>(rng: () => number, list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
