import { useMemo } from 'react';
import { ArrowRightLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firstNameFromEmail } from '@/utils/data';

/**
 * BalancesWidget — shows 50/50 shared ledger split for couples.
 * Parent handles positioning/animation — this component is layout-agnostic.
 * Props:
 *   txns            all transactions for active ledger (including transfers)
 *   members         [{user_id, email, role}] for active ledger
 *   currentUserId   session.user.id
 *   ledgerName      string
 *   fmt             currency formatter
 *   onRequestSettle ({amount, payerId, payeeId, payerName, payeeName}) => void
 */
export function BalancesWidget({ txns, members, currentUserId, ledgerName, fmt, onRequestSettle }) {
  const partner     = members.find(m => m.user_id !== currentUserId);
  const myName      = firstNameFromEmail(members.find(m => m.user_id === currentUserId)?.email);
  const partnerName = firstNameFromEmail(partner?.email);

  const { myPaid, partnerPaid, net, splitCategory } = useMemo(() => {
    const spendBy = {};
    const categorySpend = {};

    txns.forEach(t => {
      if (t.type !== 'expense') return;
      const amount = Math.abs(t.amount);
      const cat = t.category || 'Other';
      spendBy[t.user_id] = (spendBy[t.user_id] || 0) + amount;
      if (!categorySpend[cat]) categorySpend[cat] = { me: 0, partner: 0, total: 0 };
      categorySpend[cat].total += amount;
      if (t.user_id === currentUserId) categorySpend[cat].me += amount;
      else if (partner && t.user_id === partner.user_id) categorySpend[cat].partner += amount;
    });

    const myPaid      = spendBy[currentUserId] || 0;
    const partnerPaid = partner ? (spendBy[partner.user_id] || 0) : 0;

    let myTransfers = 0, partnerTransfers = 0;
    txns.forEach(t => {
      if (t.type !== 'transfer') return;
      const amt = Math.abs(t.amount);
      if (t.user_id === currentUserId) myTransfers += amt;
      else if (partner && t.user_id === partner.user_id) partnerTransfers += amt;
    });

    const rawImbalance = (myPaid - partnerPaid) / 2;
    const net = Math.round((rawImbalance - partnerTransfers + myTransfers) * 100) / 100;

    const side = net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';
    let bestCategory = null;
    let bestScore = 0;

    Object.entries(categorySpend).forEach(([cat, vals]) => {
      const diff = (vals.me - vals.partner) / 2;
      const matchesSide =
        side === 'neutral' ||
        (side === 'positive' && diff > 0) ||
        (side === 'negative' && diff < 0);
      if (!matchesSide) return;
      const score = Math.abs(diff);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    });

    if (!bestCategory) {
      let fallback = null;
      let fallbackTotal = 0;
      Object.entries(categorySpend).forEach(([cat, vals]) => {
        if (vals.total > fallbackTotal) {
          fallbackTotal = vals.total;
          fallback = cat;
        }
      });
      bestCategory = fallback;
    }

    return { myPaid, partnerPaid, net, splitCategory: bestCategory || 'General' };
  }, [txns, currentUserId, partner]);

  const isEven    = Math.abs(net) < 0.01;
  const theyOweMe = net > 0;
  const canCurrentUserSettle = !isEven && !theyOweMe;

  const handleSettle = () => {
    if (isEven || !partner || !canCurrentUserSettle) return;
    onRequestSettle({
      amount:    Math.abs(net),
      payerId:   theyOweMe ? partner.user_id : currentUserId,
      payeeId:   theyOweMe ? currentUserId : partner.user_id,
      payerName: theyOweMe ? partnerName : myName,
      payeeName: theyOweMe ? myName : partnerName,
    });
  };

  // ── Personal ledger (solo) ──────────────────────────────────────────────────
  if (members.length <= 1) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 h-full">
        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0">
          <Users size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Shared Balances</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Personal ledger — invite a partner to track shared expenses
          </p>
        </div>
      </div>
    );
  }

  // ── 3+ members (multi-way, not yet supported) ───────────────────────────────
  if (members.length > 2) {
    const total = txns
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4 h-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Shared Balances</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Shared pool with {members.length} members — multi-way split coming soon
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total pooled</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(total)}</p>
        </div>
      </div>
    );
  }

  // ── Couples (2 members) ─────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-muted rounded-md text-muted-foreground">
            <ArrowRightLeft size={14} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Shared Balances</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">{ledgerName}</p>
      </div>

      {/* 3-zone layout */}
      <div className="flex items-center gap-4">
        {/* Left — my spend */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            {myName} paid
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums tracking-tight truncate">
            {fmt(myPaid)}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-border shrink-0" />

        {/* Center — net + action */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          {isEven ? (
            <p className="text-sm font-semibold text-muted-foreground text-center">You're all even</p>
          ) : (
            <p className={cn(
              'text-[11px] font-semibold text-center leading-tight',
              theyOweMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}>
              <span className="text-base font-black tabular-nums">{fmt(Math.abs(net))}</span>
              <br />
              {theyOweMe
                ? `${partnerName} owes ${myName}`
                : `${myName} owes ${partnerName}`}
            </p>
          )}
          {!isEven && (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {splitCategory}
            </span>
          )}
          <button
            onClick={handleSettle}
            disabled={!canCurrentUserSettle}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-primary hover:bg-primary/90 transition-colors',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
          >
            <ArrowRightLeft size={11} />
            {canCurrentUserSettle ? 'Settle Up' : (isEven ? 'Settled' : 'Waiting')}
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-border shrink-0" />

        {/* Right — partner spend */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            {partnerName} paid
          </p>
          <p className="text-lg font-bold text-foreground tabular-nums tracking-tight truncate">
            {fmt(partnerPaid)}
          </p>
        </div>
      </div>
    </div>
  );
}
