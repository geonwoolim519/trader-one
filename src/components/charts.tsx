import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAsset } from "../data/assets";
import type { AssetState } from "../types";
import { formatPrice } from "../utils/randomEngine";

export function AssetChart({ asset, range }: { asset: AssetState; range: "1D" | "5D" | "1M" | "GAME" }) {
  const def = getAsset(asset.id);
  const data = useMemo(() => {
    if (range === "1D") {
      return asset.intraday.map((price, i) => ({ t: `${i}h`, price }));
    }
    let hist = asset.history;
    if (range === "5D") hist = hist.slice(-5);
    if (range === "1M") hist = hist.slice(-22);
    if (range === "GAME") hist = hist.filter((h) => h.day >= 0);
    if (hist.length < 2) hist = asset.history.slice(-12);
    return hist.map((h) => ({ t: h.day >= 0 ? `D${h.day || 0}` : `${h.day}`, price: h.price }));
  }, [asset, range]);

  const up = (data[data.length - 1]?.price ?? 0) >= (data[0]?.price ?? 0);
  const color = up ? "#ff2a2a" : "#3b82f6";

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8a8a8a", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#8a8a8a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v: number) => formatPrice(v, def.currency, def.id).replace("₩", "").replace("$", "")}
          />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }}
            labelStyle={{ color: "#888" }}
            formatter={(v) => [formatPrice(Number(v), def.currency, def.id), def.nameKo]}
          />
          <Area type="monotone" dataKey="price" stroke={color} fill={`url(#g-${asset.id})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE = ["#ffffff", "#e10600", "#8a8a8a", "#3b82f6", "#d4d4d4", "#5a5a5a"];

export function AllocChart({
  items,
}: {
  items: { name: string; value: number }[];
}) {
  const data = items.filter((x) => x.value > 1);
  if (!data.length) return <div className="flex h-44 items-center justify-center text-sm text-mute">보유 자산 없음</div>;
  return (
    <div className="h-44">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={PIE[i % PIE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }}
            formatter={(v) => [`₩${Math.round(Number(v)).toLocaleString("ko-KR")}`, ""]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RangeTabs({
  value,
  onChange,
}: {
  value: "1D" | "5D" | "1M" | "GAME";
  onChange: (v: "1D" | "5D" | "1M" | "GAME") => void;
}) {
  const [v, setV] = useState(value);
  const cur = value ?? v;
  return (
    <div className="flex gap-1 rounded-xl bg-black p-1">
      {(["1D", "5D", "1M", "GAME"] as const).map((r) => (
        <button
          key={r}
          onClick={() => {
            setV(r);
            onChange(r);
          }}
          className={`flex-1 rounded-lg py-1.5 text-xs tracking-wider ${cur === r ? "bg-white/10 text-white" : "text-mute"}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
