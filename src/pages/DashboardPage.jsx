import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import {
  ArrowDownLeft, ArrowUpRight, Activity, CreditCard,
  ChevronDown, Filter, CalendarDays, ArrowDownRight,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer } from '@/components/ui/chart';
import { Dropdown, DropdownItem } from '@/components/Dropdown';
import { MiniTooltip } from '@/components/MiniTooltip';
import { TransactionCard } from '@/components/TransactionCard';
import { BalancesWidget } from '@/components/BalancesWidget';
import { PALETTE, CURRENCIES } from '@/utils/data';
import { cn } from '@/lib/utils';

// ── Greeting helpers ─────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

// ── tiny stat card sub-component ─────────────────────────────────────────────
function StatCard({ title, icon, value, change, chartData, chartConfig, dataKey, color, delay }) {
  const isPositiveGood = dataKey === 'income';
  const good = isPositiveGood ? change >= 0 : change < 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col shadow-sm h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <div className="p-1 bg-muted rounded-md text-muted-foreground">{icon}</div>
      </div>
      <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        <span className={good ? 'text-emerald-500' : 'text-rose-500'}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>{' '}
        {dataKey === 'income' ? 'than last month' : 'spent than last month'}
      </p>
      <div className="h-11 mt-3">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ComposedChart data={chartData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <filter id={`shadow-${dataKey}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={color} floodOpacity="0.4" />
              </filter>
            </defs>
            <Tooltip content={<MiniTooltip color={color} />} cursor={false} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              filter={`url(#shadow-${dataKey})`}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              fill={`url(#grad-${dataKey})`}
              fillOpacity={1}
              stroke="none"
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export function DashboardPage({
  txns, onEdit, onDelete, monthlyTrend, onAdd,
  currency, setCurrency, fmt, userName = 'there',
  incomeTarget = 5000, fixedObligations = 2000,
  ledgerMembers = [], currentUserId = null, activeLedger = null,
  onRequestSettle,
}) {
  const [expTime, setExpTime]       = useState('This Month');
  const [revTime, setRevTime]       = useState('All Time');
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [txFilterType, setTxFilterType] = useState('all');
  const [txFilterCat,  setTxFilterCat]  = useState('all');

  // ── aggregates ──────────────────────────────────────────────────────────────
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expense;

  const allTxCats = useMemo(() => [...new Set(txns.map(t => t.category))].sort(), [txns]);

  // ── dynamic insights (all derived from live txns) ─────────────────────────
  const { todayAllowance, remainingPlayMoney, totalPlayMoney, flexibleSpend, daysLeft } = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    
    let flex = 0;
    txns.forEach(t => {
      if (t.type === 'expense' && t.date.slice(0, 7) === currentMonth) {
        if (t.category !== 'Rent' && t.category !== 'Utilities') {
          flex += Math.abs(t.amount);
        }
      }
    });

    const totalPlay = incomeTarget - fixedObligations;
    const remaining = totalPlay - flex;
    
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const left = lastDay.getDate() - today.getDate() + 1; // +1 includes today
    
    const allowance = remaining / left;
    
    return { 
      todayAllowance: allowance, 
      remainingPlayMoney: remaining, 
      totalPlayMoney: totalPlay, 
      flexibleSpend: flex, 
      daysLeft: left 
    };
  }, [txns, incomeTarget, fixedObligations]);

  // ── filtered transaction list ───────────────────────────────────────────────
  const [recentTxns, setRecentTxns] = useState(() => {
    let list = [...txns].filter(t => t.type !== 'transfer').sort((a, b) => b.date.localeCompare(a.date));
    if (txFilterType !== 'all') list = list.filter(t => t.type === txFilterType);
    if (txFilterCat  !== 'all') list = list.filter(t => t.category === txFilterCat);
    return list.slice(0, 12);
  });

  useEffect(() => {
    let list = [...txns].filter(t => t.type !== 'transfer').sort((a, b) => b.date.localeCompare(a.date));
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      list = list.filter(t => t.date === dateStr);
    }
    if (txFilterType !== 'all') list = list.filter(t => t.type === txFilterType);
    if (txFilterCat  !== 'all') list = list.filter(t => t.category === txFilterCat);
    setRecentTxns(selectedDate ? list : list.slice(0, 12));
  }, [txns, selectedDate, txFilterType, txFilterCat]);

  // ── month-over-month % change ──────────────────────────────────────────────
  const today = new Date();
  const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lmDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lmDate.getFullYear()}-${String(lmDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthData = monthlyTrend.find(m => m.fullKey === thisMonthKey) || { income: 0, expense: 0 };
  const lastMonthData = monthlyTrend.find(m => m.fullKey === lastMonthKey) || { income: 0, expense: 0 };

  const calcPercent = (thisV, lastV) => {
    if (lastV === 0) return thisV > 0 ? 100 : 0;
    return Math.round(((thisV - lastV) / lastV) * 100);
  };

  const incPercent = calcPercent(thisMonthData.income, lastMonthData.income);
  const expPercent = calcPercent(thisMonthData.expense, lastMonthData.expense);

  // ── category breakdown data ────────────────────────────────────────────────
  const catData = useMemo(() => {
    const latestMonth = recentTxns[0]?.date.slice(0, 7) || new Date().toISOString().slice(0, 7);
    const map = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      if (expTime === 'This Month' && t.date.slice(0, 7) !== latestMonth) return;
      if (expTime === 'This Year'  && t.date.slice(0, 4) !== latestMonth.slice(0, 4)) return;
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [txns, expTime, recentTxns]);

  // ── revenue chart data ─────────────────────────────────────────────────────
  const filteredTrend = useMemo(() => {
    if (revTime === 'All Time') return monthlyTrend;
    if (revTime === '2025') return monthlyTrend.filter(m => ['Oct','Nov','Dec'].includes(m.month));
    return monthlyTrend.filter(m => ['Jan','Feb','Mar'].includes(m.month));
  }, [monthlyTrend, revTime]);

  const revChartConfig = { income:  { label: 'Revenue', color: 'var(--income)'  } };
  const expChartConfig = { expense: { label: 'Expense', color: 'var(--expense)' } };

  const barPalette = ['#fb923c','#f97316','#ea580c','#fdba74','#fed7aa'];

  const activeFilters = [txFilterType !== 'all', txFilterCat !== 'all'].filter(Boolean).length;

  const greeting = getGreeting();

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">

      {/* ── Greeting row ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="col-span-12 flex flex-col xl:flex-row xl:items-end justify-between pb-4 gap-4"
      >
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none">
            {greeting},{' '}
            <span className="text-primary">{userName}</span>
          </h1>
        </div>

        {/* Compact Safe to Spend Widget inline with salutation */}
        <div className={cn(
          "flex items-center gap-4 px-5 py-2.5 rounded-xl border self-start xl:self-end w-full xl:w-auto",
          todayAllowance >= 0 
            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20" 
            : "border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30"
        )}>
           <div className="flex justify-between items-center w-full gap-5 sm:gap-8">
             <div className="flex flex-col">
                <span className={cn(
                  "text-[10px] uppercase font-medium tracking-widest flex items-center gap-1.5 whitespace-nowrap",
                  todayAllowance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", todayAllowance >= 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]")} />
                  Safe Today
                </span>
                <span className={cn(
                  "text-2xl font-medium tracking-tight mt-0.5",
                  todayAllowance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                   {todayAllowance < 0 ? "-" : ""}{fmt(Math.abs(todayAllowance))}
                </span>
             </div>

             <div className="w-px h-8 bg-border/50" />

             <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest whitespace-nowrap">Flexible Spend</span>
                <span className="text-sm font-medium text-foreground mt-0.5">{fmt(flexibleSpend)}</span>
             </div>

             <div className="w-px h-8 bg-border/50" />

             <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest whitespace-nowrap">Money Left</span>
                <span className="text-sm font-medium text-foreground mt-0.5 whitespace-nowrap">
                  {fmt(remainingPlayMoney)} <span className="text-[10px] text-muted-foreground font-medium">/ {daysLeft}d</span>
                </span>
             </div>
           </div>
        </div>
      </motion.div>

      {/* ── Balance card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: 'easeOut' }}
        className="col-span-12 md:col-span-5 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative min-h-[200px]"
        style={{ background: 'var(--accent-grad)' }}
      >
        {/* decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        {/* header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-white/90">Total Balance</p>
            <p className="text-[11px] text-white/60 mt-0.5">Just now</p>
          </div>

          {/* Currency picker – uses Dropdown component */}
          <Dropdown
            width={148}
            align="right"
            trigger={(toggle, open) => (
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2.5 py-1 rounded-full text-[11px] font-semibold outline-none cursor-pointer hover:bg-white/25 transition-colors"
              >
                {CURRENCIES[currency]?.flag} {currency}
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200"
                  style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                />
              </button>
            )}
          >
            {Object.keys(CURRENCIES).map(key => (
              <DropdownItem
                key={key}
                label={`${CURRENCIES[key].flag}  ${key}`}
                active={currency === key}
                onClick={() => setCurrency(key)}
              />
            ))}
          </Dropdown>
        </div>

        {/* balance pill */}
        <div className="my-3.5 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-xs text-white/80 mb-1">Available to Spend</p>
          <p className="text-3xl font-semibold text-white tracking-tight">{fmt(balance)}</p>
        </div>

        {/* action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => onAdd('income')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white border border-white/25 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <ArrowDownRight size={14} /> Add Income
          </button>
          <button
            onClick={() => onAdd('expense')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white border border-white/25 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <ArrowUpRight size={14} /> Add Expense
          </button>
        </div>
      </motion.div>

      {/* ── Right bento column: Revenue + Expenses + Balances ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45, ease: 'easeOut' }}
        className="col-span-12 md:col-span-7 grid grid-cols-2 gap-4"
      >
        {/* Revenue stat */}
        <StatCard
          title="Total Revenue"
          icon={<Activity size={14} />}
          value={fmt(income)}
          change={incPercent}
          chartData={monthlyTrend}
          chartConfig={revChartConfig}
          dataKey="income"
          color="var(--income)"
          delay={0.1}
        />

        {/* Expense stat */}
        <StatCard
          title="Total Expenses"
          icon={<CreditCard size={14} />}
          value={fmt(expense)}
          change={expPercent}
          chartData={monthlyTrend}
          chartConfig={expChartConfig}
          dataKey="expense"
          color="var(--expense)"
          delay={0.15}
        />

        {/* Balances widget — full width bottom of bento */}
        <div className="col-span-2">
          <BalancesWidget
            txns={txns}
            members={ledgerMembers}
            currentUserId={currentUserId}
            ledgerName={activeLedger?.name}
            fmt={fmt}
            onRequestSettle={onRequestSettle}
          />
        </div>
      </motion.div>

      {/* ── Expense breakdown ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 md:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-sm"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-foreground">Expenses Breakdown</h3>
          <Dropdown
            width={148}
            trigger={(toggle, open) => (
              <button
                onClick={toggle}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                {expTime}
                <ChevronDown
                  size={12}
                  className="transition-transform duration-200"
                  style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                />
              </button>
            )}
          >
            {['This Month', 'This Year', 'All Time'].map(opt => (
              <DropdownItem key={opt} label={opt} active={expTime === opt} onClick={() => setExpTime(opt)} />
            ))}
          </Dropdown>
        </div>

        {/* gradient bar chart */}
        {catData.length > 0 ? (
          <>
            <div className="flex gap-1.5 h-11 mb-4">
              {catData.map((d, i) => (
                <div
                  key={d.name}
                  title={`${d.name}: ${fmt(d.value)}`}
                  style={{
                    flex: d.value,
                    background: `linear-gradient(to top, ${barPalette[i % barPalette.length]}99, ${barPalette[i % barPalette.length]})`,
                  }}
                  className="rounded-lg"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {catData.map((d, i) => (
                <div key={d.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-sm shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No expense data</p>
        )}
      </motion.div>

      {/* ── Revenue bar chart ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 md:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-sm"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
          <Dropdown
            width={140}
            trigger={(toggle, open) => (
              <button
                onClick={toggle}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                {revTime}
                <ChevronDown
                  size={12}
                  className="transition-transform duration-200"
                  style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                />
              </button>
            )}
          >
            {['All Time', '2026', '2025'].map(opt => (
              <DropdownItem key={opt} label={opt} active={revTime === opt} onClick={() => setRevTime(opt)} />
            ))}
          </Dropdown>
        </div>

        <ChartContainer config={revChartConfig} className="w-full h-[160px]">
          <BarChart data={filteredTrend} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={0}>
            <defs>
              <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted, #9d97b0)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted, #9d97b0)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
            <Tooltip content={<MiniTooltip color="#f97316" />} cursor={{ fill: 'rgba(249,115,22,0.05)' }} />
            <Bar dataKey="income" name="Revenue" fill="url(#gradOrange)" radius={[6, 6, 2, 2]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
      </motion.div>

      {/* ── Transaction history ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
        className="col-span-12 border border-border rounded-2xl shadow-sm overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        {/* header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Transaction History</h3>

          <div className="flex items-center gap-2">
            {/* date picker */}
            <Dropdown
              width={280}
              align="right"
              trigger={toggle => (
                <button
                  onClick={toggle}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-8 text-xs rounded-lg border transition-colors',
                    selectedDate
                      ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <CalendarDays size={13} />
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Select date'
                  }
                  {selectedDate && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); setSelectedDate(undefined); }}
                      className="ml-1 opacity-60 hover:opacity-100 text-sm leading-none"
                    >
                      ×
                    </span>
                  )}
                </button>
              )}
            >
              <div className="p-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-xl"
                />
              </div>
            </Dropdown>

            {/* filter dropdown */}
            <Dropdown
              width={224}
              align="right"
              trigger={(toggle) => (
                <button
                  onClick={toggle}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-8 text-xs rounded-lg border transition-colors',
                    activeFilters > 0
                      ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Filter size={13} />
                  Filter
                  {activeFilters > 0 && (
                    <span className="ml-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {activeFilters}
                    </span>
                  )}
                </button>
              )}
            >
              {(hide) => (
                <div className="pb-1">
                  <div className="px-3 pt-2.5 pb-2 border-b border-border mb-1">
                    <p className="text-xs font-bold text-foreground">Filter transactions</p>
                  </div>

                  <div className="px-1 py-1">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-2 py-1">Type</p>
                    {[['all','All Types'],['income','Income'],['expense','Expense']].map(([val, label]) => (
                      <DropdownItem
                        key={val}
                        label={label}
                        active={txFilterType === val}
                        onClick={() => { setTxFilterType(val); }}
                      />
                    ))}
                  </div>

                  <div className="border-t border-border mt-1 px-1 pt-1">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-2 py-1">Category</p>
                    <div className="max-h-40 overflow-y-auto">
                      <DropdownItem
                        label="All Categories"
                        active={txFilterCat === 'all'}
                        onClick={() => setTxFilterCat('all')}
                      />
                      {allTxCats.map(cat => (
                        <DropdownItem
                          key={cat}
                          label={cat}
                          active={txFilterCat === cat}
                          onClick={() => setTxFilterCat(cat)}
                        />
                      ))}
                    </div>
                  </div>

                  {activeFilters > 0 && (
                    <button
                      onClick={() => { setTxFilterType('all'); setTxFilterCat('all'); }}
                      className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-2 border-t border-border mt-1 transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </Dropdown>
          </div>
        </div>

        {/* transaction grid – receipt cards are tall, use fewer columns */}
        {recentTxns.length > 0 ? (
          <div className="px-5 pb-6 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-6">
              {recentTxns.map((tx, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3, ease: 'easeOut' }}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('sourceIdx', idx.toString());
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const fromIdx = parseInt(e.dataTransfer.getData('sourceIdx'), 10);
                    if (isNaN(fromIdx) || fromIdx === idx) return;
                    const newList = [...recentTxns];
                    const item = newList.splice(fromIdx, 1)[0];
                    newList.splice(idx, 0, item);
                    setRecentTxns(newList);
                  }}
                  key={tx.id}
                  className="w-full"
                >
                  <TransactionCard tx={tx} fmt={fmt} onEdit={onEdit} onDelete={onDelete} />
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No transactions found.
          </div>
        )}
      </motion.div>

    </div>
  );
}
