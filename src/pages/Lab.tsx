import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { formatKrw, formatPct, pnlClass } from "../utils/randomEngine";

export function LabPage() {
  const nav = useNavigate();
  const [lev, setLev] = useState(2);
  const [move, setMove] = useState(8);
  const [spot, setSpot] = useState(100);
  const [strike, setStrike] = useState(100);
  const [days, setDays] = useState(10);
  const [vol, setVol] = useState(20);
  const [kind, setKind] = useState<"call" | "put">("call");

  const leveraged = useMemo(() => {
    const pnl = (move / 100) * lev;
    const liq = pnl <= -0.9;
    return { pnl, liq };
  }, [lev, move]);

  const option = useMemo(() => {
    const t = Math.max(1, days) / 365;
    const intrinsic = kind === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    const time = (vol / 100) * Math.sqrt(t) * spot * 0.4;
    const theo = intrinsic + time;
    const after = Math.max(0, time * 0.7) + (kind === "call" ? Math.max(0, spot * 1.02 - strike) : Math.max(0, strike - spot * 0.98));
    return { intrinsic, time, theo, after };
  }, [spot, strike, days, vol, kind]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="text-sm text-mute" onClick={() => nav("/play")}>
        ← HOME
      </button>
      <h1 className="text-2xl font-semibold tracking-wide">ADVANCED LAB</h1>
      <p className="text-sm text-mute">
        일반 게임 자금과 분리된 교육용 계산기입니다. 옵션·레버리지는 원하지 않으면 쓰지 않아도 됩니다.
      </p>
      <Card className="p-4">
        <Label>LEVERAGE</Label>
        <p className="mt-2 text-sm text-white/75">손익 확대, 손실 한도, 강제청산 위험을 단순화해 보여 줍니다.</p>
        <Field label={`배수 ${lev}x`} v={lev} min={1} max={5} step={1} onChange={setLev} />
        <Field label={`기초자산 변동 ${move}%`} v={move} min={-30} max={30} step={1} onChange={setMove} />
        <div className={`mt-3 text-2xl tabular ${pnlClass(leveraged.pnl)}`}>{formatPct(leveraged.pnl)}</div>
        {leveraged.liq && <div className="mt-2 text-sm text-brand">가상 강제청산: 손실이 유지증거금을 넘었습니다.</div>}
        <p className="mt-2 text-xs text-mute">실제 거래소와 연결되지 않습니다. 100만 원 가상 증거금 기준 예시입니다.</p>
        <div className="mt-1 text-xs text-mute">예시 손익 {formatKrw(1_000_000 * leveraged.pnl)}</div>
      </Card>
      <Card className="p-4">
        <Label>OPTIONS — 단순 모형</Label>
        <p className="mt-2 text-sm text-white/75">콜/풋, 행사가, 만기, 시간가치 감소, 변동성.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className={`rounded-xl py-2 ${kind === "call" ? "bg-brand" : "border border-white/15"}`} onClick={() => setKind("call")}>
            CALL
          </button>
          <button className={`rounded-xl py-2 ${kind === "put" ? "bg-brand" : "border border-white/15"}`} onClick={() => setKind("put")}>
            PUT
          </button>
        </div>
        <Field label={`기초 ${spot}`} v={spot} min={50} max={150} step={1} onChange={setSpot} />
        <Field label={`행사가 ${strike}`} v={strike} min={50} max={150} step={1} onChange={setStrike} />
        <Field label={`만기 ${days}일`} v={days} min={1} max={60} step={1} onChange={setDays} />
        <Field label={`변동성 ${vol}%`} v={vol} min={5} max={60} step={1} onChange={setVol} />
        <div className="mt-3 space-y-1 text-sm">
          <div>내재가치 {option.intrinsic.toFixed(2)}</div>
          <div>시간가치 {option.time.toFixed(2)}</div>
          <div>단순 이론가 {option.theo.toFixed(2)}</div>
          <div className="text-mute">하루 지난 뒤 예시 {option.after.toFixed(2)} (시간가치 감소)</div>
        </div>
        <p className="mt-2 text-xs text-mute">블랙-숄즈가 아닌 교육용 근사입니다. 매매 신호가 아닙니다.</p>
      </Card>
    </div>
  );
}

function Field({
  label,
  v,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  v: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mt-3 block text-sm">
      <div className="text-mute">{label}</div>
      <input
        type="range"
        className="mt-1 w-full"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
