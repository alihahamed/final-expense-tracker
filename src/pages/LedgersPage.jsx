import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, Plus, KeyRound, ArrowRight, UserPlus, FileText, Share2, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function LedgersPage({ 
  session, 
  ledgers, setLedgers, 
  activeLedger, setActiveLedger 
}) {
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load ledgers on mount
  useEffect(() => {
    fetchLedgers();
  }, []);

  async function fetchLedgers(preferredLedgerId = null) {
    const { data: members, error: mErr } = await supabase
      .from('ledger_members')
      .select('ledger_id')
      .eq('user_id', session.user.id);

    if (mErr) { console.error('[fetchLedgers] members error:', mErr); return; }
    if (!members?.length) return;

    const ledgerIds = [...new Set(members.map(m => m.ledger_id))];
    const { data: ledgersData, error: lErr } = await supabase
      .from('ledgers')
      .select('*')
      .in('id', ledgerIds)
      .order('created_at', { ascending: false });

    if (lErr) { console.error('[fetchLedgers] ledgers error:', lErr); return; }
    if (ledgersData) {
      setLedgers(ledgersData);
      const preferred = preferredLedgerId
        ? ledgersData.find(l => l.id === preferredLedgerId)
        : null;
      setActiveLedger(prev => preferred ?? prev ?? ledgersData[0]);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const name = createName.trim();
    if (!name) return toast.error('Workspace name cannot be empty.');
    setIsCreating(true);

    try {
      const newLedgerId = crypto.randomUUID();

      const { error: lErr } = await supabase
        .from('ledgers')
        .insert([{ id: newLedgerId, name }]);
      if (lErr) throw lErr;

      const { error: mErr } = await supabase
        .from('ledger_members')
        .insert([{ ledger_id: newLedgerId, user_id: session.user.id }]);
      if (mErr) throw mErr;

      await fetchLedgers(newLedgerId);
      setCreateName('');
      toast.success(`Workspace "${name}" created!`);
    } catch (err) {
      console.error('[handleCreate] error:', err);
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.length !== 6) {
       return toast.error('Invite code must be exactly 6 characters.');
    }
    setIsJoining(true);

    try {
      const { data: joinedLedgerId, error: fnErr } = await supabase.rpc('join_ledger', {
        invite: joinCode.trim()
      });

      if (fnErr) throw fnErr;

      await fetchLedgers(joinedLedgerId);
      toast.success('Successfully joined Workspace!');
      setJoinCode('');
    } catch (err) {
      toast.error('Failed to join ledger. Invalid code or already a member.');
    } finally {
      setIsJoining(false);
    }
  }

  async function handleDeleteLedger(ledgerId, ledgerName, e) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${ledgerName}"?\n\nIf you own this workspace, it will be deleted for everyone. All transactions will be permanently lost.`)) return;
    
    try {
      // NOTE: For safety, Supabase Postgres should ideally have ON DELETE CASCADE for foreign keys.
      // If it fails due to foreign key constraints, the catch block will toast an error.
      const { error } = await supabase.from('ledgers').delete().eq('id', ledgerId);
      
      if (error) throw error;
      
      toast.success(`Workspace deleted.`);
      const remaining = ledgers.filter(l => l.id !== ledgerId);
      setLedgers(remaining);
      
      if (activeLedger?.id === ledgerId) {
        setActiveLedger(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      toast.error("Could not delete workspace. It might have existing transactions.");
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none mb-2">
            Workspaces
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Manage Collaborative Ledgers
          </p>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-widest self-start md:self-auto">
          {ledgers.length} Active {ledgers.length === 1 ? 'Workspace' : 'Workspaces'}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Existing Ledgers mapped as premium cards */}
        {ledgers.map((ledger, idx) => {
          const isActive = activeLedger?.id === ledger.id;
          return (
            <motion.div
              key={ledger.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveLedger(ledger)}
              className={cn(
                "group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px]",
                isActive 
                  ? "bg-primary/5 border-primary/40 shadow-sm" 
                  : "bg-surface border-border hover:border-primary/30 hover:shadow-sm"
              )}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    {isActive ? <Check size={18} /> : <FileText size={18} />}
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-widest font-black bg-primary text-white px-2.5 py-1 rounded-lg">
                        Active
                      </span>
                    )}
                    <button 
                      onClick={(e) => handleDeleteLedger(ledger.id, ledger.name, e)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors rounded-lg"
                      title="Delete Workspace"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-medium text-foreground tracking-tight leading-tight">
                  {ledger.name}
                </h3>
              </div>

              {isActive ? (
                <div className="mt-6 flex items-center justify-between bg-card border border-border px-4 py-2.5 rounded-xl shadow-sm" onClick={e => e.stopPropagation()}>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold text-muted-foreground leading-none mb-1">Invite Code</span>
                    <span className="text-sm font-bold tracking-widest font-mono text-foreground leading-none">{ledger.invite_code}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      handleCopyCode(ledger.invite_code);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      copiedCode ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {copiedCode ? <Check size={14} /> : <Share2 size={14} />}
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-60">ID: {ledger.id.split('-')[0]}</p>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Create Ledger Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: ledgers.length * 0.05 }}
          className="bg-card border-2 border-dashed border-border hover:border-primary/30 transition-colors p-6 rounded-2xl flex flex-col justify-between min-h-[180px]"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">New Workspace</h2>
              <Plus size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">Create a new isolated pool for your finances.</p>
          </div>
          <form onSubmit={handleCreate} className="relative mt-auto">
            <input
              type="text"
              placeholder="Workspace Name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              className="w-full bg-muted border border-border/50 rounded-xl pl-3 pr-10 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
            />
            <button
              disabled={isCreating || !createName.trim()}
              type="submit"
              className={cn(
                "absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg flex items-center justify-center transition-all",
                !createName.trim() ? "bg-border/50 text-muted-foreground cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90 shadow-sm"
              )}
            >
              {isCreating ? <Check size={14} className="opacity-50" /> : <ArrowRight size={14} />}
            </button>
          </form>
        </motion.div>

        {/* Join Ledger Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (ledgers.length + 1) * 0.05 }}
          className="bg-muted border border-border p-6 rounded-2xl flex flex-col justify-between min-h-[180px] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
            <KeyRound size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Join Existing</h2>
              <UserPlus size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">Enter a partner's 6-digit invite code.</p>
          </div>
          <form onSubmit={handleJoin} className="relative mt-auto z-10">
            <input
              type="text"
              maxLength={6}
              placeholder="CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-card border border-border rounded-xl pl-4 pr-10 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 transition-all font-mono tracking-[0.2em] uppercase font-bold placeholder:font-sans placeholder:tracking-normal placeholder:font-medium placeholder:text-muted-foreground/60"
            />
            <button
              disabled={isJoining || joinCode.length !== 6}
              type="submit"
              className={cn(
                "absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg flex items-center justify-center transition-all",
                joinCode.length !== 6 ? "bg-muted border border-border text-muted-foreground cursor-not-allowed" : "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
              )}
            >
              {isJoining ? <Check size={14} className="opacity-50" /> : <ArrowRight size={14} />}
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  );
}
