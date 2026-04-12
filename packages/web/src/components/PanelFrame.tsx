interface PanelFrameProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  isLive?: boolean;
}

export function PanelFrame({ title, children, className, accentColor, isLive }: PanelFrameProps) {
  const accent = accentColor ?? 'var(--accent-amber)';

  return (
    <div
      className={`overflow-hidden flex flex-col rounded-sm ${className ?? ''}`}
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="flex items-center justify-between px-2 py-0.5"
        style={{
          background: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border)',
          borderLeft: `2px solid ${accent}`,
        }}
      >
        <span
          className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: accent }}
        >
          {title}
        </span>
        {isLive && (
          <span className="flex items-center gap-1">
            <span className="animate-blink inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
            <span className="font-[family-name:var(--font-barlow-condensed)] text-[9px] font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
              LIVE
            </span>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-1 text-xs">
        {children}
      </div>
    </div>
  );
}
