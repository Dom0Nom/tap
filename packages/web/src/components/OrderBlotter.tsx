import type { Order } from '@tap/lib';

interface OrderBlotterProps {
  orders: Order[];
}

export function OrderBlotter({ orders }: OrderBlotterProps) {
  if (orders.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No orders</div>;

  return (
    <div className="overflow-auto max-h-full">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr>
            {['SIDE', 'TICKER', 'QTY', 'TYPE', 'STATUS'].map((h, i) => (
              <th
                key={h}
                className={`pb-1.5 font-[family-name:var(--font-barlow-condensed)] font-semibold text-[10px] tracking-wider uppercase sticky top-0 ${i <= 1 ? 'text-left' : 'text-right'}`}
                style={{ color: 'var(--text-muted)', background: 'var(--bg-panel)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => {
            const sideColor = order.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)';
            const statusColor = order.status === 'filled'
              ? 'var(--accent-green)'
              : order.status === 'rejected'
                ? 'var(--accent-red)'
                : 'var(--accent-amber)';
            const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';

            return (
              <tr key={order.clientOrderId} className="h-6" style={{ background: rowBg }}>
                <td className="font-[family-name:var(--font-mono)] uppercase font-medium" style={{ color: sideColor }}>
                  {order.side}
                </td>
                <td className="font-[family-name:var(--font-mono)]" style={{ color: 'var(--text-primary)' }}>
                  {order.ticker}
                </td>
                <td className="font-[family-name:var(--font-mono)] tabular-nums text-right" style={{ color: 'var(--text-secondary)' }}>
                  {order.qty}
                </td>
                <td className="font-[family-name:var(--font-mono)] text-right uppercase" style={{ color: 'var(--text-muted)' }}>
                  {order.kind}
                </td>
                <td className="font-[family-name:var(--font-mono)] text-right uppercase text-[10px]" style={{ color: statusColor }}>
                  {order.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
