/**
 * Custom Recharts tooltip that shows as a tiny pill.
 * Pass `color` as a prop – e.g. color="var(--income)"
 */
export function MiniTooltip({ active, payload, color = '#f97316' }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const val = typeof entry.value === 'number'
    ? entry.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : entry.value;

  return (
    <div
      style={{ background: color }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold shadow-lg"
    >
      {entry.name && (
        <span className="opacity-75 capitalize">{entry.name}</span>
      )}
      <span>{val}</span>
    </div>
  );
}
