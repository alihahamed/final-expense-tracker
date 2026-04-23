import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, PolarGrid, RadialBar, RadialBarChart } from 'recharts';
import { fmtDate } from '@/utils/data';
import { cn } from '@/lib/utils';
import { CategoryPieChart, CategoryDetailPanel } from '@/components/CategoryPieChart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// ── constants ────────────────────────────────────────────────────────────────
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// category → pastel colour map
// Each entry: [tileClass (bg), dotClass (bg), textClass]
const CAT_PALETTE = [
  { tile: 'bg-blue-200/70 dark:bg-blue-900/40',       dot: 'bg-blue-400',     text: 'text-blue-800 dark:text-blue-200',       glow: 'rgba(96,165,250,0.35)'   },
  { tile: 'bg-emerald-200/70 dark:bg-emerald-900/40', dot: 'bg-emerald-400',  text: 'text-emerald-800 dark:text-emerald-200', glow: 'rgba(52,211,153,0.35)'   },
  { tile: 'bg-rose-200/70 dark:bg-rose-900/40',       dot: 'bg-rose-400',     text: 'text-rose-800 dark:text-rose-200',       glow: 'rgba(251,113,133,0.35)'  },
  { tile: 'bg-violet-200/70 dark:bg-violet-900/40',   dot: 'bg-violet-400',   text: 'text-violet-800 dark:text-violet-200',   glow: 'rgba(167,139,250,0.35)'  },
  { tile: 'bg-cyan-200/70 dark:bg-cyan-900/40',       dot: 'bg-cyan-400',     text: 'text-cyan-800 dark:text-cyan-200',       glow: 'rgba(34,211,238,0.35)'   },
  { tile: 'bg-amber-200/70 dark:bg-amber-900/40',     dot: 'bg-amber-400',    text: 'text-amber-800 dark:text-amber-200',     glow: 'rgba(251,191,36,0.35)'   },
  { tile: 'bg-fuchsia-200/70 dark:bg-fuchsia-900/40', dot: 'bg-fuchsia-400',  text: 'text-fuchsia-800 dark:text-fuchsia-200', glow: 'rgba(232,121,249,0.35)'  },
  { tile: 'bg-indigo-200/70 dark:bg-indigo-900/40',   dot: 'bg-indigo-400',   text: 'text-indigo-800 dark:text-indigo-200',   glow: 'rgba(129,140,248,0.35)'  },
];

const CAT_COLOR_MAP = {};
let colorIndex = 0;
export const getCatPalette = (cat) => {
  if (!cat) return CAT_PALETTE[0];
  if (!CAT_COLOR_MAP[cat]) {
    CAT_COLOR_MAP[cat] = CAT_PALETTE[colorIndex % CAT_PALETTE.length];
    colorIndex++;
  }
  return CAT_COLOR_MAP[cat];
};
// Convenience: just the dot class for tooltips
export const getCatColor = (cat) => getCatPalette(cat).dot;

// ── small helpers ─────────────────────────────────────────────────────────────
function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function firstDayOf(y, m) {
  return new Date(y, m, 1).getDay();
}

function HoverTooltip({ hoverDay, dayMap, fmt }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!hoverDay) return;
    const update = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', update);
    return () => window.removeEventListener('mousemove', update);
  }, [hoverDay]);

  return (
    <AnimatePresence>
      {hoverDay && mousePos.x !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 2, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed pointer-events-none z-50 px-3 py-2.5 rounded-xl shadow-[0_18px_48px_rgba(0,0,0,0.45)] flex flex-col gap-0.5"
          style={{
            left: mousePos.x + 18,
            top: mousePos.y + 18,
            background: 'linear-gradient(155deg, rgba(12,12,13,0.96), rgba(6,6,7,0.98))',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mb-1.5">
            {fmtDate(hoverDay)}
          </div>
          <div className="flex flex-col gap-1.5 w-full min-w-[140px]">
            {dayMap[hoverDay]?.count > 0 ? (
              Object.entries(dayMap[hoverDay].catSpends).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between items-center gap-4 text-xs font-medium text-white">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", getCatColor(cat))} />
                    <span className="truncate">{cat}</span>
                  </div>
                  <span className="tabular-nums opacity-90">{fmt(amount)}</span>
                </div>
              ))
            ) : (
              <span className="text-white/60 text-xs">No activity</span>
            )}
            {dayMap[hoverDay]?.income > 0 && (
                <div className="flex justify-between items-center gap-4 text-xs font-medium text-emerald-400 mt-1 pt-1 border-t border-white/10">
                  <span>Income</span>
                  <span className="tabular-nums">+{fmt(dayMap[hoverDay].income)}</span>
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function TransactionsPage({ txns, fmt, onEdit, onDelete }) {
  const today      = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // selected range: null = show all for the visible month
  const [selRange, setSelRange] = useState(null); // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
  const [hoverDay, setHoverDay] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);

  // ── category arc data ────────────────────────────────────────────────────────
  const CAT_ARC_COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#6366f1'];

  const catData = useMemo(() => {
    const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const map = {};
    txns.forEach(t => {
      if (t.type !== 'expense') return;
      if (t.date.slice(0, 7) !== currentMonth) return;
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    let colorIdx = 0;
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        color: CAT_ARC_COLORS[colorIdx++ % CAT_ARC_COLORS.length],
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [txns, year, month]);

  const totalMonthSpend = catData.reduce((s, d) => s + d.value, 0);

  const monthStats = useMemo(() => {
    const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    let income = 0;
    const daily = {};

    txns.forEach((t) => {
      if (t.date.slice(0, 7) !== currentMonth) return;
      if (!daily[t.date]) daily[t.date] = { spend: 0, count: 0 };
      if (t.type === 'income') income += Math.abs(t.amount);
      if (t.type === 'expense') daily[t.date].spend += Math.abs(t.amount);
      if (t.type !== 'transfer') daily[t.date].count += 1;
    });

    let peakDate = null;
    let peakSpend = 0;
    let busiestDate = null;
    let busiestCount = 0;
    Object.entries(daily).forEach(([date, d]) => {
      if (d.spend > peakSpend) { peakSpend = d.spend; peakDate = date; }
      if (d.count > busiestCount) { busiestCount = d.count; busiestDate = date; }
    });

    return {
      income,
      peakDate,
      peakSpend,
      busiestDate,
      busiestCount,
    };
  }, [txns, year, month]);

  // ── build day spend map for calendar ───────────────────────────────────────
  const dayMap = useMemo(() => {
    const map = {};
    txns.forEach(t => {
      if (t.type === 'transfer') return; // settlements are neutral — exclude from calendar
      if (!map[t.date]) map[t.date] = { spend: 0, income: 0, count: 0, txns: [], catSpends: {} };
      if (t.type === 'expense') {
        map[t.date].spend += Math.abs(t.amount);
        map[t.date].catSpends[t.category] = (map[t.date].catSpends[t.category] || 0) + Math.abs(t.amount);
      } else if (t.type === 'income') {
        map[t.date].income += t.amount;
      }
      map[t.date].count++;
      map[t.date].txns.push(t);
    });
    // Find dominant category for each day
    Object.values(map).forEach(day => {
      let maxCat = null;
      let maxVal = 0;
      Object.entries(day.catSpends).forEach(([cat, val]) => {
        if (val > maxVal) { maxVal = val; maxCat = cat; }
      });
      day.dominantCat = maxCat;
    });
    return map;
  }, [txns]);

  // ── calendar grid ───────────────────────────────────────────────────────────
  const days    = daysInMonth(year, month);
  const firstDW = firstDayOf(year, month);
  const cells   = []; // array of { date: 'YYYY-MM-DD' | null }
  for (let i = 0; i < firstDW; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(isoDate(year, month, d));

  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  const maxVisibleSpend = Math.max(
    1,
    ...cells
      .filter(Boolean)
      .map((date) => dayMap[date]?.spend || 0)
  );

  const isoToday = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const weekCards = [];
  for (let i = 0; i < cells.length; i += 7) {
    const dates = cells.slice(i, i + 7);
    const nonNullDates = dates.filter(Boolean);
    const start = nonNullDates[0] || null;
    const end = nonNullDates[nonNullDates.length - 1] || null;
    let spend = 0;
    let incomeAmount = 0;
    let incomeCount = 0;

    nonNullDates.forEach((date) => {
      const d = dayMap[date];
      if (!d) return;
      spend += d.spend || 0;
      incomeAmount += d.income || 0;
      incomeCount += (d.txns || []).filter((t) => t.type === 'income').length;
    });

    const isCurrentWeek = !!start && !!end && isoToday >= start && isoToday <= end;

    weekCards.push({
      index: i / 7,
      dates,
      start,
      end,
      spend,
      incomeAmount,
      incomeCount,
      isCurrentWeek,
    });
  }

  const weeklyTrendData = weekCards.map((week) => ({
    week: `W${week.index + 1}`,
    spend: Number(week.spend.toFixed(2)),
    income: Number(week.incomeAmount.toFixed(2)),
  }));

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthDaySeries = Object.entries(dayMap)
    .filter(([date]) => date.startsWith(monthKey))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      day: Number(date.split('-')[2]),
      spend: Number((value.spend || 0).toFixed(2)),
    }));

  const spendAreaData = monthDaySeries.slice(-10);
  const maxDayCount = Math.max(1, ...Object.values(dayMap).map((d) => d.count || 0));
  const busiestRatio = Math.min(100, Math.round((monthStats.busiestCount / maxDayCount) * 100));

  const spendAreaConfig = { spend: { label: 'Spend', color: '#fb923c' } };
  const incomeBarConfig = { income: { label: 'Income', color: '#34d399' } };
  const busiestRadialConfig = { activity: { label: 'Activity', color: '#60a5fa' } };

  // ── drag-select helpers ─────────────────────────────────────────────────────
  const dragEnd = useCallback((date) => {
    if (!dragStart || !date) { setDragStart(null); return; }
    const [a, b] = [dragStart, date].sort();
    setSelRange({ start: a, end: b });
    setDragStart(null);
  }, [dragStart]);

  const inRange = useCallback((date) => {
    if (!date) return false;
    if (selRange) return date >= selRange.start && date <= selRange.end;
    if (dragStart && hoverDay) {
      const [a, b] = [dragStart, hoverDay].sort();
      return date >= a && date <= b;
    }
    return false;
  }, [selRange, dragStart, hoverDay]);

  // ── filtered transaction list from selection ────────────────────────────────
  // Removed brutalist table logic

  // ── month nav ───────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelRange(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelRange(null);
  };

  return (
    <div className="flex flex-col gap-0">

      {/* ── Calendar Heatmap ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[calc(100vh-2rem)]"
        onMouseLeave={() => { setHoverDay(null); if (dragStart) { setDragStart(null); } }}
      >
        {/* header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 sm:gap-0 flex-shrink-0">
          {/* Left: Title */}
          <div className="flex-1">
            <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none">
              Transaction <span className="text-primary">History</span>
            </h1>
          </div>

          {/* Center: Month filter */}
          <div className="flex items-center gap-4 sm:absolute sm:left-1/2 sm:-translate-x-1/2 justify-center z-10 bg-card">
            <h2 className="text-sm font-bold text-foreground tabular-nums tracking-tight w-20 text-center">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded-md hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-md hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: Live category legend */}
          <div className="flex-1 flex justify-end">
            <div className="hidden sm:flex flex-wrap items-center justify-end gap-x-3 gap-y-1 max-w-[280px]">
              {Object.entries(CAT_COLOR_MAP).map(([cat, palette]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', palette.dot)} />
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-4 mb-0">
          {/* calendar body - week cards */}
        <div className="relative rounded-2xl border border-orange-500/25 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_18px_44px_rgba(0,0,0,0.12)] overflow-hidden h-full">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_95%_5%,rgba(251,146,60,0.22),transparent_40%)]" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(255,255,255,1)_0px,rgba(255,255,255,1)_1px,transparent_1px,transparent_3px)]" />
          <div className="relative z-10 p-3 h-full flex flex-col">
            <div className="grid grid-cols-7 mb-3 flex-shrink-0">
              {DAYS.map((d, idx) => (
                <div
                  key={d}
                  className={cn(
                    'text-center text-[10px] font-semibold uppercase tracking-[0.16em] py-1 rounded-md',
                    idx === 0 || idx === 6 ? 'text-orange-500/90 bg-orange-500/10' : 'text-muted-foreground'
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${year}-${month}`}
                initial={{ opacity: 0, x: 28, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: 'easeInOut' }}
                className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory space-y-3 pr-1"
                onMouseLeave={() => { if (!dragStart) setHoverDay(null); }}
                onMouseUp={() => { if (hoverDay) dragEnd(hoverDay); }}
              >
                {weekCards.map((week) => (
                  <div
                    key={`week-${week.index}`}
                    className={cn(
                      'relative rounded-xl border bg-card/70 backdrop-blur-sm p-3 snap-start overflow-hidden',
                      week.isCurrentWeek ? 'border-orange-400/50 shadow-[0_0_0_1px_rgba(251,146,60,0.25),0_10px_24px_rgba(251,146,60,0.12)]' : 'border-border/60'
                    )}
                  >
                    {week.isCurrentWeek && (
                      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 bg-orange-500/10 blur-md" />
                    )}

                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {week.start && week.end ? `${fmtDate(week.start)} - ${fmtDate(week.end)}` : 'Week'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500/12 text-rose-600 dark:text-rose-400">
                          -{fmt(week.spend)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                          +{week.incomeCount} income
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-7 gap-2.5 select-none">
                      {week.dates.map((date, dayIndex) => {
                        if (!date) {
                          return (
                            <div
                              key={`empty-${week.index}-${dayIndex}`}
                              className={cn(
                                'h-[65px] rounded-lg border border-border/35',
                                dayIndex === 0 || dayIndex === 6 ? 'bg-orange-500/8' : 'bg-card/55'
                              )}
                            />
                          );
                        }

                        const data = dayMap[date];
                        const inSel = inRange(date);
                        const isToday = date === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
                        const intensity = Math.max(0.16, Math.min(1, (data?.spend || 0) / maxVisibleSpend));

                        return (
                          <div
                            key={date}
                            className={cn(
                              'group relative h-[65px] rounded-lg border px-2 py-2 cursor-pointer transition-all duration-300 overflow-hidden',
                              inSel ? 'border-primary ring-1 ring-primary/50' : 'border-border/50 hover:border-primary/35',
                              dayIndex === 0 || dayIndex === 6 ? 'bg-orange-500/8' : 'bg-card/70'
                            )}
                            onMouseDown={() => { setDragStart(date); setSelRange(null); }}
                            onMouseEnter={() => setHoverDay(date)}
                            onMouseLeave={() => { if (!dragStart) setHoverDay(null); }}
                            onMouseUp={() => dragEnd(date)}
                            onClick={() => {
                              if (!dragStart) {
                                setSelRange((r) => r?.start === date && r?.end === date ? null : { start: date, end: date });
                              }
                            }}
                          >
                            {data?.dominantCat && (
                              <div
                                className={cn('absolute inset-0 rounded-lg', getCatPalette(data.dominantCat).tile)}
                                style={{
                                  opacity: intensity * 0.65,
                                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.2), 0 10px 20px ${getCatPalette(data.dominantCat).glow}`,
                                }}
                              />
                            )}

                            <div className="relative z-10 flex items-start justify-between">
                              <span className={cn(
                                'text-[13px] font-bold leading-none',
                                isToday ? 'text-primary' : data?.dominantCat ? getCatPalette(data.dominantCat).text : 'text-foreground'
                              )}>
                                {date.split('-')[2].replace(/^0/, '')}
                              </span>
                              {!!data?.income && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">+{Math.round(data.income)}</span>
                              )}
                            </div>

                            {!!data?.spend && (
                              <div className="relative z-10 mt-2.5">
                                <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      data?.dominantCat ? getCatPalette(data.dominantCat).dot : 'bg-primary/70'
                                    )}
                                    style={{ width: `${Math.max(8, Math.min(100, (data.spend / maxVisibleSpend) * 100))}%` }}
                                  />
                                </div>
                                <p className="mt-1 text-[10px] font-semibold tabular-nums text-foreground/80 truncate">
                                  {fmt(data.spend).replace(/\.00$/, '')}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          </div>

          <aside className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-2.5 shadow-sm flex flex-col gap-2.5">
              <div className="rounded-xl border border-orange-400/25 bg-gradient-to-br from-orange-500/10 via-card to-card p-2 overflow-hidden flex-1 min-h-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Spend Pulse</p>
                <ChartContainer config={spendAreaConfig} className="h-[calc(100%-0.9rem)] w-full">
                  <AreaChart data={spendAreaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-spend)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--color-spend)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={() => 'Daily Spend'} />} />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="var(--color-spend)"
                      strokeWidth={2}
                      fill="url(#spendGradient)"
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-card to-card p-2 overflow-hidden flex-1 min-h-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Weekly Income</p>
                <ChartContainer config={incomeBarConfig} className="h-[calc(100%-0.9rem)] w-full">
                  <BarChart data={weeklyTrendData} margin={{ top: 6, right: 0, left: -16, bottom: 0 }} barSize={12}>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(label) => `${label}`} />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 2, 2]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="rounded-xl border border-blue-400/25 bg-gradient-to-br from-blue-500/10 via-card to-card p-2 overflow-hidden flex-1 min-h-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Busiest Day</p>
                <ChartContainer config={busiestRadialConfig} className="h-[calc(100%-0.9rem)] w-full">
                  <RadialBarChart
                    data={[{ name: 'activity', value: busiestRatio, fill: 'var(--color-activity)' }]}
                    startAngle={210}
                    endAngle={-30}
                    innerRadius="55%"
                    outerRadius="85%"
                  >
                    <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[58, 44]} />
                    <RadialBar dataKey="value" cornerRadius={8} background />
                    <text x="50%" y="52%" textAnchor="middle" className="fill-foreground text-lg font-bold tabular-nums">
                      {busiestRatio}%
                    </text>
                    <text x="50%" y="64%" textAnchor="middle" className="fill-muted-foreground text-[8px] font-semibold uppercase tracking-widest">
                      flow
                    </text>
                  </RadialBarChart>
                </ChartContainer>
              </div>
          </aside>
        </div>

        {/* selection label */}
        {selRange && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {selRange.start === selRange.end
                ? fmtDate(selRange.start)
                : `${fmtDate(selRange.start)} → ${fmtDate(selRange.end)}`}
              <span className="normal-case tracking-normal ml-2 text-foreground font-medium">· Selection</span>
            </p>
            <button
              onClick={() => setSelRange(null)}
              className="text-xs font-medium text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors w-fit"
            >
              <X size={14} /> Clear selection
            </button>
          </div>
        )}

        <HoverTooltip hoverDay={hoverDay} dayMap={dayMap} fmt={fmt} />
      </motion.div>
    </div>
  );
}

