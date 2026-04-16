import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, Loader2, Check, RotateCcw, AlertCircle, Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseReceiptText, inferCategory, preprocessImageCanvas } from '@/utils/receiptParser';

const EXPENSE_CATS = ['Rent','Groceries','Dining','Utilities','Transport','Shopping','Health','Entertainment','Education','Other'];

const inputCls = 'w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all';
const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block';

/**
 * ReceiptScanModal
 * Props:
 *   onSave    (tx) => void  — same shape as handleSave in App.jsx
 *   onClose   () => void
 *   currency  string
 */
export function ReceiptScanModal({ onSave, onClose, currency = 'USD' }) {
  const fileInputRef = useRef(null);

  // State machine: 'capturing' | 'scanning' | 'reviewing' | 'saving' | 'error'
  const [scanState, setScanState]   = useState('capturing');
  const [progress,  setProgress]    = useState(0);
  const [preview,   setPreview]     = useState(null);
  const [errorMsg,  setErrorMsg]    = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Review fields
  const [merchant,  setMerchant]  = useState('');
  const [amount,    setAmount]    = useState('');
  const [date,      setDate]      = useState('');
  const [category,  setCategory]  = useState('');
  const [desc,      setDesc]      = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [fieldErr,  setFieldErr]  = useState('');

  // ── Process image ────────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, HEIC, etc.)');
      setScanState('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image is too large. Please use a photo under 10 MB.');
      setScanState('error');
      return;
    }

    // Show preview immediately
    const url = URL.createObjectURL(file);
    setPreview(url);
    setScanState('scanning');
    setProgress(0);

    try {
      // Lazy-load Tesseract only when needed
      const { createWorker } = await import('tesseract.js');

      const preprocessed = await preprocessImageCanvas(file).catch(() => file);

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(preprocessed);
      await worker.terminate();

      if (!text || text.trim().length < 15) {
        setErrorMsg("We couldn't read enough text from this image. Try better lighting or a flatter surface.");
        setScanState('error');
        return;
      }

      const parsed   = parseReceiptText(text);
      const catGuess = inferCategory(parsed.merchant, parsed.lineItems);

      // Populate review fields
      const detectedItems = (parsed.lineItems || []).filter(Boolean);
      setMerchant(parsed.merchant || '');
      setAmount(parsed.amount != null ? String(parsed.amount) : '');
      setDate(parsed.date || new Date().toISOString().split('T')[0]);
      setCategory(catGuess);
      setLineItems(detectedItems);
      setDesc(detectedItems.slice(0, 3).join(', ') || parsed.merchant || '');
      setFieldErr('');
      setScanState('reviewing');

    } catch (err) {
      console.error('[ReceiptScanModal] OCR error:', err);
      setErrorMsg("Receipt scanning isn't available right now. You can enter the details manually instead.");
      setScanState('error');
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected after rescan
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setFieldErr('Enter a valid amount.');
      return;
    }
    if (!date) {
      setFieldErr('Select a date.');
      return;
    }
    if (!category) {
      setFieldErr('Select a category.');
      return;
    }
    setScanState('saving');
    onSave({
      type: 'expense',
      category,
      description: desc.trim() || lineItems.slice(0, 3).join(', ') || merchant || 'Receipt',
      amount: -Math.abs(amt),
      date,
    });
    onClose();
  };

  const handleRescan = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setProgress(0);
    setErrorMsg('');
    setFieldErr('');
    setScanState('capturing');
    setMerchant(''); setAmount(''); setDate(''); setCategory(''); setDesc(''); setLineItems([]);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div
      key="scan-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="scan-panel"
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{   opacity: 0, y: 40,  scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
        className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 relative max-h-[90dvh] overflow-y-auto"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">

          {/* ── CAPTURING ─────────────────────────────────────────────────── */}
          {scanState === 'capturing' && (
            <motion.div
              key="capturing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <ScanLine size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Scan a Receipt</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Take a photo or upload an image</p>
                </div>
              </div>

              {/* Hidden real file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Primary CTA — triggers camera on mobile */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all mb-3"
              >
                <Camera size={16} />
                Take Photo / Choose File
              </button>

              {/* Desktop drag-drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full border-2 border-dashed rounded-2xl py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <Upload size={20} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Drop image here or click to browse</p>
                <p className="text-[10px] text-muted-foreground opacity-60">JPG, PNG, HEIC · Max 10 MB</p>
              </div>
            </motion.div>
          )}

          {/* ── SCANNING ──────────────────────────────────────────────────── */}
          {scanState === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              {preview && (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full max-h-48 object-contain rounded-xl border border-border"
                />
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={15} className="animate-spin text-primary" />
                Reading your receipt…
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max(progress, 5)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{progress}%</p>
            </motion.div>
          )}

          {/* ── REVIEWING ─────────────────────────────────────────────────── */}
          {scanState === 'reviewing' && (
            <motion.div
              key="reviewing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Review & Confirm</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Edit any field before saving</p>
                  </div>
                </div>
                <button
                  onClick={handleRescan}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw size={11} />
                  Rescan
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Merchant */}
                <div>
                  <label className={labelCls}>Merchant</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    placeholder="Store / merchant name"
                    className={inputCls}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className={labelCls}>Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={cn(inputCls, 'pl-7', !amount && 'ring-2 ring-rose-400/50')}
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

                {/* Category */}
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={cn(inputCls, 'cursor-pointer')}
                  >
                    <option value="">Select category…</option>
                    {EXPENSE_CATS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    type="text"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Add a description…"
                    className={inputCls}
                  />
                </div>

                {/* Detected Items */}
                {lineItems.length > 0 && (
                  <div>
                    <label className={labelCls}>Detected Items</label>
                    <div className="flex flex-wrap gap-1.5">
                      {lineItems.slice(0, 10).map((item, idx) => (
                        <span
                          key={`${item}-${idx}`}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-muted text-foreground border border-border"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {fieldErr && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl px-3 py-2 mt-3">
                  {fieldErr}
                </p>
              )}

              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-all active:scale-[0.98]"
                >
                  <Check size={14} />
                  Save Expense
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SAVING ────────────────────────────────────────────────────── */}
          {scanState === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-10"
            >
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving…</p>
            </motion.div>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {scanState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle size={22} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Couldn't Read Receipt</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">{errorMsg}</p>
                </div>
                {errorMsg.includes('lighting') && (
                  <ul className="text-[11px] text-muted-foreground text-left space-y-1 mt-1">
                    <li>· Better lighting reduces shadows</li>
                    <li>· Lay receipt flat, avoid crumpling</li>
                    <li>· Avoid glare from phone screen</li>
                  </ul>
                )}
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={handleRescan}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw size={13} />
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Enter Manually
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
