# Kinetic — Dashboard Design System

> **Purpose**: Single source of truth for UI consistency across all pages and sections of the Kinetic expense tracker. Every new page, panel, modal, or widget must follow these tokens and patterns exactly.

---

## 1. Color Tokens

All colors are defined as CSS custom properties in `src/index.css`. **Never use raw hex values in components — always reference a token.**

### Brand

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--brand` | `#f97316` | `#f97316` | Primary interactive color — buttons, active states, links |
| `--brand-light` | `#fdba74` | `#fdba74` | Light accent — dashed borders, subtle tints |
| `--brand-dim` | `#ffedd5` | `#431407` | Faint brand bg — hover states, pill backgrounds |
| `--brand-text` | `#c2410c` | `#fdba74` | Brand text on light surfaces |

In Tailwind use `text-primary`, `bg-primary`, `border-primary` — these map to `--brand`.

### Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#FBF8F5` | `#141110` | Page background (`bg-background`) |
| `--surface` | `#fdfbf8` | `#1f1b1a` | Card / popover background (`bg-card`) |
| `--surface-2` | `#F5F0EC` | `#2a2422` | Secondary surface — input bg, hover, muted (`bg-muted`) |
| `--receipt-paper` | `#ffffff` | `#231f1d` | Thermal receipt cards only — do not use on regular cards |

### Text

| Token | Light | Dark | Tailwind alias | Usage |
|---|---|---|---|---|
| `--text-primary` | `#0f172a` | `#f5f5f5` | `text-foreground` | Primary copy — headings, labels, amounts |
| `--text-secondary` | `#334155` | `#a39c99` | — | Secondary annotations |
| `--text-muted` | `#1e293b` | `#6b6580` | `text-muted-foreground` | Timestamps, subtitles, axis ticks, placeholders |

> **Rule**: Subtext / captions always use `text-muted-foreground`. Never use raw `slate-*` color classes.

### Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--income` / `text-emerald-500` | `#10b981` | `#34d399` | Positive values, income badges |
| `--expense` / `text-rose-500` | `#f43f5e` | `#fb7185` | Negative values, expense badges |
| `--income-bg` | `#d1fae5` | `#064e3b` | Income pill backgrounds |
| `--expense-bg` | `#ffe4e6` | `#4c0519` | Expense pill backgrounds |

### Borders

| Token | Light | Dark |
|---|---|---|
| `--border` | `#d8d5d2` | `#38322f` |

Use `border-border` in Tailwind.

---

## 2. Typography

### Font Families

```css
--font-sans:    'Plus Jakarta Sans', 'Inter Variable', system-ui, sans-serif;
--font-heading: 'Plus Jakarta Sans', 'Inter Variable', system-ui, sans-serif;
--font-mono:    ui-monospace, 'Cascadia Mono', 'Fira Code', monospace;
```

- **UI copy** → `font-sans` (Plus Jakarta Sans) — all labels, cards, buttons, charts
- **Monospace** → `font-mono` — receipt headers, auth codes, codes, keyboard shortcuts

### Type Scale

| Role | Size | Weight | Class examples | Used for |
|---|---|---|---|---|
| Page title / Greeting | `text-4xl` (≈36px) | `font-medium` (500) | `tracking-tight leading-none` | One H1 per page — the greeting |
| Hero amount | `text-3xl` (30px) | `font-medium` (600) | `tracking-tight text-white` | Balance card main number |
| Transaction amount | `text-[30px]` | `font-black` (900) | `tracking-tight` | Receipt card amount |
| Section heading | `text-sm` (14px) | `font-medium` (600) | — | Card titles: "Expenses Breakdown", "Revenue" |
| Stat value | `text-2xl` (24px) | `font-semibold` (600) | `tracking-tight` | Revenue / expense stat card numbers |
| Insight number | `text-lg` (18px) | `font-bold` (700) | `tabular-nums leading-tight` | Greeting-row insight values |
| Body / label | `text-xs` (12px) | `font-medium` (500) | — | Card labels, list items, button text |
| Caption / subtext | `text-[11px]` | `font-medium` (500) | `uppercase tracking-widest` | Date stamps, mini labels, stat subtitles |
| Axis ticks (chart) | `font-size: 11` | 400 | passed to recharts `tick` | X/Y axis labels |
| Receipt header | `text-[13px]` | `font-black` (900) | `font-mono tracking-[0.28em] uppercase` | "KINETIC PAY" |
| Receipt meta | `text-[10px]` | `font-semibold` | `font-mono uppercase tracking-widest` | Visa number, date, auth code |

> **Rule**: Headings and amounts use `tracking-tight`. Small caps labels use `uppercase tracking-widest`. Never mix font families within a single card (exception: receipt cards which intentionally blend sans + mono).

---

## 3. Spacing & Layout

### Page Grid

```
grid grid-cols-12 gap-4 auto-rows-min
```

All dashboard sections snap to the 12-column grid. Common column spans:

| Section | Cols (md+) | Cols (sm) | Cols (xs) |
|---|---|---|---|
| Greeting banner | 12 | 12 | 12 |
| Balance card | 5 | 12 | 12 |
| Stat card (Revenue) | 3 | 6 | 12 |
| Stat card (Expenses) | 4 | 6 | 12 |
| Breakdown panel | 5 | 12 | 12 |
| Revenue bar chart | 7 | 12 | 12 |
| Transaction history | 12 | 12 | 12 |

### Card Internal Spacing

- Standard card padding: `p-5`
- Section header row bottom margin: `mb-3` or `mb-4`
- Gap between items in a list: `gap-2`
- Gap between action buttons: `gap-2.5`
- Balance pill inner padding: `px-4 py-3`

### Intra-section Dividers

Vertical pixel divider between insight stats:
```jsx
<div className="w-px h-8 bg-border" />
```

---

## 4. Border Radius

All values derive from a base `--radius: 0.75rem`.

| Scale | Value | Tailwind | Use |
|---|---|---|---|
| `--radius-sm` | ~0.45rem | `rounded-md` | Small chips, icon containers |
| `--radius-md` | `rounded-lg` | ~0.6rem | Dropdown items, input fields |
| Default | `0.75rem` | `rounded-xl` | Buttons, pills, filter chips |
| `--radius-lg` | `0.75rem` | `rounded-2xl` | **Standard card radius — use this everywhere** |
| `--radius-xl` | ~1.05rem | `rounded-2xl` | Large panels |
| `rounded-full` | 9999px | — | Pill-shaped items (currency picker, status badge) |

> **Rule**: Cards, panels, modals, and wrappers → always `rounded-2xl`. Buttons → `rounded-xl`. Small chips → `rounded-lg` or `rounded-md`.

---

## 5. Shadows

```css
--shadow-sm: 0 1px 3px rgba(234,88,12,.04), 0 1px 2px rgba(0,0,0,.02);
--shadow-md: 0 6px 16px rgba(234,88,12,.05), 0 2px 6px rgba(0,0,0,.03);
--shadow-lg: 0 12px 32px rgba(234,88,12,.08), 0 4px 12px rgba(0,0,0,.04);
```

- Standard content card: `shadow-sm` (via Tailwind `shadow-sm` or the token)
- Floating panels, modals: `shadow-lg`
- Receipts in light mode get an additional orange base-glow using `blur-[6px]` bottom div

---

## 6. UI Components

### 6.1 `<Dropdown>` + `<DropdownItem>`

**File**: `src/components/Dropdown.jsx`  
**Use for**: Any picker / filter / sort menu. Never use a native `<select>`.

```jsx
import { Dropdown, DropdownItem } from '@/components/Dropdown';

<Dropdown
  width={148}          // panel width in px
  align="right"        // 'left' | 'right'
  trigger={(toggle, open) => (
    <button onClick={toggle} className="...">
      Label <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
    </button>
  )}
>
  {options.map(opt => (
    <DropdownItem
      key={opt}
      label={opt}
      active={selected === opt}
      onClick={() => setSelected(opt)}
    />
  ))}
</Dropdown>
```

**Trigger button styles by context:**

| Context | Trigger classes |
|---|---|
| On dark gradient (balance card) | `bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2.5 py-1 rounded-full text-[11px] font-semibold hover:bg-white/25` |
| On light card (section filter) | `flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted` |
| Date/filter chip | `px-3 h-8 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted` (active: `bg-primary/10 border-primary/30 text-primary`) |

The `<ChevronDown>` icon inside the trigger **must always rotate 180° when open**:
```jsx
style={{ transform: open ? 'rotate(180deg)' : 'none' }}
className="transition-transform duration-200"
```

**Panel**: `rounded-xl border border-border bg-popover shadow-lg backdrop-blur-sm`, animates in with `fade-in-0 zoom-in-95 duration-150`.

### 6.2 Standard Content Card

```jsx
<div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
  {/* card header */}
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-sm font-semibold text-foreground">Section Title</h3>
    {/* optional right control — use <Dropdown> */}
  </div>
  {/* content */}
</div>
```

### 6.3 Balance / Hero Card

Full-bleed gradient card. Always uses `--accent-grad`:

```jsx
<div
  className="rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative min-h-[200px]"
  style={{ background: 'var(--accent-grad)' }}
>
  {/* Decorative glow — always include */}
  <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
  {/* content — text is always white */}
</div>
```

Text colors on the gradient card: `text-white/90` (primary), `text-white/60` (secondary), `text-white/80` (labels).

### 6.4 `<StatCard>` — Mini Metric Widget

```jsx
<div className="bg-card border border-border rounded-2xl p-5 flex flex-col shadow-sm">
  <div className="flex justify-between items-center mb-3">
    <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
    <div className="p-1 bg-muted rounded-md text-muted-foreground">{icon}</div>
  </div>
  <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
  <p className="text-[11px] text-muted-foreground mt-1">
    <span className="text-emerald-500 or text-rose-500">↑/↓ X%</span> context label
  </p>
  {/* Sparkline chart — h-11 mt-3 */}
</div>
```

Includes a `ComposedChart` sparkline (Line + Area gradient) from recharts at `h-11`.

### 6.5 Action Buttons (on gradient card)

```jsx
<button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white border border-white/25 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
  <ArrowDownRight size={14} /> Add Income
</button>
```

### 6.6 Quick-add Buttons (topbar / sidebar)

```jsx
{/* Income */}
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-100 hover:bg-emerald-200 transition-colors">
  <ArrowDownLeft size={12} /> Income
</button>
{/* Expense */}
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-100 hover:bg-rose-200 transition-colors">
  <ArrowUpRight size={12} /> Expense
</button>
```

Dark mode variants: `dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40`.

### 6.7 Filter Chip (active state)

When a filter is applied, the chip changes color to indicate selection:

```jsx
// inactive
"border-border text-muted-foreground hover:text-foreground hover:bg-muted"
// active
"bg-primary/10 border-primary/30 text-primary font-medium"
```

### 6.8 `<TransactionCard>` — Thermal Receipt

**File**: `src/components/TransactionCard.jsx`

- Background: `var(--receipt-paper)` → white in light, dark in dark
- Thin ring: `ring-1 ring-black/[0.08] dark:ring-white/[0.06]`
- **Orange** (brand color): "KINETIC PAY" heading, visa/date meta, dashed dividers (`--brand-light`), auth + thank-you footer, category bracket
- **Dark / foreground**: description text, amount
- Income amount: `text-emerald-600 dark:text-emerald-400`
- Expense amount: `text-foreground`
- Tear edges: SVG `<path>` top + bottom, `fill: var(--receipt-paper)`, same bg as card body
- Hover: `brightness-[0.97]` on the body, floating action pill appears (`opacity-0 group-hover:opacity-100`)
- Cursor: `cursor-grab active:cursor-grabbing`

### 6.9 Calendar Date Picker (in Dropdown)

Uses shadcn `<Calendar>` inside a `<Dropdown width={280} align="right">`. The trigger is a standard filter chip (§6.7 style).

---

## 7. Charts (recharts)

All charts use the `<ChartContainer>` wrapper from `@/components/ui/chart`.

### Brand Palette for Charts

```js
const barPalette = ['#fb923c', '#f97316', '#ea580c', '#fdba74', '#fed7aa'];
// chart tokens: --chart-1 through --chart-5
```

### Sparkline (ComposedChart — Line + Area)

- Line: `strokeWidth={2.5}`, `dot={false}`, with a drop-shadow SVG filter
- Area: gradient from `color 15%` → `transparent`, `fillOpacity={1}`, `stroke="none"`
- Tooltip: `<MiniTooltip>` component, `cursor={false}`

### Revenue Bar Chart

- `<BarChart>` with `barGap={0}`, `maxBarSize={36}`
- Bar fill: `url(#gradOrange)` — linear gradient `#f97316` top → `#f97316 10%` bottom
- Bar radius: `[6, 6, 2, 2]` (rounded top, squared bottom)
- Grid: `<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}`
- Axes: `axisLine={false}` `tickLine={false}`, fill `var(--text-muted)`, fontSize 11
- Tooltip cursor: `fill: rgba(249,115,22,0.05)`

### Proportional Category Bar

Horizontal flex bar — each segment's `flex` value equals its monetary value:
```jsx
<div style={{ flex: d.value, background: `linear-gradient(to top, ${color}99, ${color})` }} className="rounded-lg h-11" />
```

---

## 8. Motion & Animation

All page-entering elements use `framer-motion`. Use these exact `motion.div` presets:

```js
// Hero / primary elements
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.05, duration: 0.45, ease: 'easeOut' }}

// Standard card (staggered)
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.1–0.3 (stagger by 0.05), duration: 0.4, ease: 'easeOut' }}

// Greeting / header row
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, ease: 'easeOut' }}
```

- Modals use `AnimatePresence mode="wait"` with spring transitions
- Dropdown panels use Tailwind `animate-in fade-in-0 zoom-in-95 duration-150`
- Receipt grid items stagger with `delay = index * 0.05`

---

## 9. Greeting Banner Pattern

One instance per page-level view. Always top-of-page, full 12 columns:

```jsx
<div className="col-span-12 flex items-end justify-between pb-2">
  {/* Left — page context */}
  <div>
    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
      {formattedDate}
    </p>
    <h1 className="text-4xl font-medium text-foreground tracking-tight leading-none">
      Page / Greeting, <span className="text-primary">{userName}</span>
    </h1>
  </div>

  {/* Right — 2–3 subtle insight stats */}
  <div className="hidden sm:flex items-center gap-6">
    <div className="text-right">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Label</p>
      <p className="text-lg font-bold tabular-nums leading-tight text-emerald-500">Value</p>
    </div>
    <div className="w-px h-8 bg-border" />
    {/* …more stats */}
  </div>
</div>
```

- Max 3 insight stats on the right
- Stats hidden on mobile (`hidden sm:flex`)
- Date label: `text-[11px] uppercase tracking-widest text-muted-foreground`
- H1: always `text-4xl font-medium tracking-tight`, name highlighted in `text-primary`

---

## 10. Icons

Library: **lucide-react**. Consistent sizing rules:

| Context | Size |
|---|---|
| Inside buttons / chips | `size={12}` |
| Card icon badges | `size={14}` |
| Section-level icons | `size={14}` to `size={16}` |
| Trend arrows in insights | `size={14}` |
| Navigation | `size={15}` |

Icon containers (muted badge):
```jsx
<div className="p-1 bg-muted rounded-md text-muted-foreground">
  <Activity size={14} />
</div>
```

---

## 11. Semantic Value Colors

Always use these exact color classes for financial values:

| Value type | Class (light) | Class (dark) |
|---|---|---|
| Positive / income | `text-emerald-600` | `dark:text-emerald-400` |
| Negative / expense count | `text-rose-500` | (same) |
| Neutral / improving stat | `text-emerald-500` | (same) |
| Warning stat | `text-amber-500` | (same) |
| Critical / negative stat | `text-rose-500` | (same) |

For badge backgrounds:
- Income: `bg-emerald-100 dark:bg-emerald-900/20`
- Expense: `bg-rose-100 dark:bg-rose-900/20`

---

## 12. Key Rules Summary

1. **No raw `slate-*` color classes** — use `text-muted-foreground`, `text-foreground`, `text-secondary`
2. **No native `<select>`** — always use `<Dropdown>` + `<DropdownItem>`
3. **All cards** → `bg-card border border-border rounded-2xl p-5 shadow-sm`
4. **Receipts only** → `var(--receipt-paper)` bg, not card surface
5. **Brand orange** (`text-primary`) → interactive elements, active states, highlights, name callout in greeting
6. **Every entering section** → wrapped in `motion.div` with staggered `delay`
7. **ChevronDown** → always rotates 180° on open via `style={{ transform }}`
8. **Amounts** → `font-semibold` or `font-black`, `tracking-tight`, `tabular-nums`
9. **Section headers** → `text-sm font-semibold text-foreground`
10. **Captions / sublabels** → `text-[11px] text-muted-foreground` or `text-[10px] uppercase tracking-widest`
