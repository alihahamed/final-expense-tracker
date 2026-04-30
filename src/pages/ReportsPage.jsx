import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ChevronDown } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { MiniTooltip } from '@/components/MiniTooltip';
import { Dropdown, DropdownItem } from '@/components/Dropdown';
import { cn } from '@/lib/utils';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS   = ['#f97316','#fb923c','#ea580c','#fdba74','#fed7aa','#c2410c','#ff6b35','#e85d04','#fca044','#f4845f'];

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium capitalize">{p.name}</span>
          <span className="font-bold text-foreground tabular-nums">{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="p-1.5 rounded-lg bg-muted"><Icon size={13} style={{ color }} /></div>
      </div>
      <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

export function ReportsPage({ txns, fmt, monthlyTrend, activeLedger }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = useMemo(() => {
    const ys = new Set(txns.map(t => parseInt(t.date.slice(0, 4))));
    return [...ys].sort((a, b) => b - a);
  }, [txns]);

  // Filter to selected year
  const yearTxns = useMemo(
    () => txns.filter(t => t.date.startsWith(String(selectedYear))),
    [txns, selectedYear]
  );

  // KPIs
  const { ytdIncome, ytdExpense, ytdNet, savingsRate } = useMemo(() => {
    let inc = 0, exp = 0;
    yearTxns.forEach(t => {
      if (t.type === 'income')  inc += t.amount;
      if (t.type === 'expense') exp += Math.abs(t.amount);
    });
    const net  = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;
    return { ytdIncome: inc, ytdExpense: exp, ytdNet: net, savingsRate: rate };
  }, [yearTxns]);

  // Monthly data for the year
  const monthlyData = useMemo(() => {
    const map = {};
    MONTHS_SHORT.forEach((m, i) => {
      map[i] = { month: m, income: 0, expense: 0, net: 0 };
    });
    yearTxns.forEach(t => {
      const mo = parseInt(t.date.slice(5, 7)) - 1;
      if (t.type === 'income')  map[mo].income  += t.amount;
      if (t.type === 'expense') map[mo].expense += Math.abs(t.amount);
    });
    return Object.values(map).map(d => ({ ...d, net: d.income - d.expense }));
  }, [yearTxns]);

  // Category breakdown
  const catData = useMemo(() => {
    const map = {};
    yearTxns.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [yearTxns]);

  const maxCat = catData[0]?.value || 1;

  const barConfig = {
    income:  { label: 'Income',  color: '#22c55e' },
    expense: { label: 'Expense', color: '#f97316' },
  };

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 flex items-end justify-between pb-2"
      >
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
            {activeLedger?.name || 'All Ledgers'}
          </p>
          <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none">
            Analytics
          </h1>
        </div>
        <Dropdown
          width={130}
          align="right"
          trigger={(toggle, open) => (
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {selectedYear}
              <ChevronDown size={13} className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        >
          {(years.length ? years : [new Date().getFullYear()]).map(y => (
            <DropdownItem key={y} label={String(y)} active={selectedYear === y} onClick={() => setSelectedYear(y)} />
          ))}
        </Dropdown>
      </motion.div>

      {/* KPI Row */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Income"   value={fmt(ytdIncome)}  sub={`${selectedYear} year-to-date`} icon={TrendingUp}   color="#22c55e" delay={0.05} />
        <KpiCard label="Total Spent"    value={fmt(ytdExpense)} sub={`${selectedYear} year-to-date`} icon={TrendingDown} color="#f97316" delay={0.1}  />
        <KpiCard label="Net Savings"    value={fmt(ytdNet)}     sub={ytdNet >= 0 ? 'You saved money' : 'Over budget'}  icon={Wallet}     color={ytdNet >= 0 ? '#22c55e' : '#f43f5e'} delay={0.15} />
        <KpiCard label="Savings Rate"   value={`${savingsRate}%`} sub="Of income saved"              icon={PiggyBank}  color="#a78bfa"  delay={0.2} />
      </div>

      {/* Income vs Expense Monthly Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 bg-card border border-border rounded-2xl p-5 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Income vs Expenses — {selectedYear}</h3>
        <ChartContainer config={barConfig} className="w-full h-[220px]">
          <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: -16, bottom: 0 }} barGap={3}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="income"  name="Income"  fill="url(#gradIncome)"  radius={[5,5,2,2]} maxBarSize={28} />
            <Bar dataKey="expense" name="Expense" fill="url(#gradExpense)" radius={[5,5,2,2]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 md:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Spending Categories</h3>
        {catData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No expense data for {selectedYear}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {catData.map((cat, i) => (
              <div key={cat.name}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="text-xs font-medium text-foreground">{cat.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(cat.value)}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.value / maxCat) * 100}%` }}
                    transition={{ delay: 0.35 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Net Savings Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 md:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Net Savings Trend — {selectedYear}</h3>
        <ChartContainer config={{ net: { label: 'Net', color: '#a78bfa' } }} className="w-full h-[200px]">
          <ComposedChart data={monthlyData} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ stroke: '#a78bfa', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="net" fill="url(#gradNet)" stroke="none" />
            <Line type="monotone" dataKey="net" name="Net" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ChartContainer>
      </motion.div>

    </div>
  );
}
