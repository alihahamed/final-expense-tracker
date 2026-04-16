import { Pencil, Trash2 } from 'lucide-react';
import { fmtDate } from '@/utils/data';
import { cn } from '@/lib/utils';

/**
 * TransactionCard – thermal receipt aesthetic.
 *
 * Orange  = all receipt *meta* (store name, card, date, auth, thank-you, dividers)
 * Dark    = bill details (description, amount, category bracket)
 */
export function TransactionCard({ tx, fmt, onEdit, onDelete }) {
  // TODO: If transfer type reaches here, render falls back to expense styling.
  // Dashboard & TransactionsPage filters exclude transfers; this is defense-in-depth.
  const isInc = tx.type === 'income';
  const authCode = String(tx.id).padStart(4, '0');

  return (
    <div className="group relative w-full cursor-grab active:cursor-grabbing select-none">

      {/* ── TOP tear edge – matches card bg ── */}
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: 12 }}
      >
        <path
          d="M0,12 L0,6 Q5,0 10,6 Q15,12 20,6 Q25,0 30,6 Q35,12 40,6 Q45,0 50,6 Q55,12 60,6 Q65,0 70,6 Q75,12 80,6 Q85,0 90,6 Q95,12 100,6 Q105,0 110,6 Q115,12 120,6 Q125,0 130,6 Q135,12 140,6 Q145,0 150,6 Q155,12 160,6 Q165,0 170,6 Q175,12 180,6 Q185,0 190,6 Q195,12 200,6 L200,12 Z"
          className="fill-card dark:fill-card"
          style={{ fill: 'var(--receipt-paper)' }}
        />
      </svg>

      {/* ── Receipt body ── */}
      <div
        className={cn(
          'relative px-5 pb-5 flex flex-col z-10',
          'ring-1 ring-black/[0.08] dark:ring-white/[0.06]',
          'transition-all duration-200 group-hover:brightness-[0.98]',
        )}
        style={{ background: 'var(--receipt-paper)' }}
      >

        {/* ── HEADER (orange receipt meta) ── */}
        <div className="text-center mb-4 pt-1">
          <h4
            className="font-mono text-[13px] tracking-[0.28em] font-black uppercase"
            style={{ color: 'var(--brand)' }}
          >
            KINETIC PAY
          </h4>
          <p
            className="font-mono text-[10px] uppercase tracking-widest mt-1.5 leading-relaxed font-semibold opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            {tx.account || 'Visa •••• 1234'}
            <br />
            {fmtDate(tx.date)}
          </p>
        </div>

        {/* ── DIVIDER (orange dashes) ── */}
        <div
          className="border-t-2 border-dashed my-3 w-full"
          style={{ borderColor: 'var(--brand-light)' }}
        />

        {/* ── BODY (bill details – stay dark/foreground) ── */}
        <div className="flex flex-col items-center gap-2 text-center py-2">
          <span className="font-sans font-bold text-[13px] uppercase tracking-wide text-foreground/85 max-w-[180px] break-words leading-snug">
            {tx.description || tx.category}
          </span>

          <span
            className={cn(
              'font-sans font-black text-[30px] tracking-tight whitespace-nowrap mt-1',
              isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
            )}
          >
            {isInc ? '+ ' : '− '}{fmt(Math.abs(tx.amount))}
          </span>

          {/* category bracket — subtle orange */}
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold mt-1 opacity-60"
            style={{ color: 'var(--brand)' }}
          >
            [ {tx.category} ]
          </span>
        </div>

        {/* ── DIVIDER (orange dashes) ── */}
        <div
          className="border-t-2 border-dashed my-3 w-full"
          style={{ borderColor: 'var(--brand-light)' }}
        />

        {/* ── FOOTER (orange receipt meta) ── */}
        <div
          className="text-center font-mono text-[9px] uppercase tracking-[0.22em] font-semibold leading-relaxed opacity-55"
          style={{ color: 'var(--brand)' }}
        >
          Auth #{authCode}
          <br /><br />
          ✦ THANK YOU ✦
        </div>

        {/* ── FLOATING ACTIONS ── */}
        <div
          className={cn(
            'absolute top-2 right-2 flex gap-1',
            'opacity-0 group-hover:opacity-100 transition-all duration-200',
            'bg-white/95 dark:bg-card/95 backdrop-blur-sm border border-black/10 dark:border-border rounded-md p-0.5 shadow-sm z-20',
          )}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx.id)}
              className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── BOTTOM tear edge ── */}
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="w-full block rotate-180"
        style={{ height: 12 }}
      >
        <path
          d="M0,12 L0,6 Q5,0 10,6 Q15,12 20,6 Q25,0 30,6 Q35,12 40,6 Q45,0 50,6 Q55,12 60,6 Q65,0 70,6 Q75,12 80,6 Q85,0 90,6 Q95,12 100,6 Q105,0 110,6 Q115,12 120,6 Q125,0 130,6 Q135,12 140,6 Q145,0 150,6 Q155,12 160,6 Q165,0 170,6 Q175,12 180,6 Q185,0 190,6 Q195,12 200,6 L200,12 Z"
          style={{ fill: 'var(--receipt-paper)' }}
        />
      </svg>

      {/* Hard drop-shadow for prominence in light mode */}
      <div
        className="pointer-events-none absolute inset-x-1 -bottom-1.5 -z-10 h-4 rounded-b blur-[6px] opacity-25 dark:opacity-10"
        style={{ background: 'var(--brand)' }}
      />
    </div>
  );
}
