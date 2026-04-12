interface PanelFrameProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelFrame({ title, children, className }: PanelFrameProps) {
  return (
    <div className={`bg-[#0a0a0a] border border-[#1a1a2e] overflow-hidden flex flex-col ${className ?? ''}`}>
      <div className="px-2 py-1 border-b border-[#1a1a2e] text-[#ffaa00] text-[10px] font-bold tracking-wider uppercase flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[#333] text-[9px]">LIVE</span>
      </div>
      <div className="flex-1 overflow-auto p-2 text-xs">
        {children}
      </div>
    </div>
  );
}
