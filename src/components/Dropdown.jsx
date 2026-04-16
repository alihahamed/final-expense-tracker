import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Generic dropdown wrapper.
 *
 * Props:
 *  - trigger(toggle, open) => ReactNode  — renders the trigger button
 *  - children                            — panel content (can also be a render-prop fn receiving `hide`)
 *  - width                               — panel width in px  (default 180)
 *  - align                               — 'left' | 'right'   (default 'right')
 */
export function Dropdown({ trigger, children, width = 180, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const toggle = () => setOpen(prev => !prev);
  const hide   = () => setOpen(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) hide();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger(toggle, open)}

      {open && (
        <div
          style={{ width }}
          className={cn(
            'absolute z-50 top-full mt-1.5 rounded-xl border border-border bg-popover',
            'shadow-lg shadow-black/10 backdrop-blur-sm overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {typeof children === 'function' ? children(hide) : children}
        </div>
      )}
    </div>
  );
}

/**
 * A single row item inside a Dropdown panel.
 */
export function DropdownItem({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg mx-1',
        'transition-colors duration-100',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
      )}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}
