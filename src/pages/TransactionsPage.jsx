import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PALETTE, fmtDate } from '@/utils/data';
import { cn } from '@/lib/utils';

// ── constants ────────────────────────────────────────────────────────────────
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// category → pastel colour map
// Each entry: [tileClass (bg), dotClass (bg), textClass]
const CAT_PALETTE = [
  { tile: 'bg-blue-200/70 dark:bg-blue-900/40',     dot: 'bg-blue-400',    text: 'text-blue-800 dark:text-blue-200'   },
  { tile: 'bg-emerald-200/70 dark:bg-emerald-900/40', dot: 'bg-emerald-400', text: 'text-emerald-800 dark:text-emerald-200' },
  { tile: 'bg-rose-200/70 dark:bg-rose-900/40',     dot: 'bg-rose-400',    text: 'text-rose-800 dark:text-rose-200'   },
  { tile: 'bg-violet-200/70 dark:bg-violet-900/40', dot: 'bg-violet-400',  text: 'text-violet-800 dark:text-violet-200' },
  { tile: 'bg-cyan-200/70 dark:bg-cyan-900/40',     dot: 'bg-cyan-400',    text: 'text-cyan-800 dark:text-cyan-200'   },
  { tile: 'bg-amber-200/70 dark:bg-amber-900/40',   dot: 'bg-amber-400',   text: 'text-amber-800 dark:text-amber-200' },
  { tile: 'bg-fuchsia-200/70 dark:bg-fuchsia-900/40', dot: 'bg-fuchsia-400', text: 'text-fuchsia-800 dark:text-fuchsia-200' },
  { tile: 'bg-indigo-200/70 dark:bg-indigo-900/40', dot: 'bg-indigo-400',  text: 'text-indigo-800 dark:text-indigo-200' },
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
          className="fixed pointer-events-none z-50 px-3 py-2.5 rounded-xl shadow-xl flex flex-col gap-0.5"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y + 16,
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
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

  const clearFilter = () => { setSelRange(null); };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Calendar Heatmap ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col"
        onMouseLeave={() => { setHoverDay(null); if (dragStart) { setDragStart(null); } }}
      >
        {/* header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
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

        {/* calendar body - Grid */}
        <div className="border border-border/50 rounded-xl overflow-hidden bg-border/40 shadow-sm relative">
          {/* day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-border/40 bg-card">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-foreground uppercase tracking-widest py-3">
                {d}
              </div>
            ))}
          </div>

          {/* calendar cells */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${year}-${month}`}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="grid grid-cols-7 gap-[1px] select-none bg-border/40"
              onMouseLeave={() => { if (!dragStart) setHoverDay(null); }}
              onMouseUp={e => { if (hoverDay) dragEnd(hoverDay); }}
            >
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-card/50 min-h-[80px]" onMouseEnter={() => setHoverDay(null)} />;
                const data  = dayMap[date];
                const inSel = inRange(date);
                const isToday = date === isoDate(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <div
                    key={date}
                    className={cn(
                      'group relative flex flex-col items-center justify-center p-2 min-h-[80px] sm:min-h-[96px] cursor-pointer transition-all duration-300 bg-card',
                      inSel ? 'ring-2 ring-primary ring-inset z-10' : 'hover:bg-muted/30'
                    )}
                    onMouseDown={() => { setDragStart(date); setSelRange(null); }}
                    onMouseEnter={() => setHoverDay(date)}
                    onMouseLeave={() => { if (!dragStart) setHoverDay(null); }}
                    onMouseUp={() => dragEnd(date)}
                    onClick={() => {
                      if (!dragStart) {
                        setSelRange(r => r?.start === date && r?.end === date ? null : { start: date, end: date });
                      }
                    }}
                  >
                    {/* Background: pastel category tile */}
                    <div className={cn(
                      "absolute inset-1.5 rounded-xl transition-all duration-300 z-0",
                      data?.dominantCat ? getCatPalette(data.dominantCat).tile : 'bg-transparent',
                      inSel && "ring-1 ring-primary/30"
                    )} />

                    {/* day number */}
                    <span className={cn(
                      "relative z-10 text-[15px] font-bold tracking-tight transition-all duration-300",
                      data?.dominantCat
                        ? getCatPalette(data.dominantCat).text
                        : isToday
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      !data?.dominantCat && !isToday && hoverDay === date && 'text-foreground'
                    )}>
                      {date.split('-')[2].replace(/^0/, '')}
                    </span>

                    {/* inner content: simplified stats over colored bg */}
                    <div className="relative z-10 mt-1 w-full flex flex-col items-center gap-1 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
                      {data?.spend > 0 && (
                        <div className={cn(
                          "px-1.5 py-0.5 rounded flex items-center justify-center",
                          data?.dominantCat ? 'bg-black/10' : 'bg-muted/50'
                        )}>
                          <span className={cn(
                            "text-[10px] font-bold tabular-nums tracking-tighter",
                            data?.dominantCat ? getCatPalette(data.dominantCat).text : 'text-muted-foreground'
                          )}>
                            {fmt(data.spend).replace(/\.00$/, '')}
                          </span>
                        </div>
                      )}
                      {data?.income > 0 && !data.spend && (
                        <div className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <span className="text-[10px] font-bold tabular-nums tracking-tighter">
                            +{fmt(data.income).replace(/\.00$/, '')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* selection label */}
        {selRange && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
