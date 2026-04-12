import type { Order } from '@tap/lib';

interface OrderBlotterProps {
  orders: Order[];
}

export function OrderBlotter({ orders }: OrderBlotterProps) {
  if (orders.length === 0) return <div className="text-[#555]">No orders</div>;

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[#888] text-left">
          <th className="pb-1 font-normal">ID</th>
          <th className="pb-1 font-normal">SIDE</th>
          <th className="pb-1 font-normal">TICKER</th>
          <th className="pb-1 font-normal text-right">QTY</th>
          <th className="pb-1 font-normal text-right">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const sideColor = order.side === 'buy' ? 'text-[#00ff41]' : 'text-[#ff3333]';
          const statusColor = order.status === 'filled' ? 'text-[#00ff41]'
            : order.status === 'rejected' ? 'text-[#ff3333]'
            : 'text-[#ffaa00]';

          return (
            <tr key={order.clientOrderId} className="border-b border-[#111] h-6">
              <td className="font-mono text-[#555]">{order.clientOrderId}</td>
              <td className={`font-mono uppercase ${sideColor}`}>{order.side}</td>
              <td className="font-mono text-[#e0e0e0]">{order.ticker}</td>
              <td className="font-mono tabular-nums text-right text-[#e0e0e0]">{order.qty}</td>
              <td className={`font-mono text-right uppercase ${statusColor}`}>{order.status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
