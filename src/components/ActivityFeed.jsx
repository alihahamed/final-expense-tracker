import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Trash2, ArrowLeftRight, UserPlus, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_META = {
  added:   { icon: Plus,          color: '#22c55e', bg: 'bg-emerald-500/10', label: 'added'    },
  updated: { icon: Pencil,        color: '#60a5fa', bg: 'bg-blue-500/10',    label: 'updated'  },
  deleted: { icon: Trash2,        color: '#f43f5e', bg: 'bg-rose-500/10',    label: 'deleted'  },
  settled: { icon: ArrowLeftRight,color: '#a78bfa', bg: 'bg-violet-500/10', label: 'settled'  },
  joined:  { icon: UserPlus,      color: '#f97316', bg: 'bg-orange-500/10',  label: 'joined'   },
};

function ActivityItem({ item, currentUserId, members = [], fmt }) {
  const isCurrentUser = item.user_id === currentUserId || item.display_name === members.find(m => m.user_id === currentUserId)?.profile_name;
  const meta   = ACTION_META[item.action] || ACTION_META.added;
  const Icon   = meta.icon;
  
  // Try to find the user in ledger members to get their latest profile name
  const member = members.find(m => m.user_id === item.user_id);
  const dbName = member?.profile_name || item.display_name || 'Someone';
  const name   = isCurrentUser ? 'You' : dbName;
  
  const desc   = item.metadata?.description || item.metadata?.category || '';
  const amount = item.metadata?.amount;
  const time   = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.bg)}>
        <Icon size={13} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 leading-snug">
          <span className="font-semibold text-white">{name}</span>
          {' '}{meta.label}{' '}
          {desc && <span className="text-white/90 font-medium">{desc}</span>}
          {amount !== undefined && (
            <span style={{ color: meta.color }} className="font-semibold">
              {' '}({item.action === 'added' || item.action === 'updated'
                ? (item.metadata?.type === 'income' ? '+' : '-')
                : ''
              }{fmt ? fmt(Math.abs(amount)) : `₹${Math.abs(amount).toFixed(2)}`})
            </span>
          )}
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

export function ActivityFeed({ items = [], unreadCount = 0, currentUserId, members = [], fmt, onClose, onMarkRead }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-72 top-0 h-screen z-50 w-72 flex flex-col shadow-2xl"
      style={{ background: '#0f0f0f', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Bell size={14} className="text-primary" />
          <span className="text-[13px] font-bold text-white">Activity</span>
          {unreadCount > 0 && (
            <span className="text-[9px] font-black text-black bg-primary px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkRead}
              className="text-[10px] font-bold text-primary/70 hover:text-primary uppercase tracking-wider transition-colors px-2 py-1"
            >
              Mark read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <Bell size={18} className="text-white/20" />
            </div>
            <p className="text-xs text-white/30 text-center">No activity yet. Transactions you and your team add will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((item) => (
              <ActivityItem
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                members={members}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Sidebar trigger button
export function ActivityBell({ unreadCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all duration-200 text-left w-full text-white/45 hover:text-white/90 hover:bg-white/5"
    >
      <Bell size={18} className="shrink-0 text-white/30" />
      Activity
      {unreadCount > 0 && (
        <span className="ml-auto text-[9px] font-black text-black bg-primary px-1.5 py-0.5 rounded-full leading-none">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
