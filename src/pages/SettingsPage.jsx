import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Sun, Moon, Database, Download, 
  Trash2, HardDrive, Smartphone,
  Laptop, AlertCircle, Terminal, Check,
  Lock, Eye, EyeOff, ShieldCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/utils/data';
import { cn } from '@/lib/utils';

import { supabase } from '@/lib/supabase';

export function SettingsPage({
  session,
  userName, setUserName,
  currency, setCurrency,
  txns, setTxns,
  incomeTarget, setIncomeTarget,
  fixedObligations, setFixedObligations,
  onProfileUpdate,
  avatars,
  currentAvatarId,
}) {
  const [deviceInfo, setDeviceInfo] = useState({ name: 'Unknown Device', os: 'Unknown OS', icon: Laptop });
  const [email, setEmail] = useState(session?.user?.email || '');
  const [pendingAvatar, setPendingAvatar] = useState(currentAvatarId);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const PW_RULES = [
    { label: '8+ characters',    test: (pw) => pw.length >= 8 },
    { label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'Number',           test: (pw) => /\d/.test(pw) },
    { label: 'Special char',     test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  ];
  const pwStrength = newPw ? PW_RULES.filter(r => r.test(newPw)).length : 0;
  const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const STRENGTH_COLORS = ['', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];
  const STRENGTH_TEXT_COLORS = ['', 'text-rose-500', 'text-amber-500', 'text-sky-500', 'text-emerald-500'];

  const txnsBytes = new Blob([JSON.stringify(txns)]).size;
  const maxStorage = 5000000;
  const storagePct = Math.min(100, (txnsBytes / maxStorage) * 100);

  useEffect(() => {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    let name = 'Unknown Browser';
    let icon = Laptop;

    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; icon = Smartphone; }
    else if (ua.includes('like Mac OS X')) { os = 'iOS'; icon = Smartphone; }

    if (ua.includes('Chrome')) name = 'Chrome';
    else if (ua.includes('Firefox')) name = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) name = 'Safari';
    else if (ua.includes('Edge')) name = 'Edge';
    
    const res = `${window.screen.width}x${window.screen.height}`;
    setDeviceInfo({ name: `${name} (${res})`, os, icon });
  }, []);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(txns, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `kinetic-export-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const handleReset = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently erase all transaction history. Proceed?")) {
      setTxns([]);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pwStrength < 3) {
      setPwMsg({ type: 'error', text: 'Password must be at least "Good" strength.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwLoading(true);
    try {
      // Re-authenticate with current password first
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPw,
      });
      if (loginErr) {
        setPwMsg({ type: 'error', text: 'Current password is incorrect.' });
        setPwLoading(false);
        return;
      }
      // Update to the new password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      toast.success('Password changed');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    setPendingAvatar(currentAvatarId);
  }, [currentAvatarId]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        display_name: userName,
        avatar_url: pendingAvatar,
        currency: currency,
        income_target: incomeTarget,
        fixed_obligations: fixedObligations,
        updated_at: new Date()
      }, { onConflict: 'id' });

    if (error) {
      toast.error('Failed to update profile');
    } else {
      await onProfileUpdate();
      setHasChanges(false);
      toast.success('Profile updated');
    }
    setIsSaving(false);
  };

  // Shared card style
  const cardCls = "break-inside-avoid bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden";
  const headerCls = "flex items-center gap-3 border-b border-border/60 justify-between pb-3";

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-medium text-foreground tracking-tight leading-none">
            Kinetic <span className="text-primary font-bold">Config</span>
          </h1>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">

        {/* 1. Identity (Medium) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <div className={headerCls}>
            <div className="flex items-center gap-2">
              <User size={15} className="text-primary" />
              <h2 className="text-[13px] font-bold text-foreground">Identity</h2>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-sm">ID-001</span>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={e => { setUserName(e.target.value); setHasChanges(true); }}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Account Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-xs text-muted-foreground cursor-not-allowed font-medium opacity-60"
              />
            </div>
            
            <button
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-rose-500/30"
            >
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* 2. Financial Baseline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }} className={cardCls}>
          <div className={headerCls}>
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-emerald-500" />
              <h2 className="text-[13px] font-bold text-foreground">Financial Baseline</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
             <p className="text-[10px] text-muted-foreground font-medium mb-1">
               Set your monthly income and fixed obligations (like rent and bills) to power the Guilt-Free allowance engine.
             </p>
             <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Monthly Income</label>
                <div className="flex gap-2 items-center bg-muted border border-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input 
                    type="text" 
                    value={incomeTarget} 
                    onChange={e => { setIncomeTarget(Number(e.target.value.replace(/\D/g, ''))); setHasChanges(true); }}
                    className="w-full bg-transparent outline-none text-xs font-bold text-foreground tabular-nums"
                  />
                </div>
             </div>
             <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Fixed Obligations</label>
                <div className="flex gap-2 items-center bg-muted border border-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input 
                    type="text" 
                    value={fixedObligations} 
                    onChange={e => { setFixedObligations(Number(e.target.value.replace(/\D/g, ''))); setHasChanges(true); }}
                    className="w-full bg-transparent outline-none text-xs font-bold text-foreground tabular-nums"
                  />
                </div>
             </div>
          </div>
        </motion.div>

        {/* 3. Localization */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className={cardCls}>
          <div className={headerCls}>
            <div className="flex items-center gap-2">
              <Sun size={15} className="text-amber-500" />
              <h2 className="text-[13px] font-bold text-foreground">Localization</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Base Currency</label>
              <select
                value={currency}
                onChange={e => { setCurrency(e.target.value); setHasChanges(true); }}
                className="w-full bg-muted border border-border rounded-xl px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/50 font-bold appearance-none cursor-pointer"
              >
                {Object.keys(CURRENCIES).map(c => (
                  <option key={c} value={c}>{c} — {CURRENCIES[c].label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* 4. Change Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className={cardCls}>
          <div className={headerCls}>
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-amber-500" />
              <h2 className="text-[13px] font-bold text-foreground">Change Password</h2>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-sm">SEC</span>
          </div>
          
          {(() => {
            const providers = session?.user?.app_metadata?.providers || [];
            const isGoogleOnly = providers.includes('google') && !providers.includes('email');
            
            if (isGoogleOnly) {
              return (
                <div className="flex flex-col items-center justify-center text-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 mt-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mb-2">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98Z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
                  </svg>
                  <p className="text-xs font-bold text-foreground">Google Authentication</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Your account is securely linked to Google. To change your password, please update your Google account settings.
                  </p>
                </div>
              );
            }
            
            return (
              <div className="flex flex-col gap-3">
            {/* Status message */}
            <AnimatePresence>
              {pwMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    'p-2.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider overflow-hidden border',
                    pwMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  )}
                >
                  {pwMsg.type === 'success' ? <ShieldCheck size={13} /> : <AlertCircle size={13} />}
                  {pwMsg.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Current Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => { setCurrentPw(e.target.value); setPwMsg(null); }}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium pr-8"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwMsg(null); }}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                placeholder="••••••••"
              />
              {newPw && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= pwStrength ? STRENGTH_COLORS[pwStrength] : 'bg-muted')} />
                    ))}
                  </div>
                  <span className={cn('text-[9px] font-bold uppercase tracking-wider', STRENGTH_TEXT_COLORS[pwStrength])}>
                    {STRENGTH_LABELS[pwStrength]}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Confirm New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setPwMsg(null); }}
                className={cn(
                  'w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium',
                  confirmPw && newPw !== confirmPw && 'ring-1 ring-rose-400/50'
                )}
                placeholder="••••••••"
              />
              {confirmPw && newPw !== confirmPw && <p className="text-[9px] font-bold text-rose-500 mt-1">Passwords do not match</p>}
            </div>
            <button
              onClick={handleChangePassword}
              disabled={pwLoading || !currentPw || !newPw || !confirmPw || pwStrength < 3 || newPw !== confirmPw}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pwLoading ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
              {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          );
        })()}
        </motion.div>

        {/* 5. Database / Storage */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardCls}>
          <div className={headerCls}>
            <div className="flex items-center gap-2">
              <Database size={15} className="text-rose-500" />
              <h2 className="text-[13px] font-bold text-foreground">Data Cluster</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
             <div className="flex items-end justify-between">
                <span className="text-2xl font-black tabular-nums text-foreground tracking-tight leading-none">{txnsBytes}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Bytes</span>
             </div>
             <div>
               <div className="flex justify-between text-[9px] mb-1 font-bold text-muted-foreground">
                 <span>Allocated</span>
                 <span>5 MB Max</span>
               </div>
               <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                 <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(2, storagePct)}%` }} />
               </div>
             </div>
             
             <div className="flex gap-2 mt-2">
               <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-border/50">
                 <Download size={12}/> Backup
               </button>
               <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-rose-500/30">
                 <Trash2 size={12}/> Format
               </button>
             </div>
          </div>
        </motion.div>

      </div>

      {/* Avatar Selection (Integrated Horizontal Strip) */}
      <div className="mt-6">
        <div className="flex flex-col items-center">
          <h2 className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-60 mb-3">Identity Selection</h2>
          
          <div className="flex items-center justify-center gap-5 py-6 px-8 overflow-x-auto no-scrollbar max-w-full">
            {avatars.map((av) => (
              <button
                key={av.id}
                onClick={() => {
                  setPendingAvatar(av.id);
                  setHasChanges(true);
                }}
                className={cn(
                  "group relative shrink-0 transition-all duration-300",
                  pendingAvatar === av.id ? "scale-105" : "hover:scale-102 opacity-40 hover:opacity-100"
                )}
              >
                <div className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all shadow-lg",
                  pendingAvatar === av.id ? "border-primary shadow-primary/20" : "border-border/50"
                )}>
                  <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                </div>
                
                <AnimatePresence>
                  {pendingAvatar === av.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-10"
                    >
                      Active
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          {/* Action Button Centered Directly Below */}
          <div className="h-10 mt-2">
            <AnimatePresence>
              {(pendingAvatar !== currentAvatarId || hasChanges) && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary hover:bg-orange-600 text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? "Syncing..." : "Update Profile"}
                  {!isSaving && <Check size={12} strokeWidth={3} />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
