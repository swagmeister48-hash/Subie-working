# Parts Price Comparison — Project Notes for Claude

Owner: Abe (non-technical — explain plainly, do the technical work for him, no jargon dumps).
Voice: when writing anything user-facing or public (posts, emails, copy), sound like a normal person — casual, direct, no marketing polish, no bullet-point essays. Abe will post these as his own words.

## What this is
A Subaru car-parts price-comparison site. Compares prices for the same part across 12+ retailers, links out via "Buy now" buttons. Will expand to more manufacturers later. Old MVP lives in the parent folder (reference only — never modify).

## Stack
- **Frontend**: this folder — Next.js 15 (app router), plain CSS (no Tailwind), client-side search UI in `components/PartsBrowser.tsx`, Supabase reads via `lib/supabase.ts`.
- **Database**: Supabase project `dbrakcmlwmaqsbgfswsc` ("Price Picker"). Use the Supabase MCP connector for ALL database work — Abe expects Claude to make DB changes directly.
- **Hosting**: LIVE on Vercel as "subiedeal" (deployed 2026-06-06). Already receiving real traffic from Instagram/Facebook/Google. GitHub repo: swagmeister48-hash/Subie-working (sandbox CAN push directly — earlier "cannot reach GitHub" note was stale).
- **Scraping**: Supabase Edge Functions (sandbox cannot reach external sites; edge functions can).

## Database essentials
- Tables: manufacturers, sellers, parts, listings, fitments, part_stats (precomputed counts — searches depend on it), facet_cache, events (analytics), crawl_log/crawl_state, ebay_jobs/ebay_raw, category_rules.
- Parts matched across sellers by `normalized_part_number` (lowercase alphanumeric). Unique constraint on it.
- `merge_prefixed_skus()` merges store-prefixed SKUs (e.g. TOM+TB6010-SB02B) into the manufacturer number — same brand + 1-4 letter prefix rule.
- `categorize()` + category_rules map ~1,100 messy store categories into ~17 clean groups in `parts.category_group`.
- Search runs through RPC `search_parts(q, p_model, p_category, p_year, p_multi_only, p_limit, p_offset)` — punctuation-insensitive via `parts.search_blob`. Facets via `get_facets()` (cached).
- After ANY big data churn: run `analyze` on parts/listings/fitments/part_stats or anon queries hit the 8s statement timeout (this bit us twice).
- `search_parts` and `get_facets` are SECURITY DEFINER (RLS re-checks cost anon ~10x; these are read-only public-catalog functions, so it's safe). Keep them read-only. Test performance AS ANON (`set local role anon`) — owner-role timings lie.

## Automation (all in Supabase pg_cron)
- `nightly-parts-crawl` 07:00 UTC — kicks edge function `crawl-driver` (self-chaining, crawls all stores page-by-page, logs to crawl_log).
- `refresh-search-stats` 08:30 UTC — merge SKUs, categorize new parts, rebuild part_stats + facet_cache, analyze.
- Edge functions: `crawl-driver`, `ingest-shopify` (manual/segmented), `ebay-ingest` (trigger/check/fetch via Bright Data), `brightdata-test`. Shared secret key inside function code (not a real secret barrier).

## eBay (working — verified end-to-end by Abe)
- Bright Data Web Scraper API, eBay dataset `gd_ltr9mjt81n0zzdk1fb`, discover_by=keywords, input field `keywords`, cap with limit_per_input. Token: Abe provides (rotate periodically).
- **Abe's rules**: New eBay listings must beat every store price; Used must beat by 15%+. All listings title-verified by `match_ebay_snapshot(snap)` (part-number-in-title proof, incl. brand-prefix-stripped; fallback = brand + Subaru-family vehicle term + 3 name words). Lessons: eBay keyword search returns junk (wrong vehicles, sneakers); genuine NEW parts rarely beat specialty stores (MAP pricing) — used/open-box is where eBay wins.
- listings have a `condition` column; unique (part_id, seller_id, condition). UI shows amber badge for non-New. ingest-shopify edge function is DEPRECATED (old conflict target) — crawl-driver is the live crawler.
- eBay Partner Network campaign ID: **5339155699** — wrap eBay URLs: `?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339155699&toolid=10001&mkevt=1`.
- Pipeline: ebay-ingest edge function (trigger/check/fetch w/ Bright Data) → ebay_raw → match_ebay_snapshot(). Cost ~1¢/part searched. NOT yet scheduled — scale/cadence decision pending with Abe.

## Analytics
`events` table: pageview / search / click_buy with anonymous session ids. Purpose: build traffic stats for affiliate outreach to stores (most stores have no formal affiliate program — direct outreach with click data is the plan).
- Each event has an `env` column: `dev` (localhost/127.0.0.1, OR a browser with `pp_owner=1` in localStorage) vs `prod` (real visitors). Filter `where env = 'prod'` for real stats. Owner mode: visiting the live site with `?owner=1` sets the flag on that browser; `?owner=0` clears it (logic in `lib/supabase.ts`).
- NEVER bulk-delete from `events` — it now holds real launch traffic (verify UA/referrer/search payloads before touching any row; real sessions show device UAs + social referrers, not headless/localhost).

## Email capture / price alerts (live June 2026)
- Lead capture for price-drop alerts (built for outreach + retention). Three entry points in the frontend: a **footer signup** (always present, source `footer`), a **popup** (source `popup`, shows ONLY after a deliberate Buy click — never on page entry/scroll; dismissal or signup persists in `localStorage.pp_email_dismissed`), and a **per-part "Alert me" bell** on each card (source `part_alert`).
- RPC `subscribe_email` writes the email to `subscribers` and, when a part is given, a row to `price_watches (subscriber_id, part_id, target_price, price_at_signup)` (`price_at_signup` read from `part_stats.best_total`). `subscribers` has an `env` column (dev/prod) like `events`. Helper: `subscribeEmail(email, source, partId?, target?)` in `lib/supabase.ts`.
- **Two RPC overloads exist**: `(p_email,p_source,p_session,p_part_id,p_target)` and `(…,p_target,p_env)`. A 5-arg call is AMBIGUOUS (PostgREST: "could not choose the best candidate function") so the helper passes **`p_env`** to target the 6-arg one. ⚠️ TODO (Cowork Claude / DB side): drop the old 5-arg overload so there's a single function — until then, never remove the 6-arg one or the frontend breaks.
- localStorage keys: `pp_email` (remembered email → one-tap part alerts), `pp_watches` (JSON array of watched part IDs → bell shows "Watching" across loads), `pp_email_dismissed`. Test signups from localhost/`pp_owner` are tagged `env='dev'`.

## Catalog state (June 2026)
~131,600 parts, ~185k listings, 12 sellers, ~27,400 cross-seller matched. Old MVP benchmark was 16k — beaten. Some suspicious giant price spreads (Forced Performance turbos) worth auditing.

## Frontend notes
- Pages: `/` (catalog, `components/PartsBrowser.tsx`) and `/retailers` (`app/retailers/page.tsx`).
- New UI overhaul in `components/PartsBrowser.tsx` and `app/globals.css`.
- Uses the live Supabase RPC contract: `search_parts` with `p_year_from`, `p_year_to`, `p_chassis`, `p_min_save_pct`, `p_sort = 'save_pct'`, and `get_facets()` returning `{v,n}` objects.
- Added premium dark theme, responsive slide-over filters, active filter chips, savings presets, and stronger list/card hierarchy.
- Kept analytics tracking, pageview/search/click_buy behavior, `PAGE_SIZE=40`, debounced search, and `Buy now` opening in a new tab.
- `/retailers`: lists all 12 stores (name, domain, rounded listing count, per-store "Ships to Canada?" note) with a plain-language intro + "confirm at checkout" disclaimer. Data is HARDCODED in `app/retailers/page.tsx` for now (counts + shipping policy) — refresh it when the catalog/policies change. Linked from the banner tagline, the top-right "retailers" header stat, and a footer link. Tracks pageviews like the rest of the site.
- Mobile filter slide-over locks `<body>` scroll while open (effect with cleanup) and uses `overscroll-behavior: contain` + capped `max-height` on long filter lists so scrolling a list (e.g. Brand) never chains to the page behind it.
- QA queries:
  - `chassis = VA` should return ~5,688 comparable parts.
  - category `Wheels & Tires` should return ~2,636.
  - savings `25%+` should return ~1,661.
  - facet badge counts should match filtered result totals exactly.

- eBay is PARKED by Abe's decision — pipeline built and dormant, never re-enable without asking him.
- DATA RETENTION (June 2026): events kept forever; price_history (change-only price+stock per part/seller) nightly; catalog_history nightly snapshot now includes per-seller competitive stats (listings/in_stock/avg/min/exclusive/contested/wins); crawl_history archives every store's nightly completion line forever (cleanup_logs aggregates before deleting crawl_log). Dashboards: subiedeal-analytics (visitors) + retailer-intel (green, per-retailer market data).
- PRICE HISTORY: backend is LIVE (June 2026) — table `price_history` (part_id, seller_id, total, in_stock, recorded_on; change-only: a row is written only when a price differs from the last recorded one). `record_price_history()` runs inside refresh_part_stats() nightly at 08:30 UTC. Baseline of ~149.6k prices seeded 2026-06-06 — history starts there. Public read-only via RLS. **NO frontend UI yet — do not add price-history charts/UI to the site until Abe explicitly says so.**
- `search_parts` and `get_facets` are SECURITY DEFINER; test query performance as the anon role, not as owner.
- After any large data churn, run `ANALYZE` on `parts`/`listings`/`fitments`/`part_stats`.

- Tied prices (very common — MAP pricing): listings order is total asc, then in-stock first, then a daily-rotating hash so no store permanently owns the top spot. Don't "simplify" this back to bare `order by total` — it silently biases one seller.
- MAGENTO STORES LIVE (June 2026): SMY Performance + Flatirons Tuning crawled via edge function `crawl-magento` (Magento GraphQL, two dialects: SMY = price_range/.html URLs, Flatirons = price.regularPrice/no URL suffix). Uses crawl_state id=2 (Shopify driver owns id=1), same Subaru-only filter, parts inserted with ignoreDuplicates (never overwrites Shopify metadata), brand inferred from facet brand list. Flatirons "*OPEN BOX*" items get condition 'Open Box'. Nightly cron `nightly-magento-crawl` 06:00 UTC. Catalog now 14 sellers. NOTE: /retailers page + "12 retailers" banner copy need updating to 14.

- QUALITY AUDIT (June 2026): deleted 113 non-parts (gift cards, shipping protection, "pick up in store") and 533 "$9,999.00 call-for-price" placeholder listings (Rays special-order wheels etc. — exactly 9999.00 only; $9,999.99 IAG engines are real). refresh_part_stats() now strips total=9999.00 nightly since crawls re-add them. SMY case-quantity fluids (Motul etc. at ~12x bottle price under same SKU) are real prices left in place — price_ceiling already hides them from comparisons. Magento crawler v3: space-form foreign names (Focus RS / Golf R / MK7) added to FOREIGN_RE; products without url_key link to the store's /catalogsearch/result/?q=SKU page.

- NUMERIC-SKU COLLISION FIX (June 2026, user-reported): bare numeric SKUs (e.g. "12000") are not unique across brands — BC Racing coilovers were merged with a Vibrant hose. Rule now: numeric-only SKUs get brand-qualified normalized_part_number (normNum(brand)+digits) in BOTH crawlers (crawl-driver v5, crawl-magento v4) and the DB was migrated to match. 62 mismatched listings deleted (URL-slug-vs-name token check). If a "wrong product" report comes in, check for npn collision first.

- FITMENT PAIRING FIX (June 2026, user-reported by a DB engineer on Reddit): fitments were a cartesian of all models x all years in a title ("2008-2021 WRX / 2009-2017 Forester" gave Forester 2021). Now segment-paired: years bind to models in their own slash-segment (model-only segments inherit the previous segment's years). Rebuilt all fitments (382k rows), chassis re-derived, and BOTH crawlers (crawl-driver v6, crawl-magento v5) parse this way. ALSO: search_parts + get_facet_counts now require model+year to match the SAME fitment row (they were independently ANDed).

- EMAIL CAPTURE + SEO (backend ready June 2026, FRONTEND NOT BUILT/PUSHED until Abe says go):
  - `subscribe_email(p_email, p_source, p_session, p_part_id, p_target, p_env)` RPC — upserts a subscriber (table `subscribers`, private, public INSERT only), optional `price_watches` row for a specific part. Returns {ok:true} or {ok:false,error}. SINGLE overload only (the old 5-arg version was dropped June 2026 to avoid ambiguity — frontend passes all 6 incl. p_env). p_env tags owner/localhost signups 'dev'.
  - `parts.slug` generated column = "name-slug-<id>"; `get_part_page(slug)` returns full part payload (listings, save_pct, fitment) for an SEO part page; `sitemap_slugs(limit,offset)` lists cross-shoppable slugs for the sitemap.
  - Frontend TODO (Claude Code, on Abe's word): email popup/footer capture calling subscribe_email; server-rendered /part/[slug] pages calling get_part_page (this is the SEO unlock — site is currently one client-rendered page Google can't index); /sitemap.xml from sitemap_slugs; price-drop digest email sender (separate, later).

- CRON TIMEOUT FIX (June 2026): refresh_part_stats() grew (price history + per-seller competitive snapshot) and started exceeding pg_cron's ~2min default statement_timeout — the 08:30 refresh silently failed, so catalog_history/price_history stopped accruing new days. Fix: `alter function ... set statement_timeout` (refresh_part_stats 20min, others 10min). Full refresh now takes ~98s. If multi-day data ever stalls again, check cron.job_run_details for jobid 2 first.

- PRICE-ALERT EMAILS (backend built June 2026, NOT yet sending): subscribers.env tags owner/localhost signups 'dev' (subscribe_email gained p_env; analytics + counts filter env='prod'). price_watches gained last_alerted_price/at. due_price_alerts() returns watches whose best price dropped below signup/last-alert price (and target if set). Edge fn `send-price-alerts` (gated by INGEST_KEY) groups by subscriber, sends Resend digest email, marks alerted; runs DRY-RUN until RESEND_API_KEY secret is set (verified dry-run works). Edge fn `unsubscribe?token=` flips unsubscribed. Cron `nightly-price-alerts` 09:00 UTC (after 08:30 stats). TO GO LIVE: Abe creates Resend acct, verifies subiedeal.com domain (DNS), sets RESEND_API_KEY secret; then alerts send automatically. FROM = alerts@subiedeal.com.

## Conventions
- **After every code change, verify functionality with Abe via a "verify block"**: a short console-style summary of what Claude tested (DB queries, timings, counts) plus 1-2 clicks for Abe with the exact expected result.
- Sample/seed SQL files in parent folder's `setup/` are historical — DB is live, don't re-run them.
- Never put real secrets in this repo. `.env.local` is gitignored and holds Supabase URL + publishable key.
- Crawls must run sequentially per store (concurrent runs deadlock on upserts).
- SUBARU-ONLY RULE (June 2026, from user feedback): the catalog excludes parts whose title names a foreign make/model with no Subaru-family signal (subaru/wrx/sti/brz/fr-s/gt86/chassis/engine codes). Enforced in crawl-driver at ingestion AND was applied as a one-time DB purge (~37k parts). Dual-fitment parts (e.g. "WRX/Evo") are kept. BRZ/86/FR-S twins always count as Subaru.
