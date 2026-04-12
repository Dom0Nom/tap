export default function Dashboard() {
  return (
    <main className="h-screen p-1 grid grid-cols-3 grid-rows-3 gap-px bg-[#1a1a2e]">
      <div className="bg-[#0a0a0a] p-2 row-span-1 col-span-1">
        <h2 className="text-[#ffaa00] text-xs mb-1">EQUITY CURVE</h2>
        <p className="text-xs text-[#555]">chart placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">POSITIONS</h2>
        <p className="text-xs text-[#555]">grid placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">ORDER BLOTTER</h2>
        <p className="text-xs text-[#555]">orders placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">TICKER CHART</h2>
        <p className="text-xs text-[#555]">candlestick placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2 col-span-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">SIGNAL HEATMAP</h2>
        <p className="text-xs text-[#555]">heatmap placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">BACKTEST STATS</h2>
        <p className="text-xs text-[#555]">stats placeholder</p>
      </div>
      <div className="bg-[#0a0a0a] p-2 col-span-2">
        <h2 className="text-[#ffaa00] text-xs mb-1">SYSTEM LOG</h2>
        <p className="text-xs text-[#555]">log placeholder</p>
      </div>
    </main>
  );
}
