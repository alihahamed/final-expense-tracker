# Kinetic Expense Tracker — Codebase Security & Architecture Report

**Generated:** 2026-04-17
**Version:** 0.0.0
**Stack:** React 19 + Vite + Tailwind CSS v4 + Supabase + Tesseract.js

---

## 1. Architecture Overview

### 1.1 Project Structure

```
src/
├── App.jsx                    # Root component, state management, auth, realtime channels
├── main.jsx                   # React root entry
├── index.css                  # Tailwind + custom CSS variables
├── components/
│   ├── BalancesWidget.jsx     # Shared expense split widget (couples 50/50)
│   ├── Dropdown.jsx           # Reusable dropdown
│   ├── MiniTooltip.jsx        # Chart tooltip
│   ├── ReceiptScanModal.jsx   # OCR receipt scanning modal (NEW)
│   ├── SettleUpModal.jsx      # Settlement confirmation modal
│   ├── TransactionCard.jsx    # Receipt-styled transaction card
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── supabase.js            # Supabase client initialization
│   └── utils.js               # cn() class merger
├── pages/
│   ├── DashboardPage.jsx      # Main dashboard with charts & widgets
│   ├── LedgersPage.jsx        # Workspace management
│   ├── LoginPage.jsx          # Auth forms
│   ├── SettingsPage.jsx       # User preferences & data export
│   └── TransactionsPage.jsx   # Full transaction list
└── utils/
    ├── data.js                # Formatters, monthly trend builder, constants
    └── receiptParser.js       # OCR text parsing & auto-categorisation (NEW)
```

### 1.2 Database Schema (Supabase/PostgreSQL)

| Table | Columns | RLS |
|-------|---------|-----|
| `ledgers` | id, name, invite_code, created_at | ✅ Enabled |
| `ledger_members` | ledger_id, user_id, role, created_at | ✅ Enabled |
| `transactions` | id, ledger_id, user_id, type, category, description, amount, date, created_at | ✅ Enabled |
| `profiles` | id, display_name, avatar_url, currency, income_target, fixed_obligations, updated_at | ✅ Enabled |

**Transaction types:** `income`, `expense`, `transfer` (CHECK constraint)

### 1.3 Authentication Flow

- Supabase Auth with email/password
- No email verification required (configured in Supabase project)
- Session persisted via Supabase client (localStorage + JWT)
- `useEffect` in `App.jsx` subscribes to `onAuthStateChange`

---

## 2. Security Analysis

### 2.1 CRITICAL: Exposed Publishable Key

**File:** `.env.local`

```
VITE_SUPABASE_URL=https://rpjlcymwempzodxaolub.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_reAiHzXnS79uUz_v3-cqNg_8C5jN7qP
```

**Status:** ✅ Expected behavior for Supabase client-side apps. The publishable (anon) key is designed to be exposed. Security relies on RLS policies, not key secrecy.

**Risk:** None directly, but ensure:
- `.env.local` is in `.gitignore`
- RLS policies are correctly configured on ALL tables
- No service role key is ever committed

**Recommendation:** Verify `.gitignore` contains `.env*` and `.env.local`.

---

### 2.2 Row Level Security (RLS) Policy Audit

#### `ledgers` table

| Policy | Command | Condition | Risk |
|--------|---------|-----------|------|
| Users can view their ledgers | SELECT | `id IN (SELECT ledger_id FROM ledger_members WHERE user_id = auth.uid())` | ✅ Safe |
| Users can insert ledgers | INSERT | `null` | ⚠️ **MODERATE** |
| Users can delete ledgers | DELETE | `id IN (SELECT ledger_id FROM ledger_members WHERE user_id = auth.uid())` | ✅ Safe |

**Issue:** INSERT policy allows any authenticated user to create a ledger. This is intentional for UX, but there's no rate limiting. A malicious user could spam ledger creation.

**Recommendation:** Add rate limiting via Supabase Edge Functions or database triggers.

---

#### `ledger_members` table

| Policy | Command | Condition | Risk |
|--------|---------|-----------|------|
| ledger_members_select_shared | SELECT | `ledger_id IN (SELECT get_user_ledger_ids(auth.uid()))` | ✅ Safe |
| Users can insert ledger_members | INSERT | `null` | ⚠️ **HIGH** |

**Issue:** INSERT policy has `null` condition — any authenticated user can insert into `ledger_members`, potentially joining ledgers they shouldn't have access to.

**However:** The `join_ledger` RPC function validates invite codes. Direct inserts bypass this validation.

**Attack Vector:**
```sql
INSERT INTO ledger_members (ledger_id, user_id) VALUES ('victim-ledger-uuid', 'attacker-user-id');
```

**Recommendation:** Change INSERT policy to:
```sql
CREATE POLICY "Users can insert themselves as members"
  ON ledger_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

This ensures users can only add themselves (not others) and still allows the invite code flow.

---

#### `transactions` table

| Policy | Command | Condition | Risk |
|--------|---------|-----------|------|
| transactions_all_v2 | ALL | `user_has_ledger_access(ledger_id)` | ✅ Safe |
| transactions_delete_v2 | DELETE | `user_has_ledger_access(ledger_id)` | ✅ Safe (redundant with ALL) |

**Status:** Uses `user_has_ledger_access()` SECURITY DEFINER function. This is correctly implemented.

**Note:** The DELETE policy is redundant since ALL covers DELETE, but no security impact.

---

#### `profiles` table

| Policy | Command | Condition | Risk |
|--------|---------|-----------|------|
| Public profiles are viewable by everyone | SELECT | `true` | ⚠️ **MODERATE** |
| Users can insert their own profile | INSERT | `null` | ⚠️ **MODERATE** |
| Users can update own profile | UPDATE | `auth.uid() = id` | ✅ Safe |

**Issues:**
1. **SELECT `true`** — All profiles are publicly readable. Any authenticated user can see all other users' display names, avatars, currencies, and financial targets.

2. **INSERT `null`** — Any user can insert a profile for ANY user ID, potentially hijacking accounts or creating fake profiles.

**Attack Vector:**
```sql
-- Attacker creates/overwrites victim's profile
INSERT INTO profiles (id, display_name, currency) VALUES ('victim-uuid', 'Hacked', 'USD')
ON CONFLICT (id) DO UPDATE SET display_name = 'Hacked';
```

**Recommendation:**
```sql
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
```

---

### 2.3 Frontend Security Issues

#### 2.3.1 No Input Sanitisation on Free-Text Fields

**Files:** `App.jsx`, `ReceiptScanModal.jsx`, `SettingsPage.jsx`

User inputs for `description`, `merchant`, `userName` are not sanitised before display.

**Risk:** If a user enters `<script>alert('xss')</script>` as a description, it could execute if rendered via `dangerouslySetInnerHTML`.

**Current Status:** React auto-escapes JSX interpolation, so XSS is blocked by default. No `dangerouslySetInnerHTML` usage found.

**Verdict:** ✅ Safe from XSS due to React's default escaping.

---

#### 2.3.2 localStorage Data Exposure

**File:** `App.jsx:340-342`

```javascript
useEffect(() => {
  if (activeLedger?.id) {
    localStorage.setItem('kinetic_active_ledger', activeLedger.id);
  }
}, [activeLedger?.id]);
```

**Risk:** Low. Only the ledger ID is stored, not sensitive financial data.

**However:** If a user's device is compromised, an attacker could determine which ledger the user was viewing.

**Verdict:** Acceptable risk.

---

#### 2.3.3 No CSRF Token Validation

**Status:** Not applicable. Supabase handles CSRF protection internally via its auth flow. All API calls use the Supabase client which includes the session token.

---

#### 2.3.4 Missing Rate Limiting on Auth

**File:** `LoginPage.jsx`

No client-side rate limiting on login attempts. A user could spam login requests.

**Mitigation:** Supabase has built-in rate limiting on auth endpoints (configurable in dashboard).

**Verdict:** ✅ Covered by Supabase infrastructure.

---

### 2.4 Realtime/WebSocket Security

**File:** `App.jsx:367-408`

Three channels are subscribed:
1. `ledger-${activeLedger.id}` — transactions INSERT/UPDATE/DELETE
2. `members-${activeLedger.id}` — ledger_members changes
3. (implicit) Supabase Auth state

**Risk Assessment:**
- Channels are filtered by `ledger_id` → users only receive events for ledgers they're members of
- RLS policies are applied to Realtime events
- No sensitive data is broadcast to unauthorised users

**Verdict:** ✅ Secure.

---

### 2.5 OCR/Receipt Scanning Security

**File:** `ReceiptScanModal.jsx`, `receiptParser.js`

**Key Points:**
1. **Client-side OCR** — Tesseract.js runs entirely in the browser. Receipt images never leave the user's device.
2. **No external API calls** — No data sent to OpenAI, Google Vision, or any third party.
3. **Image preprocessing** — Canvas-based resize/grayscale only, no exfiltration.

**Verdict:** ✅ Privacy-preserving by design. Excellent.

**Potential Issue:** The `createImageBitmap` and `canvas.toBlob` APIs could fail on malformed images, but the error handling catches this gracefully.

---

### 2.6 Dependency Vulnerabilities

**Command:** `npm audit` (recommended to run)

**Notable dependencies:**
- `@supabase/supabase-js` — Actively maintained, no known critical CVEs
- `tesseract.js` — Client-side OCR, no network calls
- `react` / `react-dom` — Latest versions (19.x)

**Recommendation:** Run `npm audit` regularly and set up Dependabot.

---

## 3. Code Quality Issues

### 3.1 Unused `SAMPLE_TXNS` in Production

**File:** `utils/data.js:23-59`

Contains hardcoded sample transactions that are never used in production (data is fetched from Supabase).

**Recommendation:** Remove or move to a seed script.

---

### 3.2 Hardcoded Currency in Modal

**File:** `ReceiptScanModal.jsx:118-119`

The currency symbol prefix uses a hardcoded switch:
```javascript
{currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency}
```

**Issue:** Doesn't support all currencies defined in `CURRENCIES`.

**Recommendation:** Use the `CURRENCIES[currency].symbol` from `utils/data.js`.

---

### 3.3 Duplicate RLS Policies

**Table:** `ledger_members`

Two INSERT policies exist:
- `Users can insert ledger_members`
- `Users can insert ledger members`

**Recommendation:** Clean up duplicates:
```sql
DROP POLICY IF EXISTS "Users can insert ledger members" ON ledger_members;
```

---

### 3.4 Duplicate SELECT Policies on `profiles`

Two SELECT policies exist:
- `Public profiles are viewable by everyone`
- `Profiles are viewable by everyone`

**Recommendation:** Drop both and create a single restrictive policy (see Section 2.2).

---

### 3.5 Missing Error Boundaries

No React Error Boundary wraps the app. A runtime error in any component will crash the entire UI.

**Recommendation:** Add an Error Boundary component at the root level.

---

### 3.6 Console Logs in Production

**File:** `App.jsx`, `LedgersPage.jsx`, `ReceiptScanModal.jsx`

Several `console.error` and `console.log` statements are present.

**Risk:** Low, but leaks internal state to browser console.

**Recommendation:** Remove or use a logging library that disables in production.

---

## 4. Data Integrity Issues

### 4.1 No Validation on `transactions.amount`

**Table:** `transactions`

The `amount` column is `numeric` with no constraints. Users can insert:
- Negative incomes (via direct SQL bypass)
- Zero amounts
- Extremely large numbers (overflow risk)

**Recommendation:** Add CHECK constraint:
```sql
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check
  CHECK (amount != 0);
```

---

### 4.2 No Cascade Delete on Foreign Keys

**Tables:** `transactions`, `ledger_members`

When a ledger is deleted, associated transactions and members are NOT automatically deleted.

**Evidence:** `LedgersPage.jsx:108` attempts to delete a ledger but may fail due to FK constraints.

**Recommendation:** Add `ON DELETE CASCADE` to foreign keys:
```sql
ALTER TABLE transactions DROP CONSTRAINT transactions_ledger_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_ledger_id_fkey
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE;

ALTER TABLE ledger_members DROP CONSTRAINT ledger_members_ledger_id_fkey;
ALTER TABLE ledger_members ADD CONSTRAINT ledger_members_ledger_id_fkey
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE;
```

---

### 4.3 `user_id` Nullable in `transactions`

**Column:** `transactions.user_id`

The `user_id` column is nullable. This allows transactions without an owner, which breaks the BalancesWidget logic.

**Recommendation:** Make non-nullable:
```sql
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
```

---

## 5. Privacy Considerations

### 5.1 Email Exposure via `get_ledger_members_with_email`

**Function:** `get_ledger_members_with_email(p_ledger_id)`

Returns email addresses of all ledger members to any member of that ledger.

**Risk:** Moderate. Email addresses are exposed to other users.

**Mitigation:** This is intentional for the couples split feature. Consider adding a privacy setting to allow users to hide their email.

---

### 5.2 `profiles` Table Public Read

As noted in Section 2.2, all profiles are publicly readable. This exposes:
- Display names
- Avatar selections
- Currency preferences
- Income targets
- Fixed obligations

**Recommendation:** Restrict SELECT to own profile only.

---

## 6. Recommendations Summary

### Critical (Fix Immediately)

| Issue | Severity | Fix |
|-------|----------|-----|
| `profiles` INSERT allows hijacking | HIGH | Add `WITH CHECK (id = auth.uid())` |
| `profiles` SELECT exposes all users | MODERATE | Change to `USING (id = auth.uid())` |

### High Priority

| Issue | Severity | Fix |
|-------|----------|-----|
| `ledger_members` INSERT allows arbitrary joins | HIGH | Add `WITH CHECK (user_id = auth.uid())` |
| No cascade delete on FK | HIGH | Add `ON DELETE CASCADE` |
| `transactions.user_id` nullable | MODERATE | Add `NOT NULL` constraint |

### Medium Priority

| Issue | Severity | Fix |
|-------|----------|-----|
| Duplicate RLS policies | LOW | Clean up with DROP POLICY |
| No rate limiting on ledger creation | MODERATE | Add rate limiting |
| No error boundary | LOW | Add React Error Boundary |
| Console logs in production | LOW | Remove or disable |

### Low Priority

| Issue | Severity | Fix |
|-------|----------|-----|
| Unused `SAMPLE_TXNS` | LOW | Remove |
| Hardcoded currency switch | LOW | Use `CURRENCIES` map |
| No `amount != 0` constraint | LOW | Add CHECK constraint |

---

## 7. Migration Script (Recommended)

```sql
-- Fix profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Fix ledger_members INSERT
DROP POLICY IF EXISTS "Users can insert ledger members" ON ledger_members;
DROP POLICY IF EXISTS "Users can insert ledger_members" ON ledger_members;

CREATE POLICY "Users can insert themselves as members"
  ON ledger_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add cascade delete
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_ledger_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_ledger_id_fkey
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE;

ALTER TABLE ledger_members DROP CONSTRAINT IF EXISTS ledger_members_ledger_id_fkey;
ALTER TABLE ledger_members ADD CONSTRAINT ledger_members_ledger_id_fkey
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE;

-- Fix nullable user_id
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;

-- Add amount validation
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check
  CHECK (amount != 0 AND type IN ('income', 'expense', 'transfer'));
```

---

## 8. Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `src/App.jsx` | ~720 | Root component, auth, state, realtime |
| `src/main.jsx` | 11 | React entry |
| `src/index.css` | ~200 | Tailwind + CSS vars |
| `src/lib/supabase.js` | 7 | Supabase client |
| `src/lib/utils.js` | ~10 | cn() helper |
| `src/pages/DashboardPage.jsx` | ~650 | Dashboard with charts |
| `src/pages/LedgersPage.jsx` | ~310 | Workspace management |
| `src/pages/LoginPage.jsx` | 135 | Auth forms |
| `src/pages/SettingsPage.jsx` | 325 | User preferences |
| `src/pages/TransactionsPage.jsx` | ~180 | Transaction list |
| `src/components/BalancesWidget.jsx` | 177 | Split calculation |
| `src/components/ReceiptScanModal.jsx` | ~280 | OCR scanning |
| `src/components/SettleUpModal.jsx` | ~130 | Settlement modal |
| `src/components/TransactionCard.jsx` | 158 | Receipt card UI |
| `src/utils/data.js` | 134 | Helpers & constants |
| `src/utils/receiptParser.js` | 227 | OCR parsing |
| `package.json` | 48 | Dependencies |
| `.env.local` | 2 | Environment vars |

---

## 9. Conclusion

The Kinetic expense tracker has a solid architecture with appropriate use of RLS policies. However, three critical issues require immediate attention:

1. **`profiles` table** — Open INSERT and SELECT policies allow data exposure and account hijacking.
2. **`ledger_members` table** — Open INSERT policy allows unauthorized ledger joins.
3. **Cascade deletes** — Missing FK cascade causes deletion failures and orphaned data.

The new OCR receipt scanning feature is implemented securely with client-side processing, preserving user privacy.

After applying the recommended migration script, the application will have a significantly improved security posture.