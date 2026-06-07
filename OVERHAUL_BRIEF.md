# Frontend Overhaul Brief — for Claude Code

Read CLAUDE.md first for project context. This brief is the spec for a visual + filter overhaul
of the site. The database work is DONE — the new RPC contract below is live in Supabase.
Your job is frontend only. Do not modify the database, edge functions, or anything in ../setup.

## Design direction: "Performance dark"
- Keep dark theme, make it premium: refined typography (consider Inter or a similar clean sans
  via next/font), one strong accent color used sparingly (suggest a rally blue, e.g. #2E5FE8
  family, or pick better), subtle surface elevation, tighter visual hierarchy.
- Flat and fast: no heavy gradients/glows. This is a price-comparison tool — data clarity wins.
- Keep the seller-comparison LIST layout (no image grid). Polish the cards: clearer hierarchy
  between part name / metadata / prices, stronger "Best" treatment, prominent green savings.
- Add a proper header: site name, tagline ("Compare Subaru part prices across 12 retailers"),
  maybe a compact stat strip (parts count, retailers, etc. — hardcode or fetch once).
- Fully responsive. On mobile the sidebar becomes a slide-over/accordion behind a Filters button.

## Layout: sidebar filter panel (desktop)
- Left sidebar (~260px) with collapsible filter groups, each option showing its count:
  Model, Chassis code, Year range, Category, Brand, Color, Retailer, Price, Savings, toggles.
- Counts come from get_facets() (shape below). Active filters shown as removable chips above
  the results. "Clear all" affordance. Result count + sort dropdown in a toolbar above results.
- Keep the "Only show parts sold by 2+ retailers" toggle, default ON.

## Live RPC contract (already deployed — match it exactly)

supabase.rpc("search_parts", {
  q: string,                 // search text
  p_model: string,           // '' = all
  p_category: string,
  p_year_from: number,       // 0 = no lower bound
  p_year_to: number,         // 0 = no upper bound
  p_multi_only: boolean,
  p_brand: string,
  p_color: string,
  p_seller: string,
  p_chassis: string,         // e.g. 'VA', 'GC8', '' = all
  p_in_stock: boolean,
  p_price_min: number,       // 0 = none
  p_price_max: number,
  p_min_save_pct: number,    // e.g. 10 = only parts where you save >=10% vs highest seller
  p_sort: string,            // 'relevance' | 'price_asc' | 'price_desc' | 'discount' | 'save_pct' | 'name'
  p_limit: number,           // keep 40
  p_offset: number
}) -> { total: number, rows: Part[] }

Part: { id, name, brand, category, part_number, color, chassis: string[],
        seller_count, discount, save_pct, models: string[], year_min, year_max,
        listings: [{ seller, price, shipping, total, url, in_stock, condition }] }
listings are pre-sorted cheapest first.

supabase.rpc("get_facets") ->
{ models:    [{v: string, n: number}],   // n = part count
  years:     number[],                   // descending
  categories:[{v, n}], brands: [{v, n}], colors: [{v, n}],
  sellers:   [{v, n}], chassis: [{v, n}] }
NOTE: facets shape changed from plain string arrays to {v, n} objects — update lib/supabase.ts.

## Savings filter UI
Offer preset steps (Any, 5%+, 10%+, 25%+, 50%+) → p_min_save_pct. Each card can show its
save_pct next to the dollar savings.

## Hard requirements (do not break)
1. Keep ALL analytics calls (track() in lib/supabase.ts): pageview on load, search on each
   query (only when filters/search active), click_buy on every Buy-now press with the same
   payload fields currently sent. These feed the events table used for retailer outreach.
2. Keep .env.local usage as-is; never commit secrets.
3. Keep PAGE_SIZE 40, debounced search (~250ms), and pagination (or infinite scroll if cleaner).
4. Buy buttons open listing.url in a new tab (noopener).
5. Show condition badge when listings[].condition !== 'New' (future-proofing; all New today).
6. Performance budget: search round-trip already ~0.4s; don't add client-side bloat.

## Verify (Abe's standing rule: verify functionality after changes)
- `npm run build` passes clean.
- Run dev, test: chassis 'VA' + years 2015–2021 returns ~25 parts (DB-verified number);
  savings 25%+ returns ~1,661; clearing filters restores full catalog (~28k comparable).
- Test mobile width (375px) — filters usable, cards readable.
- Commit in logical chunks and push to origin main. Then update CLAUDE.md's frontend notes.
