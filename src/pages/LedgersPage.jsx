import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, KeyRound, ArrowRight, FileText, Share2, Check, Trash2, X, Users, Settings, LogOut, MoreVertical, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function LedgersPage({
  session,
  ledgers, setLedgers,
  activeLedger, setActiveLedger,
  avatars = []
}) {
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orbitRadius, setOrbitRadius] = useState(280);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, ledger: null });
  const [ledgerMembersMap, setLedgerMembersMap] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    fetchLedgers();
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  function updateRadius() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const minDimension = Math.min(width, height - 100); // Leave space for header
    setOrbitRadius(minDimension * 0.32);
  }

  useEffect(() => {
    if (ledgers.length > 0 && !selectedLedger) {
      setSelectedLedger(ledgers[0]);
    }
  }, [ledgers]);

  // Fetch members + profiles for all ledgers
  useEffect(() => {
    if (!ledgers.length) return;
    async function fetchAllMembers() {
      const ledgerIds = ledgers.map(l => l.id);
      const { data: members, error: mErr } = await supabase
        .from('ledger_members')
        .select('ledger_id, user_id')
        .in('ledger_id', ledgerIds);
      if (mErr || !members) return;

      const userIds = [...new Set(members.map(m => m.user_id))];
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      if (pErr) return;

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      const map = {};
      members.forEach(m => {
        if (!map[m.ledger_id]) map[m.ledger_id] = [];
        const profile = profileMap[m.user_id];
        map[m.ledger_id].push({
          user_id: m.user_id,
          display_name: profile?.display_name || 'User',
          avatar_id: profile?.avatar_url || 'av1',
        });
      });
      setLedgerMembersMap(map);
    }
    fetchAllMembers();
  }, [ledgers]);

  const getAvatarUrl = (avatarId) => {
    const found = avatars.find(a => a.id === avatarId);
    return found ? found.url : (avatars[0]?.url || null);
  };

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
      setShowCreateForm(false);
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
      setShowJoinModal(false);
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
      const { error } = await supabase.from('ledgers').delete().eq('id', ledgerId);

      if (error) throw error;

      toast.success(`Workspace deleted.`);
      const remaining = ledgers.filter(l => l.id !== ledgerId);
      setLedgers(remaining);

      if (activeLedger?.id === ledgerId) {
        setActiveLedger(remaining.length > 0 ? remaining[0] : null);
      }
      if (selectedLedger?.id === ledgerId) {
        setSelectedLedger(remaining.length > 0 ? remaining[0] : null);
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

  const handleSelectLedger = (ledger) => {
    setSelectedLedger(ledger);
    setActiveLedger(ledger);
  };

  const handleContextMenu = (e, ledger) => {
    e.preventDefault();
    e.stopPropagation();
    const menuHeight = 260;
    const menuWidth = 180;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    let y = e.clientY;
    let x = e.clientX;
    if (y + menuHeight > viewportH) y = viewportH - menuHeight - 8;
    if (x + menuWidth > viewportW) x = viewportW - menuWidth - 8;
    if (y < 8) y = 8;
    if (x < 8) x = 8;
    setContextMenu({ visible: true, x, y, ledger });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, ledger: null });
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const getOrbitPosition = (index, total, radius) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  };

  return (
    <div ref={containerRef} className="relative h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-50 flex-none flex items-center justify-between px-8 py-6"
      >
        <div>
          <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none">
            Workspaces
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-2">
            Navigate Your Financial Hubs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Workspace Count - Liquid Glass Pill */}
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              {ledgers.length} {ledgers.length === 1 ? 'Workspace' : 'Workspaces'}
            </span>
          </div>
          {/* Join Button - Liquid Glass Pill */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowJoinModal(true); }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-sm flex items-center gap-2 hover:from-orange-500/20 hover:to-orange-500/10 transition-all cursor-pointer"
          >
            <KeyRound size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Join</span>
          </button>
        </div>
      </motion.div>

      {/* Orbital Layout - Centered in remaining viewport */}
      <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
        {/* Central Hub - only shown when workspaces exist */}
        {ledgers.length > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-20"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-36 h-36 rounded-full bg-gradient-to-br from-primary to-orange-600 flex flex-col items-center justify-center cursor-pointer shadow-xl shadow-orange-500/30 border-4 border-white dark:border-neutral-900"
            >
              <Plus size={32} className="text-white mb-1" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">New</span>
              <span className="text-[10px] text-white/80 font-medium">Workspace</span>
            </motion.div>

            {/* Create Form Popup */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.95 }}
                  className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-56"
                >
                  <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-3 shadow-xl">
                    <input
                      type="text"
                      placeholder="Workspace name..."
                      value={createName}
                      onChange={e => setCreateName(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60 mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setCreateName('');
                        }}
                        className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isCreating || !createName.trim()}
                        type="submit"
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          !createName.trim()
                            ? "bg-border/50 text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary/90"
                        )}
                      >
                        {isCreating ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Orbiting Nodes */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {ledgers.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 pointer-events-auto"
            >
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 3, -3, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-28 h-28 rounded-full border-2 border-dashed border-orange-300 dark:border-orange-500/40 flex items-center justify-center bg-orange-50 dark:bg-orange-500/5"
              >
                <FileText size={36} className="text-orange-300 dark:text-orange-500/40" />
              </motion.div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground mb-1">No workspaces yet</p>
                <p className="text-xs text-muted-foreground mb-4">Create your first workspace to get started</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-br from-primary to-orange-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-orange-500/30"
                >
                  <span className="flex items-center gap-2"><Plus size={14} /> Create Workspace</span>
                </motion.button>
              </div>
              {/* Inline Create Form for empty state */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.div
                    initial={{ y: 10, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 10, opacity: 0, scale: 0.95 }}
                    className="w-56"
                  >
                    <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-3 shadow-xl">
                      <input
                        type="text"
                        placeholder="Workspace name..."
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60 mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowCreateForm(false); setCreateName(''); }}
                          className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isCreating || !createName.trim()}
                          type="submit"
                          className={cn(
                            "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                            !createName.trim()
                              ? "bg-border/50 text-muted-foreground cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary/90"
                          )}
                        >
                          {isCreating ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            ledgers.map((ledger, idx) => {
              const isActive = activeLedger?.id === ledger.id;
              const isSelected = selectedLedger?.id === ledger.id;
              const total = ledgers.length;
              const pos = getOrbitPosition(idx, total, orbitRadius);

              return (
                <motion.div
                  key={ledger.id}
                  initial={{ x: pos.x, y: pos.y, scale: 0.8, opacity: 0 }}
                  animate={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.08, type: 'spring', stiffness: 100, damping: 15 }}
                  className="absolute pointer-events-auto"
                  style={{ x: pos.x, y: pos.y }}
                >
                  <motion.div
                    whileHover={{ scale: 1.15, zIndex: 30 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectLedger(ledger)}
                    onContextMenu={(e) => handleContextMenu(e, ledger)}
                    className={cn(
                      "w-28 h-28 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2",
                      isActive
                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/30"
                        : isSelected
                          ? "bg-primary/10 text-primary border-primary/50 shadow-lg"
                          : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-lg"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: isActive ? [0, 5, -5, 0] : 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <FileText size={22} className={cn("mb-1", isActive ? "text-white" : isSelected ? "text-primary" : "text-muted-foreground")} />
                    </motion.div>
                    <span className={cn(
                      "text-[10px] font-medium text-center px-2 line-clamp-2 leading-tight",
                      isActive ? "text-white/90" : isSelected ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {ledger.name}
                    </span>
                    {/* Member avatars */}
                    {(() => {
                      const members = ledgerMembersMap[ledger.id] || [];
                      const shown = members.slice(0, 3);
                      const extra = members.length - 3;
                      return (
                        <div className="absolute -bottom-3 flex items-center">
                          {shown.map((m, mi) => (
                            <div
                              key={m.user_id}
                              className="w-6 h-6 rounded-full border-2 border-card overflow-hidden bg-muted shadow-sm"
                              style={{ marginLeft: mi > 0 ? '-6px' : 0, zIndex: shown.length - mi }}
                              title={m.display_name}
                            >
                              {getAvatarUrl(m.avatar_id) ? (
                                <img src={getAvatarUrl(m.avatar_id)} alt={m.display_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                  {m.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                            </div>
                          ))}
                          {extra > 0 && (
                            <div
                              className="w-6 h-6 rounded-full border-2 border-card bg-orange-500 text-white flex items-center justify-center text-[8px] font-bold shadow-sm"
                              style={{ marginLeft: '-6px', zIndex: 0 }}
                            >
                              +{extra}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* Member count pill */}
                    <div className="absolute -top-1 -right-1">
                      <span className="text-[8px] font-bold text-white bg-orange-500 rounded-full px-1.5 py-0.5 shadow-sm">
                        {(ledgerMembersMap[ledger.id] || []).length}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Connection Lines - rendered as absolutely positioned divs to avoid SVG calc() issues */}
        {ledgers.map((ledger, idx) => {
          const total = ledgers.length;
          const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
          const isActive = activeLedger?.id === ledger.id;

          const hubR = 72;
          const nodeR = 56;
          const lineStart = hubR;
          const lineEnd = orbitRadius - nodeR;
          const lineLength = lineEnd - lineStart;
          if (lineLength <= 0) return null;

          const midX = ((lineStart + lineEnd) / 2) * Math.cos(angle);
          const midY = ((lineStart + lineEnd) / 2) * Math.sin(angle);
          const angleDeg = (angle * 180) / Math.PI;

          return (
            <motion.div
              key={`line-${ledger.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0.5 }}
              transition={{ delay: idx * 0.08 + 0.15, duration: 0.5 }}
              className="absolute pointer-events-none"
              style={{
                width: `${lineLength}px`,
                height: isActive ? '3px' : '2px',
                background: isActive ? '#ea580c' : '#cbd5e1',
                left: '50%',
                top: '50%',
                transformOrigin: '0 50%',
                transform: `translate(${Math.cos(angle) * lineStart}px, ${Math.sin(angle) * lineStart}px) rotate(${angleDeg}deg)`,
                zIndex: 1,
                borderRadius: '2px',
                boxShadow: isActive ? '0 0 8px rgba(234,88,12,0.4)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && contextMenu.ledger && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-popover border border-border rounded-xl shadow-2xl py-2 z-50 min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-xs font-semibold text-foreground truncate">{contextMenu.ledger.name}</p>
              <p className="text-[9px] text-muted-foreground">Workspace</p>
            </div>
            <button
              onClick={() => {
                handleSelectLedger(contextMenu.ledger);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink size={14} className="text-muted-foreground" />
              Open Workspace
            </button>
            <button
              onClick={() => {
                handleCopyCode(contextMenu.ledger.invite_code);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Copy size={14} className="text-muted-foreground" />
              Copy Invite Code
            </button>
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Users size={14} className="text-muted-foreground" />
              View Members
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Settings size={14} className="text-muted-foreground" />
              Settings
            </button>
            <button
              onClick={(e) => {
                handleDeleteLedger(contextMenu.ledger.id, contextMenu.ledger.name, e);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedLedger && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed bottom-10 right-10 w-72 bg-card border border-border rounded-2xl shadow-2xl p-4 z-40"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  selectedLedger.id === activeLedger?.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedLedger.name}</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {selectedLedger.id === activeLedger?.id ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLedger(null)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {/* Invite Code */}
              <div className="bg-muted border border-border rounded-lg p-2">
                <span className="block text-[7px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Invite Code</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest font-mono text-foreground">{selectedLedger.invite_code}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(selectedLedger.invite_code);
                    }}
                    className={cn(
                      "p-1 rounded transition-colors",
                      copiedCode ? "bg-emerald-500/10 text-emerald-500" : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {copiedCode ? <Check size={10} /> : <Share2 size={10} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setActiveLedger(selectedLedger);
                    toast.success(`Switched to ${selectedLedger.name}`);
                  }}
                  disabled={selectedLedger.id === activeLedger?.id}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    selectedLedger.id === activeLedger?.id
                      ? "bg-emerald-500/10 text-emerald-500 cursor-default"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {selectedLedger.id === activeLedger?.id ? <Check size={10} /> : <ArrowRight size={10} />}
                  {selectedLedger.id === activeLedger?.id ? 'Active' : 'Switch'}
                </button>
                <button
                  onClick={(e) => handleDeleteLedger(selectedLedger.id, selectedLedger.name, e)}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 size={10} />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">Join Workspace</h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleJoin}>
                <div className="mb-3">
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Enter Invite Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-[0.3em] uppercase font-bold text-center placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isJoining || joinCode.length !== 6}
                    type="submit"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                      joinCode.length !== 6
                        ? "bg-border/50 text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    )}
                  >
                    {isJoining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
