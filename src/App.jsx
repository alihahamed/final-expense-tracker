import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LedgersPage } from './pages/LedgersPage';
import { LoginPage } from './pages/LoginPage';
import { SettleUpModal } from './components/SettleUpModal';
import { supabase } from './lib/supabase';
import { buildMonthlyTrend, CURRENCIES, CAT_EMOJI } from './utils/data';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard, Receipt, Settings, Moon, Sun,
  X, Check, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Users,
  User, LogOut,
} from 'lucide-react';
import Logo from './assets/app-logo.png';
import Av1 from './assets/3D_Portrait_Avatar_1.png';
import Av12 from './assets/3D_Portrait_Avatar_12.png';
import Av24 from './assets/3D_Portrait_Avatar_24.png';
import Av25 from './assets/3D_Portrait_Avatar_25.png';

import './index.css';

const AVATARS = [
  { id: 'av1',  url: Av1,  name: 'Portrait 1' },
  { id: 'av12', url: Av12, name: 'Portrait 12' },
  { id: 'av24', url: Av24, name: 'Portrait 24' },
  { id: 'av25', url: Av25, name: 'Portrait 25' },
];

// ── currency formatter ────────────────────────────────────────────────────────
function makeFmt(currency) {
  const { locale } = CURRENCIES[currency] || CURRENCIES.USD;
  return (amount) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
}

// ── categories ────────────────────────────────────────────────────────────────
const INCOME_CATS  = ['Salary','Freelance','Interest','Investment','Other'];
const EXPENSE_CATS = ['Rent','Groceries','Dining','Utilities','Transport','Shopping','Health','Entertainment','Education','Other'];

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Modal  (enter: slide-up + fade, exit: fade down)
// ─────────────────────────────────────────────────────────────────────────────
function TxnModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [type,  setType]  = useState(initial?.type       || 'expense');
  const [cat,   setCat]   = useState(initial?.category    || '');
  const [desc,  setDesc]  = useState(initial?.description || '');
  const [amt,   setAmt]   = useState(initial ? String(Math.abs(initial.amount)) : '');
  const [date,  setDate]  = useState(initial?.date        || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const handleSave = () => {
    const amount = parseFloat(amt);
    if (!cat)              return setError('Please select a category.');
    if (!desc.trim())      return setError('Please enter a description.');
    if (isNaN(amount) || amount <= 0) return setError('Please enter a valid positive amount.');

    onSave({
      id: initial?.id || undefined, // undefined signals a new insert
      type,
      category: cat,
      description: desc.trim(),
      amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      date,
    });
    onClose();
  };

  const inputCls = 'w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all';
  const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block';

  return (
    /* Backdrop */
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <motion.div
        key="modal-panel"
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{   opacity: 0, y: 40,  scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
        className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 relative"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            !isEdit && type === 'income'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : !isEdit
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'
              : 'bg-primary/10 text-primary',
          )}>
            {isEdit
              ? <Wallet size={16} />
              : type === 'income'
              ? <ArrowDownLeft size={16} />
              : <ArrowUpRight size={16} />
            }
          </div>
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? 'Edit Transaction' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
          </h2>
        </div>

        {/* Type toggle — only show on new transaction */}
        {!isEdit && (
          <div className="flex bg-muted rounded-xl p-1 mb-5 gap-1">
            {['income', 'expense'].map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setCat(''); setError(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200',
                  type === t
                    ? t === 'income'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-rose-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'income' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={cat}
              onChange={e => { setCat(e.target.value); setError(''); }}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {cats.map(c => (
                <option key={c} value={c}>{CAT_EMOJI[c] ?? '📦'} {c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={desc}
              onChange={e => { setDesc(e.target.value); setError(''); }}
              className={inputCls}
            />
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amt}
                onChange={e => { setAmt(e.target.value); setError(''); }}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl px-3 py-2 mt-4">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95',
              !isEdit && type === 'income'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : !isEdit
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-primary hover:bg-primary/90',
            )}
          >
            <Check size={14} />
            {isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sidebar nav config ────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'ledgers',      label: 'Workspaces',   icon: Users },
];

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Ledgers & Transactions State
  const [ledgers, setLedgers] = useState([]);
  const [activeLedger, setActiveLedger] = useState(null);
  const [txns, setTxns] = useState([]);
  
  const [currency, setCurrency] = useState('USD');
  const [page,     setPage]     = useState('dashboard');
  const [modal,        setModal]        = useState(null);
  const [settleModal,  setSettleModal]  = useState(null);
  const [ledgerMembers, setLedgerMembers] = useState([]);
  const [userName, setUserName] = useState('Alex');
  const [incomeTarget, setIncomeTarget] = useState(5000);
  const [fixedObligations, setFixedObligations] = useState(2000);
  const [avatarUrl, setAvatarUrl] = useState(Av1);
  const [profileLoading, setProfileLoading] = useState(true);

  // 1. Auth Subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUserName(data.display_name || 'Alex');
      setCurrency(data.currency || 'USD');
      setIncomeTarget(data.income_target || 5000);
      setFixedObligations(data.fixed_obligations || 2000);
      
      const foundAv = AVATARS.find(a => a.id === data.avatar_url);
      setAvatarUrl(foundAv ? foundAv.url : Av1);
    } else {
      // Create default profile if not exists
      const defaultProfile = {
        id: userId,
        display_name: 'Alex',
        avatar_url: 'av1',
        currency: 'USD',
        income_target: 5000,
        fixed_obligations: 2000
      };
      await supabase.from('profiles').upsert(defaultProfile);
      setUserName('Alex');
      setCurrency('USD');
      setIncomeTarget(5000);
      setFixedObligations(2000);
      setAvatarUrl(Av1);
    }
    setProfileLoading(false);
    setLoadingSession(false);
  }

  // 2. Load all ledgers + create default if none exist
  const isCheckingDefault = useRef(false);

  useEffect(() => {
    if (!session?.user) return;
    if (isCheckingDefault.current) return;
    isCheckingDefault.current = true;

    async function initLedgers() {
      // Fetch all ledger IDs this user is a member of
      const { data: members, error: mErr } = await supabase
        .from('ledger_members')
        .select('ledger_id')
        .eq('user_id', session.user.id);

      if (mErr) return;

      if (!members || members.length === 0) {
        // No ledgers — create a Personal Ledger
        const defaultLedgerId = crypto.randomUUID();
        const { error: lErr } = await supabase
          .from('ledgers')
          .insert([{ id: defaultLedgerId, name: 'Personal Ledger' }]);
        if (!lErr) {
          await supabase
            .from('ledger_members')
            .insert([{ ledger_id: defaultLedgerId, user_id: session.user.id }]);
          const { data: newLedger } = await supabase
            .from('ledgers')
            .select('*')
            .eq('id', defaultLedgerId)
            .single();
          if (newLedger) {
            setLedgers([newLedger]);
            setActiveLedger(newLedger);
            localStorage.setItem('kinetic_active_ledger', newLedger.id);
          }
        }
        return;
      }

      // Fetch full ledger data for all member ledger IDs
      const ledgerIds = [...new Set(members.map(m => m.ledger_id))];
      const { data: ledgersData, error: lErr } = await supabase
        .from('ledgers')
        .select('*')
        .in('id', ledgerIds)
        .order('created_at', { ascending: false });

      if (!lErr && ledgersData) {
        setLedgers(ledgersData);
        // Restore last active ledger from localStorage
        const savedId = localStorage.getItem('kinetic_active_ledger');
        const saved = savedId ? ledgersData.find(l => l.id === savedId) : null;
        setActiveLedger(prev => prev ?? saved ?? ledgersData[0]);
      }
    }

    initLedgers();
  }, [session]);

  // Persist active ledger to localStorage whenever it changes
  useEffect(() => {
    if (activeLedger?.id) {
      localStorage.setItem('kinetic_active_ledger', activeLedger.id);
    }
  }, [activeLedger?.id]);

  // 3. Fetch Transactions when Active Ledger changes & Subscribe to Websocket
  useEffect(() => {
    if (!activeLedger?.id) {
       setTxns([]);
       return;
    }

    async function fetchTxns() {
       const { data, error } = await supabase
         .from('transactions')
         .select('*')
         .eq('ledger_id', activeLedger.id)
         .order('date', { ascending: false })
         .order('created_at', { ascending: false });

       if (!error && data) {
          setTxns(data);
       }
    }

    fetchTxns();

    // WEBSOCKET: delta-based updates — no full refetch on every event
    const channel = supabase
      .channel(`ledger-${activeLedger.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `ledger_id=eq.${activeLedger.id}` },
        (payload) => {
          const tx = payload.new;
          setTxns(prev => {
            // Skip if already in state (own insert already applied optimistically)
            if (prev.some(t => t.id === tx.id)) return prev;
            return [tx, ...prev].sort((a, b) =>
              b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
            );
          });
          // Toast partner's settlement to current user
          if (tx.type === 'transfer' && tx.user_id !== session.user.id) {
            toast.success('Settlement received', {
              description: `${tx.description} — ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(tx.amount))}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `ledger_id=eq.${activeLedger.id}` },
        (payload) => {
          setTxns(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions', filter: `ledger_id=eq.${activeLedger.id}` },
        (payload) => {
          setTxns(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLedger]);

  // 4. Fetch ledger members when active ledger changes
  useEffect(() => {
    if (!activeLedger?.id) { setLedgerMembers([]); return; }
    let cancelled = false;
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .rpc('get_ledger_members_with_email', { p_ledger_id: activeLedger.id });
      if (!cancelled && !error && data) setLedgerMembers(data);
    };
    fetchMembers();
    const ch = supabase
      .channel(`members-${activeLedger.id}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'ledger_members',
            filter: `ledger_id=eq.${activeLedger.id}` },
          fetchMembers)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeLedger]);

  const fmt          = useMemo(() => makeFmt(currency), [currency]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(txns), [txns]);

  const handleAdd    = useCallback((type) => {
    if (!activeLedger) return alert('Select or create a workspace first!');
    setModal({ mode: 'add', type });
  }, [activeLedger]);
  
  const handleEdit   = useCallback((tx)   => setModal({ mode: 'edit', tx }),  []);
  
  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
       setTxns(prev => prev.filter(t => t.id !== id));
    } else {
       console.error("Delete failed:", error);
    }
  }, []);

  const handleSave = useCallback(async (tx) => {
    if (!activeLedger?.id) return;
    
    if (tx.id) {
       // Update
       const { data, error } = await supabase
         .from('transactions')
         .update({
            type: tx.type,
            category: tx.category,
            description: tx.description,
            amount: tx.amount,
            date: tx.date
         })
         .eq('id', tx.id)
         .select()
         .single();
         
       if (!error && data) {
         setTxns(prev => prev.map(t => t.id === data.id ? data : t));
       }
    } else {
       // Insert
       const { data, error } = await supabase
         .from('transactions')
         .insert([{
            ledger_id: activeLedger.id,
            user_id: session.user.id,
            type: tx.type,
            category: tx.category,
            description: tx.description,
            amount: tx.amount,
            date: tx.date
         }])
         .select()
         .single();
         
       if (!error && data) {
         setTxns(prev => [data, ...prev].sort((a,b) => b.date.localeCompare(a.date)));
       }
    }
  }, [activeLedger, session]);

  const handleSettle = useCallback(async ({ payerId, amount, date, note }) => {
    if (!activeLedger?.id) return;
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ledger_id: activeLedger.id,
        user_id: payerId,
        type: 'transfer',
        category: 'Settlement',
        description: note || 'Settle up',
        amount: Math.abs(amount),
        date,
      }])
      .select()
      .single();
    if (error) { toast.error('Failed to record settlement'); return; }
    setTxns(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    toast.success('Settlement recorded');
    setSettleModal(null);
  }, [activeLedger]);

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-primary/30">
      <Toaster theme="light" position="top-center" />
      {!session && !loadingSession && (
         <LoginPage />
      )}

      {session && (
        <>
          <div className="h-screen flex p-4 gap-4 bg-black">
            {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
            <aside
              className="w-64 shrink-0 flex flex-col px-4 py-8 bg-black text-white rounded-3xl shadow-2xl relative"
            >
              {/* Logo area */}
              <div className="px-2 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-orange-500/10">
                    <img src={Logo} alt="Kinetic Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[15px] font-bold text-white leading-none block">Kinetic</span>
                    <span className="text-[11px] text-white/40 font-medium">Ledger Pro</span>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-1.5">
                {NAV.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPage(id)}
                    className={cn(
                      'relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all duration-200 text-left w-full group',
                      page === id
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/90 hover:bg-white/5',
                    )}
                  >
                    {page === id && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 w-1.5 h-6 bg-primary rounded-full"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon
                      size={18}
                      className={cn(
                        'shrink-0 transition-colors',
                        page === id ? 'text-primary' : 'text-white/30 group-hover:text-white/60',
                      )}
                    />
                    {label}
                  </button>
                ))}
              </nav>

              {/* Bottom Section */}
              <div className="mt-auto flex flex-col gap-2">
                {/* Settings Link */}
                <button
                  onClick={() => setPage('settings')}
                  className={cn(
                    'relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all duration-200 text-left w-full group',
                    page === 'settings'
                      ? 'text-white'
                      : 'text-white/45 hover:text-white/90 hover:bg-white/5',
                  )}
                >
                  {page === 'settings' && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 w-1.5 h-6 bg-primary rounded-full"
                    />
                  )}
                  <Settings
                    size={18}
                    className={cn(
                      'shrink-0 transition-colors',
                      page === 'settings' ? 'text-primary' : 'text-white/30 group-hover:text-white/60',
                    )}
                  />
                  Settings
                </button>

                <div className="h-px bg-white/5 mx-2 my-2" />

                {/* Profile Card */}
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-15 h-15 rounded-2xl overflow-hidden bg-white/10 border border-white/10 shrink-0">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[16px] font-medium text-white truncate">
                      {userName || session?.user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-[10px] text-white/35 font-medium truncate uppercase tracking-tight">
                      Standard Plan
                    </span>
                  </div>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="ml-auto p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Main content wrapper ────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 bg-card rounded-3xl overflow-hidden border border-border/10 shadow-sm relative">
              {/* Force dark mode for main if dark state is removed? 
                  The user said "remove the dark mode", so we should ideally stick to one theme or let it be background controlled.
                  However, "min-h-screen bg-background" is still outside.
              */}
              <main className="flex-1 p-5 lg:p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {page === 'dashboard' && (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{   opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <DashboardPage
                        txns={txns}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        monthlyTrend={monthlyTrend}
                        onAdd={handleAdd}
                        currency={currency}
                        setCurrency={setCurrency}
                        fmt={fmt}
                        userName={userName}
                        incomeTarget={incomeTarget}
                        fixedObligations={fixedObligations}
                        ledgerMembers={ledgerMembers}
                        currentUserId={session.user.id}
                        activeLedger={activeLedger}
                        onRequestSettle={(p) => setSettleModal(p)}
                      />
                    </motion.div>
                  )}
                  {page === 'transactions' && (
                    <motion.div
                      key="transactions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{   opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <TransactionsPage
                        txns={txns}
                        fmt={fmt}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  )}
                  {page === 'ledgers' && (
                    <motion.div
                      key="ledgers"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{   opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <LedgersPage
                        session={session}
                        ledgers={ledgers} setLedgers={setLedgers}
                        activeLedger={activeLedger} setActiveLedger={setActiveLedger}
                      />
                    </motion.div>
                  )}
                  {page === 'settings' && (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{   opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <SettingsPage
                        session={session}
                        userName={userName} setUserName={setUserName}
                        currency={currency} setCurrency={setCurrency}
                        txns={txns} setTxns={setTxns}
                        incomeTarget={incomeTarget} setIncomeTarget={setIncomeTarget}
                        fixedObligations={fixedObligations} setFixedObligations={setFixedObligations}
                        onProfileUpdate={() => fetchProfile(session.user.id)}
                        avatars={AVATARS}
                        currentAvatarId={AVATARS.find(a => a.url === avatarUrl)?.id || 'av1'}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          </div>

          {/* ── Modals with AnimatePresence ──────────────────────────────────────── */}
          <AnimatePresence>
            {modal && (
              <TxnModal
                key="txn-modal"
                initial={modal.mode === 'edit' ? modal.tx : { type: modal.type }}
                onSave={handleSave}
                onClose={() => setModal(null)}
              />
            )}
            {settleModal && (
              <SettleUpModal
                key="settle-modal"
                preset={settleModal}
                fmt={fmt}
                onConfirm={handleSettle}
                onClose={() => setSettleModal(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
