export default function MetricsDisplay({ timing }) {
  if (!timing) return null;
  const fmt = ms => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  const blocks = [
    { label: 'STT',       value: fmt(timing.sttMs),       color: 'var(--primary)' },
    { label: 'Translate', value: fmt(timing.translateMs), color: 'var(--accent)'  },
    { label: 'Total',     value: fmt(timing.totalMs),     color: 'var(--primary)' },
  ];
  return (
    <div className="grid grid-cols-3 rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)' }}>
      {blocks.map((b, i) => (
        <div key={b.label} className="py-3 px-2 text-center"
          style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
          <div className="font-mono text-lg font-bold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[9px] font-semibold uppercase tracking-widest mt-0.5"
            style={{ color: 'var(--muted-fg)' }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}
