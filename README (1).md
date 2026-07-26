# Anchor — setup

## 1. Supabase project
1. Create a new Supabase project (separate from budget/75hard — keeps this data isolated).
2. Open the SQL editor → paste all of `schema.sql` → Run.
3. In Authentication → Providers, make sure Email is enabled. If you don't want
   email confirmation friction for two known users, turn off "Confirm email"
   under Authentication → Settings.
4. Copy Project URL and anon public key from Settings → API.

## 2. Configure the app
In `index.html`, set:
```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

## 3. Deploy
Same pattern as budget/75hard — push `index.html`, `manifest.json` to a repo and
serve via GitHub Pages or Vercel.

## 4. First run
1. You sign up, create an invite code (shown on a waiting screen).
2. Send the code to your partner; they sign up and enter it to join.
3. Once both are paired, you each land on your own Today screen — you cannot
   see, edit, or query her goals, checkins, or pool. The only shared table is
   `owed_gifts` (a claimed wishlist reward), by design.

## How the account boundary is enforced
- Every table (`goals`, `goal_items`, `checkins`, `wishlist_items`) has an RLS
  policy scoped to `owner_id = auth.uid()` — there is no policy granting
  select to a partner, so even a compromised client can't read the other
  person's data directly.
- Moving a missed goal's stake into the *partner's* pool has to cross that
  boundary somehow — that happens only inside `resolve_day()`, a
  `SECURITY DEFINER` Postgres function with fixed logic (no arbitrary input),
  callable only via `sb.rpc('resolve_day')`. It resolves the caller's own
  goals and credits the partner's pool by a formula, nothing else.
- `claim_wishlist()` works the same way: it re-checks your pool balance
  server-side (never trusts the number the client sends) before creating the
  shared `owed_gifts` row.

## Notes / open decisions for you to test
- **Manual "Resolve yesterday"**: for v1, each person resolves their own
  previous day with a button tap (matches your "manual vs cron" question from
  the POC). If this feels like friction after a week, the same `resolve_day()`
  function can be wrapped in a Supabase Edge Function + cron so it runs
  automatically at midnight per person — no schema changes needed.
- **Streak multiplier cap** is still the same ±60% cap from the POC
  (`least(streak, 20) * 0.03`) — easy to retune in `schema.sql` if it feels
  too spicy or too flat once you've lived with it a few weeks.
- **Checklist "full day" streak** (the 🔥 combo streak for all 5 prayers) was
  in the POC but isn't tracked as its own column in this v1 — each prayer's
  streak is tracked individually. Say the word if you want the combined
  streak back; it's a small addition (one column + a bit of `resolve_day`
  logic).
- v1 scope on purpose, per what we agreed: no push notifications, no
  Amazon/Flipkart URL scraping for wishlist items (manual entry only), no
  income-based pricing. All addable later without restructuring what's here.
