interface MetricCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  description: string;
  norm?: string;
  color?: string;
  progress?: number;
}

export default function MetricCard({
  title,
  value,
  unit,
  description,
  norm,
  color,
  progress,
}: MetricCardProps) {
  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </span>
        <div className="group relative">
          <span
            className="cursor-help text-xs px-1.5 py-0.5 rounded-md transition-opacity opacity-30 group-hover:opacity-100"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
          >
            ?
          </span>
          <div
            className="hidden group-hover:block absolute right-0 top-7 z-50 w-60 p-3 rounded-xl text-xs leading-relaxed"
            style={{
              backgroundColor: '#2a2a2a',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              color: 'var(--text-secondary)',
            }}
          >
            <p className="mb-1">{description}</p>
            {norm && (
              <p style={{ color: 'var(--green)' }}>
                Норма: {norm}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="text-2xl font-semibold mb-2">
        <span style={{ color: color || 'var(--text-primary)' }}>
          {value !== null && value !== undefined ? value : '\u2014'}
        </span>
        {unit && (
          <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(Math.max(progress, 0), 100)}%`,
              backgroundColor: color || 'var(--accent)',
              opacity: 0.8,
            }}
          />
        </div>
      )}
    </div>
  );
}
