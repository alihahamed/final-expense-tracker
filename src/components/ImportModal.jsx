import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXPECTED_FIELDS = ['type', 'category', 'description', 'amount', 'date'];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx]; });
      rows.push(row);
    }
  }
  return { headers, rows };
}

function normalizeRow(row, mapping) {
  const type = (row[mapping.type] || '').toLowerCase();
  const amount = parseFloat(row[mapping.amount]);
  const date = row[mapping.date] || '';
  const category = row[mapping.category] || 'Other';
  const description = row[mapping.description] || '';

  if (!type || isNaN(amount) || !date) return null;

  return {
    type: type === 'income' ? 'income' : 'expense',
    category,
    description,
    amount: type === 'income' ? Math.abs(amount) : -Math.abs(amount),
    date: date.slice(0, 10),
  };
}

export function ImportModal({ onClose, onImport, existingTxns = [] }) {
  const [step, setStep] = useState('upload'); // upload | map | preview | importing
  const [fileType, setFileType] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [dupeCount, setDupeCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (ext === 'json') {
        try {
          let parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) parsed = [parsed];
          const headers = Object.keys(parsed[0] || {});
          setRawHeaders(headers);
          setRawRows(parsed);
          setFileType('json');
          autoMap(headers);
        } catch {
          toast.error('Invalid JSON file');
          return;
        }
      } else {
        const { headers, rows } = parseCSV(text);
        if (!headers.length) { toast.error('Empty or invalid CSV'); return; }
        setRawHeaders(headers);
        setRawRows(rows);
        setFileType('csv');
        autoMap(headers);
      }
      setStep('map');
    };
    reader.readAsText(file);
  }, []);

  const autoMap = (headers) => {
    const m = {};
    const lowerHeaders = headers.map(h => h.toLowerCase());
    EXPECTED_FIELDS.forEach(field => {
      const idx = lowerHeaders.findIndex(h =>
        h === field || h.includes(field) ||
        (field === 'description' && (h.includes('note') || h.includes('memo') || h.includes('desc'))) ||
        (field === 'type' && h.includes('kind')) ||
        (field === 'amount' && h.includes('sum'))
      );
      if (idx >= 0) m[field] = headers[idx];
    });
    setMapping(m);
  };

  const handleBuildPreview = () => {
    const rows = rawRows
      .map(r => normalizeRow(r, mapping))
      .filter(Boolean);

    // Duplicate detection
    const existingKeys = new Set(
      existingTxns.map(t => `${t.date}|${t.amount}|${t.description}`)
    );
    let dupes = 0;
    const clean = rows.filter(r => {
      const key = `${r.date}|${r.amount}|${r.description}`;
      if (existingKeys.has(key)) { dupes++; return false; }
      return true;
    });

    setDupeCount(dupes);
    setPreview(clean);
    setStep('preview');
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    await onImport(preview);
    setImporting(false);
    toast.success(`${preview.length} transactions imported`);
    onClose();
  };

  const allMapped = EXPECTED_FIELDS.every(f => mapping[f]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Upload size={16} />
          </div>
          <h2 className="text-base font-bold text-foreground">Import Transactions</h2>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Upload a CSV or JSON file to import transactions. We'll detect the columns and let you map them.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText size={18} className="text-blue-500" />
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground">Drop CSV or JSON here</p>
              <p className="text-[10px] text-muted-foreground">or click to browse</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Step: Map Columns */}
        {step === 'map' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Map your file columns to transaction fields. We auto-matched what we could.
            </p>
            <div className="flex flex-col gap-2.5">
              {EXPECTED_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-24 shrink-0">{field}</span>
                  <select
                    value={mapping[field] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    className={cn(
                      'flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30',
                      mapping[field] ? 'border-emerald-500/30' : ''
                    )}
                  >
                    <option value="">— select —</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {mapping[field] && <Check size={13} className="text-emerald-500 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/70 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleBuildPreview}
                disabled={!allMapped}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all',
                  allMapped ? 'bg-primary hover:bg-primary/90' : 'bg-border text-muted-foreground cursor-not-allowed'
                )}
              >
                Preview
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Ready to import <span className="font-bold text-foreground">{preview.length}</span> transactions
              </p>
              {dupeCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                  <AlertCircle size={11} /> {dupeCount} duplicates skipped
                </span>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {preview.slice(0, 20).map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{tx.description || tx.category}</p>
                    <p className="text-[10px] text-muted-foreground">{tx.date} · {tx.category}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-bold tabular-nums',
                    tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {tx.type === 'income' ? '+' : ''}{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {preview.length > 20 && (
                <p className="text-center text-[10px] text-muted-foreground py-2">
                  + {preview.length - 20} more
                </p>
              )}
            </div>
            <div className="flex gap-2.5 mt-1">
              <button
                onClick={() => setStep('map')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/70 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-95"
              >
                <Check size={14} /> Import {preview.length}
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Importing {preview.length} transactions…</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
