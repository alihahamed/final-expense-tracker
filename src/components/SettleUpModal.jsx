import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRightLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SettleUpModal — confirm a settlement between two ledger members.
 * Props:
 *   preset   { amount, payerId, payeeId, payerName, payeeName }
 *   fmt      currency formatter
 *   onConfirm({ payerId, amount, date, note }) => Promise<void>
 *   onClose  () => void
 */
export function SettleUpModal({ preset, fmt, onConfirm, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  const inputCls = 'w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all';
  const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block';

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    await onConfirm({
      payerId: preset.payerId,
      amount:  preset.amount,
      date,
      note: note.trim() || `Settlement to ${preset.payeeName}`,
    });
    setPending(false);
  };

  return (
    <motion.div
      key="settle-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="settle-panel"
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

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <ArrowRightLeft size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Settle Up</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Record a repayment between members</p>
          </div>
        </div>

        {/* Amount summary */}
        <div className="bg-muted rounded-2xl px-4 py-4 mb-4 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            {preset.payerName} pays {preset.payeeName}
          </p>
          <p className="text-3xl font-black text-primary tracking-tight tabular-nums">
            {fmt(preset.amount)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
              <ArrowRightLeft size={9} />
              Settlement
            </span>
            <span className="text-[10px] text-muted-foreground font-mono opacity-60">· transfer</span>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className={labelCls}>Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={`Settlement to ${preset.payeeName}`}
            className={inputCls}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
            {pending ? 'Recording…' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
