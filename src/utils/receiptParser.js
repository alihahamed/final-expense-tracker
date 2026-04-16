/**
 * receiptParser.js — pure JS utilities for OCR receipt parsing.
 * No React dependencies. All functions are synchronous except preprocessImageCanvas.
 */

// ── Category inference rules ───────────────────────────────────────────────────

export const MERCHANT_RULES = [
  // Groceries
  {
    pattern: /walmart|wal.?mart|kroger|safeway|whole foods|trader joe|costco|sam'?s club|publix|aldi|wegmans|meijer|stop & shop|giant|food lion|sprouts|heb|winn.?dixie|target grocery|fresh market|piggly/i,
    category: 'Groceries',
  },
  // Dining
  {
    pattern: /mcdonald|burger king|wendy'?s|taco bell|subway|chipotle|domino|pizza hut|papa john|starbucks|dunkin|panera|chick.?fil|popeyes|kfc|sonic|arby|five guys|shake shack|in.?n.?out|waffle house|ihop|denny'?s|applebee|olive garden|red lobster|chili'?s|outback|cheesecake factory|doordash|grubhub|ubereats|postmates|seamless|just eat|deliveroo|zomato/i,
    category: 'Dining',
  },
  // Transport
  {
    pattern: /uber(?! eats)|lyft|taxi|cab|transit|metro|amtrak|greyhound|delta(?! dental)|united airlines|american airlines|southwest|jetblue|spirit airlines|frontier|ryanair|easyjet|shell|exxon|chevron|bp |mobil|sunoco|circle k|speedway|wawa|marathon gas|quiktrip|casey'?s|loves travel|pilot flying|petro/i,
    category: 'Transport',
  },
  // Entertainment
  {
    pattern: /netflix|spotify|hulu|disney\+|hbo|apple tv|amazon prime video|youtube premium|twitch|steam|playstation|xbox|nintendo|amc theatre|regal cinema|cinemark|ticketmaster|eventbrite|stubhub|fandango|concert|bowling|laser tag/i,
    category: 'Entertainment',
  },
  // Health
  {
    pattern: /cvs|walgreens|rite aid|duane reade|pharmacy|clinic|urgent care|hospital|doctor|dentist|optometry|vision center|planet fitness|24 hour fitness|anytime fitness|la fitness|gold'?s gym|crunch fitness|equinox|ymca|fitbit|peloton|delta dental/i,
    category: 'Health',
  },
  // Shopping
  {
    pattern: /amazon(?! prime video)|best buy|home depot|lowe'?s|ikea|bed bath|nordstrom|macy'?s|tj maxx|marshalls|ross stores|old navy|gap |h&m|zara|uniqlo|forever 21|american eagle|abercrombie|express clothing|victoria'?s secret|foot locker|nike store|adidas store|apple store/i,
    category: 'Shopping',
  },
  // Utilities
  {
    pattern: /electric bill|water bill|gas bill|internet bill|comcast|xfinity|att |verizon|t.?mobile|spectrum|cox cable|utility|pg&e|con ed|duke energy|national grid|centerpoint|dominion energy/i,
    category: 'Utilities',
  },
  // Rent / Accommodation
  {
    pattern: /rent payment|apartment|lease payment|airbnb|vrbo|booking\.com|marriott|hilton|hyatt|ihg |holiday inn|best western|motel 6|super 8|hampton inn/i,
    category: 'Rent',
  },
  // Education
  {
    pattern: /udemy|coursera|skillshare|linkedin learning|pluralsight|khan academy|tutoring|textbook|barnes & noble|school supply|office depot|staples(?! center)/i,
    category: 'Education',
  },
];

export const LINE_ITEM_RULES = [
  { pattern: /produce|vegetable|fruit|bread|milk|cheese|meat|seafood|bakery|deli|cereal|snack/i, category: 'Groceries' },
  { pattern: /fuel|gasoline|diesel|premium|unleaded|petrol/i, category: 'Transport' },
  { pattern: /prescription|rx |vitamin|supplement|bandage|otc |medicine/i, category: 'Health' },
  { pattern: /monthly fee|subscription|streaming/i, category: 'Entertainment' },
];

/**
 * inferCategory — match merchant name then line items.
 * @param {string} merchant
 * @param {string[]} lineItems
 * @returns {string} one of EXPENSE_CATS
 */
export function inferCategory(merchant, lineItems = []) {
  const text = (merchant || '').toLowerCase();

  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }

  // Fallback: scan all line item text
  const itemText = lineItems.join(' ');
  for (const rule of LINE_ITEM_RULES) {
    if (rule.pattern.test(itemText)) return rule.category;
  }

  return 'Other';
}

// ── Text parsing ───────────────────────────────────────────────────────────────

/**
 * parseReceiptText — extract structured data from raw OCR output.
 * @param {string} rawText
 * @returns {{ merchant: string, amount: number|null, date: string|null, lineItems: string[] }}
 */
export function parseReceiptText(rawText) {
  if (!rawText || rawText.trim().length < 5) {
    return { merchant: '', amount: null, date: null, lineItems: [] };
  }

  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return {
    merchant:  extractMerchant(lines),
    amount:    extractAmount(lines),
    date:      extractDate(lines),
    lineItems: extractLineItems(lines),
  };
}

// Merchant: first 1–3 non-noise lines (before address/phone)
function extractMerchant(lines) {
  const noiseRx = /^\d+[\s\-\d]*$|^\+?[\d\s\-().]{7,}$|^(www\.|http)/i;
  const candidates = [];
  for (const line of lines.slice(0, 6)) {
    if (line.length < 2 || noiseRx.test(line)) continue;
    candidates.push(line);
    if (candidates.length >= 2) break;
  }
  return candidates.join(' ').trim();
}

// Amount: collect all "total" patterns, return largest value
function extractAmount(lines) {
  const totalRx = /(?:total|amount due|grand total|balance due|charge)[^\d]*(\d{1,3}(?:[,]\d{3})*(?:[.]\d{2})?)/gi;
  const looseRx = /\$\s*(\d{1,3}(?:[,]\d{3})*(?:[.]\d{2})?)/g;

  const found = [];

  for (const line of lines) {
    let m;
    totalRx.lastIndex = 0;
    while ((m = totalRx.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(',', ''));
      if (!isNaN(val) && val > 0) found.push(val);
    }
  }

  if (found.length === 0) {
    // Fallback: all dollar amounts in the receipt
    const fullText = lines.join('\n');
    looseRx.lastIndex = 0;
    let m;
    while ((m = looseRx.exec(fullText)) !== null) {
      const val = parseFloat(m[1].replace(',', ''));
      if (!isNaN(val) && val > 0) found.push(val);
    }
  }

  if (found.length === 0) return null;
  // Grand total is usually the largest value
  return Math.max(...found);
}

// Date: normalise to ISO YYYY-MM-DD
function extractDate(lines) {
  const patterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    { rx: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/, fn: (m) => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
    // YYYY-MM-DD
    { rx: /\b(20\d{2})[\/\-](\d{2})[\/\-](\d{2})\b/, fn: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    // "Apr 14, 2026" or "14 Apr 2026"
    { rx: /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d{2})\b/i, fn: (m) => `${m[3]}-${monthNum(m[2])}-${m[1].padStart(2,'0')}` },
    { rx: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/i, fn: (m) => `${m[3]}-${monthNum(m[1])}-${m[2].padStart(2,'0')}` },
  ];

  for (const line of lines) {
    for (const { rx, fn } of patterns) {
      const m = line.match(rx);
      if (m) {
        try {
          const iso = fn(m);
          if (isValidDate(iso)) return iso;
        } catch {}
      }
    }
  }

  return null;
}

function monthNum(abbr) {
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  return months[abbr.toLowerCase().slice(0,3)] || '01';
}

function isValidDate(iso) {
  const d = new Date(iso);
  return !isNaN(d.getTime()) && iso >= '2000-01-01';
}

// Line items: lines with a trailing price
function extractLineItems(lines) {
  const itemRx = /^(.+?)\s+\$?(\d+\.\d{2})\s*$/;
  const items = [];
  for (const line of lines) {
    const m = line.match(itemRx);
    if (m && m[1].length > 1 && m[1].length < 40) {
      items.push(m[1].trim());
    }
  }
  return items.slice(0, 20); // cap at 20 items
}

// ── Image preprocessing ────────────────────────────────────────────────────────

/**
 * preprocessImageCanvas — resize + grayscale + contrast boost before OCR.
 * Reduces Tesseract processing time ~40–60% and improves accuracy.
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
export async function preprocessImageCanvas(file) {
  const img = await createImageBitmap(file);
  const MAX = 1500;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(img.width  * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  // Grayscale + contrast boost
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/png');
  });
}
