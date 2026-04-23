import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CAT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
];

function CustomLabel({ cx, cy, totalSpend, fmt }) {
  return (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--brand)" fontSize={7} fontWeight="700" letterSpacing="0.1em">
        SPENT
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text-primary)" fontSize={13} fontWeight="700" className="tabular-nums">
        {fmt(totalSpend)}
      </text>
    </>
  );
}

function CustomTooltip({ active, payload, fmt }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">{d.name}</p>
      <p className="text-sm font-bold text-foreground tabular-nums">{fmt(d.value)}</p>
      <p className="text-[10px] text-muted-foreground">{d.percent}% of total</p>
    </div>
  );
}

export function RadialArcChart({ catData, totalSpend, fmt, onSelectCat, selectedCat }) {
  const arcs = useMemo(() => {
    if (!catData || catData.length === 0) return [];
    const total = catData.reduce((s, d) => s + d.value, 0);
    return catData.map((d, i) => ({
      ...d,
      color: d.color || CAT_COLORS[i % CAT_COLORS.length],
      percent: d.percent ?? Math.round((d.value / total) * 100),
    }));
  }, [catData]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={arcs}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              onClick={(d) => onSelectCat(selectedCat === d.name ? null : d.name)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {arcs.map((arc) => (
                <Cell
                  key={arc.name}
                  fill={arc.color}
                  opacity={selectedCat && selectedCat !== arc.name ? 0.35 : 0.9}
                  stroke={selectedCat === arc.name ? arc.color : 'none'}
                  strokeWidth={selectedCat === arc.name ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip fmt={fmt} />} />
            <Pie
              data={[{ value: totalSpend }]}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={40}
              dataKey="value"
              labelLine={false}
              label={<CustomLabel cx={110} cy={110} totalSpend={totalSpend} fmt={fmt} />}
              fill="var(--brand)"
              stroke="none"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3 max-w-[280px]">
        {arcs.map((arc, i) => (
          <motion.button
            key={arc.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.04 }}
            onClick={() => onSelectCat(selectedCat === arc.name ? null : arc.name)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all duration-150",
              selectedCat === arc.name
                ? "bg-brand/10 ring-1 ring-brand/30 text-brand"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: arc.color }}
            />
            <span>{arc.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Compact detail panel ─────────────────────────────────────────────────────
export function CategoryDetailPanel({ category, catData, fmt, onClose, topTransactions = [] }) {
  const total = catData?.value || 0;
  const percent = catData?.percent || 0;
  const color = catData?.color || 'var(--brand)';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.97 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden"
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(to right, ${color}80, ${color}, ${color}80)` }}
      />

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold text-foreground">{category}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-foreground tabular-nums tracking-tight">
          {fmt(total)}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {percent}% of total
        </span>
      </div>

      {/* Mini bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(to right, ${color}99, ${color})` }}
        />
      </div>

      {/* Top transactions */}
      {topTransactions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent</p>
          {topTransactions.slice(0, 3).map((tx) => (
            <div key={tx.id} className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                {tx.description || tx.category}
              </span>
              <span className="text-[11px] font-semibold text-foreground tabular-nums ml-2">
                {fmt(Math.abs(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No transactions this month</p>
      )}
    </motion.div>
  );
}
