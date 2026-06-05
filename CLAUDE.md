# Parts Price Comparison — Project Notes for Claude

Owner: Abe (non-technical — explain plainly, do the technical work for him, no jargon dumps).

## What this is
A Subaru car-parts price-comparison site. Compares prices for the same part across 12+ retailers, links out via "Buy now" buttons. Will expand to more manufacturers later. Old MVP lives in the parent folder (reference only — never modify).

## Stack
- **Frontend**: this folder — Next.js 15 (app router), plain CSS (no Tailwind), client-side search UI in `components/PartsBrowser.tsx`, Supabase reads via `lib/supabase.ts`.
- **Database**: Supabase project `dbrakcmlwmaqsbgfswsc` ("Price Picker"). Use the Supabase MCP connector for ALL database work — Abe expects Claude to make DB changes directly.
- **Hosting**: Vercel (NOT yet set up — parked until Abe says go). GitHub repo: swagmeister48-hash/Subie-working (Abe pushes; Claude prepares commands; sandbox cannot reach GitHub).
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

## Catalog state (June 2026)
~131,600 parts, ~185k listings, 12 sellers, ~27,400 cross-seller matched. Old MVP benchmark was 16k — beaten. Some suspicious giant price spreads (Forced Performance turbos) worth auditing.

## Frontend notes
- New UI overhaul in `components/PartsBrowser.tsx` and `app/globals.css`.
- Uses the live Supabase RPC contract: `search_parts` with `p_year_from`, `p_year_to`, `p_chassis`, `p_min_save_pct`, `p_sort = 'save_pct'`, and `get_facets()` returning `{v,n}` objects.
- Added premium dark theme, responsive slide-over filters, active filter chips, savings presets, and stronger list/card hierarchy.
- Kept analytics tracking, pageview/search/click_buy behavior, `PAGE_SIZE=40`, debounced search, and `Buy now` opening in a new tab.

- eBay is PARKED by Abe's decision — pipeline built and dormant, never re-enable without asking him.
- `search_parts` and `get_facets` are SECURITY DEFINER; test query performance as the anon role, not as owner.
- After any large data churn, run `ANALYZE` on `parts`/`listings`/`fitments`/`part_stats`.

## Conventions
- **After every code change, verify functionality with Abe via a "verify block"**: a short console-style summary of what Claude tested (DB queries, timings, counts) plus 1-2 clicks for Abe with the exact expected result.
- Sample/seed SQL files in parent folder's `setup/` are historical — DB is live, don't re-run them.
- Never put real secrets in this repo. `.env.local` is gitignored and holds Supabase URL + publishable key.
- Crawls must run sequentially per store (concurrent runs deadlock on upserts).
