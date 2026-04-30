// ── Design palette used for category colour dots ──────────────────────────────
export const PALETTE = [
  '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#8b5cf6',
];

// ── Supported currencies ───────────────────────────────────────────────────────
export const CURRENCIES = {
  INR: { symbol: '₹',  flag: '🇮🇳', locale: 'en-IN', rate: 1,    label: 'Indian Rupee' },
  USD: { symbol: '$',  flag: '🇺🇸', locale: 'en-US', rate: 0.012, label: 'US Dollar' },
  EUR: { symbol: '€',  flag: '🇪🇺', locale: 'de-DE', rate: 0.011, label: 'Euro' },
  GBP: { symbol: '£',  flag: '🇬🇧', locale: 'en-GB', rate: 0.0095, label: 'British Pound' },
  JPY: { symbol: '¥',  flag: '🇯🇵', locale: 'ja-JP', rate: 1.84,  label: 'Japanese Yen' },
  CAD: { symbol: 'C$', flag: '🇨🇦', locale: 'en-CA', rate: 0.017, label: 'Canadian Dollar' },
  AUD: { symbol: 'A$', flag: '🇦🇺', locale: 'en-AU', rate: 0.018, label: 'Australian Dollar' },
  SGD: { symbol: 'S$', flag: '🇸🇬', locale: 'en-SG', rate: 0.016, label: 'Singapore Dollar' },
};

// ── Sample transactions ────────────────────────────────────────────────────────
let _id = 1;
const uid = () => String(_id++);

export const SAMPLE_TXNS = [
  { id: uid(), type: 'income',  category: 'Salary',       description: 'Monthly salary',           amount:  4500, date: '2026-04-01' },
  { id: uid(), type: 'income',  category: 'Freelance',    description: 'React dashboard project',  amount:  1200, date: '2026-04-03' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Apr rent',                 amount: -1500, date: '2026-04-02' },
  { id: uid(), type: 'expense', category: 'Groceries',    description: 'Whole Foods run',          amount:  -210, date: '2026-04-05' },
  { id: uid(), type: 'expense', category: 'Dining',       description: 'Dinner with friends',      amount:   -85, date: '2026-04-06' },
  { id: uid(), type: 'expense', category: 'Utilities',    description: 'Electricity & water',      amount:  -130, date: '2026-04-07' },
  { id: uid(), type: 'expense', category: 'Transport',    description: 'Metro monthly pass',       amount:   -60, date: '2026-04-07' },
  { id: uid(), type: 'income',  category: 'Interest',     description: 'Savings interest',         amount:    42, date: '2026-04-08' },
  { id: uid(), type: 'expense', category: 'Shopping',     description: 'Shoes & clothes',          amount:  -320, date: '2026-04-09' },
  { id: uid(), type: 'expense', category: 'Health',       description: 'Gym membership',           amount:   -45, date: '2026-04-10' },
  { id: uid(), type: 'income',  category: 'Freelance',    description: 'Logo design gig',          amount:   350, date: '2026-04-11' },
  { id: uid(), type: 'expense', category: 'Entertainment','description': 'Netflix + Spotify',      amount:   -28, date: '2026-04-11' },
  { id: uid(), type: 'expense', category: 'Dining',       description: 'Lunch takeout',            amount:   -24, date: '2026-04-12' },
  { id: uid(), type: 'expense', category: 'Education',    description: 'Udemy course bundle',      amount:   -79, date: '2026-04-13' },
  { id: uid(), type: 'expense', category: 'Groceries',    description: 'Trader Joe\'s',            amount:  -155, date: '2026-04-14' },
  // Older months for trend chart
  { id: uid(), type: 'income',  category: 'Salary',       description: 'March salary',             amount:  4500, date: '2026-03-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Mar rent',                 amount: -1500, date: '2026-03-02' },
  { id: uid(), type: 'expense', category: 'Groceries',    description: 'Grocery run',              amount:  -195, date: '2026-03-05' },
  { id: uid(), type: 'income',  category: 'Freelance',    description: 'Website redesign',         amount:   900, date: '2026-03-10' },
  { id: uid(), type: 'expense', category: 'Shopping',     description: 'Amazon order',             amount:  -245, date: '2026-03-15' },
  { id: uid(), type: 'income',  category: 'Salary',       description: 'February salary',          amount:  4500, date: '2026-02-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Feb rent',                 amount: -1500, date: '2026-02-02' },
  { id: uid(), type: 'expense', category: 'Groceries',    description: 'Grocery run',              amount:  -170, date: '2026-02-05' },
  { id: uid(), type: 'income',  category: 'Freelance',    description: 'App design gig',           amount:   650, date: '2026-02-12' },
  { id: uid(), type: 'income',  category: 'Salary',       description: 'January salary',           amount:  4200, date: '2026-01-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Jan rent',                 amount: -1400, date: '2026-01-02' },
  { id: uid(), type: 'expense', category: 'Groceries',    description: 'Grocery run',              amount:  -188, date: '2026-01-06' },
  { id: uid(), type: 'income',  category: 'Salary',       description: 'December salary',          amount:  4200, date: '2025-12-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Dec rent',                 amount: -1400, date: '2025-12-02' },
  { id: uid(), type: 'expense', category: 'Shopping',     description: 'Holiday gifts',            amount:  -680, date: '2025-12-20' },
  { id: uid(), type: 'income',  category: 'Salary',       description: 'November salary',          amount:  4200, date: '2025-11-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Nov rent',                 amount: -1400, date: '2025-11-02' },
  { id: uid(), type: 'income',  category: 'Salary',       description: 'October salary',           amount:  4200, date: '2025-10-01' },
  { id: uid(), type: 'expense', category: 'Rent',         description: 'Oct rent',                 amount: -1400, date: '2025-10-02' },
];

// ── Build monthly trend from transactions ─────────────────────────────────────
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function buildMonthlyTrend(txns) {
  const map = {};
  
  // Fill the map with at least the last 6 months so charts aren't broken for new users
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    map[`${year}-${m}`] = { income: 0, expense: 0 };
  }

  txns.forEach(t => {
    if (t.type === 'transfer') return; // transfers are neutral — never affect trend
    const key = t.date.slice(0, 7); // "YYYY-MM"
    if (!map[key]) map[key] = { income: 0, expense: 0 };
    if (t.type === 'income')  map[key].income  += t.amount;
    if (t.type === 'expense') map[key].expense += Math.abs(t.amount);
  });
  
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      month: MONTH_LABELS[parseInt(key.slice(5, 7), 10) - 1],
      year: key.slice(0, 4),
      fullKey: key,
      ...vals,
    }));
}

// ── Category emoji map ────────────────────────────────────────────────────────
export const CAT_EMOJI = {
  Salary:        '💼',
  Freelance:     '💻',
  Interest:      '🏦',
  Rent:          '🏠',
  Groceries:     '🛒',
  Dining:        '🍽️',
  Utilities:     '💡',
  Transport:     '🚇',
  Shopping:      '🛍️',
  Health:        '🏥',
  Entertainment: '🎬',
  Education:     '📚',
  Other:         '📦',
};

// ── First-name extractor from email ──────────────────────────────────────────
/**
 * firstNameFromEmail('aliahmedyus@gmail.com') → 'Aliahmedyus'
 * firstNameFromEmail('asna.fazeela@gmail.com') → 'Asna'
 */
export function firstNameFromEmail(email) {
  if (!email) return 'Partner';
  const local = email.split('@')[0] ?? '';
  const cleaned = local.replace(/[._\-0-9]+/g, ' ').trim().split(' ')[0];
  if (!cleaned) return local || 'Partner';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

// ── Date formatter ────────────────────────────────────────────────────────────
/**
 * fmtDate('2026-04-14') → 'Apr 14, 2026'
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
