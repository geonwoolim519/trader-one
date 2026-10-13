import { useNavigate } from "react-router-dom";
import { Card, Label } from "../components/ui";
import { getAsset } from "../data/assets";
import { useGame } from "../store/GameProvider";
import { orderLabel } from "../utils/orderEngine";
import { availableCash } from "../utils/orderMath";
import { formatKrw, formatPrice } from "../utils/randomEngine";

const STATUS: Record<string, string> = {
  open: "대기 중",
  filled: "체결 완료",
  cancelled: "취소됨",
  expired: "만료됨",
};

export function OrdersPage() {
  const { state, cancel } = useGame();
  const nav = useNavigate();
  if (!state) return null;
  const list = [...(state.openOrders ?? [])].slice().reverse();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide">OPEN ORDERS</h1>
          <p className="mt-1 text-sm text-mute">미체결 지정가는 현금을 빼지 않고 예약만 합니다.</p>
        </div>
        <button className="text-xs text-mute" onClick={() => nav("/play/trade")}>
          NEW ORDER
        </button>
      </div>
      <Card className="p-4 text-sm">
        <Label>AVAILABLE CASH</Label>
        <div className="mt-1 tabular text-xl">{formatKrw(availableCash(state))}</div>
        <div className="text-xs text-mute">보유 {formatKrw(state.cash)} · 예약 {formatKrw(state.reservedBuyKrw ?? 0)}</div>
      </Card>
      {list.length === 0 && <p className="text-sm text-mute">대기 중인 주문이 없습니다.</p>}
      <div className="space-y-2">
        {list.map((o) => {
          const a = getAsset(o.assetId);
          return (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{a.nameKo}</div>
                  <div className="mt-1 text-xs text-mute">
                    {orderLabel(o.type)} · {o.side === "buy" ? "매수" : "매도"} · {o.qty}주
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {o.limitPrice != null && `지정 ${formatPrice(o.limitPrice, a.currency, a.id)} · `}
                    {o.triggerPrice != null && `트리거 ${formatPrice(o.triggerPrice, a.currency, a.id)} · `}
                    DAY {o.createdDay} → {o.expireDay}
                    {o.activateDay ? ` · 활성 ${o.activateDay}` : ""}
                  </div>
                  {o.fillPrice != null && (
                    <div className="mt-1 text-xs text-white/70">
                      체결 {formatPrice(o.fillPrice, a.currency, a.id)}
                      {o.slippage ? ` · 슬리피지 ${(o.slippage * 100).toFixed(2)}%` : ""}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs tracking-wider">{STATUS[o.status]}</div>
                  {o.status === "open" && (
                    <button className="mt-2 rounded-lg border border-white/15 px-3 py-1 text-xs" onClick={() => cancel(o.id)}>
                      취소
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
