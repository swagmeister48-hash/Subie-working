# Subie — Handoff / Project State

_Last updated: 2026-06-08_

## Project state (current)

### Database (Supabase, all live)
- **Search RPC:** `search_parts(q, p_model, p_category, p_year_from, p_year_to, p_multi_only, p_brand, p_color, p_seller, p_chassis, p_in_stock, p_price_min, p_price_max, p_min_save_pct, p_sort, p_limit, p_offset)`.
- **Sorts:** `relevance`, `price_asc`, `price_desc`, `discount`, `save_pct`, `name`.
- **Facets:** `get_facets()` returns `{v,n}` objects for models / categories / brands / colors / sellers / chassis, plus a `years[]` array.
- Both functions are `SECURITY DEFINER` (fast for the anonymous web role). Test query performance **as the anon role**, not owner.
- Facet counts reflect the default **2+-retailer** ("cross-shoppable") view.
- **Chassis** is derived from fitment data: VA ≈ 5,673 · GR ≈ 4,664 · GD ≈ 4,092 · VB ≈ 2,509 · ZC6 ≈ 2,156 · SJ ≈ 1,547 · ZD8 ≈ 1,469 · SK ≈ 1,252 · SG ≈ 1,233 · SH ≈ 1,232 · SF ≈ 681 · GC8 ≈ 447 (plus a handful of low-count codes hidden in the UI).
- **Colors** inferred (~43k parts colored).
- **eBay is PARKED** — there is no eBay seller in the catalog. Do not re-enable without asking Abe.
- **Nightly maintenance** auto-runs merge SKUs / categorize / color / chassis / stats / `ANALYZE`.
- **Catalog:** ~136k parts, ~28k cross-shoppable, 12 sellers.

#### First-load performance fix (2026-06-06)
- **Symptom:** the default catalog showed empty on first paint; applying then clearing any
  filter made results appear.
- **Root cause:** the default `search_parts` query took ~5s even warm because the planner
  chose a full Seq Scan on the wide `parts` table (Supabase's default `random_page_cost=4`
  is wrong for SSD). Cold, it exceeded the anon statement timeout; the error was swallowed
  and rendered as "0 results". A warmed retry (after a filter) then succeeded.
- **Fix:** migration `search_parts_ssd_planner_costs` scopes `random_page_cost = 1.1` and
  `work_mem = '64MB'` to the `search_parts` function only (no global impact). It now picks
  the PK index plan: **~5s → ~0.3s**. `ALTER FUNCTION` invalidates cached plans so PostgREST
  backends replan automatically.
- **Belt-and-suspenders:** the client (`searchParts` + `run()`) now distinguishes a real
  error from genuinely-empty results and retries a slow/cold query up to 2× with backoff,
  and the first paint fires immediately (not behind the debounce timer). A failed load shows
  a "Try again" message instead of a misleading "No parts match".

### Frontend (builds clean)
- **Type system:** Space Grotesk (display/headings + wordmark), Manrope (body), JetBrains
  Mono (search box, part numbers, prices) — loaded via `next/font/google` in `app/layout.tsx`
  as `--font-display` / `--font-sans` / `--font-mono`. (Replaced Inter-everywhere.)
- **Brand bar:** asymmetric header — `✦ SUBIE` wordmark left, live **parts / retailers**
  stats right (categories stat removed). Replaces the old centered-everything stack.
- **Search:** prominent centered field with a `⌕` glyph, box-less, ~4px corners, mono font,
  green caret; placeholder "input part number, name, etc"; wired to the debounced search.
  Small uppercase mono tagline "The best price, every time" beneath it.
- **Chassis/model banner** — Subaru image chosen from the active chassis/model filter, edges
  gradient-blended into the page background (`#11151f`), with a small green eyebrow
  (Chassis/Model) + display-font headline + year/model sub. Default (no filter) banner reads
  **"For enthusiasts and professionals."** Graceful gradient+text fallback if an image is
  missing (no broken-image icon).
- **Filters:** compact wrapping chips (not full-width stacked pills); the **entire header row
  is click-to-toggle** with hover + rotating chevron; groups collapsed by default.
- **Results:** stronger hierarchy — display-font part names, mono part-numbers/prices, and the
  **best (cheapest) listing row is highlighted green**. Performance green (`#3cbf77`) on Best
  badge / Buy buttons / savings; blue (`#2e5fe8`) accent for general UI.
- Homepage loads the default catalog with a skeleton loader; analytics `track()`
  (pageview / search / click_buy) wired.
- **Email capture / price alerts** (`components/EmailSignup.tsx`): always-present **footer
  signup** (source `footer`); a **popup** (source `popup`) that appears ONLY after a Buy click
  (never on entry/scroll), dismissal/signup remembered in `pp_email_dismissed`; and a quiet
  orange **"Alert me" bell** on each card (source `part_alert`) — one tap if `pp_email` is
  known, else a compact email + optional "under $___" target. Watches persist in `pp_watches`
  → "Watching". All via `subscribeEmail(email, source, partId?, target?)` → `subscribe_email`
  RPC (writes `subscribers` + `price_watches`). The helper passes `p_env` to disambiguate the
  two RPC overloads — see CLAUDE.md "Email capture" (drop the old 5-arg overload eventually).

### Hosting / repo
- **Vercel:** LIVE as "subiedeal" — every push to `main` auto-deploys.
- **GitHub:** `swagmeister48-hash/Subie-working`. Claude can push directly.

#### ⚠️ Two checkouts — commit & push config/doc changes immediately
There are TWO working copies of this repo on Abe's machine, and TWO Claudes touch it:
- **Primary working dir:** `/Users/abe/Subie-working` (this Claude — frontend/UI).
- **MVP checkout:** `~/Downloads/Subie-mvp-main/parts-compare` — used as a SYNC TARGET
  (`git -C … pull origin main` after each push) and also where "Cowork Claude" (DB/backend)
  has been working.

Rule, so this never bites again (uncommitted `CLAUDE.md` edits in the MVP checkout twice
blocked syncs and nearly got lost):
- **Whoever edits `CLAUDE.md` / `HANDOFF.md` / any tracked file commits AND pushes it right
  away** — don't leave uncommitted edits sitting in either checkout.
- **Author in your own working dir, then push;** don't hand-edit files in the other Claude's
  checkout except to consolidate someone's stranded work onto `main`.
- A pull that fails with *"local changes would be overwritten"* means the target has
  uncommitted work — inspect `git status`/`git diff`, commit & push it first, then pull.
- A pull that fails on **`index.lock`**: if no `git` process is actually running (check `ps`
  and the lock's age), it's a stale lock — `rm .git/index.lock` and retry.

## Pending
- Vercel deployment (when Abe says go).
- Audit suspicious giant price spreads (e.g. Forced Performance turbos).
- eBay cadence/scale decision (only if Abe un-parks it).

## Banner images

All banner photos live in `/public/cars/`, were resized to ~1600px and optimised to
**≤300 KB** each, and every one was **visually confirmed to be the correct Subaru** before use.

### Image credits
Every file below is from **Pexels** under the [Pexels License](https://www.pexels.com/license/)
— free for commercial use, no attribution required (credited here anyway).

| File | What it is | Source |
| --- | --- | --- |
| `default.jpg` | Impreza (GC8) "555" rally car — site default & GC8 | https://www.pexels.com/photo/subaru-rally-car-at-red-bull-off-road-race-33626705/ |
| `va.jpg` | Silver VA-gen WRX STI (2015–2021) | https://www.pexels.com/photo/silver-subaru-wrx-sti-12920621/ |
| `gd.jpg` | Blue GD-gen WRX STI (2002–2007) | https://www.pexels.com/photo/high-speed-blue-subaru-wrx-sti-on-highway-30112449/ |
| `gr.jpg` | Orange GR-gen Impreza WRX hatch (2008–2014) | https://www.pexels.com/photo/back-view-of-orange-subaru-impreza-wrx-18501353/ |
| `zc6.jpg` / `brz.jpg` | White 1st-gen Subaru BRZ (ZC6) | https://www.pexels.com/photo/white-subaru-brz-sports-car-18611668/ |
| `zd8.jpg` | Modified (lowered) Subaru BRZ — see note below | https://www.pexels.com/photo/subaru-brz-at-night-gas-station-stop-31768891/ |
| `wrx.jpg` | Blue VA-gen WRX, front | https://www.pexels.com/photo/front-of-blue-subaru-impreza-wrx-16728010/ |
| `sti.jpg` | Two WRX STIs at night | https://www.pexels.com/photo/black-and-white-subaru-wrx-cars-17158873/ |
| `forester.jpg` / `sh.jpg` | Black SH-gen Forester (2009–2013) | https://www.pexels.com/photo/black-subaru-forester-19868891/ |
| `sf.jpg` | Green SF-gen Forester (1997–2002), cropped from a 2-car shot | https://www.pexels.com/photo/two-subaru-suvs-parked-outdoors-in-nature-28577509/ |
| `sg.jpg` | White SG-gen Forester STI (2003–2008) | https://www.pexels.com/photo/white-subaru-forester-in-north-carolina-outdoors-30454655/ |
| `sj.jpg` | Silver SJ-gen Forester (2014–2018) | https://www.pexels.com/photo/silver-suv-parked-by-the-baltic-sea-in-estonia-34529318/ |
| `sk.jpg` | Gray SK-gen Forester (2019+), snowy mountains | https://www.pexels.com/photo/subaru-car-with-snowy-mountain-backdrop-31978126/ |
| `impreza.jpg` | White GD-gen Impreza WRX STI | https://www.pexels.com/photo/white-modified-subaru-impreza-wrx-sti-9661391/ |
| `outback.jpg` | Modern Outback off-road | https://www.pexels.com/photo/subaru-outback-in-mud-15928390/ |

> **Note on `zd8.jpg`:** a free-licensed photo of a *true* 2nd-gen ZD8 BRZ wasn't available
> on Unsplash / Pexels / Pixabay, so this is the closest genuine Subaru BRZ (a clean, lowered
> 1st-gen-facelift build). It's a deliberate, brand-accurate stand-in — swap it if a real ZD8
> turns up. Two candidates were rejected during sourcing for being Toyota 86 twins, not Subarus.

### How the banner picks an image (`resolveBanner` in `components/PartsBrowser.tsx`)
1. **Active chassis** → its mapped image: VA→`va`, GD→`gd`, GR→`gr`, ZC6→`zc6`, ZD8→`zd8`,
   VB→`wrx`, GC8→`default`, and each Forester generation to its own photo:
   SF→`sf`, SG→`sg`, SH→`sh`, SJ→`sj`, SK→`sk`.
2. Else **active model** → WRX→`wrx`, STI→`sti`, BRZ→`brz`, Forester→`forester`,
   Impreza→`impreza`, Outback→`outback`.
3. Else → `default.jpg` (the rally car), headline "For enthusiasts and professionals."

Every mapping points at a file that exists, so the banner never requests a missing image.
If an image ever fails to load, an `onError` handler hides it and the styled gradient + text
remain (no broken-image icon).
